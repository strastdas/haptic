import { readFileSync, writeFileSync } from 'node:fs';
const data = JSON.parse(
  readFileSync(
    process.argv[2] ??
      new URL('../node_modules/@iconify-json/teenyicons/icons.json', import.meta.url).pathname,
    'utf8'
  )
);

// Existing key -> teenyicons name. Solid variants kept where the UI used a
// filled icon (settings nav, active states).
const MAP = {
  moon: 'moon-outline',
  sun: 'sun-outline',
  monitor: 'computer-outline',
  settings: 'cog-outline',
  settingsSolid: 'cog-solid',
  folder: 'folder-outline',
  folderOpen: 'folder-solid',
  folderPlus: 'folder-plus-outline',
  note: 'file-outline',
  noteOutline: 'note-outline',
  notePlus: 'file-plus-outline',
  searchBars: 'search-outline',
  calendarEdit: 'calendar-outline',
  calendarTick: 'calendar-tick-outline',
  lifebouy: 'lifebuoy-outline',
  home: 'home-outline',
  checkSquare: 'clipboard-tick-outline',
  bolt: 'keyboard-outline',
  editPencil: 'edit-outline',
  editPencilSolid: 'edit-solid',
  bin: 'bin-outline',
  copy: 'documents-outline',
  eye: 'eye-outline',
  glasses: 'eye-closed-outline',
  motionCirclesLines: 'send-outline',
  sidebarArrow: 'left-outline',
  arrowLeft: 'arrow-left-outline',
  arrowRight: 'arrow-right-outline',
  arrowUp: 'arrow-up-outline',
  arrowDown: 'arrow-down-outline',
  chevron: 'right-outline',
  floppy: 'save-outline',
  cursorI: 'text-outline',
  text: 'text-outline',
  textDocument: 'text-document-outline',
  sidebarMenuLeft: 'view-column-outline',
  sidebarMenuRight: 'info-outline',
  x: 'x-outline',
  expandAlt: 'expand-alt-outline',
  minimiseAlt: 'minimise-alt-outline',
  opactiySolid: 'adjust-horizontal-solid',
  cloudX: 'x-circle-outline',
  safe: 'safe-outline',
  undoCircle: 'anti-clockwise-outline',
  infoCircle: 'info-circle-outline',
  layer: 'layers-outline',
  phoneOff: 'mobile-outline',
  // Needed by components that used lucide directly.
  chevronDown: 'down-outline',
  chevronUp: 'up-outline',
  chevronLeft: 'left-outline',
  chevronRight: 'right-outline',
  loader: 'loader-outline',
  check: 'tick-outline',
  search: 'search-outline',
  download: 'download-outline',
  replace: 'refresh-outline',
  replaceAll: 'refresh-alt-outline',
  caseSensitive: 'text-outline',
  wholeWord: 'paragraph-outline'
};

const missing = Object.entries(MAP).filter(([, v]) => !data.icons[v]);
if (missing.length) {
  console.error('MISSING:', missing.map(([k, v]) => `${k}=${v}`).join(', '));
  process.exit(1);
}

const entries = Object.entries(MAP)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([key, name]) => {
    const body = data.icons[name].body.replaceAll('`', '\\`').replaceAll('${', '\\${');
    return `\t\t${key}: {\n\t\t\tbox: ${data.width},\n\t\t\tsvg: \`${body}\`\n\t\t}`;
  });

const out = `<script module lang="ts">
	/*
	 * Teenyicons (https://icones.js.org/collection/teenyicons), inlined.
	 *
	 * Bodies are copied verbatim from @iconify-json/teenyicons, which is a
	 * devDependency used only by scripts/generate-icons.mjs — nothing ships it at
	 * runtime. Regenerate with \`node scripts/generate-icons.mjs\` after editing the
	 * MAP in that script.
	 *
	 * All icons are 15x15. Outline variants are STROKE-based
	 * (\`fill="none" stroke="currentColor"\`), so colour them with \`text-*\`, not
	 * \`fill-*\`; solid variants use \`fill="currentColor"\` and follow \`text-*\` too.
	 */
	let icons = {
${entries.join(',\n')}
	};

	export type IconKey = keyof typeof icons;
</script>

<script lang="ts">
	interface Props {
		name: IconKey;
		[key: string]: any;
	}

	let { name, ...props }: Props = $props();
	let displayIcon = $derived(icons[name]);
</script>

<svg
	class={props.class}
	width="1em"
	height="1em"
	viewBox="0 0 {displayIcon.box} {displayIcon.box}"
	{...props}
>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html displayIcon.svg}
</svg>
`;
writeFileSync('packages/app/src/components/shared/icon.svelte', out);
console.log('generated', entries.length, 'icons');
