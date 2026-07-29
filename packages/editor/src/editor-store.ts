import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
import { EditorState } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/core';
import { get } from 'svelte/store';

type SaveListener = () => void;

interface EditorStore extends Writable<Editor> {
  subscribeToSaveEvents: (callback: SaveListener) => () => void;
  notifySaveEvent: () => void;
}

export function createEditorStore(): EditorStore {
  const { subscribe, set, update } = writable<Editor>();
  const saveListeners: SaveListener[] = [];

  return {
    subscribe,
    set,
    update,
    subscribeToSaveEvents: (callback: SaveListener) => {
      saveListeners.push(callback);
      return () => {
        const index = saveListeners.indexOf(callback);
        if (index !== -1) {
          saveListeners.splice(index, 1);
        }
      };
    },
    notifySaveEvent: () => {
      saveListeners.forEach((listener) => listener());
    }
  };
}

/** The single global TipTap editor instance shared across the app. */
export const editor = createEditorStore();

/**
 * Resets the editors document title, updating the editor state, and focusing on the
 * first element after the heading.
 */
export function setEditorContent(content: string) {
  const $editor = get(editor);

  // Set content of the editor
  $editor.commands.setContent(content);

  // Update the editor state
  const newEditorState = EditorState.create({
    doc: $editor.state.doc,
    plugins: $editor.state.plugins,
    schema: $editor.state.schema
  });
  $editor.view.updateState(newEditorState);

  // Focus first line
  $editor.chain().focus().run();
}
