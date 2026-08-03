<script lang="ts">
	import { canDownloadCloudNote, downloadCloudNote } from '@haptic/core/adapter';
	import { activeFile, collection, editorMode } from '@haptic/core/store';
	import { basename, scopeOf, stem } from '@haptic/core/path';
	import { cn } from '@haptic/ui/lib/utils';
	import Icon from '../shared/icon.svelte';

	interface Props {
		/**
		 * Centre the title and reserve room on both sides. The desktop shell sets
		 * this: the title bar doubles as the macOS window chrome, so the title has
		 * to clear the traffic lights (~78px) and stay visually centred in the
		 * window. Passed explicitly rather than read from a store so the layout
		 * can't depend on bootstrap ordering.
		 */
		windowChrome?: boolean;
	}

	let { windowChrome = false }: Props = $props();
	let isDownloadingNote = $state(false);
	let downloadError = $state(false);

	let collectionName = $derived.by(() => {
		if (!$collection) {
			return '';
		}
		return scopeOf($collection) === 'cloud' ? 'Haptic Sync' : basename($collection);
	});
	let fileName = $derived($activeFile ? stem($activeFile) : '');
	let canDownloadActiveNote = $derived(
		Boolean($activeFile && scopeOf($activeFile) === 'cloud' && canDownloadCloudNote())
	);

	async function handleDownloadActiveNote() {
		if (!$activeFile) {
			return;
		}

		isDownloadingNote = true;
		downloadError = false;
		try {
			await downloadCloudNote($activeFile);
		} catch {
			downloadError = true;
		} finally {
			isDownloadingNote = false;
		}
	}
</script>

<header
	class={cn(
		'absolute top-0 w-full flex items-center h-9 border-b bg-background z-40',
		windowChrome ? 'justify-center px-20' : 'justify-start px-3'
	)}
	data-tauri-drag-region
>
	<div class="flex min-w-0 items-center gap-1.5 text-sm">
		<div class="pointer-events-none flex min-w-0 items-center gap-1.5 cursor-default outline-none">
			<span class="text-foreground/85 shrink-0">{collectionName}</span>
			{#if fileName}
				<span class="text-foreground/35 shrink-0" aria-hidden="true">/</span>
				<span class="text-foreground/60 truncate">{fileName}</span>
			{/if}
			{#if $editorMode === 'edit'}
				<span
					class="ml-1 inline-flex h-[18px] shrink-0 items-center rounded bg-accent px-1.5 text-[11px] font-medium text-foreground/80"
				>
					Editing
				</span>
			{/if}
		</div>
		{#if canDownloadActiveNote}
			<button
				class="flex size-6 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
				aria-label={`Download ${fileName}`}
				disabled={isDownloadingNote}
				onclick={() => void handleDownloadActiveNote()}
			>
				<Icon name="download" class="size-3.5" aria-hidden="true" />
			</button>
		{/if}
		{#if downloadError}
			<span class="text-destructive text-xs" role="status">Couldn’t download note.</span>
		{/if}
	</div>
</header>
