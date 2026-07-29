import { OS_TRASH_DIR } from '@/constants';
import { collection, collectionSettings, platform } from '@/store';
import { getNextUntitledName } from '@/utils';
import { homeDir } from '@tauri-apps/api/path';
import { mkdir, remove, rename } from '@tauri-apps/plugin-fs';
import { get } from 'svelte/store';
import { readDirTree } from './fs';

// Create a new folder
export const createFolder = async (dirPath: string) => {
  // Read the directory
  const files = await readDirTree(dirPath, false);

  // Generate a new name
  const name = getNextUntitledName(files, 'Untitled');

  // Save the new folder
  await mkdir(`${dirPath}/${name}`);

  return `${dirPath}/${name}`;
};

// Delete a folder
export const deleteFolder = async (path: string, recursive = false) => {
  const folderName = path.split('/').pop()!;

  if (!recursive) {
    let children = await readDirTree(path, false);

    // Ignore hidden files (.DS_Store etc.): the tree hides dotfiles, so a
    // folder that looks empty to the user must be deletable.
    children = children.filter((child) => !child.name?.startsWith('.'));

    if (children.length > 0) {
      throw new Error('Folder is not empty');
    }
  }

  switch (get(collectionSettings).notes.trash_dir) {
    case 'system': {
      await rename(path, `${await homeDir()}${OS_TRASH_DIR[get(platform)]}${folderName}`);
      break;
    }
    case 'haptic': {
      await rename(path, `${get(collection)}/.haptic/trash/${path.split('/').pop()!}`);
      break;
    }
    case 'delete': {
      await remove(path, { recursive: true });
      break;
    }
  }
};

// Rename a folder
export const renameFolder = async (path: string, name: string) => {
  await rename(path, `${path.split('/').slice(0, -1).join('/')}/${name}`);
};

// Move a folder
export const moveFolder = async (source: string, target: string) => {
  // Get target directory
  const files = await readDirTree(target, false);

  // Make sure there are no name conflicts
  const folderName = source.split('/').pop()!;

  if (files.some((file) => file.name === folderName && file.children !== undefined)) {
    throw new Error('Name conflict');
  }

  await rename(source, `${target}/${folderName}`);
};
