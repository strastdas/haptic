# Haptic — agent guide

Local-first markdown notes app. Fork of [chroxify/haptic](https://github.com/chroxify/haptic) (inactive since early 2025), maintained here. **AGPLv3 — the license and upstream attribution must stay.**

## Layout

pnpm + Turborepo workspace (`apps/*`, `packages/*`).

| Path              | What it is                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`        | SvelteKit SPA (`ssr = false`, adapter-static). Storage = IndexedDB (via `idb`).                                                                |
| `apps/desktop`    | Same UI in Tauri 2. Storage = real `.md` files via the Tauri filesystem plugin.                                                                |
| `apps/api`        | Cloudflare Worker shared by web and desktop. Central auth callbacks and PostgreSQL-backed application sessions live here.                      |
| `apps/homepage`   | Marketing site. **Out of scope** — still Svelte 4 / Tailwind 3 with its own vendored UI and ESLint setup. Don't modernize it as a side effect. |
| `packages/core`   | `@haptic/core` — types, stores, constants, pure utils, and the `StorageAdapter` seam.                                                          |
| `packages/editor` | `@haptic/editor` — global TipTap instance store, `setEditorContent`, the `SearchAndReplace` extension.                                         |
| `packages/app`    | `@haptic/app` — shared feature components (command menu, settings, layout, editor UI, notes panes).                                            |
| `packages/ui`     | `@haptic/ui` — shadcn-svelte primitives + the Haptic theme.                                                                                    |

## The one architectural rule

**The two apps share everything except storage.** Platform differences go through one of three seams in `@haptic/core`, never through conditional imports:

1. `StorageAdapter` (`packages/core/src/adapter.ts`) — each app registers its implementation at boot (`lib/adapter.ts`, imported for its side effect from the root layout). Shared code calls the delegating free functions (`createNote`, `fetchCollectionEntries`, …), which throw if no adapter is registered.
2. `PlatformActions` (same file) — `setTheme` / `toggleTheme` / `openExternal` / `showInFolder`, registered the same way.
3. Stores — `platform` (which OS), `isDesktopApp` (which shell), `appTheme`, `draftFile` (a note the editor shows that isn't in storage yet).

When the difference is **layout** rather than capability, pass a prop instead of reading a store: `<Header windowChrome />` is set by the desktop shell.

`packages/app` must never import `@tauri-apps/*` or the web app's IndexedDB layer. If shared code needs a platform capability, add it to a seam. Web-only UI (e.g. the `webkitdirectory` collection import) is injected as a prop from the app.

Anything genuinely divergent stays app-local: routes (`src/routes/**`), `lib/api/*`, `lib/database` (web), `src-tauri` (desktop).

## Commands

```fish
pnpm install
pnpm dev                  # all apps; ASK before starting a dev server
pnpm --filter=desktop dev:tauri   # desktop dev server is pinned to :1420, web to :5173
pnpm --filter=api dev       # Worker on :8787; requires apps/api/.dev.vars
pnpm check                # svelte-check — run after any code change
pnpm test                 # vitest (unit + StorageAdapter contract)
pnpm --filter=web test:e2e  # playwright (builds + previews; needs `playwright install chromium` once)
pnpm build --filter=web --filter=desktop
pnpm lint:oxc / pnpm format
cd apps/desktop/src-tauri && cargo check   # Rust

# Signed + notarized macOS build (needs the Developer ID cert in the keychain
# and a stored notarytool profile — see docs/releasing.md)
cd apps/desktop
APPLE_SIGNING_IDENTITY='Developer ID Application: …' pnpm tauri build
xcrun notarytool submit <dmg> --keychain-profile haptic --wait
xcrun stapler staple <dmg>
```

Package manager is **pnpm** (see `packageManager` in the root `package.json`). Node >= 22.

## Conventions

- **Lint/format is Oxc** (oxlint + oxfmt via `@strastdas/oxc-config`). Never reintroduce ESLint or Prettier. `.svelte` files are intentionally unformatted — oxfmt does not support them. See `docs/quality.md` for scope and approved exceptions.
- The oxlint baseline is **advisory, not clean** — CI's lint job is `continue-on-error` and `lint-staged` runs oxfmt only. Burn findings down in focused commits; don't disable rules to hide them.
- Conventional commits (`feat`, `fix`, `ui`, `a11y`, `perf`, `refactor`, `style`, `test`, `docs`, `chore`). Never include AI attribution or `Co-Authored-By` lines.
- Svelte 5 runes throughout `apps/{web,desktop}` and `packages/{app,ui}`. Global state stays in `svelte/store` writables (a TipTap instance lives in one) — runes conversion of stores is optional, never a prerequisite.
- `packages/ui` is CLI-owned: regenerate with `shadcn-svelte add -o` rather than hand-editing, and keep formatter churn out of it so future regen diffs stay readable. Local extensions (e.g. the button `scale` variant) are marked with a comment. **Exception: icons.** 15 primitives import from `packages/ui/components/icons/` instead of `@lucide/svelte`; a regen will revert that and reintroduce the dependency — re-point them afterwards. See `docs/architecture.md`.
- **Icons are Teenyicons, and `icon.svelte` is generated.** Edit the `MAP` in `scripts/generate-icons.mjs` and re-run it; never hand-edit `packages/app/src/components/shared/icon.svelte`. Outline variants are **stroke-based**, so colour icons with `text-*` — a `fill-*` utility silently does nothing.
- When touching storage behavior, extend the contract suite (`packages/core/src/adapter.contract.ts`) — it runs against both the real web adapter and a mock.

## Landmines

- **Tailwind sees nothing by default.** The entry CSS lives in `packages/ui`, which every app resolves through a node_modules symlink, and Tailwind 4 skips node_modules when auto-detecting sources. Every directory containing markup is declared with `@source` in `theme.css` / `app.{web,desktop}.css`. **A new package with classes in it must be added there or its utilities silently won't generate.**
- **Component CSS must use complete colours.** Tokens are full `hsl()` values, not Tailwind-3 bare channels — write `var(--border)`, never `hsl(var(--border))`, and `color-mix(in oklab, var(--foreground) 60%, transparent)` for alpha.
- **The desktop dev server is pinned to port 1420 with `strictPort`.** It must match `devUrl` in `tauri.conf.json`. On the default port Vite silently moves to the next free one while Tauri keeps loading the old address — which, with the web app running, meant the Tauri window rendered _the web app_ and every desktop-only feature looked broken.
- Tauri plugin crates and their npm packages share a version line and must match on major/minor. `tauri dev` only warns; `tauri build` hard-fails.
- **The desktop `tauri` script runs `cross-env CI=true tauri` on purpose.** Tauri's DMG bundler drives Finder over AppleScript to prettify the disk-image window, which times out (`-1712`) and fails the build after the `.app` is already built. `CI=true` makes it pass `--skip-jenkins` and skip that step; the DMG is plain but correct. Don't "clean this up" — see `docs/releasing.md`.
- **The web store is IndexedDB, database `haptic-local`** (`apps/web/src/lib/database/client.ts`). PGlite/drizzle were removed: their only job was backing a tree of text files, the live queries were two `SELECT * FROM entry` refetch hooks, and search was one `ILIKE`. Object stores replace tables; `by-collection`/`by-parent` indexes replace the WHERE filters; `watchEntries` replaces live queries. IndexedDB keys are immutable, so rename/move is delete-then-put — use `repathEntry`.
- **The Tauri updater is removed on purpose.** The v1 config pointed at upstream's `haptic.md` endpoint with upstream's signing key. Re-add `tauri-plugin-updater` only alongside our own endpoint and keypair.
- `tauri.conf.json` has no allowlist — Tauri 2 permissions live in `src-tauri/capabilities/default.json`. Filesystem access is scoped to `$HOME/**` and `$APPDATA`; new fs calls may need a new permission there. **A standalone file opened outside `$HOME` is granted access one path at a time** via the `allow_file` command — don't widen the static scope to `**` instead.
- **File associations only work in a bundled app.** `bundle.fileAssociations` registers `.md` with the OS, but `tauri dev` never registers them, so "open with" can only be tested from a real `tauri build` + install. macOS delivers these as `RunEvent::Opened`; Windows/Linux as argv through `tauri-plugin-single-instance`.
- Tauri 2's `readDir` is **not recursive**; the desktop adapter rebuilds the tree via `readDirTree` in `apps/desktop/src/lib/api/fs.ts`.
- **No CI runs automatically.** `ci.yml` and `desktop-build.yml` are `workflow_dispatch` only (triggers commented at the top of each, ready to restore), so `pnpm check`, `pnpm test`, and the builds are the real gate — run them before you claim a change works. Upstream's release/Docker/Tauri-1 workflows were deleted outright.

## Not yet built

**Markdown tables are not supported and are destructive.** No table extension is registered, so the schema has no table nodes: `tiptap-markdown` parses a table correctly, then ProseMirror discards everything it can't map and only the cell text survives. Opening a note containing a table and letting auto-save fire rewrites the file without it. Needs `@tiptap/extension-table` + row/cell/header before any note with tables is opened.

Haptic Sync is UI-only — every control in the settings pane is disabled ("Coming soon"). The shared API has centralized-auth and PostgreSQL session foundations, but note sync between web and desktop is not implemented. It is on the roadmap in `README.md`.
