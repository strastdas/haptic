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

// Non-standard directory-picker attributes used by the collection importer
// (<input webkitdirectory directory>), absent from Svelte's HTML typings.
declare namespace svelteHTML {
  interface HTMLAttributes<T> {
    webkitdirectory?: boolean | '';
    directory?: boolean | '';
  }
}
