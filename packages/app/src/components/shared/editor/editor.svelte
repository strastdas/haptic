<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { Editor } from '@tiptap/core';
	import { activeFile, collectionSettings } from '@haptic/core/store';
	import { editor } from '@haptic/editor/store';
	import StarterKit from '@tiptap/starter-kit';
	import Document from '@tiptap/extension-document';
	import { Typography } from '@tiptap/extension-typography';
	import { Markdown } from 'tiptap-markdown';
	import { saveNote } from '@haptic/core/adapter';
	import { TaskList } from '@tiptap/extension-task-list';
	import { TaskItem } from '@tiptap/extension-task-item';
	import { Link } from '@tiptap/extension-link';
	import CharacterCount from '@tiptap/extension-character-count';
	import { SearchAndReplace } from '@haptic/editor';
	import Shortcut from '../shortcut.svelte';
	import { SHORTCUTS } from '@haptic/core/constants';
	import { get } from 'svelte/store';

	let element: HTMLDivElement | undefined = $state();
	let tiptapEditor: Editor;
	let timeout: NodeJS.Timeout;

	onMount(() => {
		tiptapEditor = new Editor({
			element: element!,
			extensions: [
				StarterKit.configure({
					document: false,
					hardBreak: false,
					paragraph: {
						HTMLAttributes: {
							class: 'min-w-[1px] my-1 leading-5'
						}
					}
				}),
				CharacterCount,
				Document,
				SearchAndReplace.configure({
					searchResultClass: 'search-result',
					disableRegex: false
				}),
				Typography,
				TaskList,
				TaskItem.configure({
					HTMLAttributes: {
						// h-5 matches the paragraph's leading-5 above, so the checkbox centres on
						// the first text line; my-0 drops the prose margin that offset it.
						class:
							'flex items-start pl-1.5 gap-2 [&>div]:mb-0 [&>label]:mt-0 [&>div]:w-full [&>div]:leading-5 [&>div>p]:inline-block [&>div>p]:my-0 [&>label]:inline-flex [&>label]:h-5 [&>label]:items-center [&>label>input]:rounded-md'
					},
					nested: true
				}),
				Link.configure({
					HTMLAttributes: {
						class:
							'text-primary underline hover:text-primary/80 transition-all cursor-pointer text-base [&>*]:font-normal'
					}
				}),
				Markdown.configure({
					linkify: true,
					transformPastedText: true
				})
			],
			editorProps: {
				attributes: {
					class: 'prose prose-theme mx-auto focus:outline-none min-h-full pb-6 select-text'
				}
			},
			onTransaction: () => {
				// force re-render so `editor.isActive` works as expected
				tiptapEditor = tiptapEditor;
				editor.set(tiptapEditor);
			},
			onUpdate: async () => {
				// If timeout before 500ms, clear it
				if (timeout) {
					clearTimeout(timeout);
				}

				// Set timeout to update the store
				timeout = setTimeout(async () => {
					if ($collectionSettings.editor.auto_save) {
						console.log('Saving note...');
						saveNote($activeFile!)
							.then(() => {
								editor.notifySaveEvent();
							})
							.catch((error) => {
								console.error('Error saving note:', error);
							});
					}
				}, $collectionSettings.editor.auto_save_debounce);
			}
		});
	});

	onDestroy(() => {
		if (editor) {
			tiptapEditor.destroy();
		}
	});
</script>

<!-- >96px is required to hide scrollbar in normal size -->
<div
	bind:this={element}
	spellcheck={$collectionSettings.editor.spell_check}
	autocorrect={$collectionSettings.editor.auto_correct.toString()}
	class="w-full h-[calc(100%-97px)] px-8"
>
	<Shortcut options={SHORTCUTS['note:save']} callback={() => saveNote(get(activeFile) ?? '')} />
	<Shortcut
		options={SHORTCUTS['note:copy-path']}
		callback={() => navigator.clipboard.writeText(get(activeFile) ?? '')}
	/>
</div>

<style>
	div :global(ul[data-type='taskList']) {
		list-style: none;
		padding: 0;
		user-select: none;
	}

	div :global(ul[data-type='taskList'] li > label input[type='checkbox']) {
		-webkit-appearance: none;
		appearance: none;
		transition: 120ms all ease-in-out;
		/* background-color: var(--background); */
		margin: 0;
		cursor: pointer;
		width: 1.2em;
		height: 1.2em;
		flex-shrink: 0;
		border: 1px solid var(--border);
		display: grid;
		place-content: center;

		&:hover {
			background-color: var(--accent);
			border: 1px solid color-mix(in oklab, var(--foreground) 60%, transparent);
		}

		/* &:checked {
			background-color: var(--primary);
		} */

		&::before {
			content: '';
			width: 0.65em;
			height: 0.65em;
			transform: scale(0);
			transition: 120ms transform ease-in-out;
			box-shadow: inset 1em 1em;
			transform-origin: center;
			clip-path: polygon(10% 44%, 0 65%, 40% 100%, 100% 10%, 80% 0%, 43% 62%);
		}

		&:checked::before {
			transform: scale(1);
		}
	}

	div :global(ul[data-type='taskList'] li[data-checked='true'] > div > p) {
		color: color-mix(in oklab, var(--foreground) 60%, transparent);
		text-decoration: line-through;
		text-decoration-thickness: 1px;
	}

	div :global(ul[data-type='taskList'] li > label) {
		margin-right: 0.2rem;
		user-select: none;
	}

	div :global(.search-result) {
		background-color: var(--muted);
	}

	div :global(.search-result-current) {
		background-color: rgba(248, 160, 30, 0.5);
	}
</style>
