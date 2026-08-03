import { activeFile, collection, collectionEntries, editor, noteHistory } from '@/store';
import { calculateReadingTime, getNextUntitledName, setEditorContent } from '@/utils';
import {
  basename,
  dirname,
  extname,
  joinPath,
  parseScopedPath,
  stem,
  withScope
} from '@haptic/core/path';
import type {
  CollectionParams,
  FileEntry,
  NoteMetadataParams,
  SearchResultParams
} from '@haptic/core/types';
import { get } from 'svelte/store';

interface CloudCollection {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface CloudFolder {
  id: string;
  path: string;
  createdAt: string;
  updatedAt: string;
}

interface CloudNote {
  id: string;
  path: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

interface CloudEntry {
  id: string;
  path: string;
  content?: string;
  createdAt: string;
  updatedAt: string;
  isFolder: boolean;
}

function apiOrigin() {
  return import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:8787`
    : window.location.origin;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) {
    headers.set('content-type', 'application/json');
  }
  const response = await fetch(new URL(path, apiOrigin()), {
    ...init,
    credentials: 'include',
    headers
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? `Haptic Sync request failed (${response.status}).`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

function cloudPath(collectionId: string, relativePath = ''): string {
  return withScope('cloud', joinPath(`/${collectionId}`, relativePath));
}

function location(path: string): { collectionId: string; relativePath: string } {
  const parsed = parseScopedPath(path);
  if (parsed.scope !== 'cloud') {
    throw new Error('Expected a cloud path.');
  }
  const [collectionId, ...segments] = parsed.path.split('/').filter(Boolean);
  if (!collectionId) {
    throw new Error('Cloud collection path is invalid.');
  }
  return { collectionId, relativePath: segments.join('/') };
}

function entryName(path: string): string {
  return path.split('/').at(-1) ?? path;
}

async function entries(collectionId: string): Promise<CloudEntry[]> {
  const [notesResponse, foldersResponse] = await Promise.all([
    request<{ notes: CloudNote[] }>(`/api/sync/collections/${collectionId}/notes`),
    request<{ folders: CloudFolder[] }>(`/api/sync/collections/${collectionId}/folders`)
  ]);
  return [
    ...foldersResponse.folders.map((folder) => ({ ...folder, isFolder: true })),
    ...notesResponse.notes.map((note) => ({ ...note, isFolder: false }))
  ];
}

async function entry(path: string): Promise<CloudEntry | undefined> {
  const { collectionId, relativePath } = location(path);
  const all = await entries(collectionId);
  return all.find((candidate) => candidate.path === relativePath);
}

function directEntries(all: CloudEntry[], relativePath: string): CloudEntry[] {
  return all.filter((candidate) => dirname(candidate.path) === relativePath);
}

function sortEntries(items: FileEntry[]): FileEntry[] {
  return items.toSorted((a, b) => {
    const aFolder = a.children !== undefined;
    const bFolder = b.children !== undefined;
    if (aFolder !== bFolder) {
      return aFolder ? -1 : 1;
    }
    return (a.name ?? '').localeCompare(b.name ?? '', undefined, { numeric: true });
  });
}

function makeTree(collectionId: string, all: CloudEntry[], relativePath: string): FileEntry[] {
  const direct = directEntries(all, relativePath);
  return sortEntries(
    direct.map((candidate) => ({
      name: entryName(candidate.path),
      path: cloudPath(collectionId, candidate.path),
      ...(candidate.isFolder ? { children: makeTree(collectionId, all, candidate.path) } : {})
    }))
  );
}

function assertNoConflict(items: CloudEntry[], path: string, selfId?: string) {
  if (
    items.some(
      (candidate) => candidate.id !== selfId && candidate.path.toLowerCase() === path.toLowerCase()
    )
  ) {
    throw new Error('Name conflict');
  }
}

export async function getCollections(): Promise<CollectionParams[]> {
  try {
    const { collections } = await request<{ collections: CloudCollection[] }>(
      '/api/sync/collections'
    );
    return collections.map((item) => ({
      lastOpened: new Date(item.updatedAt),
      name: item.name,
      path: cloudPath(item.id)
    }));
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return [];
    }
    throw error;
  }
}

export async function createCloudCollection(name = 'Haptic Sync'): Promise<string> {
  const collections = await getCollections();
  const existing = collections.find((item) => item.name === name);
  if (existing) {
    return existing.path;
  }
  const { collection: created } = await request<{ collection: CloudCollection }>(
    '/api/sync/collections',
    {
      body: JSON.stringify({ name }),
      method: 'POST'
    }
  );
  return cloudPath(created.id);
}

export async function loadCollection(path?: string): Promise<void> {
  if (!path) {
    return;
  }
  const { collectionId } = location(path);
  await request<{ collection: CloudCollection }>(`/api/sync/collections/${collectionId}`);
  collection.set(cloudPath(collectionId));
  noteHistory.set([]);
  activeFile.set(null);
}

export async function fetchCollectionEntries(
  dirPath?: string,
  _sort: 'name' | 'date' = 'name',
  showDotfiles = false
): Promise<FileEntry[]> {
  const target = dirPath ?? get(collection);
  if (!target) {
    throw new Error('No directory path provided');
  }
  const { collectionId, relativePath } = location(target);
  const tree = makeTree(collectionId, await entries(collectionId), relativePath);
  const visible = showDotfiles
    ? tree
    : tree.filter((candidate) => !candidate.name?.startsWith('.'));
  return visible;
}

async function refreshCurrentCollection(collectionId: string): Promise<void> {
  const current = get(collection);
  if (
    !current ||
    parseScopedPath(current).scope !== 'cloud' ||
    location(current).collectionId !== collectionId
  ) {
    return;
  }
  collectionEntries.set(await fetchCollectionEntries(current));
}

async function ensureFolders(
  collectionId: string,
  relativePath: string,
  all: CloudEntry[]
): Promise<void> {
  let folderPath = '';
  const existingFolders = new Set(
    all.filter((candidate) => candidate.isFolder).map((candidate) => candidate.path)
  );
  const missing: string[] = [];
  for (const segment of relativePath.split('/').filter(Boolean)) {
    folderPath = joinPath(folderPath, segment);
    if (!existingFolders.has(folderPath)) {
      missing.push(folderPath);
    }
  }
  await Promise.all(
    missing.map(
      async (path) =>
        await request(`/api/sync/collections/${collectionId}/folders`, {
          body: JSON.stringify({ path }),
          method: 'POST'
        })
    )
  );
  const timestamp = new Date().toISOString();
  all.push(
    ...missing.map((path) => ({
      createdAt: timestamp,
      id: path,
      isFolder: true,
      path,
      updatedAt: timestamp
    }))
  );
}

export async function createNote(dirPath: string, name?: string, open = true): Promise<void> {
  const { collectionId, relativePath } = location(dirPath);
  const all = await entries(collectionId);
  const noteName =
    name ??
    getNextUntitledName(
      directEntries(all, relativePath).map((item) => ({ name: entryName(item.path) })),
      'Untitled',
      '.md'
    );
  const path = [relativePath, noteName].filter(Boolean).join('/');
  assertNoConflict(all, path);
  await ensureFolders(collectionId, relativePath, all);
  await request(`/api/sync/collections/${collectionId}/notes`, {
    body: JSON.stringify({ content: '', path }),
    method: 'POST'
  });
  await refreshCurrentCollection(collectionId);
  if (open) {
    const createdPath = cloudPath(collectionId, path);
    const created = await entry(createdPath);
    setEditorContent(created?.content ?? '');
    activeFile.set(createdPath);
    noteHistory.update((history) =>
      history.at(-1) === createdPath ? history : [...history, createdPath]
    );
  }
}

export async function openNote(path: string, skipHistory = false): Promise<void> {
  const found = await entry(path);
  setEditorContent(found?.content ?? '');
  activeFile.set(path);
  if (!skipHistory) {
    noteHistory.update((history) => (history.at(-1) === path ? history : [...history, path]));
  }
}

export async function readNoteContent(path: string): Promise<string> {
  const found = await entry(path);
  return found?.content ?? '';
}

export async function writeNoteContent(path: string, content: string): Promise<void> {
  const found = await entry(path);
  if (!found || found.isFolder) {
    throw new Error('Cloud note not found.');
  }
  const { collectionId, relativePath } = location(path);
  await request(`/api/sync/collections/${collectionId}/notes/${found.id}`, {
    body: JSON.stringify({ content, path: relativePath }),
    method: 'PUT'
  });
}

export async function saveNote(path: string): Promise<void> {
  let content = get(editor).storage.markdown.getMarkdown();
  content = content.replace(/^# .*\n/, '');
  await writeNoteContent(path, content);
}

export async function deleteNote(path: string): Promise<void> {
  const found = await entry(path);
  if (!found || found.isFolder) {
    return;
  }
  const { collectionId } = location(path);
  await request(`/api/sync/collections/${collectionId}/notes/${found.id}`, { method: 'DELETE' });
  await refreshCurrentCollection(collectionId);
  activeFile.set(null);
}

export async function renameNote(path: string, name: string): Promise<void> {
  const found = await entry(path);
  if (!found || found.isFolder) {
    return;
  }
  const safeName = (name.endsWith('.md') ? name : `${name}.md`).replaceAll(/[/\\?%*:|"<>]/g, '');
  const { collectionId, relativePath } = location(path);
  const all = await entries(collectionId);
  const destination = joinPath(dirname(relativePath), safeName);
  assertNoConflict(all, destination, found.id);
  await request(`/api/sync/collections/${collectionId}/notes/${found.id}`, {
    body: JSON.stringify({ content: found.content ?? '', path: destination }),
    method: 'PUT'
  });
  await refreshCurrentCollection(collectionId);
  activeFile.set(cloudPath(collectionId, destination));
}

export async function moveNote(source: string, target: string): Promise<void> {
  const found = await entry(source);
  if (!found || found.isFolder) {
    return;
  }
  const { collectionId, relativePath } = location(source);
  const targetLocation = location(target);
  if (targetLocation.collectionId !== collectionId) {
    throw new Error('Cloud note must stay in its collection.');
  }
  const destination = joinPath(targetLocation.relativePath, basename(relativePath));
  assertNoConflict(await entries(collectionId), destination, found.id);
  await request(`/api/sync/collections/${collectionId}/notes/${found.id}`, {
    body: JSON.stringify({ content: found.content ?? '', path: destination }),
    method: 'PUT'
  });
  await refreshCurrentCollection(collectionId);
  await openNote(cloudPath(collectionId, destination));
}

export async function duplicateNote(path: string): Promise<void> {
  const found = await entry(path);
  if (!found || found.isFolder) {
    return;
  }
  const { collectionId, relativePath } = location(path);
  const siblings = directEntries(await entries(collectionId), dirname(relativePath));
  const name = `${stem(relativePath)} (${siblings.filter((item) => !item.isFolder && entryName(item.path).startsWith(entryName(relativePath))).length}).${extname(relativePath)}`;
  const destination = joinPath(dirname(relativePath), name);
  await request(`/api/sync/collections/${collectionId}/notes`, {
    body: JSON.stringify({ content: found.content ?? '', path: destination }),
    method: 'POST'
  });
  await refreshCurrentCollection(collectionId);
  await openNote(cloudPath(collectionId, destination));
}

export async function createFolder(dirPath: string): Promise<string> {
  const { collectionId, relativePath } = location(dirPath);
  const all = await entries(collectionId);
  const name = getNextUntitledName(
    directEntries(all, relativePath).map((item) => ({ name: entryName(item.path) })),
    'Untitled'
  );
  const path = joinPath(relativePath, name);
  assertNoConflict(all, path);
  await request(`/api/sync/collections/${collectionId}/folders`, {
    body: JSON.stringify({ path }),
    method: 'POST'
  });
  await refreshCurrentCollection(collectionId);
  return cloudPath(collectionId, path);
}

export async function deleteFolder(path: string, recursive = false): Promise<void> {
  const found = await entry(path);
  if (!found || !found.isFolder) {
    return;
  }
  const { collectionId } = location(path);
  await request(
    `/api/sync/collections/${collectionId}/folders/${found.id}?recursive=${recursive}`,
    {
      method: 'DELETE'
    }
  );
  await refreshCurrentCollection(collectionId);
}

async function updateFolder(path: string, destination: string): Promise<void> {
  const found = await entry(path);
  if (!found || !found.isFolder) {
    return;
  }
  const { collectionId } = location(path);
  assertNoConflict(await entries(collectionId), destination, found.id);
  await request(`/api/sync/collections/${collectionId}/folders/${found.id}`, {
    body: JSON.stringify({ path: destination }),
    method: 'PUT'
  });
  await refreshCurrentCollection(collectionId);
}

export async function renameFolder(path: string, name: string): Promise<void> {
  const { collectionId, relativePath } = location(path);
  await updateFolder(path, joinPath(dirname(relativePath), name));
  if (get(activeFile)?.startsWith(`${path}/`)) {
    activeFile.set(cloudPath(collectionId, joinPath(dirname(relativePath), name)));
  }
}

export async function moveFolder(source: string, target: string): Promise<void> {
  const sourceLocation = location(source);
  const targetLocation = location(target);
  if (sourceLocation.collectionId !== targetLocation.collectionId) {
    throw new Error('Cloud folder must stay in its collection.');
  }
  await updateFolder(
    source,
    joinPath(targetLocation.relativePath, basename(sourceLocation.relativePath))
  );
}

export async function getNoteMetadataParams(path: string): Promise<NoteMetadataParams> {
  const found = await entry(path);
  const content = found?.content ?? '';
  const words = get(editor).storage.characterCount.words();
  const characters = get(editor).storage.characterCount.characters();
  return {
    editorMetadata: { avgReadingTime: calculateReadingTime(words), characters, words },
    fileMetadata: {
      createdAt: new Date(found?.createdAt ?? 0),
      modifiedAt: new Date(found?.updatedAt ?? 0),
      size: new TextEncoder().encode(content).length
    }
  };
}

export async function searchEntries(
  collectionPath: string,
  query: string,
  caseSensitive = false,
  matchWord = false
): Promise<SearchResultParams[]> {
  const { collectionId } = location(collectionPath);
  const compare = caseSensitive ? query : query.toLowerCase();
  const all = await entries(collectionId);
  return all.flatMap((candidate) => {
    if (candidate.isFolder || !candidate.content) {
      return [];
    }
    const body = caseSensitive ? candidate.content : candidate.content.toLowerCase();
    const hit = matchWord
      ? new RegExp(`(^|\\s)${compare.replaceAll(/[.*+?^${}()|[\\]\\]/g, '\\$&')}($|\\s)`).test(body)
      : body.includes(compare);
    return hit
      ? [{ context_preview: candidate.content, path: cloudPath(collectionId, candidate.path) }]
      : [];
  });
}
