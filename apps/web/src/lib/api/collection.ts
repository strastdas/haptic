import { allEntries, childEntries, getDb, type CollectionRow } from '@/database/client';
import { activeFile, collection, collectionEntries, noteHistory } from '@/store';
import type { FileEntry } from '@/types';
import { buildFileTree, sortFileEntry } from '@/utils';
import { basename } from '@haptic/core/path';
import { get } from 'svelte/store';

// Fetch the collection entries
export const fetchCollectionEntries = async (
  dirPath?: string,
  sort: 'name' | 'date' = 'name',
  showDotfiles = false
): Promise<FileEntry[]> => {
  dirPath = dirPath || get(collection);
  if (!dirPath) {
    throw new Error('No directory path provided');
  }

  // Get collection by path
  const collectionObj = await getDb().get('collection', get(collection));
  if (!collectionObj) {
    throw new Error('Collection not found');
  }

  // Read entries: the whole collection at the root, otherwise one directory
  const entries =
    dirPath === get(collection)
      ? await allEntries(get(collection))
      : (await childEntries(dirPath)).filter((row) => row.collectionPath === get(collection));

  // Convert entries to FileEntry[] format with recursive children
  const fileEntries = buildFileTree(entries, dirPath);

  // Sort entries recursively
  const sortEntries = (entries: FileEntry[]) => {
    entries.sort((a, b) => {
      if (sort === 'name' && a.name && b.name) {
        return sortFileEntry(a, b);
      } else if (sort === 'date') {
        console.warn('Sorting by date is not implemented yet');
      }
      return 0;
    });

    entries.forEach((entry) => {
      if (entry.children) {
        sortEntries(entry.children);
      }
    });
  };

  sortEntries(fileEntries);

  // Hide dotfiles recursively
  const filterDotfiles = (entries: FileEntry[]): FileEntry[] =>
    entries.filter((entry) => {
      if (!showDotfiles && entry.name?.startsWith('.')) {
        return false;
      }
      if (entry.children) {
        entry.children = filterDotfiles(entry.children);
      }
      return true;
    });

  // Set collectionEntries if length is different
  collectionEntries.set(showDotfiles ? fileEntries : filterDotfiles(fileEntries));

  return showDotfiles ? fileEntries : filterDotfiles(fileEntries);
};

export const loadCollection = async (path?: string | undefined) => {
  // Return if no path is provided
  if (!path) {
    return;
  }

  // Set collection path
  collection.set(path);

  // Reset all collection states
  noteHistory.set([]);
  activeFile.set(null);

  // Add (or touch) the collection. `put` is an upsert on the keyPath, so this
  // replaces the previous exists-check-then-insert-or-update.
  const existing = await getDb().get('collection', path);
  await getDb().put('collection', {
    path,
    name: existing?.name ?? basename(path),
    lastOpened: new Date()
  });
};

// Get all collections
export const getCollections = async (): Promise<CollectionRow[]> => {
  return getDb().getAll('collection');
};
