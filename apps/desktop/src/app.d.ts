// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    // interface Locals {}
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

// Non-standard attributes absent from Svelte's HTML typings (shared @haptic/app
// components are type-checked from this app too):
// - webkitdirectory/directory: directory picker used by the web collection importer
// - autocorrect: Safari/WebKit text-correction toggle used by the editor
declare namespace svelteHTML {
  interface HTMLAttributes<T> {
    webkitdirectory?: boolean | '' | null;
    directory?: boolean | '' | null;
    autocorrect?: string | null;
  }
}
