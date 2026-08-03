import { get } from 'svelte/store';
import { basename, dirname, joinPath, parseScopedPath, sameScope, type StorageScope } from './path';
import { activeFile, appTheme, collection, draftFile, editorMode, standaloneFiles } from './store';
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
 * Storage seam. Implementations are registered **per scope** at boot via
 * `setStorageAdapter(scope, impl)`; shared components call the delegating free
 * functions below, which route on the scope carried by the path argument (see
 * ./path). One app can hold several adapters at once — desktop will own both
 * the local filesystem and the cloud store.
 *
 * Today: web and desktop each register a `local` adapter (IndexedDB and the
 * Tauri filesystem respectively). A cloud adapter will register alongside it
 * once account-backed sync is implemented.
 *
 * The method set mirrors the (historically identical) exported signatures of
 * the apps' `lib/api/{notes,collection,folders,settings}.ts` modules, plus the
 * content primitives below.
 */
export interface StorageAdapter {
  // content
  /**
   * Reads a note body by value.
   *
   * Note that `saveNote` writes whatever the shared TipTap editor is currently
   * showing, so it cannot express "write this string to that path". These two
   * are the only content primitives that work without the editor, and every
   * cross-scope transfer is built on them.
   */
  readNoteContent(path: string): Promise<string>;
  /** Writes a note body by value, without involving the editor. */
  writeNoteContent(path: string, content: string): Promise<void>;
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

const adapters = new Map<StorageScope, StorageAdapter>();

/**
 * Scope used for operations that carry no path — app settings, and the
 * collection list when nothing is open yet.
 */
let primaryScope: StorageScope = 'local';

export function setStorageAdapter(scope: StorageScope, impl: StorageAdapter) {
  adapters.set(scope, impl);
}

/** Which adapter handles path-less operations. Defaults to `local`. */
export function setPrimaryScope(scope: StorageScope) {
  primaryScope = scope;
}

export function hasStorageAdapter(scope: StorageScope): boolean {
  return adapters.has(scope);
}

/** Scopes with an adapter registered, in registration order. */
export function registeredScopes(): StorageScope[] {
  return [...adapters.keys()];
}

/** Test seam — drops all registrations. */
export function clearStorageAdapters() {
  adapters.clear();
  primaryScope = 'local';
}

function forScope(scope: StorageScope): StorageAdapter {
  const impl = adapters.get(scope);
  if (!impl) {
    throw new Error(
      `No StorageAdapter registered for scope '${scope}'. Call setStorageAdapter('${scope}', …) during app bootstrap.`
    );
  }
  return impl;
}

/** Resolves the adapter that owns a path. */
function required(path?: string): StorageAdapter {
  return forScope(path === undefined ? primaryScope : parseScopedPath(path).scope);
}

// Delegating free functions — same names components have always imported.
// Each routes on the scope of its path argument.
/**
 * Creating a note is already a deliberate act, so — unlike opening one — it
 * drops straight into edit mode. `editorMode` defaults to 'view' and nothing
 * else moved it, which left a freshly created note impossible to type into.
 *
 * Only when the note is actually opened: `open: false` is the draft/transfer
 * path, which must not disturb what the editor is currently showing.
 */
export const createNote: StorageAdapter['createNote'] = async (dirPath, name, open = true) => {
  const result = await required(dirPath).createNote(dirPath, name, open);
  if (open) {
    editorMode.set('edit');
  }
  return result;
};
export const openNote: StorageAdapter['openNote'] = (path, ...rest) => {
  // Navigating away abandons an unwritten draft.
  draftFile.set(null);
  // Every note opens read-only; editing is always re-entered deliberately.
  // Hooked here rather than on `activeFile` because renameNote repoints that
  // store too, and renaming shouldn't kick you out of the editor.
  editorMode.set('view');
  return required(path).openNote(path, ...rest);
};
export const deleteNote: StorageAdapter['deleteNote'] = (path) => required(path).deleteNote(path);
export const renameNote: StorageAdapter['renameNote'] = (path, name) =>
  required(path).renameNote(path, name);
export const readNoteContent: StorageAdapter['readNoteContent'] = (path) =>
  required(path).readNoteContent(path);
export const writeNoteContent: StorageAdapter['writeNoteContent'] = (path, content) =>
  required(path).writeNoteContent(path, content);
/**
 * Saving is the moment a draft becomes real: clicking a date in the daily
 * calendar shouldn't leave an empty file behind, so the note is only created
 * once there is something to write into it.
 */
export const saveNote: StorageAdapter['saveNote'] = async (path) => {
  const adapter = required(path);
  if (get(draftFile) === path) {
    await adapter.createNote(dirname(path), basename(path), false);
    draftFile.set(null);
  }
  return adapter.saveNote(path);
};
/**
 * Moves a note. When source and target sit in different scopes this is not a
 * single adapter's operation — it becomes a read-write-delete across two, which
 * is exactly the local -> cloud sync path.
 */
export const moveNote: StorageAdapter['moveNote'] = async (source, target) => {
  if (!sameScope(source, target)) {
    return transferNote(source, target, { removeSource: true });
  }
  return required(source).moveNote(source, target);
};
export const duplicateNote: StorageAdapter['duplicateNote'] = (path) =>
  required(path).duplicateNote(path);
export const getNoteMetadataParams: StorageAdapter['getNoteMetadataParams'] = (path) =>
  required(path).getNoteMetadataParams(path);
export const fetchCollectionEntries: StorageAdapter['fetchCollectionEntries'] = (
  dirPath,
  ...rest
) => required(dirPath).fetchCollectionEntries(dirPath, ...rest);
export const loadCollection: StorageAdapter['loadCollection'] = (path) =>
  required(path).loadCollection(path);
/** Aggregates across every registered scope — local and cloud collections list together. */
export const getCollections: StorageAdapter['getCollections'] = async () => {
  const lists = await Promise.all([...adapters.values()].map((impl) => impl.getCollections()));
  return lists.flat();
};
export const searchEntries: StorageAdapter['searchEntries'] = (collectionPath, ...rest) =>
  required(collectionPath).searchEntries(collectionPath, ...rest);
export const createFolder: StorageAdapter['createFolder'] = (dirPath) =>
  required(dirPath).createFolder(dirPath);
export const deleteFolder: StorageAdapter['deleteFolder'] = (path, ...rest) =>
  required(path).deleteFolder(path, ...rest);
export const renameFolder: StorageAdapter['renameFolder'] = (path, name) =>
  required(path).renameFolder(path, name);
export const moveFolder: StorageAdapter['moveFolder'] = (source, target) => {
  if (!sameScope(source, target)) {
    throw new Error(
      'Cross-scope folder moves are not supported yet — move or sync notes individually.'
    );
  }
  return required(source).moveFolder(source, target);
};
/**
 * Copies a note into a directory that may be owned by a different adapter, and
 * returns the new path.
 *
 * This is the one primitive behind every cross-space action: "sync to cloud"
 * (local -> cloud, keeping the source), "download" (cloud -> local, keeping the
 * source), and a cross-scope `moveNote` (removing it). No adapter can express
 * this alone, which is why `readNoteContent`/`writeNoteContent` exist.
 *
 * Deliberately a copy, never a link: per the sync model a synced local file
 * becomes a *new* cloud note, and the two are not tracked against each other
 * afterwards.
 */
export async function transferNote(
  source: string,
  targetDir: string,
  { removeSource = false }: { removeSource?: boolean } = {}
): Promise<string> {
  const from = required(source);
  const to = required(targetDir);
  const name = basename(source);

  const siblings = await to.fetchCollectionEntries(targetDir, 'name', true);
  if (siblings.some((entry) => entry.name === name && entry.children === undefined)) {
    throw new Error('Name conflict');
  }

  const content = await from.readNoteContent(source);
  const destination = joinPath(targetDir, name);
  // `open: false` — the editor keeps showing whatever it had; a transfer is a
  // background operation, unlike the interactive same-scope move.
  await to.createNote(targetDir, name, false);
  await to.writeNoteContent(destination, content);

  if (removeSource) {
    await from.deleteNote(source);
  }
  return destination;
}

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
  /** Begin the platform's account sign-in flow. */
  startSignIn?(): void | Promise<unknown>;
  /** Read the authenticated account for the current device session. */
  getAccount?(): Promise<Account | null>;
  /** End the authenticated account session for the current device. */
  signOut?(): void | Promise<unknown>;
  /** Create and open the platform's first cloud collection. */
  createCloudCollection?(): void | Promise<unknown>;
  /** Export the signed-in user's cloud collection as a local download. */
  downloadCloudNotes?(): void | Promise<unknown>;
  /** Export one cloud note as a local Markdown file. */
  downloadCloudNote?(path: string): void | Promise<unknown>;
  /** Reveal a file in the OS file manager (desktop only). */
  showInFolder?(path: string): void | Promise<unknown>;
  /**
   * Pick a single note from the OS file dialog and open it (desktop only).
   * Resolves to the chosen path, or null if the dialog was dismissed.
   */
  pickFile?(): Promise<string | null>;
  /**
   * Surface an error to the user in whatever way the platform can.
   *
   * Storage failures used to be swallowed: a denied filesystem scope or an
   * unreadable file left the app looking like the click did nothing, which is
   * indistinguishable from a broken feature.
   */
  reportError?(message: string): void;
}

