import { appTheme } from '@haptic/core/store';
import type { AppTheme } from '@haptic/core/types';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { get } from 'svelte/store';
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
