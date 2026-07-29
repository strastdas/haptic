# Quality tooling

This repository follows the [`@strastdas/oxc-config` QUALITY.md](https://www.npmjs.com/package/@strastdas/oxc-config) policy. This document records only repository-local scope and approved exceptions.

## Tooling

- **Lint**: `pnpm lint:oxc` — oxlint with the `@strastdas/oxc-config/base` profile (this is a Svelte/Tauri monorepo, not Next.js).
- **Format**: `pnpm format` / `pnpm format:check:oxc` — oxfmt, config migrated from the repo's previous `.prettierrc` (single quotes, no trailing commas, print width 100).
- **Typecheck**: `pnpm check` — `svelte-check` per app via Turbo.
- **Rust** (`apps/desktop/src-tauri`): `cargo fmt --check` and `cargo clippy --all-targets -- -D warnings`, enforced by the `rust-lint` job in `desktop-build.yml`. Unlike the JS baseline, Rust lint is **blocking** — it is already clean.

## Local scope

- `apps/homepage` is excluded from oxlint (out of scope for the modernization; it keeps its own self-contained ESLint 9 setup until it is either adopted or retired). It is the only place ESLint/Prettier still exist — everywhere else they are removed, and the former `@haptic/eslint-config` package is deleted.
- `.svelte` files are **not formatted** — oxfmt does not support Svelte templates. Per policy, no second formatter is reintroduced; `svelte-check` + oxlint cover Svelte correctness.
- Generated/vendor paths ignored: `.svelte-kit`, `build`, `dist`, `src-tauri/target`, lockfiles.

## Approved exceptions

- `**/*.svelte` override in `oxlint.config.mjs` disables `eslint/prefer-const` and `unicorn/no-useless-undefined`. Re-evaluated 2026-07-29 after the Svelte 5 runes migration: `import/no-mutable-exports` and `eslint/no-labels` no longer fire (no `export let` props or `$:` labels remain) and were **removed** from the override. The two kept rules are still structural false positives: `$state` variables are reassigned from templates/bindings (invisible to oxlint's script extraction, 455 hits) and `= $state(undefined)` marks optional props (10 hits).
- `apps/web/src/lib/database/migrations/index.ts` carries two inline `no-await-in-loop` disables: migrations (and the statements within each) must apply strictly sequentially.

## Testing

- **Unit/contract**: `pnpm test` — Vitest workspace with a `core` project (pure utils + StorageAdapter contract vs. an in-memory mock) and a `web` project (the same contract vs. the real adapter on in-memory PGlite, plus migrations-runner and search tests).
- **E2E**: `pnpm --filter=web test:e2e` — Playwright smoke specs against a production build served by `vite preview` (see `apps/web/playwright.config.ts`); run `pnpm --filter=web exec playwright install chromium` once first.
- CI (`.github/workflows/ci.yml`): `lint` (advisory), `check`, `test`, `build-web`, `e2e`; plus the required Tauri build in `desktop-build.yml` on desktop-affecting PRs. Renovate (`renovate.json`) runs monthly with grouped tauri/tiptap updates.

## Migration status

- Baseline re-recorded 2026-07-29 (post Phase 5/6): 583 advisory oxlint findings (mostly `no-non-null-assertion`, `prefer-destructuring`, `no-use-before-define`, `no-await-in-loop`, DOM-idiom rules; the count rose vs. the initial ~460 because the `.svelte` override list was tightened — see above). Burn down in focused commits; do not weaken shared rules to hide them.
- Because the baseline is not clean, `lint-staged` runs **oxfmt only** and the CI lint job is **advisory** (`continue-on-error`). Both become blocking once the baseline is clean.
