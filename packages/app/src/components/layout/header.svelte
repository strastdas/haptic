<script lang="ts">
	import { activeFile, collection, editorMode } from '@haptic/core/store';
	import { SHORTCUTS } from '@haptic/core/constants';
	import { basename, scopeOf, stem } from '@haptic/core/path';
	import { Button } from '@haptic/ui/components/button';
	import { cn } from '@haptic/ui/lib/utils';
	import Icon from '../shared/icon.svelte';
	import Tooltip from '../shared/tooltip.svelte';

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
	let fileName = $derived($activeFile ? stem($activeFile) : '');
</script>

<header
	class={cn(
		'absolute top-0 w-full flex items-center h-9 border-b bg-background z-40',
		windowChrome ? 'justify-center px-20' : 'justify-start px-3'
	)}
	data-tauri-drag-region
>
	<div class="pointer-events-none flex min-w-0 items-center gap-1.5 text-sm cursor-default outline-none">
		<span class="text-foreground/85 shrink-0">{collectionName}</span>
		{#if fileName}
			<span class="text-foreground/35 shrink-0" aria-hidden="true">/</span>
			<span class="text-foreground/60 truncate">{fileName}</span>
		{/if}
	</div>
	<div class="absolute right-3 flex rounded-md border border-border/70 bg-muted/30 p-0.5" role="group" aria-label="Editor mode">
		<Tooltip text="View mode" shortcut={SHORTCUTS['editor:toggle-mode']}>
			<Button
				size="icon"
				variant="ghost"
				scale="md"
				class={cn(
					'h-6 w-6 text-muted-foreground hover:bg-accent hover:text-foreground',
					$editorMode === 'view' && 'bg-accent text-foreground'
				)}
				aria-label="View mode"
				aria-pressed={$editorMode === 'view'}
				onclick={() => editorMode.set('view')}
			>
				<Icon name="textDocument" class="w-4 h-4" aria-hidden="true" />
			</Button>
		</Tooltip>
		<Tooltip text="Edit mode" shortcut={SHORTCUTS['editor:toggle-mode']}>
			<Button
				size="icon"
				variant="ghost"
				scale="md"
				class={cn(
					'h-6 w-6 text-muted-foreground hover:bg-accent hover:text-foreground',
					$editorMode === 'edit' && 'bg-accent text-foreground'
				)}
				aria-label="Edit mode"
				aria-pressed={$editorMode === 'edit'}
				onclick={() => editorMode.set('edit')}
			>
				<Icon name="text" class="w-4 h-4" aria-hidden="true" />
			</Button>
		</Tooltip>
	</div>
</header>
