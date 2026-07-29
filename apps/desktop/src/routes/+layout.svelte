<script lang="ts">
	import '@/adapter';
	import { loadSettings } from '@/api/settings';
	import Footer from '@haptic/app/components/layout/footer.svelte';
	import Header from '@haptic/app/components/layout/header.svelte';
	import Sidebar from '@haptic/app/components/layout/sidebar.svelte';
	import { getCurrentWindow } from '@tauri-apps/api/window';
	import Command from '@haptic/app/components/shared/command-menu/command.svelte';
	import { appTheme, collection, platform } from '@/store';
	import { updateWindowTheme, validateHapticFolder } from '@/utils';
	import '@haptic/ui/app.desktop.css';
	import { BaseDirectory, readTextFile } from '@tauri-apps/plugin-fs';
	import { platform as osPlatform } from '@tauri-apps/plugin-os';
	import { onMount } from 'svelte';
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

	onMount(async () => {
		// Load latest collection on mount
		await loadLatestCollection();

		// Validate haptic folder
		await validateHapticFolder($collection);

		// Load app & collection settings
		loadSettings(true, true);

		// Set platform (v2's platform() is sync and reports 'macos', not 'darwin')
		const os = osPlatform();
		platform.set(os === 'macos' ? 'darwin' : (os as 'linux' | 'windows'));
	});

	// Keep local theme synced
	appTheme.subscribe(async (value) => {
		// Update app theme ('auto' -> null follows the OS theme)
		await getCurrentWindow()
			.setTheme(value === 'auto' ? null : value)
			.catch((error) => console.error('Failed to set window theme:', error));

		// Update window theme
		updateWindowTheme();
	});
</script>

<Command />

{#if $platform === 'darwin'}
	<Header />
{/if}
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
