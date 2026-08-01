<script lang="ts">
	import '@/adapter';
	import { loadSettings } from '@/api/settings';
	import Footer from '@haptic/app/components/layout/footer.svelte';
	import Header from '@haptic/app/components/layout/header.svelte';
	import Sidebar from '@haptic/app/components/layout/sidebar.svelte';
	import Command from '@haptic/app/components/shared/command-menu/command.svelte';
	import { appTheme, collection, platform } from '@/store';
	import { openNote, reportError, trackStandaloneFile } from '@haptic/core/adapter';
	import { normalizeSeparators } from '@haptic/core/path';
	import { ensureEditorReady } from '@haptic/app/components/shared/command-menu/commands';
	import { validateHapticFolder } from '@/utils';
	import { applyTheme, hydrateTheme, persistTheme, watchSystemTheme } from '@/theme';
	import '@haptic/ui/app.desktop.css';
	import { invoke } from '@tauri-apps/api/core';
	import { listen, type UnlistenFn } from '@tauri-apps/api/event';
	import { getCurrentWebview } from '@tauri-apps/api/webview';
	import { BaseDirectory, readTextFile } from '@tauri-apps/plugin-fs';
	import { platform as osPlatform } from '@tauri-apps/plugin-os';
	import { onDestroy, onMount } from 'svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	// Prevent right-clicking in production
	if (import.meta.env.PROD) {
		document.addEventListener('contextmenu', (event) => event.preventDefault());
	}

	// Load latest collection
	async function loadLatestCollection() {
		const collections = await readTextFile('collections.json', {
			baseDir: BaseDirectory.AppData
		}).catch(() => null);

		if (!collections) {return;}

		// Get collection with latest lastOpened date
		const latestCollection = JSON.parse(collections).sort(
			(a: { lastOpened: string | number | Date }, b: { lastOpened: string | number | Date }) => 
				new Date(b.lastOpened).getTime() - new Date(a.lastOpened).getTime()
			
		)[0];

		collection.set(latestCollection.path);
	}

	/**
	 * Opens notes the OS handed us — "open with", a Finder double-click, a drop on
	 * the dock icon, or a path on the command line.
	 *
	 * The paths are pulled rather than pushed: launching the app by opening a file
	 * delivers the event long before the webview exists, and Tauri does not buffer
	 * emits, so Rust queues them and we drain the queue here.
	 */
	async function openPendingFiles() {
		try {
			const paths = await invoke<string[]>('take_pending_files');
			if (paths.length === 0) {
				return;
			}
			// Launching by opening a file lands here before any route has mounted
			// an editor.
			await ensureEditorReady();
			for (const raw of paths) {
				const path = normalizeSeparators(raw);
				trackStandaloneFile(path);
				await openNote(path);
			}
		} catch (error) {
			reportError(`Could not open that file.\n\n${error instanceof Error ? error.message : error}`);
		}
	}

	onMount(async () => {
		// Hook the OS paths up BEFORE the (slow, and fallible) collection boot
		// below — a throw in there used to mean files opened from Finder were
		// silently dropped.
		stopListeningForOpenFiles = await listen('haptic-open-files', openPendingFiles);

		stopListeningForDrop = await getCurrentWebview().onDragDropEvent(async (event) => {
			if (event.payload.type !== 'drop') {
				return;
			}
			// Dropping onto the window doesn't go through Rust, so grant scope here.
			const notes = event.payload.paths.filter((path) => /\.(md|markdown|mdx|txt)$/i.test(path));
			try {
				if (notes.length > 0) {
					await ensureEditorReady();
				}
				for (const raw of notes) {
					const path = normalizeSeparators(raw);
					await invoke('allow_file', { path });
					trackStandaloneFile(path);
					await openNote(path);
				}
			} catch (error) {
				reportError(
					`Could not open that file.\n\n${error instanceof Error ? error.message : error}`
				);
			}
		});

		await openPendingFiles();

		// Load latest collection on mount
		await loadLatestCollection();

		// Validate haptic folder
		await validateHapticFolder($collection);

		// Load app & collection settings, then adopt the persisted theme preference
		await loadSettings(true, true);
		hydrateTheme();

		// Set platform (v2's platform() is sync and reports 'macos', not 'darwin')
		const os = osPlatform();
		platform.set(os === 'macos' ? 'darwin' : (os as 'linux' | 'windows'));
	});

	// Keep the shell's theme in sync with the preference, and follow the OS while
	// that preference is 'auto'.
	const stopWatchingTheme = appTheme.subscribe((theme) => {
		applyTheme(theme);
		persistTheme(theme);
	});
	const stopWatchingSystemTheme = watchSystemTheme();
	let stopListeningForOpenFiles: UnlistenFn | undefined;
	let stopListeningForDrop: UnlistenFn | undefined;

	onDestroy(() => {
		stopWatchingTheme();
		stopWatchingSystemTheme();
		stopListeningForOpenFiles?.();
		stopListeningForDrop?.();
	});
</script>

<Command />

<!--
	`windowChrome` centres the title and reserves room for the macOS traffic
	lights, which only macOS overlays onto the title bar. Windows and Linux keep
	their native decorations, so the header renders as an ordinary left-aligned
	bar there rather than not at all.
-->
<Header windowChrome={$platform === 'darwin'} />
<Sidebar />
<main class="flex min-h-screen w-full items-center justify-center">
	{@render children?.()}
</main>
<Footer />

<style>
	/* Custom scrollbar */
	:global(::-webkit-scrollbar) {
		width: 14px;
	}

	:global(::-webkit-scrollbar-thumb) {
		border: 4px solid rgba(0, 0, 0, 0);
		background-clip: padding-box;
		border-radius: 50px;
		background-color: var(--border);

		&:hover {
			background-color: color-mix(in oklab, var(--foreground) 15%, transparent);
		}
	}
</style>
