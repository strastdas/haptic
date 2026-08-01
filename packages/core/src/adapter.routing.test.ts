import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearStorageAdapters,
  createNote,
  deleteNote,
  fetchCollectionEntries,
  getCollections,
  moveNote,
  readNoteContent,
  registeredScopes,
  setStorageAdapter,
  transferNote,
  writeNoteContent
} from './adapter';
import type { StorageAdapter } from './adapter';
import { basename, dirname, joinPath } from './path';
import type { StorageScope } from './path';
import type { FileEntry } from './types';

/**
 * Routing behaviour of the storage seam with TWO adapters registered at once —
 * the arrangement the desktop app needs to hold local files and cloud notes
 * simultaneously, and which the previous single-global seam could not express.
 *
 * The mock is deliberately minimal: routing is about *which* adapter is called,
 * not about storage semantics (those are covered by the contract suite).
 */
function createScopedMock(scope: StorageScope) {
  const files = new Map<string, string>();
  const calls: string[] = [];

  const record =
    <T extends unknown[], R>(name: string, fn: (...args: T) => R) =>
    (...args: T): R => {
      calls.push(name);
      return fn(...args);
    };

  const adapter: StorageAdapter = {
    readNoteContent: record('readNoteContent', async (path: string) => files.get(path) ?? ''),
    writeNoteContent: record('writeNoteContent', async (path: string, content: string) => {
      files.set(path, content);
    }),
    createNote: record('createNote', async (dirPath: string, name = 'Untitled.md') => {
      files.set(joinPath(dirPath, name), '');
    }),
    deleteNote: record('deleteNote', async (path: string) => {
      files.delete(path);
    }),
    moveNote: record('moveNote', async (source: string, target: string) => {
      const content = files.get(source) ?? '';
      files.delete(source);
      files.set(joinPath(target, basename(source)), content);
    }),
    fetchCollectionEntries: record('fetchCollectionEntries', async (dirPath?: string) => {
      const root = dirPath ?? '';
      return [...files.keys()]
        .filter((path) => dirname(path) === root)
        .map((path): FileEntry => ({ path, name: basename(path) }));
    }),
    getCollections: record('getCollections', async () => [
      { path: `${scope}-collection`, name: scope, lastOpened: new Date(0) }
    ]),
    // Unused by these tests — routing never reaches them.
    openNote: vi.fn(),
    renameNote: vi.fn(),
    saveNote: vi.fn(),
    duplicateNote: vi.fn(),
    getNoteMetadataParams: vi.fn(),
    loadCollection: vi.fn(),
    searchEntries: vi.fn(),
    createFolder: vi.fn(),
    deleteFolder: vi.fn(),
    renameFolder: vi.fn(),
    moveFolder: vi.fn(),
    loadSettings: vi.fn(),
    setSettings: vi.fn()
  } as unknown as StorageAdapter;

  return { adapter, files, calls };
}

