<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		getCollections,
		loadCollection,
		moveNote,
		openExternal,
		openNote,
		setTheme
	} from '@haptic/core/adapter';
	import { activeFile, appTheme, collection } from '@haptic/core/store';
	import { formatTimeAgo, shortcutToString } from '@haptic/core/utils';
	import * as Command from '@haptic/ui/components/command';
	import { onMount } from 'svelte';
	import Icon from '../icon.svelte';
	import { SHORTCUTS } from '@haptic/core/constants';
	import Shortcut from '../shortcut.svelte';
	import { mainCommands as commands, createNoteCommands, openFileInEditor } from './commands';
	import { getAllItems } from './helpers';

	interface Props {
		/**
		 * Web-only collection import flow: receives the files picked via the
		 * hidden `webkitdirectory` input and reports progress (0-100). When
		 * provided, the "Open new collection" item renders the file input;
		 * otherwise (desktop) it delegates to the platform's `loadCollection()`.
		 */
		importCollection?: (files: FileList, onProgress: (progress: number) => void) => Promise<void>;
	}

	let { importCollection = undefined }: Props = $props();

	let open = $state(false);
	let search = $state('');
	let value = $state('');
	let page: string | undefined = $state(undefined);
	let openedWithShortcut = $state('');
	let fileInput: HTMLInputElement | null = $state(null);
	let loadingCollection: { loading: boolean; progress: number } | undefined = $state(undefined);

	const shortcutKeyMap: Record<string, string | undefined> = {
		'cmd+k': 'default',
		'cmd+j': 'open_note',
		'cmd+shift+m': 'move_note',
		'cmd+shift+t': 'change_theme',
		'cmd+o': 'open_collection'
	};

	// If a page is provided, it opens that page, otherwise it closes the menu
	function handlePageState(newPage: string | undefined) {
		if (newPage) {
			// Add bounce animation for page change
			const dialog = document.querySelector('[data-slot="dialog-content"]');

			if (dialog) {
				dialog.animate(
					[
						{ transform: 'scale(1)' },
						{ transform: 'scale(0.98, 0.98)' },
						{ transform: 'scale(1, 1)' }
					],
					{
						duration: 225,
						easing: 'ease'
					}
				);
			}
		} else {
			open = false;
			openedWithShortcut = '';
		}

		page = newPage;
		search = '';
	}

	onMount(() => {
		function handleKeydown(e: KeyboardEvent) {
			const keyPressed = `${e.metaKey || e.ctrlKey ? 'cmd+' : ''}${e.shiftKey ? 'shift+' : ''}${
				e.key
			}`;
			if (
				(e.metaKey || e.ctrlKey || e.shiftKey) &&
				shortcutKeyMap[keyPressed] &&
				(openedWithShortcut === keyPressed || openedWithShortcut === '')
			) {
				e.preventDefault();
				openedWithShortcut = keyPressed;
				page = shortcutKeyMap[keyPressed];
				open = !open;
				if (!open) {
					handlePageState(undefined);
				}
			}
		}
		document.addEventListener('keydown', handleKeydown);
		return () => {
			document.removeEventListener('keydown', handleKeydown);
		};
	});

	activeFile.subscribe((notePath) => {
		// Remove last note specific commands
		if (commands[0].name !== 'Notes') {
			commands.shift();
		}

		if (notePath) {
			// Add notePath specific commands to the top of the list
			commands.unshift(createNoteCommands(notePath));

			// Set value to first command
			value = commands[0].commands[0].title;
		}
	});

	async function openPickedCollection() {
		if (!files || files.length === 0 || !importCollection) {
			return console.error('No files selected');
		}

		// Set loading state
		loadingCollection = { loading: true, progress: 0 };

		await importCollection(files, (progress) => {
			loadingCollection = { loading: true, progress };
		});

		// Reset loading state
		loadingCollection = undefined;

		// Close dialog
		await goto('/notes');
		handlePageState(undefined);
	}

	let files: FileList | undefined = $state();
	$effect(() => {
		if (files) {
			openPickedCollection();
		}
	});
</script>

<!--
	`shortcutKeyMap` above only opens command-menu *pages*; a command that runs an
	action needs its own binding, the same way the notes pane binds note:save.
-->
<Shortcut options={SHORTCUTS['app:open-file']} callback={() => openFileInEditor()} />

