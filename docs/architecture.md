# Architecture

## Why the packages exist

The upstream project kept `apps/web` and `apps/desktop` as near-complete forks of each other — the same components, routes, and API modules existed twice and had already drifted, so every fix had to be made (or forgotten) twice. The revival collapsed that into shared packages, keeping only the parts that are genuinely platform-specific separate.

```
packages/core    types · stores · constants · pure utils · StorageAdapter + PlatformActions seams
packages/editor  global TipTap instance store · setEditorContent · SearchAndReplace extension
packages/app     shared feature components (command menu, settings, layout, notes panes, editor UI)
packages/ui      shadcn-svelte primitives + Haptic theme (CLI-owned)

apps/web         routes · PGlite/drizzle adapter · web CSS entry
apps/desktop     routes · Tauri filesystem adapter · Rust backend · desktop CSS entry
apps/homepage    marketing site (out of scope, self-contained)
```

All packages are **source-only** — no build step, consumed through `exports` maps, compiled by each app's Vite.

## The storage seam

`StorageAdapter` (`packages/core/src/adapter.ts`) is the interface both apps implement. Its method set was derived from the two apps' historically identical `lib/api/*` export signatures, so adopting it required almost no changes at call sites.

Each app builds its implementation from its `lib/api/*` modules and registers it during bootstrap:

```ts
// apps/*/src/lib/adapter.ts — imported for its side effect from routes/+layout.svelte
setStorageAdapter({ ...notes, ...collection, ...folders, ...settings, searchEntries });
```

Shared code imports the delegating free functions (`createNote`, `moveFolder`, `fetchCollectionEntries`, …) from `@haptic/core`. They throw a clear error if no adapter is registered, which surfaces bootstrap-order mistakes immediately instead of producing `undefined`.

`PlatformActions` works the same way for capabilities that aren't storage: `setTheme`, `toggleTheme`, `openExternal`, `showInFolder`. `showInFolder` is optional and no-ops on web, so shared components can call it unconditionally and gate only the *UI* on `isDesktopApp`.

Two delegating functions do more than forward:

- **`openNote`** clears any pending draft and resets `editorMode` to `'view'`, so every note opens read-only. It is hooked here rather than on `activeFile` because `renameNote` repoints that store too, and renaming shouldn't drop you out of the editor.
- **`saveNote`** materializes a draft before writing. See *Drafts* below.

For UI that only one platform can provide, the app passes a prop rather than the shared component reaching for a platform API — e.g. web's `<input webkitdirectory>` collection importer is injected into the command menu as `importCollection`.

### How the two implementations differ

| Concern                | Web                                                                   | Desktop                                                                                  |
| ---------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Notes                  | `entry` table in PGlite (`idb://haptic-v2`), content in a text column | `.md` files on disk                                                                      |
| Tree                   | `parent_path` column → `buildFileTree()`                              | `readDirTree()` walk (Tauri 2's `readDir` is not recursive)                              |
| Change watching        | PGlite live queries                                                   | `watchImmediate` from `@tauri-apps/plugin-fs`                                            |
| Search                 | `ILIKE` query + JS context extraction                                 | Rust `search_files` command                                                              |
| Theme switching        | mode-watcher toggles `.dark` and persists to localStorage             | `lib/theme.ts` toggles `.dark`, persists to `theme_mode` in `settings.json`              |
| Collections / settings | `collection` + `collection_settings` tables, localStorage             | `collections.json` / `settings.json` in app-data, `.haptic/settings.json` per collection |
| Delete                 | row delete                                                            | OS trash, `.haptic/trash`, or hard delete (per setting)                                  |

Because the interface is shared, the same contract test suite (`packages/core/src/adapter.contract.ts`) runs against the real web adapter (in-memory PGlite) and a mock. The Tauri adapter conforms to the same interface but isn't test-run — there is no Tauri runtime in Vitest.

## State

Global state is `svelte/store` writables in `packages/core/src/store.ts` — deliberately not migrated to runes: they are consumed across dozens of components, `svelte/store` is fully supported in Svelte 5, and one of them holds a TipTap editor instance. Components themselves use runes.

Three stores carry platform context: `platform` (which OS, for shortcut glyphs), `isDesktopApp` (which shell, for genuine web-vs-desktop branches), and `appTheme`.

Prefer a **prop** over `isDesktopApp` when the difference is about layout rather than capability — `<Header windowChrome />` is set by the desktop shell because its title bar doubles as window chrome, which keeps the component independent of bootstrap ordering.

### Drafts

`draftFile` holds the path of a note the editor is showing that does not exist in storage yet. The daily view opens one when you visit a date with no note, instead of creating an empty file just because you clicked a calendar cell. `saveNote` creates it on the first write, passing `open: false` to `createNote` so opening doesn't reset the editor and discard what was typed. `openNote` abandons an unwritten draft.

## Web data layer

`initDatabase()` boots PGlite and constructs drizzle; the root layout awaits it before rendering anything that touches storage, so `getDb()` can be synchronous and throws if called too early. This replaced a `@ts-nocheck` Proxy that could hand out Promises for property access before initialization.

Migrations live in `lib/database/migrations/` as ordered SQL files applied once each, inside a transaction, tracked in a `haptic_migrations` table. Failures are logged and rethrown — the previous runner swallowed every error, which meant any future schema change would have failed silently on existing databases.

The database name is `idb://haptic-v2` because PGlite 0.3 changed the on-disk Postgres major. The pre-0.3 `idb://haptic` is never opened or deleted, so a future importer can still read it; until then the UI shows a dismissible notice when it detects one.

## Desktop backend

`src-tauri` is thin: two commands (`show_in_folder`, `search_files`), official Tauri 2 plugins (`fs` with the `watch` feature, `window-state`, `dialog`, `opener`, `os`), and macOS window styling in `src/mac/window.rs` (transparent titlebar, traffic-light positioning, fullscreen events, and a `haptic-bg-changed` listener that tints the window chrome to match the theme).

Permissions are declared in `capabilities/default.json` — filesystem access is scoped to `$HOME/**` and `$APPDATA` rather than the v1 config's `allowlist: { all: true }`. New filesystem calls may require adding a permission there.

The updater is intentionally absent; see the roadmap.

## Theming

The palette lives in `packages/ui/haptic.css` in the stock shadcn Tailwind-4 shape: complete `hsl()` colours on `:root`, overridden under `.dark`. **Both apps switch on the `.dark` class** — web through mode-watcher, desktop through `apps/desktop/src/lib/theme.ts` — so a stock shadcn theme is a straight drop-in.

Desktop previously switched on `@media (prefers-color-scheme: dark)`, which ignored the user's own preference and, because the custom variant was declared with invalid syntax, meant no `dark:` utility ever compiled there.

Two things a pasted theme won't include:

- **`--secondary-background`** — Haptic's own token for the surface behind the editor and note panes. Raised (`--card`) in light, and derived *below* `--background` in dark so note text sits on the darkest surface.
- **`--font-sans` / `--font-mono`**, declared in `theme.css`.

`theme.css` also holds the `@theme inline` mappings that turn every token into a utility. A new token needs an entry there or `bg-*`/`text-*` won't generate.

## Fonts

LilGrotesk (sans) and Ioskeley Mono (mono). Web links them from `cdn.strast.dev` in `app.html`; desktop imports a local mirror from `app.desktop.css` so Vite bundles the woff2 files and the app works offline. The two must be kept in sync — see the comment at the top of `packages/ui/fonts/*.css`.
