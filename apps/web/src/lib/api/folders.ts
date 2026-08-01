import {
  allEntries,
  childEntries,
  deleteEntry,
  getEntry,
  putEntry,
  repathEntry,
  type EntryRow
} from '@/database/client';
import { collection } from '@/store';
import { getNextUntitledName } from '@/utils';
import { basename, dirname, joinPath } from '@haptic/core/path';
import { get } from 'svelte/store';
import { moveNote } from './notes';

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

// Rename a folder
export const renameFolder = async (path: string, name: string) => {
  const row = await getEntry(path);
  if (!row) {
    return;
  }
  await repathEntry(path, { ...row, name, path: joinPath(dirname(path), name) });
};

// Move a folder
export const moveFolder = async (source: string, target: string) => {
  const row = await getEntry(source);
  if (!row) {
    return;
  }

  // Make sure there are no name conflicts
  const folderName = basename(source);
  const targetFiles = await childEntries(target);

  if (targetFiles.some((file) => file.name === folderName && file.isFolder)) {
    throw new Error('Name conflict');
  }

  const destination = joinPath(target, folderName);

  // Move all children first — each child's own move re-reads its parent, so the
  // folder row has to stay put until they are done.
  for (const file of await childEntries(source)) {
    if (file.isFolder) {
      await moveFolder(file.path, destination);
    } else {
      await moveNote(file.path, destination);
    }
  }

  await repathEntry(source, { ...row, path: destination, parentPath: target });
};
