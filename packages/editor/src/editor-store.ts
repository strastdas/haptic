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
 * Resolves once the editor component has published its TipTap instance.
 *
 * Mounting is not synchronous with navigation: SvelteKit's `goto` resolves
 * before the destination page's `onMount` has run, so code that navigates to a
 * note route and immediately sets content would find the store still empty.
 * Rejects rather than hanging if the editor never appears.
 */
export function whenEditorReady(timeoutMs = 5000): Promise<void> {
  if (get(editor)) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    let unsubscribe: (() => void) | undefined;
    const timer = setTimeout(() => {
      unsubscribe?.();
      reject(new Error('The editor is not ready yet.'));
    }, timeoutMs);

    unsubscribe = editor.subscribe((instance) => {
      if (!instance) {
        return;
      }
      clearTimeout(timer);
      // `unsubscribe` is still unassigned if this fired synchronously, so defer.
      queueMicrotask(() => unsubscribe?.());
      resolve();
    });
  });
}

/**
 * Scrolls every scrollable ancestor of the editor back to the top.
 *
 * The scroll container lives in the route, not in the editor, so it survives every
 * content swap. Notes open read-only (`openNote` resets `editorMode` to `'view'`), which
 * makes the `focus()` below a no-op on a non-editable view — without this a freshly
 * opened note would render at wherever the previous one was left.
 */
function scrollAncestorsToTop(dom: HTMLElement) {
  for (let node = dom.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') {
      node.scrollTop = 0;
    }
  }
}

/**
 * Resets the editors document title, updating the editor state, and focusing on the
 * first element after the heading.
 */
export function setEditorContent(content: string) {
  const $editor = get(editor);

  // The editor component publishes the instance on mount. Reaching this before
  // then used to fail as `undefined is not an object (evaluating 'n.commands')`,
  // which says nothing about the actual problem.
  if (!$editor) {
    throw new Error('The editor is not ready yet.');
  }

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

  scrollAncestorsToTop($editor.view.dom);
}
