# Haptic — agent guide

Local-first markdown notes app. Fork of [chroxify/haptic](https://github.com/chroxify/haptic) (inactive since early 2025), maintained here. **AGPLv3 — the license and upstream attribution must stay.**

## Layout

pnpm + Turborepo workspace (`apps/*`, `packages/*`).

| Path              | What it is                                                                                                                                     |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`        | SvelteKit SPA (`ssr = false`, adapter-static). Storage = PGlite (Postgres in the browser) + drizzle.                                           |
| `apps/desktop`    | Same UI in Tauri 2. Storage = real `.md` files via the Tauri filesystem plugin.                                                                |
| `apps/homepage`   | Marketing site. **Out of scope** — still Svelte 4 / Tailwind 3 with its own vendored UI and ESLint setup. Don't modernize it as a side effect. |
| `packages/core`   | `@haptic/core` — types, stores, constants, pure utils, and the `StorageAdapter` seam.                                                          |
| `packages/editor` | `@haptic/editor` — global TipTap instance store, `setEditorContent`, the `SearchAndReplace` extension.                                         |
| `packages/app`    | `@haptic/app` — shared feature components (command menu, settings, layout, editor UI, notes panes).                                            |
| `packages/ui`     | `@haptic/ui` — shadcn-svelte primitives + the Haptic theme.                                                                                    |

## The one architectural rule

**The two apps share everything except storage.** Platform differences go through one of three seams in `@haptic/core`, never through conditional imports:

1. `StorageAdapter` (`packages/core/src/adapter.ts`) — each app registers its implementation at boot (`lib/adapter.ts`, imported for its side effect from the root layout). Shared code calls the delegating free functions (`createNote`, `fetchCollectionEntries`, …), which throw if no adapter is registered.
2. `PlatformActions` (same file) — `setTheme` / `toggleTheme` / `openExternal` / `showInFolder`, registered the same way.
3. Stores — `platform` (which OS), `isDesktopApp` (which shell), `appTheme`.

`packages/app` must never import `@tauri-apps/*`, PGlite, or drizzle. If shared code needs a platform capability, add it to a seam. Web-only UI (e.g. the `webkitdirectory` collection import) is injected as a prop from the app.

Anything genuinely divergent stays app-local: routes (`src/routes/**`), `lib/api/*`, `lib/database` (web), `src-tauri` (desktop).

## Commands

```fish
pnpm install
pnpm dev                  # all apps; ASK before starting a dev server
pnpm --filter=desktop dev:tauri
pnpm check                # svelte-check — run after any code change
pnpm test                 # vitest (unit + StorageAdapter contract)
pnpm --filter=web test:e2e  # playwright (builds + previews; needs `playwright install chromium` once)
pnpm build --filter=web --filter=desktop
pnpm lint:oxc / pnpm format
cd apps/desktop/src-tauri && cargo check   # Rust
```

Package manager is **pnpm** (see `packageManager` in the root `package.json`). Node >= 22.

## Conventions

- **Lint/format is Oxc** (oxlint + oxfmt via `@strastdas/oxc-config`). Never reintroduce ESLint or Prettier. `.svelte` files are intentionally unformatted — oxfmt does not support them. See `docs/quality.md` for scope and approved exceptions.
- The oxlint baseline is **advisory, not clean** — CI's lint job is `continue-on-error` and `lint-staged` runs oxfmt only. Burn findings down in focused commits; don't disable rules to hide them.
- Conventional commits (`feat`, `fix`, `ui`, `a11y`, `perf`, `refactor`, `style`, `test`, `docs`, `chore`). Never include AI attribution or `Co-Authored-By` lines.
- Svelte 5 runes throughout `apps/{web,desktop}` and `packages/{app,ui}`. Global state stays in `svelte/store` writables (a TipTap instance lives in one) — runes conversion of stores is optional, never a prerequisite.
- `packages/ui` is CLI-owned: regenerate with `shadcn-svelte add -o` rather than hand-editing, and keep formatter churn out of it so future regen diffs stay readable. Local extensions (e.g. the button `scale` variant) are marked with a comment.
- When touching storage behavior, extend the contract suite (`packages/core/src/adapter.contract.ts`) — it runs against both the real web adapter and a mock.

## Landmines

- **PGlite data dir is `idb://haptic-v2`.** The pre-0.3 `idb://haptic` is deliberately left untouched for a future importer — never point the app back at it or delete it.
- **The Tauri updater is removed on purpose.** The v1 config pointed at upstream's `haptic.md` endpoint with upstream's signing key. Re-add `tauri-plugin-updater` only alongside our own endpoint and keypair.
- `tauri.conf.json` has no allowlist — Tauri 2 permissions live in `src-tauri/capabilities/default.json`. Filesystem access is scoped to `$HOME/**` and `$APPDATA`; new fs calls may need a new permission there.
- Tauri 2's `readDir` is **not recursive**; the desktop adapter rebuilds the tree via `readDirTree` in `apps/desktop/src/lib/api/fs.ts`.
- Web migrations must never swallow errors — the runner in `lib/database/migrations/index.ts` applies files once, transactionally, tracked in `haptic_migrations`, and rethrows.
- **No CI runs automatically.** `ci.yml` and `desktop-build.yml` are `workflow_dispatch` only (triggers commented at the top of each, ready to restore), so `pnpm check`, `pnpm test`, and the builds are the real gate — run them before you claim a change works. Upstream's release/Docker/Tauri-1 workflows were deleted outright.

## Not yet built

Haptic Sync is UI-only — every control in the settings pane is disabled ("Coming soon"); there is no sync of any kind between web and desktop. The legacy-PGlite importer is stubbed as a dismissible notice. Both are on the roadmap in `README.md`.