/** The small, platform-independent identity shape shared settings can render. */
export interface Account {
  id: string;
  email?: string;
  name?: string;
  role?: string;
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

/** True when this platform has an account sign-in flow. */
export function canStartSignIn(): boolean {
  return Boolean(platformActions?.startSignIn);
}

/** Starts sign-in when the current platform supports it. */
export function startSignIn() {
  return platformActions?.startSignIn?.();
}

/** True when this platform can read its current account session. */
export function canGetAccount(): boolean {
  return Boolean(platformActions?.getAccount);
}

/** Reads the current account, or null where sessions are not supported yet. */
export function getAccount(): Promise<Account | null> {
  return platformActions?.getAccount?.() ?? Promise.resolve(null);
}

/** True when this platform can end its current account session. */
export function canSignOut(): boolean {
  return Boolean(platformActions?.signOut);
}

/** Ends the current account session when the platform supports it. */
export function signOut() {
  return platformActions?.signOut?.();
}

/** True when this platform can create a cloud collection. */
export function canCreateCloudCollection(): boolean {
  return Boolean(platformActions?.createCloudCollection);
}

/** Creates and opens a cloud collection when the platform supports it. */
export function createCloudCollection() {
  return platformActions?.createCloudCollection?.();
}

/** True when this platform can export cloud notes. */
export function canDownloadCloudNotes(): boolean {
  return Boolean(platformActions?.downloadCloudNotes);
}

/** Downloads the signed-in user's cloud notes when the platform supports it. */
export function downloadCloudNotes() {
  return platformActions?.downloadCloudNotes?.();
}

/** True when this platform can export an individual cloud note. */
export function canDownloadCloudNote(): boolean {
  return Boolean(platformActions?.downloadCloudNote);
}

/** Downloads one cloud note when the platform supports it. */
export function downloadCloudNote(path: string) {
  return platformActions?.downloadCloudNote?.(path);
}

export function showInFolder(path: string) {
  return platformActions?.showInFolder?.(path);
}

/** True when the platform can open a standalone file (desktop). */
export function canOpenFile(): boolean {
  return Boolean(platformActions?.pickFile);
}

/**
 * A note is "standalone" when it sits outside the open collection — or when
 * there is no collection at all. Those have no row in the tree, so they are
 * tracked separately for the sidebar to render.
 */
export function isStandalone(path: string): boolean {
  const root = get(collection);
  return !root || !path.startsWith(`${root}/`);
}

/**
 * Opens a single note from the OS file dialog, outside any collection.
 *
 * Storage needs no special case — the desktop adapter reads and writes absolute
 * paths and never consults `collection` — so this only has to remember the file
 * so the sidebar can list it.
 */
export async function openFile(): Promise<string | null> {
  try {
    const path = (await platformActions?.pickFile?.()) ?? null;
    if (!path) {
      return null;
    }
    trackStandaloneFile(path);
    await openNote(path);
    return path;
  } catch (error) {
    reportError(`Could not open that file.\n\n${error instanceof Error ? error.message : error}`);
    return null;
  }
}

/** Shows an error to the user; falls back to the console where the platform can't. */
export function reportError(message: string) {
  if (platformActions?.reportError) {
    platformActions.reportError(message);
  } else {
    console.error(message);
  }
}

/** Registers an externally opened file (dialog, OS "open with", drag-and-drop). */
export function trackStandaloneFile(path: string) {
  if (!isStandalone(path)) {
    return;
  }
  standaloneFiles.update((files) => (files.includes(path) ? files : [...files, path]));
}

/** Removes a file from the standalone list, clearing the editor if it was open. */
export function closeStandaloneFile(path: string) {
  standaloneFiles.update((files) => files.filter((file) => file !== path));
  if (get(activeFile) === path) {
    activeFile.set(null);
    draftFile.set(null);
  }
}
