<script lang="ts">
	import { activeFile, collection, editorMode } from '@haptic/core/store';
	import { basename, scopeOf } from '@haptic/core/path';
	import { cn } from '@haptic/ui/lib/utils';

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

	let collectionName = $derived.by(() => {
		if (!$collection) {
			return '';
		}
		return scopeOf($collection) === 'cloud' ? 'Haptic Sync' : basename($collection);
	});
	let fileName = $derived($activeFile ? basename($activeFile) : '');
</script>

<header
	class={cn(
		'absolute top-0 w-full flex items-center h-9 border-b bg-background z-40',
		windowChrome ? 'justify-center px-20' : 'justify-start px-3'
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
