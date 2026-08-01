// Shared helpers live in @haptic/core; only desktop-specific (Tauri) helpers remain here.
export * from '@haptic/core/utils';
// Theme actions live behind @haptic/core's platform seam (registered in ./adapter).
export { setTheme, toggleTheme } from '@haptic/core/adapter';
export { setEditorContent } from '@haptic/editor/store';

import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { message, open } from '@tauri-apps/plugin-dialog';
import { exists, mkdir } from '@tauri-apps/plugin-fs';
import { normalizeSeparators } from '@haptic/core/path';
import type { SearchResultParams } from '@haptic/core/types';

// Show in folder
export async function showInFolder(path: string) {
  await invoke('show_in_folder', { path });
}

/** PlatformActions.reportError — a native alert, since the app has no toasts. */
export function reportError(text: string) {
  message(text, { title: 'Haptic', kind: 'error' }).catch((error) => {
    console.error('Failed to show error dialog:', error, text);
  });
}

/**
 * PlatformActions.pickFile — choose a single markdown note from the OS dialog.
 *
 * Returns the path, normalized to forward slashes as everywhere else, or null
 * when the dialog is dismissed.
 *
 * The dialog plugin is documented to add the picked path to the filesystem
 * scope itself, but the static scope is only `$HOME/**` and a silent denial here
 * is invisible, so the grant is made explicitly too — it is idempotent and
 * costs one IPC call.
 */
export async function pickFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    directory: false,
    filters: [{ name: 'Markdown', extensions: ['md', 'markdown', 'mdx', 'txt'] }]
  });

  if (typeof selected !== 'string') {
    return null;
  }

  const path = normalizeSeparators(selected);
  await invoke('allow_file', { path });
  return path;
}

/**
 * StorageAdapter.searchEntries for the desktop app: the Rust `search_files`
 * command walks the vault on disk and returns the same {path, context_preview}
 * shape the web app builds with SQL.
 */
export function searchEntries(
  collectionPath: string,
  query: string,
  caseSensitive = false,
  matchWord = false
): Promise<SearchResultParams[]> {
  return invoke<SearchResultParams[]>('search_files', {
    dirPath: collectionPath,
    query,
    caseSensitive,
    matchWord,
    recursive: true
  });
}

export async function validateHapticFolder(path: string | null | undefined) {
  // On a first launch there is no collection yet — `undefined` used to slip
  // past a `=== null` check and try to mkdir "undefined/.haptic", which threw
  // and aborted the rest of the layout's onMount.
  if (!path) {
    return;
  }

  const hapticFolder = await exists(`${path}/.haptic`).catch(() => false);

  if (!hapticFolder) {
    // Create .haptic folder
    await mkdir(`${path}/.haptic`);

    // Create trash folder
    await mkdir(`${path}/.haptic/trash`);

    // Create daily folder
    await mkdir(`${path}/.haptic/daily`);
  }
}

function hslToHex(hsl: string): string {
  // Extract the H, S, and L values from the HSL string. Accepts both the bare
  // "h s% l%" triplet (pre-Tailwind 4) and the full "hsl(h s% l% / a)" color
  // that --background resolves to since the Tailwind 4 port.
  const [h, sPercent, lPercent] = hsl
    .trim()
    .replace(/^hsla?\(/i, '') // Strip the hsl()/hsla() wrapper
    .replace(/\)$/, '')
    .replace(/\/.*$/, '') // Drop any "/ alpha" tail
    .replaceAll(',', ' ') // Legacy comma-separated syntax
    .replaceAll('%', '') // Remove percentage signs
    .trim()
    .split(/\s+/)
    .map(Number);

  const s = sPercent / 100;
  const l = lPercent / 100;

  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0'); // Convert to hex and ensure two digits
  };

  return `#${f(0)}${f(8)}${f(4)}`;
}

export function updateWindowTheme() {
  // Get theme background color - (num num% num%)
  const hsl = getComputedStyle(document.documentElement).getPropertyValue('--background');

  // Convert to hex
  const hex = hslToHex(hsl);

  // Set window theme
  emit('haptic-bg-changed', hex).catch((error) => {
    console.error('Failed to emit event:', error);
  });
}
