// Shared helpers live in @haptic/core; only desktop-specific (Tauri) helpers remain here.
export * from '@haptic/core/utils';
// Theme actions live behind @haptic/core's platform seam (registered in ./adapter).
export { setTheme, toggleTheme } from '@haptic/core/adapter';
export { setEditorContent } from '@haptic/editor/store';

import { emit } from '@tauri-apps/api/event';
import { createDir, readDir } from '@tauri-apps/api/fs';
import { invoke } from '@tauri-apps/api/tauri';

// Show in folder
export async function showInFolder(path: string) {
  await invoke('show_in_folder', { path });
}

export async function validateHapticFolder(path: string) {
  if (path === null) {
    return;
  }

  const hapticFolder = await readDir(`${path}/.haptic`).catch(() => null);

  if (!hapticFolder) {
    // Create .haptic folder
    await createDir(`${path}/.haptic`);

    // Create trash folder
    await createDir(`${path}/.haptic/trash`);

    // Create daily folder
    await createDir(`${path}/.haptic/daily`);
  }
}

function hslToHex(hsl: string): string {
  // Extract the H, S, and L values from the HSL string
  const [h, sPercent, lPercent] = hsl
    .replaceAll(/%/g, '') // Remove percentage signs
    .split(' ')
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

