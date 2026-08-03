<script lang="ts">
	import '@/adapter';
	import { loadSettings } from '@/api/settings';
	import Footer from '@haptic/app/components/layout/footer.svelte';
	import Header from '@haptic/app/components/layout/header.svelte';
	import Sidebar from '@haptic/app/components/layout/sidebar.svelte';
	import Command from '@haptic/app/components/shared/command-menu/command.svelte';
	import { importCollection } from '@/import-collection';
	import Icon from '@haptic/app/components/shared/icon.svelte';
	import { getDb, initDatabase } from '@/database/client';
	import { seedIfFresh } from '@/database/seed';
	import { createCloudCollection, getAccount } from '@haptic/core/adapter';
	import { collection } from '@/store';
	import { createDeviceDetector } from '@/utils';
	import '@haptic/ui/app.web.css';
	import { ModeWatcher } from 'mode-watcher';
	import { onMount } from 'svelte';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	// Device detector
	const device = createDeviceDetector();

	// Storage boot gate: children may read the database synchronously via
	// getDb(), so nothing that touches storage renders before init finished.
	let storageReady = $state(false);

	// Load latest collection
	async function loadLatestCollection() {
		const collections = await getDb().getAll('collection');

		if (collections.length === 0) {return;}

		// Get collection with latest lastOpened date
		const latestCollection = collections.reduce((prev, current) =>
			prev.lastOpened > current.lastOpened ? prev : current
		);

		collection.set(latestCollection.path);
	}

	async function openCloudCollectionForExistingSession() {
		try {
			if (await getAccount()) {
				await createCloudCollection();
			}
		} catch {
			// Startup remains usable offline: retain the local collection restored above.
		}
	}

	onMount(async () => {
		// Boot the browser store
		await initDatabase();

		// Seed the demo collection only on a genuinely empty database
		await seedIfFresh();

		// Load latest collection on mount
		await loadLatestCollection();

		// Load app & collection settings
		loadSettings(true, true);

		// An existing account session makes Haptic Sync the default workspace.
		await openCloudCollectionForExistingSession();

		storageReady = true;
	});
</script>

<svelte:head>
	<title>Haptic</title>
	<meta
		name="description"
		content="Haptic is a new local-first & privacy-focused home for your markdown notes. It's a minimalistic, lightweight and fast note-taking app that's designed to be distraction-free."
	/>
	<meta
		name="keywords"
		content="Haptic, Note-taking, Markdown, Local-first, Privacy-focused, Open-source, Online Markdown Editor, Fast Note-taking, Minimalistic Design"
	/>
	<meta name="author" content="Haptic" />
	<meta name="robots" content="index, follow" />
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<meta name="theme-color" content="#0F0F0F" />
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

	<!-- Open Graph. No canonical URL or share image yet: the old ones pointed at
	     upstream's haptic.md domain and its landing screenshot. -->
	<meta property="og:site_name" content="Haptic" />
	<meta property="og:locale" content="en" />
	<meta property="og:type" content="website" />
	<meta property="og:title" content="Haptic - Write Notes at the speed of touch" />
	<meta
		property="og:description"
		content="Haptic is a new local-first & privacy-focused home for your markdown notes. It's a minimalistic, lightweight and fast note-taking app that's designed to be distraction-free."
	/>

	<!-- Twitter -->
	<meta property="twitter:card" content="summary" />
	<meta property="twitter:title" content="Haptic - Write Notes at the speed of touch" />
	<meta
		property="twitter:description"
		content="Haptic is a new local-first & privacy-focused home for your markdown notes. It's a minimalistic, lightweight and fast note-taking app that's designed to be distraction-free."
	/>

	{#if import.meta.env.PROD}
		<script
			defer
			src="https://cloud.umami.is/script.js"
			data-website-id="279d8c15-20ea-4cc9-91b0-647c90767f15"
		></script>
		<script async src="https://cdn.seline.so/seline.js" data-token="d028e058129b859"></script>
	{/if}
</svelte:head>

{#if $device.isDesktop}
	<ModeWatcher />
	{#if storageReady}
		<Command {importCollection} />
		<Header />
		<Sidebar />
		<main class="flex min-h-screen w-full items-center justify-center">
			{@render children?.()}
		</main>
		<Footer />
	{/if}
{:else}
	<main class="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-5">
		<Icon name="phoneOff" class="w-9 h-9 text-secondary-foreground" />
		<div class="flex flex-col text-center gap-2">
			<h1 class="text-secondary-foreground">Seems like you're on mobile</h1>
			<p class="text-muted-foreground text-sm leading-relaxed">
				Haptic isn't yet supported on mobile devices.<br />Please try again on a desktop.
			</p>
		</div>
	</main>
{/if}

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
