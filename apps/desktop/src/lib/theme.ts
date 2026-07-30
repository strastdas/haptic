import { appSettings, appTheme } from '@haptic/core/store';
import type { AppTheme } from '@haptic/core/types';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { get } from 'svelte/store';
import { setSettings } from './api/settings';
import { updateWindowTheme } from './utils';

const systemPrefersDark = () => globalThis.matchMedia('(prefers-color-scheme: dark)');

/** 'auto' resolves against the OS; the other two are explicit. */
function resolve(theme: AppTheme): 'light' | 'dark' {
  if (theme === 'auto') {
    return systemPrefersDark().matches ? 'dark' : 'light';
  }
  return theme;
}

/**
 * Applies a theme preference to the desktop shell.
 *
 * The palette is driven by the `.dark` class on <html>, exactly like the web
 * app — desktop used to switch on `@media (prefers-color-scheme: dark)`
 * instead, which ignored the user's own preference entirely and left every
 * `dark:` utility uncompiled.
 */
export function applyTheme(theme: AppTheme) {
  document.documentElement.classList.toggle('dark', resolve(theme) === 'dark');

  // Tauri's own window theme (titlebar, native menus). null = follow the OS.
  getCurrentWindow()
    .setTheme(theme === 'auto' ? null : theme)
    .catch((error: unknown) => console.error('Failed to set window theme:', error));

  // Reads the resolved --background, so it has to run after the class toggle.
  updateWindowTheme();
}

/**
 * Re-applies the theme when the OS switches, but only while the preference is
 * 'auto'. Returns an unsubscribe function.
 */
export function watchSystemTheme(): () => void {
  const query = systemPrefersDark();
  const onChange = () => {
    if (get(appTheme) === 'auto') {
      applyTheme('auto');
    }
  };
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
}

/*
 * Persistence. The web app gets this free from mode-watcher's localStorage;
 * desktop stores it in settings.json under the `theme_mode` key that already
 * existed in AppSettingsParams (and was, until now, read by nothing).
 *
 * `theme_mode` is the persisted spelling ('system'), `appTheme` the in-app one
 * ('auto') — the two names come from mode-watcher and the shared store
 * respectively, and this module is the only place they meet.
 */

/** Guards against persisting the default before settings.json has been read. */
let hydrated = false;

function toAppTheme(themeMode: string): AppTheme {
  if (themeMode === 'light' || themeMode === 'dark') {
    return themeMode;
  }
  // 'system' and anything unrecognised fall back to following the OS.
  return 'auto';
}

/** Adopts the persisted preference. Call once, after loadSettings resolves. */
export function hydrateTheme() {
  appTheme.set(toAppTheme(get(appSettings).theme_mode));
  hydrated = true;
}

/** Writes the preference back to settings.json, if it actually changed. */
export function persistTheme(theme: AppTheme) {
  if (!hydrated) {
    return;
  }
  const settings = get(appSettings);
  const themeMode = theme === 'auto' ? 'system' : theme;
  if (settings.theme_mode === themeMode) {
    return;
  }
  setSettings('app', { ...settings, theme_mode: themeMode }).catch((error: unknown) =>
    console.error('Failed to persist theme preference:', error)
  );
}
