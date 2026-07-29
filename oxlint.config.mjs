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
      // Svelte 4 compiler idioms that generic JS rules misidentify (QUALITY.md: valid
      // narrow exception — framework patterns). `export let` props are mutable by
      // design, `$:` is a reactive label, `= undefined` marks optional props, and
      // reassignments often happen in the template, invisible to oxlint's script view.
      // Revisit when Phase 3 migrates components to Svelte 5 runes.
      files: ['**/*.svelte'],
      rules: {
        'import/no-mutable-exports': 'off',
        'eslint/no-labels': 'off',
        'eslint/prefer-const': 'off',
        'unicorn/no-useless-undefined': 'off'
      }
    }
  ]
});
