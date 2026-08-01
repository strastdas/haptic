# Architecture

## Why the packages exist

The upstream project kept `apps/web` and `apps/desktop` as near-complete forks of each other — the same components, routes, and API modules existed twice and had already drifted, so every fix had to be made (or forgotten) twice. The revival collapsed that into shared packages, keeping only the parts that are genuinely platform-specific separate.

```
packages/core    types · stores · constants · pure utils · StorageAdapter + PlatformActions seams
packages/editor  global TipTap instance store · setEditorContent · SearchAndReplace extension
packages/app     shared feature components (command menu, settings, layout, notes panes, editor UI)
packages/ui      shadcn-svelte primitives + Haptic theme (CLI-owned)

apps/web         routes · IndexedDB adapter · web CSS entry
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
| Notes                  | `entry` object store in IndexedDB (`haptic-local`)                    | `.md` files on disk                                                                      |
| Tree                   | `parent_path` column → `buildFileTree()`                              | `readDirTree()` walk (Tauri 2's `readDir` is not recursive)                              |
| Change watching        | `watchEntries` change signal                                          | `watchImmediate` from `@tauri-apps/plugin-fs`                                            |
| Search                 | JS filter + context extraction                                        | Rust `search_files` command                                                              |
| Theme switching        | mode-watcher toggles `.dark` and persists to localStorage             | `lib/theme.ts` toggles `.dark`, persists to `theme_mode` in `settings.json`              |
| Collections / settings | `collection` + `collectionSettings` stores, localStorage              | `collections.json` / `settings.json` in app-data, `.haptic/settings.json` per collection |
| Delete                 | row delete                                                            | OS trash, `.haptic/trash`, or hard delete (per setting)                                  |

Because the interface is shared, the same contract test suite (`packages/core/src/adapter.contract.ts`) runs against the real web adapter (IndexedDB, via `fake-indexeddb` in tests) and a mock. The Tauri adapter conforms to the same interface but isn't test-run — there is no Tauri runtime in Vitest.

### Scopes

Adapters are registered **per scope**, not per app: `setStorageAdapter('local', impl)`. A path
carries its scope as a scheme prefix (`cloud:/col_1/note.md`), and the delegating free
functions route on it, so one app can hold several stores at once — which is what the planned
cloud sync needs. `local` is the *implicit* default: unprefixed paths mean local and are never
rewritten, so everything persisted before scopes existed stays valid. See `packages/core/src/path.ts`.

`readNoteContent` / `writeNoteContent` are the only way to move a note body without the shared
TipTap editor (`saveNote` writes whatever the editor is currently showing). `transferNote`
builds on them to copy a note between scopes — the primitive behind sync, download, and a
cross-scope move.

Path components go through `@haptic/core/path` (`basename`, `dirname`, `joinPath`, `stem`,
`relativeDepth`) rather than `split('/')`, so Windows paths survive. Native separators are
normalized to `/` once, in the desktop `loadCollection` where the directory dialog returns.

### Single-file opens (desktop)

A note can be opened on its own, outside any collection — via *Open file…* (`cmd+shift+o`),
or by double-clicking a `.md` in the file manager.

Storage needed no special case: the desktop adapter's note operations take an absolute path
and never consult `collection`. Three things had to be added around it.

- **`standaloneFiles`** (a store) lists notes that sit outside the open collection, since they
  have no row in the tree. The sidebar renders them above it. `isStandalone` compares against
  `` `${collection}/` `` — the trailing slash matters, or `/Notes2/a.md` would count as inside
  `/Notes`. Closing one only removes it from the list; it never touches the file.
- **`PlatformActions.pickFile`** is the dialog, desktop-only and optional like `showInFolder`.
  Shared UI gates on `canOpenFile()` rather than `isDesktopApp`, so the command simply does not
  appear where it cannot work.
- **Filesystem scope.** `capabilities/default.json` scopes to `$HOME/**`, which is right for
  collections but too narrow here — a note can live on an external volume or in `/tmp`.
  Rather than widening the static scope to `**`, the `allow_file` command extends it one path
  at a time, only after the user has explicitly chosen that file.

The OS hands files over two different ways: macOS sends an Apple Event, surfaced as
`RunEvent::Opened`; Windows and Linux pass argv, which needs `tauri-plugin-single-instance` so
a second launch forwards to the running app instead of starting a second copy. Both funnel
into `open_files::open_paths`, which grants scope, focuses the window, and emits
`haptic-open-files` for the frontend to open. Associations are declared in
`tauri.conf.json` under `bundle.fileAssociations`.

**Note:** file associations only take effect in a bundled, installed app — `tauri dev` will not
register them, so that path can only be verified from a real build.

## State

Global state is `svelte/store` writables in `packages/core/src/store.ts` — deliberately not migrated to runes: they are consumed across dozens of components, `svelte/store` is fully supported in Svelte 5, and one of them holds a TipTap editor instance. Components themselves use runes.

Three stores carry platform context: `platform` (which OS, for shortcut glyphs), `isDesktopApp` (which shell, for genuine web-vs-desktop branches), and `appTheme`.

Prefer a **prop** over `isDesktopApp` when the difference is about layout rather than capability — `<Header windowChrome />` is set by the desktop shell because its title bar doubles as window chrome, which keeps the component independent of bootstrap ordering.

### Drafts

`draftFile` holds the path of a note the editor is showing that does not exist in storage yet. The daily view opens one when you visit a date with no note, instead of creating an empty file just because you clicked a calendar cell. `saveNote` creates it on the first write, passing `open: false` to `createNote` so opening doesn't reset the editor and discard what was typed. `openNote` abandons an unwritten draft.

## Web data layer

`initDatabase()` opens IndexedDB (database `haptic-local`, via `idb`); the root layout awaits it before rendering anything that touches storage, so `getDb()` can be synchronous and throws if called too early.

Three object stores replace the old tables: `entry` (keyed on path, indexed `by-collection` and `by-parent`), `collection`, and `collectionSettings`. **IndexedDB keys are immutable**, so a rename or move is a delete-then-put in one transaction rather than an `UPDATE` of the primary key — that is what `repathEntry` is for.

`watchEntries` replaces PGlite's live queries. Both former call sites ran `SELECT * FROM entry` and then refetched the whole tree, so a bare "something changed" signal is exactly equivalent; every write helper fires it.

This replaced PGlite + drizzle. PGlite was only ever backing a tree of text files — its live queries were the two refetch hooks above and search was a single `ILIKE` — which did not justify shipping a WASM Postgres, an ORM and a migration runner, and it effectively did not work on mobile browsers. Removing it also took the schema, the SQL migration runner and `drizzle.config.ts` with it; the demo collection is now seeded from `database/seed-data.json` on a genuinely empty database.

## Desktop backend

`src-tauri` is thin: three commands (`show_in_folder`, `search_files`, `move_to_trash`), official Tauri 2 plugins (`fs` with the `watch` feature, `window-state`, `dialog`, `opener`, `os`), and macOS window styling in `src/mac/window.rs` (transparent titlebar, traffic-light positioning, fullscreen events, and a `haptic-bg-changed` listener that tints the window chrome to match the theme).

Permissions are declared in `capabilities/default.json` — filesystem access is scoped to `$HOME/**` and `$APPDATA` rather than the v1 config's `allowlist: { all: true }`. New filesystem calls may require adding a permission there.

The updater is intentionally absent; see the roadmap.

## Theming

The palette lives in `packages/ui/haptic.css` in the stock shadcn Tailwind-4 shape: complete `hsl()` colours on `:root`, overridden under `.dark`. **Both apps switch on the `.dark` class** — web through mode-watcher, desktop through `apps/desktop/src/lib/theme.ts` — so a stock shadcn theme is a straight drop-in.

Desktop previously switched on `@media (prefers-color-scheme: dark)`, which ignored the user's own preference and, because the custom variant was declared with invalid syntax, meant no `dark:` utility ever compiled there.

Two things a pasted theme won't include:

- **`--secondary-background`** — Haptic's own token for the surface behind the editor and note panes. Raised (`--card`) in light, and derived *below* `--background` in dark so note text sits on the darkest surface.
- **`--font-sans` / `--font-mono`**, declared in `theme.css`.

`theme.css` also holds the `@theme inline` mappings that turn every token into a utility. A new token needs an entry there or `bg-*`/`text-*` won't generate.

## Icons

[Teenyicons](https://icones.js.org/collection/teenyicons), everywhere. `@lucide/svelte` is
gone; nothing else draws icons.

`packages/app/src/components/shared/icon.svelte` is **generated** — run
`node scripts/generate-icons.mjs` after editing the `MAP` in that script, don't hand-edit the
component. The generator reads `@iconify-json/teenyicons` (a devDependency of `@haptic/app`,
never shipped at runtime), inlines each body, and **fails if a mapped name doesn't exist**, so
the map cannot silently drift.

**Outline icons are stroke-based** (`fill="none" stroke="currentColor"`); solid ones use
`fill="currentColor"`. Both follow `currentColor`, so colour them with `text-*`. A `fill-*`
utility does nothing — the previous icon set was fill-based, so that was a real trap during the
swap. All icons are 15x15.

### Mappings that aren't obvious

Most keys map to the same-named teenyicon. These didn't:

| Key | Teenyicon | Why |
| --- | --- | --- |
| `cloudSolid` (Haptic Sync) | `refresh-solid` | **Teenyicons has no cloud icon at all.** |
| `cloudX` (sync unavailable) | `x-circle-outline` | Same reason. |
| `copy` | `documents-outline` | No `copy`; two stacked documents is the nearest read. |
| `sidebarMenuLeft` (toggle sidebar) | `view-column-outline` | No sidebar/panel icon. |
| `sidebarMenuRight` (note details) | `info-outline` | Ditto — "details" reads better as info than as a mirrored panel. |
| `bolt` (view shortcuts) | `keyboard-outline` | More literal than a lightning bolt. |
| `motionCirclesLines` (move note to…) | `send-outline` | |
| `checkSquare` (tasks) | `clipboard-tick-outline` | |
| `glasses` (view mode) | `eye-closed-outline` | Pairs with `eye` for edit mode. |
| `cursorI` (toggle editor mode) | `text-outline` | |
| `undoCircle` | `anti-clockwise-outline` | |
| `phoneOff` (mobile unsupported) | `mobile-outline` | No "off" variant exists. |

### `packages/ui` diverges from the shadcn baseline

`packages/ui` cannot import from `@haptic/app` (the dependency runs the other way), so it has
its own inlined set in `packages/ui/components/icons/` — seven icons, generated the same way.
15 shadcn primitives import from there instead of `@lucide/svelte`.

**This is a deliberate divergence from a CLI-owned area.** `shadcn-svelte add -o` will
regenerate those components with lucide imports and revert it. After any regeneration, re-point
the icon imports and re-check that `@lucide/svelte` hasn't come back as a dependency.

## Fonts

LilGrotesk (sans) and Sevka Fixed (mono). Web links them from `cdn.strast.dev` in `app.html`; desktop imports a local mirror from `app.desktop.css` so Vite bundles the woff2 files and the app works offline. The two must be kept in sync — see the comment at the top of `packages/ui/fonts/*.css`.

The CDN stylesheets ship each family whole (300-700, upright and italic, with `ttf` fallbacks beside every `woff2`). The desktop mirrors carry **only the upright weights the UI uses, woff2 only** — the webview supports woff2 everywhere, and mirroring the rest would grow the binary for faces nothing asks for. Adding a weight means adding it to the mirror, not just using it.

Sevka Fixed replaced Ioskeley Mono. That also retired a base-layer `tracking-tight` on `code`, `pre`, `kbd`, `samp` and `.font-mono`, which existed purely because Ioskeley set wide by default; a fixed-width face does not want it. Restore it there if the shortcut chips ever read loose.
