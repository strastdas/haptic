<script lang="ts">
	import { activeFile, collection, editorMode, isDesktopApp } from '@haptic/core/store';
	import { cn } from '@haptic/ui/lib/utils';

	let collectionName = $derived($collection?.split('/').pop() || '');
	let fileName = $derived($activeFile?.split('/').pop() || '');
</script>

<header
	class={cn(
		'absolute top-0 w-full flex items-center h-9 border-b bg-background z-40',
		// Centred on desktop. The padding is symmetric and wide enough to clear the
		// macOS traffic lights (~78px): justify-center only centres while the title
		// fits, so a long one has to run out from a safe left edge, not under them.
		$isDesktopApp ? 'justify-center px-20' : 'justify-start px-3'
	)}
	data-tauri-drag-region
>
	<div
		class="pointer-events-none flex items-center gap-1.5 text-sm cursor-default outline-none min-w-0"
	>
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
</header>
