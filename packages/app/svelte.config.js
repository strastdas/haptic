// Minimal config so tooling (svelte-check / svelte-language-server) treats this
// source-only package as a Svelte 5 project instead of falling back to the
// legacy svelte-preprocess pipeline. The Svelte 5 compiler handles
// <script lang="ts"> natively; no preprocessors are needed here.
export default {};
