import {
  canOpenFile,
  createFolder,
  createNote,
  deleteNote,
  duplicateNote,
  openFile,
  saveNote,
  showInFolder
} from '@haptic/core/adapter';
import { goto } from '$app/navigation';
import { SHORTCUTS } from '@haptic/core/constants';
import { basename } from '@haptic/core/path';
import {
  collection,
  collectionSearchActive,
  editorMode,
  editorSearchActive,
  isDesktopApp,
  isNoteDetailSidebarOpen,
  isPageSidebarOpen,
  platform,
  settingsStore
} from '@haptic/core/store';
import type { ShortcutParams } from '@haptic/core/types';
import { editor, whenEditorReady } from '@haptic/editor/store';
import { get } from 'svelte/store';
import type { IconKey } from '../icon.svelte';

/**
 * Makes sure there is a mounted editor before content is pushed into it.
 *
 * Only the note/daily/task routes mount the editor, so opening a file from the
 * empty landing page has to navigate first — and then *wait*, because `goto`
 * resolves before the destination page's `onMount` has created the TipTap
 * instance. A populated store means the current route already has one, so this
 * won't drag you off daily or tasks.
 */
export async function ensureEditorReady() {
  if (get(editor)) {
    return;
  }
  await goto('/notes');
  await whenEditorReady();
}

/** Opens a standalone file, in an editor guaranteed to exist. */
export async function openFileInEditor() {
  await ensureEditorReady();
  await openFile();
}

interface Command {
  title: string;
  icon: IconKey | null;
  shortcut?: ShortcutParams;
  onSelect?: () => string | void;
  /**
   * Whether to show the command, evaluated when the menu renders.
   *
   * Must not be resolved here: this list is a module-level const, so anything
   * read at construction time is captured before the app has registered its
   * platform seams — the exact bootstrap-ordering trap the architecture doc
   * warns about.
   */
  available?: () => boolean;
}

interface CommandGroup {
  name: string;
  commands: Command[];
}

export const mainCommands: CommandGroup[] = [
  {
    name: 'Notes',
    commands: [
      {
        title: 'New note',
        icon: 'notePlus',
        shortcut: SHORTCUTS['notes:create'],
        onSelect: () => {
          createNote(get(collection));
        }
      },
      {
        title: 'New folder',
        icon: 'folderPlus',
        shortcut: SHORTCUTS['notes:create-folder'],
        onSelect: () => {
          createFolder(get(collection));
        }
      },
      {
        title: 'Open note',
        icon: 'note',
        shortcut: SHORTCUTS['command:open-note'],
        onSelect: () => 'open_note'
      },
      {
        title: 'Search collection',
        icon: 'search',
        shortcut: SHORTCUTS['notes:search'],
        onSelect: () => {
          collectionSearchActive.set(true);
        }
      },
      {
        title: 'Toggle editor mode',
        icon: 'cursorI',
        shortcut: SHORTCUTS['editor:toggle-mode'],
        onSelect: () => {
          get(editor).setEditable(!get(editor).isEditable);
          editorMode.update((mode) => (mode === 'edit' ? 'view' : 'edit'));
        }
      },
      {
        title: 'Find in note',
        icon: 'search',
        shortcut: SHORTCUTS['editor:search'],
        onSelect: () => {
          editorSearchActive.set(true);
        }
      }
    ]
  },
  {
    name: 'Navigation',
    commands: [
      {
        title: 'Go to previous note',
        icon: 'arrowLeft',
        shortcut: SHORTCUTS['notes:history-back'],
        onSelect: () => {
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowLeft', altKey: true, metaKey: true })
          );
        }
      },
      {
        title: 'Go to next note',
        icon: 'arrowRight',
        shortcut: SHORTCUTS['notes:history-forward'],
        onSelect: () => {
          window.dispatchEvent(
            new KeyboardEvent('keydown', { key: 'ArrowRight', altKey: true, metaKey: true })
          );
        }
      },
      {
        title: 'Open other collection',
        icon: 'folder',
        shortcut: SHORTCUTS['app:open-collection'],
        onSelect: () => 'open_collection'
      },
      {
        // Desktop only — web has no way to reopen a picked file later, so the
        // command is hidden rather than shown and failing.
        title: 'Open file',
        icon: 'note',
        shortcut: SHORTCUTS['app:open-file'],
        available: canOpenFile,
        onSelect: () => {
          openFileInEditor();
        }
      },
      {
        title: 'Go to settings',
        icon: 'settings',
        shortcut: SHORTCUTS['app:settings'],
        onSelect: () => {
          settingsStore.update((state) => ({ ...state, isOpen: true }));
        }
      },
      {
        title: 'View shortcuts',
        icon: 'bolt',
        shortcut: SHORTCUTS['app:shortcuts']
      }
    ]
  },
  {
    name: 'Appearance',
    commands: [
      {
        title: 'Change theme',
        icon: 'sun',
        shortcut: SHORTCUTS['settings:toggle-theme'],
        onSelect: () => 'change_theme'
      }
    ]
  },
  {
    name: 'Layout',
    commands: [
      {
        title: 'Toggle sidebar',
        icon: 'sidebarMenuLeft',
        shortcut: SHORTCUTS['notes:toggle-sidebar'],
        onSelect: () => {
          isPageSidebarOpen.update((open) => !open);
        }
      },
      {
        title: 'Toggle note details',
        icon: 'sidebarMenuRight',
        shortcut: SHORTCUTS['notes:toggle-details'],
        onSelect: () => {
          isNoteDetailSidebarOpen.update((open) => !open);
        }
      }
    ]
  }
];

export const createNoteCommands = (notePath: string): CommandGroup => ({
  name: basename(notePath),
  commands: [
    {
      title: 'Save note',
      icon: 'floppy',
      shortcut: SHORTCUTS['note:save'],
      onSelect: () => {
        saveNote(notePath);
      }
    },
    {
      title: 'Duplicate note',
      icon: 'copy',
      shortcut: SHORTCUTS['note:duplicate'],
      onSelect() {
        duplicateNote(notePath);
      }
    },
    {
      title: 'Rename note',
      icon: 'editPencil',
      shortcut: SHORTCUTS['note:rename'],
      onSelect: () => {
        document.dispatchEvent(new CustomEvent('haptic:rename-note', { detail: notePath }));
      }
    },
    {
      title: 'Delete note',
      icon: 'bin',
      shortcut: SHORTCUTS['note:delete'],
      onSelect: () => {
        deleteNote(notePath);
      }
    },
    {
      title: 'Move note to...',
      icon: 'motionCirclesLines',
      shortcut: SHORTCUTS['command:move-note'],
      onSelect: () => {
        return 'move_note';
      }
    },
    {
      title: 'Copy note path',
      icon: 'copy',
      shortcut: SHORTCUTS['note:copy-path'],
      onSelect: () => {
        navigator.clipboard.writeText(notePath);
      }
    },
    // Desktop-only: reveal the note in the OS file manager
    ...(get(isDesktopApp)
      ? [
          {
            title: `Reveal in ${
              get(platform) === 'darwin'
                ? 'Finder'
                : get(platform) === 'linux'
                  ? 'Files'
                  : 'Explorer'
            }`,
            icon: 'eye' as IconKey,
            shortcut: SHORTCUTS['note:show-in-folder'],
            onSelect: () => {
              showInFolder(notePath);
            }
          }
        ]
      : [])
  ]
});
