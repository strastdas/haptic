import {
  createFolder,
  createNote,
  deleteNote,
  duplicateNote,
  saveNote,
  showInFolder
} from '@haptic/core/adapter';
import { SHORTCUTS } from '@haptic/core/constants';
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
import { editor } from '@haptic/editor/store';
import { get } from 'svelte/store';
import type { IconKey } from '../icon.svelte';

interface Command {
  title: string;
  icon: IconKey | null;
  shortcut?: ShortcutParams;
  onSelect?: () => string | void;
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
        icon: 'searchDocument',
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
        icon: 'searchDocument',
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
        title: 'Go to settings',
        icon: 'settings',
        shortcut: SHORTCUTS['app:settings'],
        onSelect: () => {
          settingsStore.update((state) => ({ ...state, isOpen: true }));
        }
      },
      {
        title: 'Go to help',
        icon: 'lifebouy',
        shortcut: SHORTCUTS['app:help'],
        onSelect: () => 'help_and_feedback'
      },
      {
        title: 'View shortcuts',
        icon: 'bolt',
        shortcut: SHORTCUTS['app:shortcuts']
      },
      {
        title: 'Send feedback',
        icon: 'lifebouy',
        shortcut: SHORTCUTS['app:help'],
        onSelect: () => 'help_and_feedback'
      },
      {
        title: 'Share with friends',
        icon: 'share',
        shortcut: SHORTCUTS['app:share'],
        onSelect: () => 'share'
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
  name: notePath.split('/').pop() as string,
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
        // Blur the editor
        get(editor).commands.blur();

        // Get the inline title input (#inline-title-input)
        const inlineTitleInput = document.getElementById('inline-title-input') as HTMLInputElement;

        // Focus the input and select all text
        window.setTimeout(() => {
          inlineTitleInput?.focus();
          inlineTitleInput?.select();
        }, 50);
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
