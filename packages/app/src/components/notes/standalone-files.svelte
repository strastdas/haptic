<script lang="ts">
	import { closeStandaloneFile, openNote } from '@haptic/core/adapter';
	import { basename, stem } from '@haptic/core/path';
	import { activeFile, standaloneFiles } from '@haptic/core/store';
	import { Button } from '@haptic/ui/components/button';
	import { Label } from '@haptic/ui/components/label';
	import { cn } from '@haptic/ui/lib/utils';
	import Icon from '../shared/icon.svelte';
	import Tooltip from '../shared/tooltip.svelte';

	/**
	 * Notes opened outside any collection ("Open file…", or a double-click in the
	 * OS file manager). They have no row in the collection tree, so they are
	 * listed separately above it — closing one only removes it from this list,
	 * it never touches the file on disk.
	 */
</script>

{#if $standaloneFiles.length > 0}
	<div class="flex w-full flex-col items-start gap-0.5">
		<Label class="px-2 text-xs text-muted-foreground">Open files</Label>
		{#each $standaloneFiles as path (path)}
			<div class="group/file flex w-full items-center">
				<Button
					size="sm"
					variant="ghost"
					scale="sm"
					class={cn(
						'h-7 flex-1 min-w-0 justify-start gap-2 pl-3 text-secondary-foreground/80 transition-all hover:text-foreground',
						$activeFile === path && 'bg-accent text-foreground'
					)}
					onclick={() => openNote(path)}
				>
					<Icon name="noteOutline" class="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
					<span class="truncate">{stem(path)}</span>
				</Button>
				<Tooltip text="Close file" side="right">
					<button
						class="mr-1 shrink-0 rounded-sm p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-accent hover:text-foreground focus-visible:opacity-100 group-hover/file:opacity-100"
						aria-label={`Close ${basename(path)}`}
						onclick={() => closeStandaloneFile(path)}
					>
						<Icon name="x" class="w-3 h-3" />
					</button>
				</Tooltip>
			</div>
		{/each}
	</div>
{/if}
