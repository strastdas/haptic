<script lang="ts">
	import { activeFile, collection, editorMode, isDesktopApp } from '@haptic/core/store';
	import { cn } from '@haptic/ui/lib/utils';

	let collectionName = $derived($collection?.split('/').pop() || '');
	let fileName = $derived($activeFile?.split('/').pop() || '');
</script>

<header
	class={cn(
		'absolute top-0 w-full flex items-center h-9 border-b bg-background z-40',
		$isDesktopApp ? 'justify-center pl-12' : 'justify-end px-1.5'
	)}
	data-tauri-drag-region
>
	<div
		class={cn(
			'pointer-events-none flex items-center gap-1.5 text-sm cursor-default outline-none',
			// Centred against the header rather than the leftover flex space, so the
			// title stays put no matter what sits next to it.
			!$isDesktopApp && 'absolute left-1/2 -translate-x-1/2'
		)}
	>
		<span class="text-foreground/85">{collectionName}</span>
		{#if fileName}
			<span class="text-foreground/35" aria-hidden="true">/</span>
			<span class="text-foreground/60 max-w-64 truncate">{fileName}</span>
		{/if}
		{#if $editorMode === 'edit'}
			<span
				class="ml-1 inline-flex h-[18px] items-center rounded bg-accent px-1.5 text-[11px] font-medium text-foreground/80"
			>
				Editing
			</span>
		{/if}
	</div>
</header>
