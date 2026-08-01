import { setPlatformActions, setStorageAdapter } from '@haptic/core/adapter';
import { isDesktopApp } from '@haptic/core/store';
import { openUrl } from '@tauri-apps/plugin-opener';
import * as collection from './api/collection';
import * as folders from './api/folders';
import * as notes from './api/notes';
import * as settings from './api/settings';
import { pickFile, reportError, searchEntries, showInFolder } from './utils';

/**
 * Registers the desktop (Tauri filesystem) implementations behind
 * @haptic/core's StorageAdapter seam, under the `local` scope. Imported for its
 * side effect from the root layout. The cloud adapter registers alongside it
 * later — desktop is the app that holds both at once.
 */
setStorageAdapter('local', {
  ...notes,
  ...collection,
  ...folders,
  ...settings,
  searchEntries
});

// Mark this runtime as the Tauri desktop shell for shared components.
isDesktopApp.set(true);

/**
 * Platform actions: external links open via the Tauri shell; theme application
 * needs no callback here because the root layout subscribes to `appTheme` and
 * forwards changes to the Tauri theme plugin.
 */
setPlatformActions({
  openExternal: (url) => openUrl(url),
  showInFolder,
  pickFile,
  reportError
});
