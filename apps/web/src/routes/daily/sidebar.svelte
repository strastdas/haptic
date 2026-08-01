<script lang="ts">
	import { fetchCollectionEntries } from '@/api/collection';
	import { openNote } from '@/api/notes';
	import { watchEntries } from '@/database/client';
	import {
		activeFile,
		collection,
		draftFile,
		editorMode,
		collectionEntries,
		editor,
		isPageSidebarOpen,
		pageSidebarWidth,
		resizingPageSidebar
	} from '@/store';
	import type { FileEntry } from '@/types';
	import { setEditorContent } from '@/utils';
	import { Calendar } from '@haptic/ui/components/calendar';
	import { Label } from '@haptic/ui/components/label';
	import { cn } from '@haptic/ui/lib/utils';
	import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date';
import type { DateValue } from '@internationalized/date';
	import { onDestroy } from 'svelte';
	import { get } from 'svelte/store';
	import Entries from './entries.svelte';

	let calValue = $state(today(getLocalTimeZone()));
	let entries: FileEntry[] = $state([]);
	let stopWatching: () => void;

	// Watch for changes in the collection
	async function watchCollection() {
		// Was a PGlite live query on `entry`; the callback always refetched the
		// whole tree, so a plain change signal is equivalent.
		return watchEntries(async () => {
			await fetchCollectionEntries(`${$collection  }/.haptic/daily`);
		});
	}

	/*
	 * The calendar needs seven 32px columns plus the panel's own padding, so the
	 * shared 210px sidebar floor clipped the last day. This view raises it.
	 */
	const MIN_WIDTH = 248;

	if (get(pageSidebarWidth) < MIN_WIDTH) {
		pageSidebarWidth.set(MIN_WIDTH);
	}

	/**
	 * Shows a daily note in the editor. Notes that don't exist yet are opened as
	 * drafts rather than created: an empty file should never appear just because
	 * a date was visited. saveNote writes the draft out on the first change.
	 */
	const showDailyNote = (path: string, exists: boolean) => {
		if (exists) {
			openNote(path, true);
			return;
		}
		draftFile.set(null);
		setEditorContent('');
		activeFile.set(path);
		draftFile.set(path);
		editorMode.set('view');
	};

	const stopWatchingStore = collectionEntries.subscribe((value) => {
		entries = value;
	});

	const stopWatchingCollectionStore = collection.subscribe(async (value) => {
		entries = await fetchCollectionEntries(`${value  }/.haptic/daily`);

		// Validate if there is a note for today
		const today = new Date().toISOString().split('T')[0];
		const dailyExists = entries.some((entry) => entry.path.includes(today));

		// Show today's note (created lazily, only once written to)
		showDailyNote(`${value}/.haptic/daily/${today}.md`, dailyExists);

		if (value) {
			if (stopWatching) {stopWatching();}
			stopWatching = await watchCollection();
		}
	});

	const handleMouseMove = (e: MouseEvent) => {
		resizingPageSidebar.set(true);

		const {x} = e;

		// Set collapsing bounds
		if (x < 100) {
			resizingPageSidebar.set(false);
			isPageSidebarOpen.set(false);
			return;
		} else if (x > 100 && !$isPageSidebarOpen) {
			resizingPageSidebar.set(false);
			isPageSidebarOpen.set(true);
			return;
		}

		// Set width bounds
		if ($pageSidebarWidth + e.movementX < MIN_WIDTH || $pageSidebarWidth + e.movementX > 500) {
			return;
		}

		// Set cursor resize bounds to prevent resizing when cursor is outside of the width bounds
		if (x < MIN_WIDTH + 35 || x > 550) {
			return;
		}

		pageSidebarWidth.update((value) => value + e.movementX);
	};

	// Resize sidebar handler
	const resizeHandler = () => {
		// Set resizing state
		resizingPageSidebar.set(true);

		// Blur the editor
		$editor.commands.blur();

		// Set cusor-col-resize class to body
		document.body.classList.toggle('cursor-col-resize');

		// Mouse up event listener
		const handleMouseUp = () => {
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);

			// Remove cursor-col-resize class from body
			document.body.classList.remove('cursor-col-resize');

			resizingPageSidebar.set(false);
		};

		// Add event listeners
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	};

	// handle open calendar day
	const handleOpenCalendarDay = async (e: DateValue | undefined) => {
		if (!e) {return;}

		// Pad the month and day with a leading zero if they're single digits
		const paddedMonth = e.month.toString().padStart(2, '0');
		const paddedDay = e.day.toString().padStart(2, '0');

		// Create the note name with padded month and day
		const noteName = `${e.year}-${paddedMonth}-${paddedDay}.md`;

		const notePath = `${$collection}/.haptic/daily/${noteName}`;

		// Open the note if it exists. If it doesn't, show an empty editor for that
		// date instead of creating a file — clicking through the calendar should
		// never leave a trail of empty notes. The draft is written to disk by
		// saveNote the first time there's something in it.
		showDailyNote(
			notePath,
			entries.some((entry) => entry.path.includes(noteName))
		);

		// Get note element by data-path
		let noteElement = document.querySelector(
			`[data-path="${$collection}/.haptic/daily/${noteName}"]`
		);

		// If note element is not found, wait for it to be rendered
		if (!noteElement) {
			await new Promise((resolve) => setTimeout(resolve, 150));
		}

		// Get note element again - this is because if the note is newly created, it might not be rendered yet
		noteElement = document.querySelector(`[data-path="${$collection}/.haptic/daily/${noteName}"]`);

		// Scroll to note element
		if (noteElement) {
			const rect = noteElement.getBoundingClientRect();
			const isAboveView = rect.top < 0;
			const isBelowView = rect.bottom > window.innerHeight;
			if (isAboveView || isBelowView) {
				// Smooth scroll doesn't seem to work well from bottom to top
				const behavior = isAboveView ? 'auto' : 'smooth';
				noteElement.scrollIntoView({ behavior, block: 'center' });
			}
		}
	};

	// Listen to activeFile change and update calendar value
	activeFile.subscribe((value) => {
		// Extract date string from active file path
		const dateString = value?.split('/').pop()?.split('.')[0];
		if (!dateString) {return;}

		// Parse date string
		const [year, month, day] = dateString.split('-').map(Number);
		if (!year || !month || !day) {return;}

		// Update calendar value
		calValue = new CalendarDate(year, month, day);
	});

	onDestroy(() => {
		if (stopWatching) {stopWatching();}
		stopWatchingStore();
		stopWatchingCollectionStore();
	});
