import { beforeEach, describe, expect, it } from 'vitest';
import type { StorageAdapter } from './adapter';
import type { FileEntry } from './types';

/**
 * Behavioral contract for StorageAdapter implementations, exercised against
 * the real web adapter (in-memory PGlite) and a pure in-memory mock (which
 * proves the contract itself is implementable without a database).
 *
 * Scope: STORAGE effects only. Editor-coupled methods (openNote, saveNote,
 * getNoteMetadataParams) and platform-coupled settings (localStorage) are
 * deliberately excluded — they read the shared TipTap editor store /
 * window, so they belong to host-app tests. Implementations whose createNote
 * or moveNote open the created note must stub the editor seam (the web tests
 * mock @haptic/editor/store).
 */
export type ContractAdapter = Pick<
  StorageAdapter,
  | 'createNote'
  | 'deleteNote'
  | 'renameNote'
  | 'moveNote'
  | 'duplicateNote'
  | 'createFolder'
  | 'deleteFolder'
  | 'renameFolder'
  | 'moveFolder'
  | 'fetchCollectionEntries'
  | 'loadCollection'
>;

export interface ContractHarness {
  adapter: ContractAdapter;
  /** Path of a freshly loaded, EMPTY collection (also set as the active collection). */
  collectionPath: string;
}

export function runStorageAdapterContract(
  name: string,
  makeHarness: () => Promise<ContractHarness>
) {
  describe(`StorageAdapter contract (${name})`, () => {
    let adapter: ContractAdapter;
    let root: string;

    beforeEach(async () => {
      const harness = await makeHarness();
      adapter = harness.adapter;
      root = harness.collectionPath;
    });

    const tree = (showDotfiles = false) =>
      adapter.fetchCollectionEntries(root, 'name', showDotfiles);
    const names = async (showDotfiles = false) => (await tree(showDotfiles)).map((e) => e.name);
    const findEntry = (entries: FileEntry[], entryName: string) =>
      entries.find((e) => e.name === entryName);

    it('creates notes with incrementing Untitled names', async () => {
      await adapter.createNote(root);
      expect(await names()).toEqual(['Untitled.md']);

      await adapter.createNote(root);
      // natural sort places 'Untitled 1.md' before 'Untitled.md' (space < dot)
      expect(await names()).toEqual(['Untitled 1.md', 'Untitled.md']);
    });

    it('creates a note with an explicit name', async () => {
      await adapter.createNote(root, 'Hello.md');
      expect(await names()).toEqual(['Hello.md']);
    });

    it('renames a note, appending .md and stripping breaking characters', async () => {
      await adapter.createNote(root, 'Old.md');
      await adapter.renameNote(`${root}/Old.md`, 'New: name?*');
      expect(await names()).toEqual(['New name.md']);
    });

    it('rejects renaming a note to an existing name', async () => {
      await adapter.createNote(root, 'A.md');
      await adapter.createNote(root, 'B.md');
      await expect(adapter.renameNote(`${root}/A.md`, 'B.md')).rejects.toThrow();
      expect(await names()).toEqual(['A.md', 'B.md']);
    });

    it('duplicates a note with a numbered suffix', async () => {
      await adapter.createNote(root, 'Note.md');
      await adapter.duplicateNote(`${root}/Note.md`);
      expect(await names()).toEqual(['Note (1).md', 'Note.md']);
    });

    it('deletes a note', async () => {
      await adapter.createNote(root, 'Gone.md');
      await adapter.deleteNote(`${root}/Gone.md`);
      expect(await names()).toEqual([]);
    });

    it('moves a note into a folder and rejects name conflicts', async () => {
      const folderPath = (await adapter.createFolder(root)) as string;
      await adapter.createNote(root, 'Move.md');
      await adapter.moveNote(`${root}/Move.md`, folderPath);

      let entries = await tree();
      expect(findEntry(entries, 'Move.md')).toBeUndefined();
      expect(findEntry(entries, 'Untitled')?.children?.map((e) => e.name)).toEqual(['Move.md']);

      // A second Move.md at the root cannot move into the same folder
      await adapter.createNote(root, 'Move.md');
      await expect(adapter.moveNote(`${root}/Move.md`, folderPath)).rejects.toThrow();

      entries = await tree();
      expect(findEntry(entries, 'Move.md')).toBeDefined();
    });

    it('creates folders with incrementing Untitled names', async () => {
      const first = await adapter.createFolder(root);
      const second = await adapter.createFolder(root);
      expect(first).toBe(`${root}/Untitled`);
      expect(second).toBe(`${root}/Untitled 1`);
      expect(await names()).toEqual(['Untitled', 'Untitled 1']);
    });

    it('refuses to delete a folder with visible children unless recursive', async () => {
      const folderPath = (await adapter.createFolder(root)) as string;
      await adapter.createNote(folderPath, 'Keep.md');

      await expect(adapter.deleteFolder(folderPath)).rejects.toThrow();
      expect(await names()).toEqual(['Untitled']);

      await adapter.deleteFolder(folderPath, true);
      expect(await names()).toEqual([]);
    });

    it('deletes a folder containing only hidden files without the recursive flag', async () => {
      const folderPath = (await adapter.createFolder(root)) as string;
      await adapter.createNote(folderPath, '.DS_Store');

      await adapter.deleteFolder(folderPath);
      expect(await names()).toEqual([]);
    });

    it('renames a folder', async () => {
      const folderPath = (await adapter.createFolder(root)) as string;
      await adapter.renameFolder(folderPath, 'Projects');
      expect(await names()).toEqual(['Projects']);
    });

    it('moves a folder with its children into another folder', async () => {
      const source = (await adapter.createFolder(root)) as string; // Untitled
      const target = (await adapter.createFolder(root)) as string; // Untitled 1
      await adapter.createNote(source, 'Child.md');

      await adapter.moveFolder(source, target);

      const entries = await tree();
      expect(entries.map((e) => e.name)).toEqual(['Untitled 1']);
      const moved = findEntry(entries, 'Untitled 1')?.children;
      expect(moved?.map((e) => e.name)).toEqual(['Untitled']);
      expect(moved?.[0].children?.map((e) => e.name)).toEqual(['Child.md']);
    });

    it('hides dotfiles by default and shows them on request', async () => {
      await adapter.createNote(root, '.hidden.md');
      await adapter.createNote(root, 'visible.md');

      expect(await names()).toEqual(['visible.md']);
      expect(await names(true)).toEqual(['.hidden.md', 'visible.md']);
    });

    it('returns a nested tree with folders first, sorted naturally', async () => {
      await adapter.createNote(root, 'b 10.md');
      await adapter.createNote(root, 'b 2.md');
      const folderPath = (await adapter.createFolder(root)) as string;
      await adapter.createNote(folderPath, 'inner.md');

      const entries = await tree();
      expect(entries.map((e) => e.name)).toEqual(['Untitled', 'b 2.md', 'b 10.md']);

      const folder = findEntry(entries, 'Untitled');
      expect(folder?.children?.map((e) => e.name)).toEqual(['inner.md']);
      // Notes are leaves; folders always carry a children array
      expect(findEntry(entries, 'b 2.md')?.children).toBeUndefined();
    });
  });
}
