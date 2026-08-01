import { setPlatformActions, setStorageAdapter } from '@haptic/core/adapter';
import { appTheme } from '@haptic/core/store';
import { setMode, userPrefersMode } from 'mode-watcher';
import * as collection from './api/collection';
import * as folders from './api/folders';
import * as notes from './api/notes';
import * as settings from './api/settings';
import { searchEntries } from './utils';

/**
 * Registers the web (PGlite/drizzle) implementations behind @haptic/core's
 * StorageAdapter seam, under the `local` scope. Imported for its side effect
 * from the root layout. The cloud adapter registers alongside it later.
 */
setStorageAdapter('local', {
  ...notes,
  ...collection,
  ...folders,
  ...settings,
  searchEntries
});

/**
 * Platform actions: theme changes forward to mode-watcher (which persists the
 * preference and toggles the root class); external links open in a new tab.
 * `appTheme` mirrors mode-watcher's persisted preference so shared components
 * have a single store to read ('auto' <-> 'system').
 */
setPlatformActions({
  applyTheme: (theme) => {
    setMode(theme === 'auto' ? 'system' : theme);
  },
  openExternal: (url) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
});

// Initialize the shared store from mode-watcher's persisted preference.
const persisted = userPrefersMode.current;
appTheme.set(persisted === 'system' ? 'auto' : persisted);