</script>

<div
	class={cn(
		'fixed left-12 h-[calc(100vh-4.5rem)] flex flex-col justify-start items-center bg-background overflow-y-auto transform transition-transform duration-300',
		!$isPageSidebarOpen && '-translate-x-52'
	)}
	style={`width: ${$pageSidebarWidth}px`}
>
	<!-- Drag border -->
	<div
		class="h-full w-1 border-r cursor-col-resize absolute top-0 right-0 z-10 hover:bg-foreground/10 hover:delay-75 transition-all duration-200 active:bg-foreground/20 active:!cursor-col-resize"
		onmousedown={resizeHandler}
		role="presentation"
	></div>

	<Calendar
		type="single"
		bind:value={calValue}
		class="border-b w-full shrink-0"
		onValueChange={handleOpenCalendarDay}
	/>

	<!-- Note Entries -->
	<div
		class="flex flex-col items-start gap-2 w-full h-full overflow-auto pt-2.5 px-2 pb-2"
		data-collection-root
		data-path={$collection + '/.haptic/daily'}
	>
		{#if entries.length === 0}
			<div class="w-full h-full flex flex-col gap-1 items-center justify-center">
				<Label class="text-muted-foreground text-xs text-center">No daily notes found</Label>
			</div>
		{:else}
			<Entries {entries} />
		{/if}
	</div>
</div>

<style>
	:global(body.cursor-col-resize) {
		/* cursor: col-resize !important;
		user-select: none !important; */
		pointer-events: none;
	}
</style>
