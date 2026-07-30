<script lang="ts">
	import { fetchCollectionEntries } from '@/api/collection';
	import { openNote } from '@/api/notes';
	import {
		activeFile,
		collection,
		draftFile,
		editorMode,
		editor,
		isPageSidebarOpen,
		pageSidebarWidth,
		resizingPageSidebar,
		platform
	} from '@/store';
	import { setEditorContent } from '@/utils';
	import { get } from 'svelte/store';
	import { Calendar } from '@haptic/ui/components/calendar';
	import { Label } from '@haptic/ui/components/label';
	import { cn } from '@haptic/ui/lib/utils';
	import { CalendarDate, getLocalTimeZone, today } from '@internationalized/date';
import type { DateValue } from '@internationalized/date';
	import type { FileEntry } from '@/types';
	import { type UnwatchFn, watchImmediate } from '@tauri-apps/plugin-fs';
	import Entries from './entries.svelte';

	let calValue = $state(today(getLocalTimeZone()));
	let entries: FileEntry[] = $state([]);
	let stopWatching: UnwatchFn;

	// Watch for changes in the collection
	async function watchCollection() {
		const stopWatching = await watchImmediate(
			`${$collection  }/.haptic/daily`,
			async () => {
				entries = await fetchCollectionEntries(`${$collection  }/.haptic/daily`);
			},
			{ recursive: true }
		);

		return stopWatching;
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

	collection.subscribe(async (value) => {
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

	let startX: number | null;
	let startWidth: number;

	const handleMouseMove = (e: MouseEvent) => {
		if (startX === null) {return;}
		resizingPageSidebar.set(true);

		const x = e.clientX;

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

		const diff = x - startX;
		const newWidth = Math.max(MIN_WIDTH, Math.min(500, startWidth + diff));

		// Set cursor resize bounds to prevent resizing when cursor is outside of the width bounds
		if (x < MIN_WIDTH + 35 || x > 550) {
			return;
		}

		pageSidebarWidth.set(newWidth);
	};

	const resizeHandler = (e: MouseEvent) => {
		e.preventDefault();
		startX = e.clientX;
		startWidth = $pageSidebarWidth;

		resizingPageSidebar.set(true);
		$editor.commands.blur();
		document.body.classList.add('cursor-col-resize');

		const handleMouseUp = () => {
			startX = null;
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
			document.body.classList.remove('cursor-col-resize');
			resizingPageSidebar.set(false);

			if ($pageSidebarWidth < 100) {
				isPageSidebarOpen.set(false);
			}
		};

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
</script>

<div
	class={cn(
		'fixed left-12 flex flex-col justify-start items-center bg-background overflow-y-auto transform transition-transform duration-300',
		!$isPageSidebarOpen && '-translate-x-52',
		$platform === 'darwin' ? 'h-[calc(100vh-4.5rem)]' : 'h-[calc(100vh-2.25rem)]'
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
		cursor: col-resize !important;
		user-select: none !important;
		pointer-events: none;
	}
</style>
