<script lang="ts">
	import EditorSearch from '@haptic/app/components/shared/editor/search.svelte';
	import EditorToolbar from '@haptic/app/components/shared/editor/toolbar.svelte';
	import { createNote } from '@/api/notes';
	import Editor from '@haptic/app/components/shared/editor/editor.svelte';
	import { SHORTCUTS } from '@/constants';
	import { activeFile, collection, collectionSettings } from '@/store';
	import { shortcutToString } from '@/utils';
	import { cn } from '@haptic/ui/lib/utils';
</script>

<div
	class="relative flex flex-col w-full h-full min-h-[calc(100vh-4.5rem)] items-start bg-secondary-background overflow-y-auto scroll-p-20"
>
	{#if $collectionSettings.editor.show_toolbar}
		<EditorToolbar />
	{/if}

	<div
		class={cn(
			'flex flex-col items-center justify-center w-full h-full -mt-10',
			$activeFile !== null && 'hidden'
		)}
	>
		<!-- Row with following options: Open collection, create note -->
		<div class="flex flex-col items-center gap-2">
			<p class="text-secondary-foreground/85">Select a note to start editing</p>
			<div class="flex gap-5">
				<button
					class="text-sm gap-1.5 flex text-muted-foreground hover:text-secondary-foreground transition-colors items-center justify-center"
					onclick={() => {
						document.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', metaKey: true }));
					}}
				>
					<span
						class="pointer-events-none inline-flex h-[18px] pl-1.5 tracking-widest select-none items-center gap-1 rounded bg-secondary px-1 font-mono text-muted-foreground opacity-100"
					>
						{shortcutToString(SHORTCUTS['app:open-collection'])}
					</span>
					Open Collection</button
				>
				<button
					class="text-sm gap-1.5 flex text-muted-foreground hover:text-secondary-foreground transition-colors items-center justify-center"
					onclick={() => {
						createNote($collection);
					}}
				>
					<span
						class="pointer-events-none inline-flex h-[18px] pl-1.5 tracking-widest select-none items-center gap-1 rounded bg-secondary px-1 font-mono text-muted-foreground opacity-100"
					>
						{shortcutToString(SHORTCUTS['notes:create'])}
					</span>
					Create note
				</button>
			</div>
		</div>
	</div>
	<div class={cn('w-full h-full', $activeFile === null && 'hidden')}>
		<EditorSearch />
		<Editor />
	</div>
</div>
