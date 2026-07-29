// Interface for shortcut parameters
export interface ShortcutParams {
  alt?: boolean;
  shift?: boolean;
  command?: boolean;
  key: string;
  code?: string;
  callback?: () => void;
  hover?: boolean;
  node?: HTMLElement;
}

// Registry for shortcuts
const shortcuts: ShortcutParams[] = [];

// Global event listener (client-only; apps are ssr=false SPAs)
if (typeof window !== 'undefined') {
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      if (
        !!shortcut.alt !== e.altKey ||
        !!shortcut.shift !== e.shiftKey ||
        !!shortcut.command !== (e.ctrlKey || e.metaKey) ||
        (shortcut.key.toLowerCase() !== e.key.toLowerCase() &&
          !(shortcut.code && shortcut.code === e.code)) ||
        (shortcut.hover && !(shortcut.node?.parentNode as Element)?.matches(':hover'))
      ) {
        continue;
      }

      e.preventDefault();
      shortcut.callback ? shortcut.callback() : shortcut.node?.click();
    }
  });
}

// Svelte action: registers the shortcut while the node is mounted.
// (Rewritten from the Svelte 4 onMount/afterUpdate/onDestroy version; actions
// already receive a destroy callback, and `afterUpdate` no longer exists in
// runes mode.)
const handleShortcut = (
  node: HTMLElement | (HTMLElement & { click: () => void }),
  params: ShortcutParams
): { destroy: () => void } => {
  params.node = node;
  shortcuts.push(params);

  return {
    destroy: () => {
      const index = shortcuts.indexOf(params);
      if (index !== -1) {
        shortcuts.splice(index, 1);
      }
    }
  };
};

export default handleShortcut;
