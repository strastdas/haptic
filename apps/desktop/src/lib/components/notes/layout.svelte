<script lang="ts">
	import { cn } from '@/utils';
	import NoteDetails from './details.svelte';
	import {
		isPageSidebarOpen,
		pageSidebarWidth,
		resizingPageSidebar,
		platform,
		isNoteDetailSidebarOpen,
		noteDetailSidebarWidth,
		resizingNoteDetailSidebar
	} from '@/store';

	
	interface Props {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		sidebar: any;
		children?: import('svelte').Snippet;
	}

	let { sidebar, children }: Props = $props();

	const SvelteComponent = $derived(sidebar);
</script>

<div
	class={cn(
		'flex flex-col w-full h-[calc(100vh-4.5rem)] bg-secondary-background ml-12 overflow-hidden',
		$platform !== 'darwin' && 'h-[100vh]'
	)}
>
	<SvelteComponent />
	<div
		class="h-full overflow-y-auto"
		style={`
					margin-left: ${$isPageSidebarOpen ? $pageSidebarWidth : 0}px; 
					margin-right: ${$isNoteDetailSidebarOpen ? $noteDetailSidebarWidth : 0}px; 
					transition: ${
						$resizingPageSidebar || $resizingNoteDetailSidebar
							? 'none'
							: 'margin-left 300ms, margin-right 300ms'
					}
			`}
	>
		{@render children?.()}
	</div>
	<NoteDetails />
</div>
