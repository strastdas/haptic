import { activeFile, collection, collectionSettings, editor, noteHistory } from '@/store';
import type { NoteMetadataParams } from '@/types';
import { calculateReadingTime, getNextUntitledName, setEditorContent } from '@/utils';
import { basename, dirname, extname, joinPath, stem } from '@haptic/core/path';
import { readTextFile, remove, rename, stat, writeTextFile } from '@tauri-apps/plugin-fs';
import { invoke } from '@tauri-apps/api/core';
import { get } from 'svelte/store';
import { readDirTree } from './fs';

// Create a new note
export const createNote = async (dirPath: string, name?: string, open = true) => {
  // Read the directory
  const files = await readDirTree(dirPath, false);

  // Generate a new name (Untitled.md, if there are any exiting Untitled notes, increment the number by 1)
  if (!name) {
    name = getNextUntitledName(files, 'Untitled', '.md');
  }

  // Save the new note
  await writeTextFile(joinPath(dirPath, name), '');

  // Open the note, unless the caller is materializing a draft the editor is
  // already showing (opening would reset the editor and lose what was typed).
  if (open) {
    openNote(joinPath(dirPath, name));
  }
};

// Open a note
export async function openNote(path: string, skipHistory = false) {
  const fileContent = await readTextFile(path);
  setEditorContent(fileContent);
  activeFile.set(path);
  if (!skipHistory) {
    noteHistory.update((history) => {
      if (history.at(-1) !== path) {
        return [...history, path];
      }
      return history;
    });
  }
}

// Delete a note
export const deleteNote = async (path: string) => {
  switch (get(collectionSettings).notes.trash_dir) {
    case 'system': {
      await invoke('move_to_trash', { path });
      break;
    }
    case 'haptic': {
      await rename(path, joinPath(get(collection), '.haptic/trash', basename(path)));
      break;
    }
    case 'delete': {
      await remove(path);
      break;
    }
  }
  activeFile.set(null);
};

// Rename a note
export const renameNote = async (path: string, name: string) => {
  // Make sure file extension is included
  if (!name.endsWith('.md')) {
    name += '.md';
  }

  // Remove breaking characters
  name = name.replaceAll(/[/\\?%*:|"<>]/g, '');

  // Read the directory
  const files = await readDirTree(dirname(path), false);

  // Make sure there are no name conflicts
  if (
    files.some(
      (file) => file.name?.toLowerCase() === name.toLowerCase() && file.children === undefined
    )
  ) {
    throw new Error('Name conflict');
  }

  // Rename the file
  const destination = joinPath(dirname(path), name);
  await rename(path, destination);
  activeFile.set(destination);
};

// Read/write a note body by value, without going through the editor.
export const readNoteContent = (path: string): Promise<string> => readTextFile(path);

export const writeNoteContent = (path: string, content: string): Promise<void> =>
  writeTextFile(path, content);

export const saveNote = async (path: string) => {
  // Get note content
  let content = get(editor).storage.markdown.getMarkdown();

  // Remove the first heading title
  content = content.replace(/^# .*\n/, '');

  await writeNoteContent(path, content);
};

export const moveNote = async (source: string, target: string) => {
  // Get target directory
  const files = await readDirTree(target, false);

  // Make sure there are no name conflicts
  const noteName = basename(source);

  if (files.some((file) => file.name === noteName && file.children === undefined)) {
    throw new Error('Name conflict');
  }

  const destination = joinPath(target, noteName);
  await rename(source, destination);
  openNote(destination);
};

// Duplicate a note (format: "<name> (<number>).<ext>") - <number> is incremented if there are any existing notes with the same name
export const duplicateNote = async (path: string) => {
  // Fetch the content of the note
  const content = await readTextFile(path);

  // Extract the name and extension of the note
  const name = stem(path).replace(/\s\(\d+\)$/, '');
  const ext = extname(path);

  // Get current index of the note
  const files = await readDirTree(dirname(path), false);
  const notes = files.filter((file) => file.name?.startsWith(name) && file.children === undefined);

  // Write the new note
  const destination = joinPath(dirname(path), `${name} (${notes.length}).${ext}`);
  await writeTextFile(destination, content);

  // Open the new note
  openNote(destination);
};

export const getNoteMetadataParams = async (path: string): Promise<NoteMetadataParams> => {
  // General file metadata (v2 `stat` replaces the old fs-extra `metadata`)
  const fileStat = await stat(path);
  const fileMetadata = {
    modifiedAt: fileStat.mtime ?? new Date(0),
    createdAt: fileStat.birthtime ?? new Date(0),
    size: fileStat.size
  };

  // Get editor metadata
  const editorWordCount = get(editor).storage.characterCount.words();
  const editorCharacterCount = get(editor).storage.characterCount.characters();

  // Calculate average reading time (in seconds if < 1min and in minutes if >= 1min)
  const avgReadingTime = calculateReadingTime(editorWordCount);

  return {
    fileMetadata,
    editorMetadata: {
      words: editorWordCount,
      characters: editorCharacterCount,
      avgReadingTime
    }
  };
};
