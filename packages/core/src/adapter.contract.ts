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
  | 'readNoteContent'
  | 'writeNoteContent'
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
> &
  Partial<Pick<StorageAdapter, 'searchEntries'>>;

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
      const folderPath = await adapter.createFolder(root);
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
      const folderPath = await adapter.createFolder(root);
      await adapter.createNote(folderPath, 'Keep.md');

      await expect(adapter.deleteFolder(folderPath)).rejects.toThrow();
      expect(await names()).toEqual(['Untitled']);

      await adapter.deleteFolder(folderPath, true);
      expect(await names()).toEqual([]);
    });

    it('deletes a folder containing only hidden files without the recursive flag', async () => {
      const folderPath = await adapter.createFolder(root);
      await adapter.createNote(folderPath, '.DS_Store');

      await adapter.deleteFolder(folderPath);
      expect(await names()).toEqual([]);
    });

    it('renames a folder', async () => {
      const folderPath = await adapter.createFolder(root);
      await adapter.renameFolder(folderPath, 'Projects');
      expect(await names()).toEqual(['Projects']);
    });

    it('moves a folder with its children into another folder', async () => {
      const source = await adapter.createFolder(root); // Untitled
      const target = await adapter.createFolder(root); // Untitled 1
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
      const folderPath = await adapter.createFolder(root);
      await adapter.createNote(folderPath, 'inner.md');

      const entries = await tree();
      expect(entries.map((e) => e.name)).toEqual(['Untitled', 'b 2.md', 'b 10.md']);

      const folder = findEntry(entries, 'Untitled');
      expect(folder?.children?.map((e) => e.name)).toEqual(['inner.md']);
      // Notes are leaves; folders always carry a children array
      expect(findEntry(entries, 'b 2.md')?.children).toBeUndefined();
    });

    // The only way to read or write a note body without the shared TipTap
    // editor, and therefore the basis of every cross-scope transfer.
    describe('note content', () => {
      it('round-trips a note body', async () => {
        await adapter.createNote(root, 'a.md');
        await adapter.writeNoteContent(`${root}/a.md`, '# Hello\n\nbody');
        expect(await adapter.readNoteContent(`${root}/a.md`)).toBe('# Hello\n\nbody');
      });

      it('reads an empty string from a freshly created note', async () => {
        await adapter.createNote(root, 'a.md');
        expect(await adapter.readNoteContent(`${root}/a.md`)).toBe('');
      });

      it('overwrites rather than appends', async () => {
        await adapter.createNote(root, 'a.md');
        await adapter.writeNoteContent(`${root}/a.md`, 'first');
        await adapter.writeNoteContent(`${root}/a.md`, 'second');
        expect(await adapter.readNoteContent(`${root}/a.md`)).toBe('second');
      });

      it('preserves content through a rename', async () => {
        await adapter.createNote(root, 'a.md');
        await adapter.writeNoteContent(`${root}/a.md`, 'kept');
        await adapter.renameNote(`${root}/a.md`, 'b');
        expect(await adapter.readNoteContent(`${root}/b.md`)).toBe('kept');
      });
    });

    describe('searchEntries', () => {
      // createNote doesn't return the path it created, so derive it the same
      // way every implementation builds it.
      const seed = async (name: string, content: string) => {
        await adapter.createNote(root, name);
        const path = `${root}/${name}`;
        await adapter.writeNoteContent(path, content);
        return path;
      };

      const paths = async (query: string, caseSensitive?: boolean, matchWord?: boolean) => {
        const results = await adapter.searchEntries!(root, query, caseSensitive, matchWord);
        return [...new Set(results.map((r) => r.path))].sort();
      };

      beforeEach(async (context) => {
        if (!adapter.searchEntries) {
          context.skip();
        }
      });

      it('finds notes containing the query and ignores the rest', async () => {
        const hit = await seed('hit.md', 'alpha beta\ngamma');
        await seed('miss.md', 'nothing here');
        expect(await paths('beta')).toEqual([hit]);
      });

      it('returns a context preview for every match', async () => {
        await seed('hit.md', 'first\nalpha\nlast');
        const results = await adapter.searchEntries!(root, 'alpha');
        expect(results.length).toBeGreaterThan(0);
        expect(results[0].context_preview).toContain('alpha');
      });

      it('is case insensitive by default and case sensitive on request', async () => {
        const upper = await seed('upper.md', 'ALPHA');
        expect(await paths('alpha')).toEqual([upper]);
        expect(await paths('alpha', true)).toEqual([]);
        expect(await paths('ALPHA', true)).toEqual([upper]);
      });

      it('matches whole words only when asked', async () => {
        const whole = await seed('whole.md', 'an alpha here');
        await seed('partial.md', 'alphabet');
        expect((await paths('alpha')).length).toBe(2);
        expect(await paths('alpha', false, true)).toEqual([whole]);
      });

      // Regression: the query was once quote-doubled before binding, so any
      // apostrophe silently matched nothing.
      it('matches queries containing an apostrophe', async () => {
        const hit = await seed('quote.md', "it's here");
        expect(await paths("it's")).toEqual([hit]);
      });

      // Regression: an unescaped query was interpolated into a RegExp, so a
      // whole-word search for markdown syntax threw instead of returning.
      it('handles regex metacharacters in a whole-word query', async () => {
        const hit = await seed('task.md', 'a - [ ] b');
        expect(await paths('- [ ]', false, true)).toEqual([hit]);
      });
    });
  });
}