describe('StorageAdapter routing', () => {
  let local: ReturnType<typeof createScopedMock>;
  let cloud: ReturnType<typeof createScopedMock>;

  beforeEach(() => {
    clearStorageAdapters();
    local = createScopedMock('local');
    cloud = createScopedMock('cloud');
    setStorageAdapter('local', local.adapter);
    setStorageAdapter('cloud', cloud.adapter);
  });

  it('registers both scopes at once', () => {
    expect(registeredScopes()).toEqual(['local', 'cloud']);
  });

  it('routes an unprefixed path to the local adapter', async () => {
    await createNote('/Notes', 'a.md');
    expect(local.files.has('/Notes/a.md')).toBe(true);
    expect(cloud.calls).toEqual([]);
  });

  it('routes a cloud: path to the cloud adapter', async () => {
    await createNote('cloud:/col_1', 'a.md');
    expect(cloud.files.has('cloud:/col_1/a.md')).toBe(true);
    expect(local.calls).toEqual([]);
  });

  it('keeps identically-named notes in different scopes apart', async () => {
    await createNote('/Notes', 'a.md');
    await writeNoteContent('/Notes/a.md', 'local body');
    await createNote('cloud:/Notes', 'a.md');
    await writeNoteContent('cloud:/Notes/a.md', 'cloud body');

    expect(await readNoteContent('/Notes/a.md')).toBe('local body');
    expect(await readNoteContent('cloud:/Notes/a.md')).toBe('cloud body');
  });

  // Throws synchronously rather than rejecting, so a bootstrap-order mistake
  // surfaces at the call site instead of as an unhandled rejection later.
  it('throws a scope-specific error when an adapter is missing', () => {
    clearStorageAdapters();
    setStorageAdapter('local', local.adapter);
    expect(() => readNoteContent('cloud:/col_1/a.md')).toThrow(/scope 'cloud'/);
  });

  it('aggregates collections across every registered scope', async () => {
    expect((await getCollections()).map((c) => c.path)).toEqual([
      'local-collection',
      'cloud-collection'
    ]);
  });

  describe('same-scope operations stay with one adapter', () => {
    it('delegates a move to the owning adapter', async () => {
      await createNote('/Notes', 'a.md');
      await moveNote('/Notes/a.md', '/Archive');

      expect(local.calls).toContain('moveNote');
      expect(local.files.has('/Archive/a.md')).toBe(true);
      expect(cloud.calls).toEqual([]);
    });
  });

  describe('cross-scope transfer', () => {
    beforeEach(async () => {
      await createNote('/Notes', 'a.md');
      await writeNoteContent('/Notes/a.md', '# Hello');
    });

    it('copies local -> cloud, leaving the source in place', async () => {
      const destination = await transferNote('/Notes/a.md', 'cloud:/col_1');

      expect(destination).toBe('cloud:/col_1/a.md');
      expect(await readNoteContent('cloud:/col_1/a.md')).toBe('# Hello');
      // The sync model is explicit that the local file is untouched.
      expect(local.files.has('/Notes/a.md')).toBe(true);
    });

    it('copies cloud -> local for download', async () => {
      await transferNote('/Notes/a.md', 'cloud:/col_1');
      await writeNoteContent('cloud:/col_1/a.md', '# Edited in the cloud');

      const destination = await transferNote('cloud:/col_1/a.md', '/Downloads');
      expect(destination).toBe('/Downloads/a.md');
      expect(await readNoteContent('/Downloads/a.md')).toBe('# Edited in the cloud');
    });

    it('never routes a single adapter method across scopes', async () => {
      await transferNote('/Notes/a.md', 'cloud:/col_1');

      // Read from local, write to cloud — neither adapter sees the other's path.
      expect(local.calls).toContain('readNoteContent');
      expect(cloud.calls).toContain('writeNoteContent');
      expect(cloud.calls).not.toContain('readNoteContent');
    });

    it('removes the source when asked, which is what a cross-scope move is', async () => {
      await moveNote('/Notes/a.md', 'cloud:/col_1');

      expect(local.files.has('/Notes/a.md')).toBe(false);
      expect(await readNoteContent('cloud:/col_1/a.md')).toBe('# Hello');
      // moveNote is never delegated — no adapter could see both sides.
      expect(local.calls).not.toContain('moveNote');
      expect(cloud.calls).not.toContain('moveNote');
    });

    it('refuses to overwrite an existing note at the destination', async () => {
      await createNote('cloud:/col_1', 'a.md');
      await expect(transferNote('/Notes/a.md', 'cloud:/col_1')).rejects.toThrow('Name conflict');
    });

    it('leaves the source intact when the transfer fails', async () => {
      await createNote('cloud:/col_1', 'a.md');
      await expect(moveNote('/Notes/a.md', 'cloud:/col_1')).rejects.toThrow('Name conflict');
      expect(local.files.has('/Notes/a.md')).toBe(true);
    });
  });

  it('reports cross-scope folder moves as unsupported rather than corrupting', async () => {
    const { moveFolder } = await import('./adapter');
    expect(() => moveFolder('/Notes/sub', 'cloud:/col_1')).toThrow(/Cross-scope/);
  });

  it('routes fetchCollectionEntries by the directory it is given', async () => {
    await createNote('cloud:/col_1', 'a.md');
    const entries = await fetchCollectionEntries('cloud:/col_1');

    expect(entries.map((e) => e.name)).toEqual(['a.md']);
    expect(local.calls).not.toContain('fetchCollectionEntries');
  });

  it('routes a delete to the owning adapter', async () => {
    await createNote('cloud:/col_1', 'a.md');
    await deleteNote('cloud:/col_1/a.md');

    expect(cloud.files.has('cloud:/col_1/a.md')).toBe(false);
    expect(local.calls).not.toContain('deleteNote');
  });
});
