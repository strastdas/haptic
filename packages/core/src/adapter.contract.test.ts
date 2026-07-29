import { get } from 'svelte/store';
import { runStorageAdapterContract, type ContractAdapter } from './adapter.contract';
import { collection } from './store';
import type { FileEntry } from './types';
import { getNextUntitledName, hideDotFiles, sortFileEntry } from './utils';

interface Row {
  path: string;
  name: string;
  parentPath: string;
  collectionPath: string;
  content: string | null;
  isFolder: boolean;
}

/**
 * Pure in-memory StorageAdapter mock mirroring the web adapter's storage
 * semantics (naming, conflict rules, dotfile handling, tree shape). Proves the
 * contract suite is a statement about adapter behavior, not about PGlite.
 */
function createMockAdapter(): ContractAdapter {
  const rows = new Map<string, Row>();

  const children = (dirPath: string) => [...rows.values()].filter((r) => r.parentPath === dirPath);

  const siblingSource = (dirPath: string) =>
    rows.has(dirPath)
      ? children(dirPath)
      : [...rows.values()].filter((r) => r.collectionPath === get(collection));

  const buildTree = (entries: Row[], rootPath: string): FileEntry[] => {
    const entryMap = new Map<string, FileEntry>(
      entries.map((e) => [
        e.path,
        { path: e.path, name: e.name, children: e.isFolder ? [] : undefined }
      ])
    );
    const roots: FileEntry[] = [];
    entries.forEach((e) => {
      const fileEntry = entryMap.get(e.path)!;
      if (e.parentPath === get(collection) || e.parentPath === rootPath) {
        roots.push(fileEntry);
      } else {
        entryMap.get(e.parentPath)?.children?.push(fileEntry);
      }
    });
    return roots;
  };

  const sortTree = (entries: FileEntry[]) => {
    entries.sort(sortFileEntry);
    entries.forEach((e) => e.children && sortTree(e.children));
  };

  const moveFolder = async (source: string, target: string): Promise<void> => {
    const folderName = source.split('/').pop()!;
    if (children(target).some((r) => r.name === folderName && r.isFolder)) {
      throw new Error('Name conflict');
    }
    for (const child of children(source)) {
      if (child.isFolder) {
        await moveFolder(child.path, `${target}/${folderName}`);
      } else {
        await adapter.moveNote(child.path, `${target}/${folderName}`);
      }
    }
    const row = rows.get(source)!;
    rows.delete(source);
    row.path = `${target}/${folderName}`;
    row.parentPath = target;
    rows.set(row.path, row);
  };

  const adapter: ContractAdapter = {
    loadCollection: async (path) => {
      if (path) {
        collection.set(path);
      }
    },

    createNote: async (dirPath, name) => {
      const finalName = name ?? getNextUntitledName(siblingSource(dirPath), 'Untitled', '.md');
      const path = `${dirPath}/${finalName}`.replace('//', '/');
      rows.set(path, {
        path,
        name: finalName,
        parentPath: dirPath,
        collectionPath: get(collection),
        content: '',
        isFolder: false
      });
    },

    deleteNote: async (path) => {
      rows.delete(path);
    },

    renameNote: async (path, name) => {
      if (!name.endsWith('.md')) {
        name += '.md';
      }
      name = name.replaceAll(/[/\\?%*:|"<>]/g, '');
      const row = rows.get(path)!;
      const conflict = children(row.parentPath).some(
        (r) => r.name.toLowerCase() === name.toLowerCase() && !r.isFolder
      );
      if (conflict) {
        throw new Error('Name conflict');
      }
      rows.delete(path);
      row.name = name;
      row.path = `${path.split('/').slice(0, -1).join('/')}/${name}`;
      rows.set(row.path, row);
    },

    moveNote: async (source, target) => {
      const noteName = source.split('/').pop()!;
      const conflict = children(target).some((r) => r.name === noteName && !r.isFolder);
      if (conflict) {
        throw new Error('Name conflict');
      }
      const row = rows.get(source)!;
      rows.delete(source);
      row.path = `${target}/${noteName}`.replace('//', '/');
      row.parentPath = target;
      rows.set(row.path, row);
    },

    duplicateNote: async (path) => {
      const row = rows.get(path)!;
      const ext = path.split('.').pop()!;
      const copies = children(row.parentPath).filter(
        (r) => r.name.startsWith(row.name) && !r.isFolder
      );
      const newName = `${row.name.replace(`.${ext}`, '')} (${copies.length}).${ext}`;
      const newPath = `${path.split('/').slice(0, -1).join('/')}/${newName}`;
      rows.set(newPath, { ...row, path: newPath, name: newName });
    },

    createFolder: async (dirPath) => {
      const name = getNextUntitledName(siblingSource(dirPath), 'Untitled');
      const path = `${dirPath}/${name}`.replace('//', '/');
      rows.set(path, {
        path,
        name,
        parentPath: dirPath,
        collectionPath: get(collection),
        content: null,
        isFolder: true
      });
      return path;
    },

    deleteFolder: async (path, recursive = false) => {
      if (!recursive) {
        const visible = children(path).filter((r) => !r.name.startsWith('.'));
        if (visible.length > 0) {
          throw new Error('Folder is not empty');
        }
      }
      // Mirrors the web adapter: only the folder row is removed; orphaned
      // children drop out of the tree because their parent no longer exists.
      rows.delete(path);
    },

    renameFolder: async (path, name) => {
      const row = rows.get(path)!;
      rows.delete(path);
      row.name = name;
      row.path = `${path.split('/').slice(0, -1).join('/')}/${name}`;
      rows.set(row.path, row);
    },

    moveFolder,

    fetchCollectionEntries: async (dirPath, _sort = 'name', showDotfiles = false) => {
      const root = dirPath || get(collection);
      const entries = [...rows.values()].filter(
        (r) =>
          r.collectionPath === get(collection) &&
          (root === get(collection) ? true : r.parentPath === root)
      );
      const tree = buildTree(entries, root);
      sortTree(tree);
      return showDotfiles ? tree : hideDotFiles(tree);
    }
  };

  return adapter;
}

runStorageAdapterContract('in-memory mock', async () => {
  const adapter = createMockAdapter();
  const collectionPath = '/Contract';
  await adapter.loadCollection(collectionPath);
  return { adapter, collectionPath };
});
