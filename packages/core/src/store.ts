import { writable } from 'svelte/store';
import { BASE_APP_SETTINGS, BASE_COLLECTION_SETTINGS } from './constants';
import type {
  AppSettingsParams,
  CollectionSettingsParams,
  FileEntry,
  Platform,
  SettingsStateParams
} from './types';

const activeFile = writable<string | null>(null);
const noteHistory = writable<string[]>([]);
const editorMode = writable<'edit' | 'view'>('edit');
const editorSearchValue = writable<string>('');
const editorSearchActive = writable<boolean>(false);

const collection = writable<string>();
// File-tree cache; kept fresh by the web adapter's live query. Unused on desktop
// (which re-reads the filesystem), but shared so components can converge on it.
const collectionEntries = writable<FileEntry[]>([]);

const tooltipsOpen = writable<number>(0);

const collectionSearchActive = writable<boolean>(false);
const isPageSidebarOpen = writable<boolean>(true);
const pageSidebarWidth = writable<number>(210);
const resizingPageSidebar = writable<boolean>(false);
const isNoteDetailSidebarOpen = writable<boolean>(false);
const noteDetailSidebarWidth = writable<number>(210);
const resizingNoteDetailSidebar = writable<boolean>(false);
export const settingsStore = writable<SettingsStateParams>({
  isOpen: false,
  activePage: 'general'
});

const appSettings = writable<AppSettingsParams>(BASE_APP_SETTINGS);
const collectionSettings = writable<CollectionSettingsParams>(BASE_COLLECTION_SETTINGS);

// Platform stores. `platform` defaults to darwin (web's historical behavior:
// mac-style shortcut glyphs); the desktop app sets the real value at boot.
const platform = writable<Platform>('darwin');
const appTheme = writable<'auto' | 'light' | 'dark'>('auto');

// True when running inside the Tauri desktop shell. The desktop app sets this
// at boot (lib/adapter.ts); web leaves it false. Shared components branch on
// this for genuinely web-vs-desktop differences (`platform` only answers
// which OS, and web keeps its historical 'darwin' default).
const isDesktopApp = writable<boolean>(false);

export {
  activeFile,
  appSettings,
  appTheme,
  collection,
  collectionEntries,
  collectionSearchActive,
  collectionSettings,
  editorMode,
  editorSearchActive,
  editorSearchValue,
  isDesktopApp,
  isNoteDetailSidebarOpen,
  isPageSidebarOpen,
  noteDetailSidebarWidth,
  noteHistory,
  pageSidebarWidth,
  platform,
  resizingNoteDetailSidebar,
  resizingPageSidebar,
  tooltipsOpen
};