<Command.Dialog
	bind:open
	bind:value
	loop
	onkeydown={(e: KeyboardEvent) => {
		if (e.key === 'Escape') {
			handlePageState(undefined);
			openedWithShortcut = '';
		} else if (
			e.key === 'Backspace' &&
			!search &&
			page !== 'default' &&
			openedWithShortcut === 'cmd+k'
		) {
			handlePageState('default');
		}
	}}
>
	<Command.Input bind:value={search} placeholder="Search or jump to..." />
	<Command.List>
		{#if !loadingCollection}
			<Command.Empty class="text-foreground/60 font-light">No commands found</Command.Empty>
		{/if}
		{#if page === 'default'}
			{#each commands as group}
				<Command.Group heading={group.name}>
					{#each group.commands.filter((command) => command.available?.() ?? true) as command}
						<Command.Item
							class="[&>*]:text-foreground/90 [&>*]:aria-selected:text-foreground [&>*]:fill-foreground/50 [&>*]:aria-selected:fill-foreground"
							value={command.title}
							onSelect={() => {
								const page = command.onSelect?.();
								if (typeof page === 'undefined') {
									handlePageState(undefined);
								} else {
									handlePageState(page);
								}
							}}
						>
							<div class="flex w-full items-center justify-between">
								<div class="flex items-center gap-1.5">
									{#if command.icon}
										<Icon name={command.icon} />
									{/if}
									<span class="text-foreground/80 group:hover:text-foreground/100"></span>
									{command.title}
								</div>
								{#if command.shortcut}
									<span class="ml-auto text-xs tracking-widest text-muted-foreground h-full"
										>{shortcutToString(command.shortcut)}
									</span>
								{/if}
							</div>
						</Command.Item>
					{/each}
				</Command.Group>
			{/each}
		{:else if page === 'move_note'}
			<Command.Group heading="Move note to...">
				{#await getAllItems(true)}
					<!-- TODO: Make this a loading spinner -->
					<Command.Loading class="text-foreground/90">Loading folders...</Command.Loading>
				{:then folders}
					{#each folders as folder}
						{#if folder.path + `/${$activeFile?.split('/').pop()}` !== $activeFile}
							<Command.Item
								class="text-foreground/90 gap-3 [&>*]:text-foreground/90 [&>*]:aria-selected:text-foreground [&>*]:fill-foreground/50 [&>*]:aria-selected:fill-foreground"
								value={folder.path}
								onSelect={() => {
									moveNote($activeFile || '', folder.path);
									handlePageState(undefined);
								}}
							>
								<Icon name="folder" />
								{folder.name.slice(1).replaceAll('/', ' > ')}
							</Command.Item>
						{/if}
					{/each}
				{:catch error}
					<Command.Item class="text-foreground/90"
						>Error loading folders: {error.message}</Command.Item
					>
				{/await}
			</Command.Group>
		{:else if page === 'open_note'}
			<Command.Group heading="Open note...">
				{#await getAllItems()}
					<Command.Loading class="text-foreground/90">Loading notes...</Command.Loading>
				{:then notes}
					{#each notes as note}
						<Command.Item
							class="text-foreground/90 gap-3 [&>*]:text-foreground/90 [&>*]:aria-selected:text-foreground [&>*]:fill-foreground/50 [&>*]:aria-selected:fill-foreground"
							value={note.path}
							onSelect={() => {
								openNote(note.path);
								handlePageState(undefined);
							}}
						>
							<Icon name="note" />
							{note.name.slice(1).replaceAll('/', ' > ')}
						</Command.Item>
					{/each}
				{:catch error}
					<Command.Item class="text-foreground/90"
						>Error loading notes: {error.message}</Command.Item
					>
				{/await}
			</Command.Group>
		{:else if page === 'change_theme'}
			<Command.Group heading="Change theme...">
				{#if $appTheme !== 'light'}
					<Command.Item
						class="text-foreground/90 gap-3 [&>*]:text-foreground/90 [&>*]:aria-selected:text-foreground [&>*]:fill-foreground/50 [&>*]:aria-selected:fill-foreground"
						value="light"
						onSelect={() => {
							setTheme('light');
							handlePageState(undefined);
						}}
					>
						<Icon name="sun" />
						Light
					</Command.Item>
				{/if}
				{#if $appTheme !== 'dark'}
					<Command.Item
						class="text-foreground/90 gap-3 [&>*]:text-foreground/90 [&>*]:aria-selected:text-foreground [&>*]:fill-foreground/50 [&>*]:aria-selected:fill-foreground"
						value="dark"
						onSelect={() => {
							setTheme('dark');
							handlePageState(undefined);
						}}
					>
						<Icon name="moon" />
						Dark
					</Command.Item>
				{/if}
				{#if $appTheme !== 'auto'}
					<Command.Item
						class="text-foreground/90 gap-3 [&>*]:text-foreground/90 [&>*]:aria-selected:text-foreground [&>*]:fill-foreground/50 [&>*]:aria-selected:fill-foreground"
						value="system"
						onSelect={() => {
							setTheme('auto');
							handlePageState(undefined);
						}}
					>
						<Icon name="monitor" />
						System
					</Command.Item>
				{/if}
			</Command.Group>
		{:else if page === 'open_collection'}
			{#if loadingCollection}
				<Command.Empty class="text-foreground/60 font-light">
					<div class="flex flex-col items-center gap-1.5">
						<Icon name="loader" class="w-3.5 h-3.5 animate-spin text-muted-foreground" />
						<div class="flex flex-col gap-0.5">
							Loading collection... ({loadingCollection.progress}%)
							<span class="text-xs text-muted-foreground"
								>Hint: You can close this window and continue working.</span
							>
						</div>
					</div>
				</Command.Empty>
			{:else}
				<Command.Group heading="Open collection">
					{#if importCollection}
						<Command.Item
							class="text-foreground/90 gap-3 [&>*]:text-foreground/90 [&>*]:aria-selected:text-foreground [&>*]:fill-foreground/50 [&>*]:aria-selected:fill-foreground"
							onSelect={() => {
								fileInput?.click();
							}}
						>
							<Icon name="folderPlus" />
							<!-- Accept folders only -->
							<input
								type="file"
								bind:files
								bind:this={fileInput}
								class="hidden"
								webkitdirectory
								multiple
							/>
							Open new collection
						</Command.Item>
					{:else}
						<Command.Item
							class="text-foreground/90 gap-3 [&>*]:text-foreground/90 [&>*]:aria-selected:text-foreground [&>*]:fill-foreground/50 [&>*]:aria-selected:fill-foreground"
							onSelect={async () => {
								await goto('/notes');
								loadCollection();
								handlePageState(undefined);
							}}
						>
							<Icon name="folderPlus" />
							Open new collection
						</Command.Item>
					{/if}
				</Command.Group>
				{#await getCollections()}
					<Command.Loading class="text-foreground/90">Recent collections</Command.Loading>
				{:then collections}
					{#if collections.filter((c) => c.path !== $collection).length > 0}
						<Command.Group heading="Browse recent collections">
							{#each collections
								.filter((c) => c.path !== $collection)
								.sort((a, b) => +new Date(b.lastOpened) - +new Date(a.lastOpened)) as collection}
								<Command.Item
									class="text-foreground/90 gap-3 [&>*]:text-foreground/90 [&>*]:aria-selected:text-foreground [&>*]:fill-foreground/50 [&>*]:aria-selected:fill-foreground"
									value={collection.path}
									onSelect={async () => {
										await goto('/notes');
										loadCollection(collection.path);
										handlePageState(undefined);
									}}
								>
									<div class="flex w-full items-center justify-between">
										<div class="flex items-center gap-1.5">
											<Icon name="folder" />
											<span class="text-foreground/80 group:hover:text-foreground/100"></span>
											{collection.name}
										</div>
										<span class="ml-auto text-xs text-muted-foreground h-full"
											>{formatTimeAgo(new Date(collection.lastOpened))}
										</span>
									</div>
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}
				{:catch error}
					<Command.Group heading="Browse recent collections">
						<Command.Item class="text-foreground/90"
							>Error loading collections: {error.message}</Command.Item
						>
					</Command.Group>
				{/await}
			{/if}
		{/if}
	</Command.List>
</Command.Dialog>

<style>
	:global([data-slot='command-list']) {
		height: min(300px, var(--bits-command-list-height));
		max-height: 400px;
		margin-bottom: 8px;
		margin-top: 8px;
		overscroll-behavior: contain;
		transition: 100ms ease;
		transition-property: height;
	}
</style>
