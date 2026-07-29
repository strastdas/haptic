// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharedConfig = require('./tailwind-preset.cjs');

module.exports = {
  presets: [sharedConfig],
  darkMode: ['class'],
  content: ['./src/**/*.{html,js,svelte,ts}']
};
