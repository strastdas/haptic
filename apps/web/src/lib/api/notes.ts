import {
  allEntries,
  childEntries,
  deleteEntry,
  getEntry,
  putEntry,
  repathEntry,
  type EntryRow
} from '@/database/client';
import { activeFile, collection, editor, noteHistory } from '@/store';
import type { NoteMetadataParams } from '@/types';
import { calculateReadingTime, getNextUntitledName, setEditorContent } from '@/utils';
import { basename, dirname, extname, joinPath, stem } from '@haptic/core/path';
import { get } from 'svelte/store';

/**
 * Siblings used for name-conflict and Untitled-numbering checks. A path that
 * isn't itself a stored folder (the collection root) has no `parentPath` rows,
 * so fall back to the whole collection — mirrors the previous SQL.
 */
async function siblingsOf(dirPath: string): Promise<EntryRow[]> {
  const dir = await getEntry(dirPath);
  return dir ? childEntries(dirPath) : allEntries(get(collection));
}

function newRow(path: string, name: string, parentPath: string, content = ''): EntryRow {
  const now = new Date();
  return {
    path,
    name,
    parentPath,
    collectionPath: get(collection),
    content,
    isFolder: false,
    size: new TextEncoder().encode(content).length,
    createdAt: now,
    updatedAt: now
  };
}

// Create a new note
export const createNote = async (dirPath: string, name?: string, open = true) => {
  const files = await siblingsOf(dirPath);

  // Generate a new name (Untitled.md, if there are any existing Untitled notes, increment the number by 1)
  if (!name) {
    name = getNextUntitledName(files, 'Untitled', '.md');
  }

  const path = joinPath(dirPath, name);
  await putEntry(newRow(path, name, dirPath));

  // Open the note, unless the caller is materializing a draft the editor is
  // already showing (opening would reset the editor and lose what was typed).
  if (open) {
    openNote(path);
  }
};

// Open a note
export async function openNote(path: string, skipHistory = false) {
  const entry = await getEntry(path);
  setEditorContent(entry?.content ?? '');
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
  await deleteEntry(path);
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

  const row = await getEntry(path);
  if (!row) {
    return;
  }

  // Make sure there are no name conflicts
  const siblings = await childEntries(row.parentPath);
  if (siblings.some((file) => file.name?.toLowerCase() === name.toLowerCase() && !file.isFolder)) {
    throw new Error('Name conflict');
  }

  const destination = joinPath(dirname(path), name);
  await repathEntry(path, { ...row, path: destination, name, updatedAt: new Date() });
  activeFile.set(destination);
};

// Read/write a note body by value, without going through the editor.
export const readNoteContent = async (path: string): Promise<string> => {
  return (await getEntry(path))?.content ?? '';
};

export const writeNoteContent = async (path: string, content: string): Promise<void> => {
  const row = await getEntry(path);
  if (!row) {
    return;
  }
  await putEntry({
    ...row,
    content,
    size: new TextEncoder().encode(content).length,
    updatedAt: new Date()
  });
};

// Save active note
export const saveNote = async (path: string) => {
  // Get note content
  let content = get(editor).storage.markdown.getMarkdown();

  // Remove the first heading title
  content = content.replace(/^# .*\n/, '');

  await writeNoteContent(path, content);
};

export const moveNote = async (source: string, target: string) => {
  const row = await getEntry(source);
  if (!row) {
    return;
  }

  // Make sure there are no name conflicts
  const noteName = basename(source);
  const targetFiles = await childEntries(target);
  if (targetFiles.some((file) => file.name === noteName && !file.isFolder)) {
    throw new Error('Name conflict');
  }

  const destination = joinPath(target, noteName);
  await repathEntry(source, { ...row, path: destination, parentPath: target });

  // Open the note
  openNote(destination);
};

// Duplicate a note (format: "<name> (<number>).<ext>") - <number> is incremented if there are any existing notes with the same name
export const duplicateNote = async (path: string) => {
  const row = await getEntry(path);
  if (!row) {
    return;
  }

  const ext = extname(path);

  // Get current index of the note
  const files = await childEntries(row.parentPath);
  const notes = files.filter((file) => file.name?.startsWith(row.name!) && !file.isFolder);

  // Write the new note
  const newName = `${stem(path)} (${notes.length}).${ext}`;
  const destination = joinPath(dirname(path), newName);
  await putEntry({
    ...newRow(destination, newName, row.parentPath, row.content ?? ''),
    collectionPath: row.collectionPath
  });

  // Open the new note
  openNote(destination);
};

export const getNoteMetadataParams = async (path: string): Promise<NoteMetadataParams> => {
  const row = await getEntry(path);

  // Get editor metadata
  const editorWordCount = get(editor).storage.characterCount.words();
  const editorCharacterCount = get(editor).storage.characterCount.characters();

  // Calculate average reading time (in seconds if < 1min and in minutes if >= 1min)
  const avgReadingTime = calculateReadingTime(editorWordCount);

  return {
    fileMetadata: {
      createdAt: row?.createdAt ?? new Date(0),
      modifiedAt: row?.updatedAt ?? new Date(0),
      size: row?.size ?? 0
    },
    editorMetadata: {
      words: editorWordCount,
      characters: editorCharacterCount,
      avgReadingTime
    }
  };
};
