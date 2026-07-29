import { activeFile, collection, noteHistory } from '@/store';
import { hideDotFiles, validateHapticFolder, sortFileEntry } from '@/utils';
import { appDataDir } from '@tauri-apps/api/path';
import { open } from '@tauri-apps/plugin-dialog';
import { BaseDirectory, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { get } from 'svelte/store';
import type { CollectionParams } from '@/types';
import { readDirTree } from './fs';

// Fetch the collection entries
export const fetchCollectionEntries = async (
  dirPath?: string,
  sort: 'name' | 'date' = 'name',
  showDotfiles = false
) => {
  dirPath = dirPath || get(collection);

  if (!dirPath) {
    new Error('No directory path provided');
  }

  let files = await readDirTree(dirPath);

  if (sort === 'name') {
    files.sort((a, b) => sortFileEntry(a, b));
  }

  // Hide dotfiles
  if (!showDotfiles) {
    files = hideDotFiles(files);
  }

  return files;
};

export const loadCollection = async (path?: string | undefined) => {
  // If no path is provided, open a dialog
  if (!path) {
    path = (await open({ directory: true })) as string;
  }

  // Return if no path is provided
  if (!path) {
    return;
  }

  // Set collection path
  collection.set(path);

  // Reset all collection states
  noteHistory.set([]);
  activeFile.set(null);

  // Validate .haptic folder
  await validateHapticFolder(path);

  // Add collection to collections data
  const collectionObj = {
    path,
    name: path.split('/').pop(),
    lastOpened: new Date().toISOString()
  };

  const collections = await readTextFile('collections.json', {
    baseDir: BaseDirectory.AppData
  }).catch(() => null);

  // v2's writeTextFile does not create parent directories; make sure the app
  // data dir exists before the first write on a fresh install.
  await mkdir(await appDataDir(), { recursive: true }).catch(() => null);

  if (collections) {
    const collectionsArray = JSON.parse(collections);
    const index = collectionsArray.findIndex((item: { path: string }) => item.path === path);

    if (index !== -1) {
      collectionsArray.splice(index, 1);
    }

    collectionsArray.push(collectionObj);
    await writeTextFile('collections.json', JSON.stringify(collectionsArray), {
      baseDir: BaseDirectory.AppData
    });
  } else {
    await writeTextFile('collections.json', JSON.stringify([collectionObj]), {
      baseDir: BaseDirectory.AppData
    });
  }
};

// Get all collections
export const getCollections = async (): Promise<CollectionParams[]> => {
  const collections = await readTextFile('collections.json', {
    baseDir: BaseDirectory.AppData
  }).catch(() => null);

  if (!collections) {
    return [];
  }

  return JSON.parse(collections);
};
