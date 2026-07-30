import { get } from 'svelte/store';
import { appTheme, draftFile, editorMode } from './store';
import type {
  AppSettingsParams,
  AppTheme,
  CollectionParams,
  CollectionSettingsParams,
  FileEntry,
  NoteMetadataParams,
  SearchResultParams
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
  /**
   * Creates a note. `open` defaults to true; pass false to materialize a draft
   * the editor is already showing, so opening doesn't wipe unsaved input.
   */
  createNote(dirPath: string, name?: string, open?: boolean): Promise<unknown>;
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
  /**
   * Full-text search across a collection. Web runs SQL over the entry table,
   * desktop invokes the Rust `search_files` command; both return the same
   * path + surrounding-context shape.
   */
  searchEntries(
    collectionPath: string,
    query: string,
    caseSensitive?: boolean,
    matchWord?: boolean
  ): Promise<SearchResultParams[]>;
  // folders
  /** Resolves to the path of the folder that was created. */
  createFolder(dirPath: string): Promise<string>;
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
export const openNote: StorageAdapter['openNote'] = (...args) => {
  // Navigating away abandons an unwritten draft.
  draftFile.set(null);
  // Every note opens read-only; editing is always re-entered deliberately.
  // Hooked here rather than on `activeFile` because renameNote repoints that
  // store too, and renaming shouldn't kick you out of the editor.
  editorMode.set('view');
  return required().openNote(...args);
};
export const deleteNote: StorageAdapter['deleteNote'] = (...args) => required().deleteNote(...args);
export const renameNote: StorageAdapter['renameNote'] = (...args) => required().renameNote(...args);
/**
 * Saving is the moment a draft becomes real: clicking a date in the daily
 * calendar shouldn't leave an empty file behind, so the note is only created
 * once there is something to write into it.
 */
export const saveNote: StorageAdapter['saveNote'] = async (path) => {
  if (get(draftFile) === path) {
    const separator = path.lastIndexOf('/');
    await required().createNote(path.slice(0, separator), path.slice(separator + 1), false);
    draftFile.set(null);
  }
  return required().saveNote(path);
};
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
export const searchEntries: StorageAdapter['searchEntries'] = (...args) =>
  required().searchEntries(...args);
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

/**
 * Platform action seam (the "theme controller" pattern). Each app registers its
 * platform-specific side effects at boot alongside the StorageAdapter:
 *
 * - web: `applyTheme` forwards to mode-watcher's `setMode`, `openExternal`
 *   opens a new browser tab.
 * - desktop: theme application already happens via an `appTheme` subscription
 *   (Tauri theme plugin), `openExternal`/`showInFolder` use Tauri shell APIs.
 *
 * Shared components only call the free functions below; the `appTheme` store
 * in ./store stays the single source of truth for the current preference.
 */
export interface PlatformActions {
  /** Apply a theme preference to the platform (e.g. mode-watcher, Tauri). */
  applyTheme?(theme: AppTheme): void;
  /** Open a URL in the user's browser. */
  openExternal(url: string): void | Promise<unknown>;
  /** Reveal a file in the OS file manager (desktop only). */
  showInFolder?(path: string): void | Promise<unknown>;
}

let platformActions: PlatformActions | null = null;

export function setPlatformActions(impl: PlatformActions) {
  platformActions = impl;
}

/** Sets the theme preference and applies it to the platform. */
export function setTheme(theme: AppTheme) {
  appTheme.set(theme);
  platformActions?.applyTheme?.(theme);
}

/** Cycles auto -> light -> dark -> auto. */
export function toggleTheme() {
  const themes: AppTheme[] = ['auto', 'light', 'dark'];
  const next = themes[(themes.indexOf(get(appTheme)) + 1) % themes.length];
  setTheme(next);
}

export function openExternal(url: string) {
  if (platformActions) {
    return platformActions.openExternal(url);
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function showInFolder(path: string) {
  return platformActions?.showInFolder?.(path);
}
