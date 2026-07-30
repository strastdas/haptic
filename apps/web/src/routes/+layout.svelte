<script lang="ts">
	import '@/adapter';
	import { loadSettings } from '@/api/settings';
	import Footer from '@haptic/app/components/layout/footer.svelte';
	import Header from '@haptic/app/components/layout/header.svelte';
	import Sidebar from '@haptic/app/components/layout/sidebar.svelte';
	import Command from '@haptic/app/components/shared/command-menu/command.svelte';
	import { importCollection } from '@/import-collection';
	import Icon from '@haptic/app/components/shared/icon.svelte';
	import { getDb, initDatabase, legacyDatabaseExists } from '@/database/client';
	import { runMigrations } from '@/database/migrations';
	import { seedIfFresh } from '@/database/seed';
	import { collection as collectionTable } from '@/database/schema';
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

	// Storage boot gate: children may query the database synchronously via
	// getDb(), so nothing that touches storage renders before init + migrations
	// finished. Migration failures surface (no catch-and-ignore).
	let storageReady = $state(false);

	// Upgrade notice for pre-0.3 PGlite data (lives under the old idb name).
	const LEGACY_NOTICE_KEY = 'haptic-legacy-notice-dismissed';
	let showLegacyNotice = $state(false);

	function dismissLegacyNotice() {
		window.localStorage.setItem(LEGACY_NOTICE_KEY, 'true');
		showLegacyNotice = false;
	}

	// Load latest collection
	async function loadLatestCollection() {
		const collections = await getDb().select().from(collectionTable);

		if (!collections || collections.length === 0) {return;}

		// Get collection with latest lastOpened date
		const latestCollection = collections.reduce((prev, current) =>
			prev.lastOpened > current.lastOpened ? prev : current
		);

		collection.set(latestCollection.path);
	}

	onMount(async () => {
		// Boot the database and bring the schema up to date
		const client = await initDatabase();
		const migration = await runMigrations(client);

		// Seed the demo collection only on a genuinely fresh database
		await seedIfFresh(client, migration);

		// Offer the upgrade notice if a pre-0.3 database exists under the old idb name
		if (
			window.localStorage.getItem(LEGACY_NOTICE_KEY) !== 'true' &&
			(await legacyDatabaseExists())
		) {
			showLegacyNotice = true;
		}

		// Load latest collection on mount
		await loadLatestCollection();

		// Load app & collection settings
		loadSettings(true, true);

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
		{#if showLegacyNotice}
			<div
				class="fixed bottom-12 left-1/2 z-50 flex w-fit max-w-[90vw] -translate-x-1/2 items-center gap-3 rounded-md border bg-secondary px-4 py-2.5 text-sm text-secondary-foreground shadow-md"
				role="status"
			>
				<p>
					Notes from a previous version were found. Import support is coming — your old data is
					untouched.
				</p>
				<button
					class="shrink-0 rounded-sm px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground"
					onclick={dismissLegacyNotice}
				>
					Dismiss
				</button>
			</div>
		{/if}
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
		<Icon name="phoneOff" class="w-9 h-9 fill-none text-secondary-foreground" />
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
