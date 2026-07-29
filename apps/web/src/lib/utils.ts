// Shared helpers live in @haptic/core; only web-specific (PGlite/DOM) helpers remain here.
export * from '@haptic/core/utils';
// Theme actions live behind @haptic/core's platform seam (registered in ./adapter).
export { setTheme, toggleTheme } from '@haptic/core/adapter';
export { setEditorContent } from '@haptic/editor/store';

import { collection } from '@haptic/core/store';
import type { FileEntry, SearchResultParams } from '@haptic/core/types';
import type { entry as entryTable } from '@/database/schema';
import { get } from 'svelte/store';
import { pgClient } from './database/client';

export function buildFileTree(
  entries: (typeof entryTable.$inferSelect)[],
  rootPath?: string
): FileEntry[] {
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
  // The query is passed as a bound parameter, so no manual quote-escaping:
  // doubling quotes here would make apostrophe searches silently match nothing.
  const likeOperator = caseSensitive ? 'LIKE' : 'ILIKE';
  const wordBoundary = matchWord ? ' ' : '';
  const searchPattern = `%${wordBoundary}${query}${wordBoundary}%`;
  const sqlQuery = `
    WITH matched_entries AS (
      SELECT path, content
      FROM entry
      WHERE collection_path = $1
        AND content ${likeOperator} $2
    )
    SELECT path, content
    FROM matched_entries
  `;
  const results = await pgClient.query<{ path: string; content: string }>(sqlQuery, [
    collectionPath,
    searchPattern
  ]);
  const searchResults: SearchResultParams[] = [];
  results.rows.forEach((row) => {
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
      const regex = new RegExp(`(^|\\s)${compareQuery}($|\\s)`, caseSensitive ? '' : 'i');
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
