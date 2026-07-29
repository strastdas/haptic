# Quality tooling

This repository follows the [`@strastdas/oxc-config` QUALITY.md](https://www.npmjs.com/package/@strastdas/oxc-config) policy. This document records only repository-local scope and approved exceptions.

## Tooling

- **Lint**: `pnpm lint:oxc` — oxlint with the `@strastdas/oxc-config/base` profile (this is a Svelte/Tauri monorepo, not Next.js).
- **Format**: `pnpm format` / `pnpm format:check:oxc` — oxfmt, config migrated from the repo's previous `.prettierrc` (single quotes, no trailing commas, print width 100).
- **Typecheck**: `pnpm check` — `svelte-check` per app via Turbo.

## Local scope

- `apps/homepage` is excluded from oxlint (out of scope for the modernization; it keeps its own self-contained ESLint 9 setup until it is either adopted or retired).
- `.svelte` files are **not formatted** — oxfmt does not support Svelte templates. Per policy, no second formatter is reintroduced; `svelte-check` + oxlint cover Svelte correctness.
- Generated/vendor paths ignored: `.svelte-kit`, `build`, `dist`, `src-tauri/target`, lockfiles.

## Approved exceptions

- `**/*.svelte` override in `oxlint.config.mjs` disables `import/no-mutable-exports`, `eslint/no-labels`, `eslint/prefer-const`, `unicorn/no-useless-undefined`: Svelte 4 compiler idioms (`export let` props, `$:` reactive labels, `= undefined` optional props, template-side reassignment invisible to oxlint). **Revisit when components migrate to Svelte 5 runes.**

## Migration status

- Baseline recorded 2026-07-29: ~460 advisory oxlint findings remain after the safe `--fix` pass (mostly `no-non-null-assertion`, `prefer-destructuring`, `no-use-before-define`, DOM-idiom rules). Burn down in focused commits; do not weaken shared rules to hide them.
- Because the baseline is not clean, `lint-staged` runs **oxfmt only** and the CI lint job is **advisory** (`continue-on-error`). Both become blocking once the baseline is clean.
