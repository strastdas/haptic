import type {
  AppSettingsParams,
  CollectionParams,
  CollectionSettingsParams,
  FileEntry,
  NoteMetadataParams
} from './types';

/**
 * Platform storage seam. The web app implements this against PGlite/drizzle,
 * the desktop app against the Tauri filesystem. Each app registers its
 * implementation at boot via `setStorageAdapter()`; shared components call the
 * delegating free functions below so they stay platform-agnostic.
 *
 * The method set mirrors the (historically identical) exported signatures of
 * the apps' `lib/api/{notes,collection,folders,settings}.ts` modules.
 */
export interface StorageAdapter {
  // notes
  createNote(dirPath: string, name?: string): Promise<unknown>;
  openNote(path: string, skipHistory?: boolean): Promise<unknown>;
  deleteNote(path: string): Promise<unknown>;
  renameNote(path: string, name: string): Promise<unknown>;
  saveNote(path: string): Promise<unknown>;
  moveNote(source: string, target: string): Promise<unknown>;
  duplicateNote(path: string): Promise<unknown>;
  getNoteMetadataParams(path: string): Promise<NoteMetadataParams>;
  // collection
  fetchCollectionEntries(
    dirPath?: string,
    sort?: 'name' | 'date',
    showDotfiles?: boolean
  ): Promise<FileEntry[]>;
  loadCollection(path?: string): Promise<unknown>;
  getCollections(): Promise<CollectionParams[]>;
  // folders
  createFolder(dirPath: string): Promise<unknown>;
  deleteFolder(path: string, recursive?: boolean): Promise<unknown>;
  renameFolder(path: string, name: string): Promise<unknown>;
  moveFolder(source: string, target: string): Promise<unknown>;
  // settings
  loadSettings(loadApp: boolean, loadCollection: boolean): Promise<unknown>;
  setSettings(
    settingsType: 'app' | 'collection',
    value?: AppSettingsParams | CollectionSettingsParams
  ): Promise<unknown>;
}

let adapter: StorageAdapter | null = null;

export function setStorageAdapter(impl: StorageAdapter) {
  adapter = impl;
}

function required(): StorageAdapter {
  if (!adapter) {
    throw new Error('No StorageAdapter registered. Call setStorageAdapter() during app bootstrap.');
  }
  return adapter;
}

// Delegating free functions — same names components have always imported.
export const createNote: StorageAdapter['createNote'] = (...args) => required().createNote(...args);
export const openNote: StorageAdapter['openNote'] = (...args) => required().openNote(...args);
export const deleteNote: StorageAdapter['deleteNote'] = (...args) => required().deleteNote(...args);
export const renameNote: StorageAdapter['renameNote'] = (...args) => required().renameNote(...args);
export const saveNote: StorageAdapter['saveNote'] = (...args) => required().saveNote(...args);
export const moveNote: StorageAdapter['moveNote'] = (...args) => required().moveNote(...args);
export const duplicateNote: StorageAdapter['duplicateNote'] = (...args) =>
  required().duplicateNote(...args);
export const getNoteMetadataParams: StorageAdapter['getNoteMetadataParams'] = (...args) =>
  required().getNoteMetadataParams(...args);
export const fetchCollectionEntries: StorageAdapter['fetchCollectionEntries'] = (...args) =>
  required().fetchCollectionEntries(...args);
export const loadCollection: StorageAdapter['loadCollection'] = (...args) =>
  required().loadCollection(...args);
export const getCollections: StorageAdapter['getCollections'] = (...args) =>
  required().getCollections(...args);
export const createFolder: StorageAdapter['createFolder'] = (...args) =>
  required().createFolder(...args);
export const deleteFolder: StorageAdapter['deleteFolder'] = (...args) =>
  required().deleteFolder(...args);
export const renameFolder: StorageAdapter['renameFolder'] = (...args) =>
  required().renameFolder(...args);
export const moveFolder: StorageAdapter['moveFolder'] = (...args) => required().moveFolder(...args);
export const loadSettings: StorageAdapter['loadSettings'] = (...args) =>
  required().loadSettings(...args);
export const setSettings: StorageAdapter['setSettings'] = (...args) =>
  required().setSettings(...args);
