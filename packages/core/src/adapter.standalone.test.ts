import { beforeEach, describe, expect, it, vi } from 'vitest';
import { get } from 'svelte/store';
import {
  canGetAccount,
  canCreateCloudCollection,
  canStartSignIn,
  canSignOut,
  canOpenFile,
  clearStorageAdapters,
  closeStandaloneFile,
  createCloudCollection,
  getAccount,
  isStandalone,
  openFile,
  signOut,
  startSignIn,
  setPlatformActions,
  setStorageAdapter,
  trackStandaloneFile,
  type StorageAdapter
} from './adapter';
import { activeFile, collection, standaloneFiles } from './store';

/**
 * Single-file opens: notes reached through "Open file…" or the OS file manager,
 * which sit outside any collection and so have no row in the tree.
 */
describe('standalone files', () => {
  const opened: string[] = [];

  beforeEach(() => {
    clearStorageAdapters();
    opened.length = 0;
    standaloneFiles.set([]);
    activeFile.set(null);
    collection.set('/Notes');
    setStorageAdapter('local', {
      openNote: async (path: string) => {
        opened.push(path);
        activeFile.set(path);
      }
    } as unknown as StorageAdapter);
    setPlatformActions({ openExternal: () => {} });
  });

  describe('isStandalone', () => {
    it('is false for a note inside the open collection', () => {
      expect(isStandalone('/Notes/a.md')).toBe(false);
      expect(isStandalone('/Notes/sub/a.md')).toBe(false);
    });

    it('is true for a note outside it', () => {
      expect(isStandalone('/Elsewhere/a.md')).toBe(true);
      expect(isStandalone('/tmp/scratch.md')).toBe(true);
    });

    // A sibling directory that merely shares a prefix is not inside the
    // collection — '/Notes2/a.md' must not match '/Notes'.
    it('is not fooled by a shared path prefix', () => {
      expect(isStandalone('/Notes2/a.md')).toBe(true);
    });

    it('is true for everything when no collection is open', () => {
      collection.set(undefined as unknown as string);
      expect(isStandalone('/Notes/a.md')).toBe(true);
    });
  });

  describe('tracking', () => {
    it('records a file outside the collection', () => {
      trackStandaloneFile('/tmp/a.md');
      expect(get(standaloneFiles)).toEqual(['/tmp/a.md']);
    });

    it('ignores a file that already lives in the collection tree', () => {
      trackStandaloneFile('/Notes/a.md');
      expect(get(standaloneFiles)).toEqual([]);
    });

    it('does not list the same file twice', () => {
      trackStandaloneFile('/tmp/a.md');
      trackStandaloneFile('/tmp/a.md');
      expect(get(standaloneFiles)).toEqual(['/tmp/a.md']);
    });
  });

  describe('closing', () => {
    it('removes the file without touching the others', () => {
      trackStandaloneFile('/tmp/a.md');
      trackStandaloneFile('/tmp/b.md');
      closeStandaloneFile('/tmp/a.md');
      expect(get(standaloneFiles)).toEqual(['/tmp/b.md']);
    });

    it('clears the editor when the closed file was the active one', () => {
      trackStandaloneFile('/tmp/a.md');
      activeFile.set('/tmp/a.md');
      closeStandaloneFile('/tmp/a.md');
      expect(get(activeFile)).toBeNull();
    });

    it('leaves the editor alone when a different file was active', () => {
      trackStandaloneFile('/tmp/a.md');
      activeFile.set('/Notes/keep.md');
      closeStandaloneFile('/tmp/a.md');
      expect(get(activeFile)).toBe('/Notes/keep.md');
    });
  });

  describe('openFile', () => {
    it('is unavailable when the platform cannot pick files', () => {
      expect(canOpenFile()).toBe(false);
    });

    it('is available once a picker is registered', () => {
      setPlatformActions({ openExternal: () => {}, pickFile: async () => null });
      expect(canOpenFile()).toBe(true);
    });

    it('tracks and opens the chosen file', async () => {
      setPlatformActions({ openExternal: () => {}, pickFile: async () => '/tmp/picked.md' });

      await expect(openFile()).resolves.toBe('/tmp/picked.md');
      expect(get(standaloneFiles)).toEqual(['/tmp/picked.md']);
      expect(opened).toEqual(['/tmp/picked.md']);
    });

    it('does nothing when the dialog is dismissed', async () => {
      setPlatformActions({ openExternal: () => {}, pickFile: async () => null });

      await expect(openFile()).resolves.toBeNull();
      expect(get(standaloneFiles)).toEqual([]);
      expect(opened).toEqual([]);
    });

    // Picking a file that happens to be inside the collection should just open
    // it, not duplicate it into the standalone list above its own tree row.
    it('opens a file inside the collection without listing it separately', async () => {
      const pickFile = vi.fn(async () => '/Notes/inside.md');
      setPlatformActions({ openExternal: () => {}, pickFile });

      await openFile();
      expect(get(standaloneFiles)).toEqual([]);
      expect(opened).toEqual(['/Notes/inside.md']);
    });
  });
});

describe('account platform action', () => {
  it('is unavailable until the platform registers a sign-in action', () => {
    setPlatformActions({ openExternal: () => {} });

    expect(canStartSignIn()).toBe(false);
    expect(startSignIn()).toBeUndefined();
  });

  it('delegates sign-in to the current platform', () => {
    const signIn = vi.fn();
    setPlatformActions({ openExternal: () => {}, startSignIn: signIn });

    startSignIn();

    expect(canStartSignIn()).toBe(true);
    expect(signIn).toHaveBeenCalledOnce();
  });

  it('reads and signs out of the current account through the platform', async () => {
    const account = { id: 'user_123', email: 'hello@example.com' };
    const readAccount = vi.fn(async () => account);
    const endSession = vi.fn();
    setPlatformActions({
      openExternal: () => {},
      getAccount: readAccount,
      signOut: endSession
    });

    await expect(getAccount()).resolves.toEqual(account);
    signOut();

    expect(canGetAccount()).toBe(true);
    expect(readAccount).toHaveBeenCalledOnce();
    expect(canSignOut()).toBe(true);
    expect(endSession).toHaveBeenCalledOnce();
  });

  it('delegates cloud collection creation to the current platform', () => {
    const create = vi.fn();
    setPlatformActions({ openExternal: () => {}, createCloudCollection: create });

    createCloudCollection();

    expect(canCreateCloudCollection()).toBe(true);
    expect(create).toHaveBeenCalledOnce();
  });
});
