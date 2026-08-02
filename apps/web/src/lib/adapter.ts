import { setPlatformActions, setStorageAdapter } from '@haptic/core/adapter';
import { appTheme } from '@haptic/core/store';
import { setMode, userPrefersMode } from 'mode-watcher';
import * as collection from './api/collection';
import * as folders from './api/folders';
import * as notes from './api/notes';
import * as settings from './api/settings';
import { searchEntries } from './utils';

function apiOrigin() {
  return import.meta.env.DEV
    ? `${window.location.protocol}//${window.location.hostname}:8787`
    : window.location.origin;
}

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
  },
  startSignIn: () => {
    const signInUrl = new URL('/api/auth/sign-in', apiOrigin());
    signInUrl.searchParams.set('returnTo', window.location.href);
    window.location.assign(signInUrl);
  },
  getAccount: async () => {
    const response = await fetch(new URL('/api/auth/session', apiOrigin()), {
      credentials: 'include'
    });
    if (response.status === 401) {
      return null;
    }
    if (!response.ok) {
      throw new Error('Could not read the Haptic account session.');
    }
    const { user } = (await response.json()) as {
      user: { id: string; email?: string; name?: string; role?: string };
    };
    return user;
  },
  signOut: async () => {
    const response = await fetch(new URL('/api/auth/sign-out', apiOrigin()), {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Could not sign out of Haptic.');
    }
  }
});

// Initialize the shared store from mode-watcher's persisted preference.
const persisted = userPrefersMode.current;
appTheme.set(persisted === 'system' ? 'auto' : persisted);
