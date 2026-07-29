import { defineConfig } from 'oxlint';
import baseConfig from '@strastdas/oxc-config/base';

// Repo-local scope only (see @strastdas/oxc-config QUALITY.md for policy):
// - `base` profile: this is a Svelte/Tauri monorepo, not Next.js.
// - apps/homepage is excluded (out of scope for the revival; still on its own ESLint 9 setup).
// - .svelte files are linted by oxlint's script extraction; template-level rules are
//   covered by svelte-check, not oxlint. oxfmt does not format .svelte (unsupported).
export default defineConfig({
  extends: [baseConfig],
  ignorePatterns: [
    '**/node_modules/**',
    '**/.svelte-kit/**',
    '**/build/**',
    '**/dist/**',
    'apps/desktop/src-tauri/target/**',
    'apps/homepage/**',
    'pnpm-lock.yaml'
  ],
  overrides: [
    {
      // Svelte compiler idioms that generic JS rules misidentify (QUALITY.md: valid
      // narrow exception — framework patterns). Re-evaluated 2026-07-29 after the
      // Svelte 5 runes migration: `import/no-mutable-exports` and `eslint/no-labels`
      // no longer fire (no `export let` props or `$:` labels left) and were removed.
      // `prefer-const` (455 hits) stays: `$state` variables are reassigned from the
      // template/bindings, invisible to oxlint's script view. `no-useless-undefined`
      // (10 hits) stays for `= $state(undefined)`-style optional props.
      files: ['**/*.svelte'],
      rules: {
        'eslint/prefer-const': 'off',
        'unicorn/no-useless-undefined': 'off'
      }
    }
  ]
});
