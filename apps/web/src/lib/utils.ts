// Shared helpers live in @haptic/core; only web-specific (IndexedDB/DOM) helpers remain here.
export * from '@haptic/core/utils';
// Theme actions live behind @haptic/core's platform seam (registered in ./adapter).
export { setTheme, toggleTheme } from '@haptic/core/adapter';
export { setEditorContent } from '@haptic/editor/store';

import { collection } from '@haptic/core/store';
import { escapeRegExp } from '@haptic/core/utils';
import type { FileEntry, SearchResultParams } from '@haptic/core/types';
import { get } from 'svelte/store';
import { allEntries, type EntryRow } from './database/client';

export function buildFileTree(entries: EntryRow[], rootPath?: string): FileEntry[] {
  const entryMap = new Map<string, FileEntry>();

  // First pass: create FileEntry objects for all entries
  entries.forEach((entry) => {
    entryMap.set(entry.path, {
      path: entry.path,
      name: entry.name || undefined,
      children: entry.isFolder ? [] : undefined
    });
  });

  // Second pass: build the tree structure
  const rootEntries: FileEntry[] = [];
  entries.forEach((entry) => {
    const fileEntry = entryMap.get(entry.path)!;

    // If it's a root entry, add it to rootEntries
    if (entry.parentPath === get(collection) || entry.parentPath === rootPath) {
      rootEntries.push(fileEntry);
    } else {
      const parentEntry = entryMap.get(entry.parentPath);
      if (parentEntry && parentEntry.children) {
        parentEntry.children.push(fileEntry);
      }
    }
  });

  return rootEntries;
}

export async function searchEntries(
  collectionPath: string,
  query: string,
  caseSensitive = false,
  matchWord = false
): Promise<SearchResultParams[]> {
  // Was a SQL ILIKE over the entry table. `extractAllContexts` below already did
  // the real work in JS — the query only ever selected candidate rows, which at
  // browser scale (one person's own notes) is a plain filter.
  const rows = await allEntries(collectionPath);
  const searchResults: SearchResultParams[] = [];
  rows.forEach((row) => {
    if (row.isFolder || !row.content) {
      return;
    }
    const contexts = extractAllContexts(row.content, query, caseSensitive, matchWord);
    contexts.forEach((context) => {
      searchResults.push({
        path: row.path,
        context_preview: context
      });
    });
  });
  return searchResults;
}

function extractAllContexts(
  content: string,
  query: string,
  caseSensitive: boolean,
  matchWord: boolean
): string[] {
  const lines = content.split('\n');
  const contexts: string[] = [];
  lines.forEach((line, index) => {
    const compareLine = caseSensitive ? line : line.toLowerCase();
    const compareQuery = caseSensitive ? query : query.toLowerCase();
    if (matchWord) {
      // Escape the query: a whole-word search for "- [ ]" or "c++" would
      // otherwise build an invalid pattern and throw.
      const regex = new RegExp(
        `(^|\\s)${escapeRegExp(compareQuery)}($|\\s)`,
        caseSensitive ? '' : 'i'
      );
      if (regex.test(compareLine)) {
        const startLine = Math.max(0, index - 1);
        const endLine = Math.min(lines.length - 1, index + 1);
        contexts.push(lines.slice(startLine, endLine + 1).join('\n'));
      }
    } else if (compareLine.includes(compareQuery)) {
      const startLine = Math.max(0, index - 1);
      const endLine = Math.min(lines.length - 1, index + 1);
      contexts.push(lines.slice(startLine, endLine + 1).join('\n'));
    }
  });
  return contexts;
}
