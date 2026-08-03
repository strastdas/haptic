import {
  allEntries,
  childEntries,
  deleteEntry,
  getEntry,
  putEntry,
  repathEntries,
  type EntryRow
} from '@/database/client';
import { activeFile, collection } from '@/store';
import { getNextUntitledName } from '@/utils';
import { basename, dirname, joinPath } from '@haptic/core/path';
import { get } from 'svelte/store';

// Create a new folder
export const createFolder = async (dirPath: string) => {
  // The collection root isn't itself a stored entry, so it has no children to
  // index by — fall back to the whole collection for Untitled numbering.
  const dir = await getEntry(dirPath);
  const files: EntryRow[] = dir ? await childEntries(dirPath) : await allEntries(get(collection));

  // Generate a new name (Untitled, if there are any existing Untitled folders, increment the number by 1)
  const name = getNextUntitledName(files, 'Untitled');
  const path = joinPath(dirPath, name);
  const now = new Date();

  // Save the new folder
  await putEntry({
    path,
    name,
    parentPath: dirPath,
    collectionPath: get(collection),
    content: null,
    isFolder: true,
    size: null,
    createdAt: now,
    updatedAt: now
  });

  return path;
};

// Delete a folder
export const deleteFolder = async (path: string, recursive = false) => {
  if (!recursive) {
    // Ignore hidden files (.DS_Store etc.): the tree hides dotfiles, so a
    // folder that looks empty to the user must be deletable.
    const children = (await childEntries(path)).filter((child) => !child.name?.startsWith('.'));

    if (children.length > 0) {
      throw new Error('Folder is not empty');
    }
  }

  // Mirrors the previous behaviour: only the folder row is removed; orphaned
  // children drop out of the tree because their parent no longer exists.
  await deleteEntry(path);
};

function isWithinFolder(path: string, folderPath: string): boolean {
  return path === folderPath || path.startsWith(`${folderPath}/`);
}

function repath(path: string, from: string, to: string): string {
  return `${to}${path.slice(from.length)}`;
}

async function repathFolderTree(source: string, destination: string): Promise<void> {
  const entries = await allEntries(get(collection));
  const affected = entries.filter((entry) => isWithinFolder(entry.path, source));
  if (affected.length === 0) {
    return;
  }

  const sourcePaths = new Set(affected.map((entry) => entry.path));
  const destinationPaths = new Set(
    affected.map((entry) => repath(entry.path, source, destination))
  );
  if (destinationPaths.size !== affected.length) {
    throw new Error('Name conflict');
  }
  if (entries.some((entry) => !sourcePaths.has(entry.path) && destinationPaths.has(entry.path))) {
    throw new Error('Name conflict');
  }

  const now = new Date();
  await repathEntries(
    affected.map((entry) => {
      const path = repath(entry.path, source, destination);
      return {
        from: entry.path,
        row: {
          ...entry,
          name: entry.path === source ? basename(destination) : entry.name,
          parentPath:
            entry.path === source
              ? dirname(destination)
              : repath(entry.parentPath, source, destination),
          path,
          updatedAt: now
        }
      };
    })
  );

  const current = get(activeFile);
  if (current && isWithinFolder(current, source)) {
    activeFile.set(repath(current, source, destination));
  }
}

// Rename a folder and every nested file/folder.
export const renameFolder = async (path: string, name: string) => {
  await repathFolderTree(path, joinPath(dirname(path), name));
};

// Move a folder
export const moveFolder = async (source: string, target: string) => {
  if (target === source || target.startsWith(`${source}/`)) {
    throw new Error('A folder cannot be moved into itself.');
  }
  await repathFolderTree(source, joinPath(target, basename(source)));
};
