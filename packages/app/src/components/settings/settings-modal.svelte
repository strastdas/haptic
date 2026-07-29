<script lang="ts">
	import Icon from '../shared/icon.svelte';
	import type { IconKey } from '../shared/icon.svelte';
	import { SHORTCUTS } from '@haptic/core/constants';
	import { settingsStore } from '@haptic/core/store';
	import { Button } from '@haptic/ui/components/button';
	import * as Dialog from '@haptic/ui/components/dialog';
	import { Label } from '@haptic/ui/components/label';
	import { Separator } from '@haptic/ui/components/separator';
	import * as Tabs from '@haptic/ui/components/tabs';
	import type { Component } from 'svelte';
	import Shortcut from '../shared/shortcut.svelte';
	import Appearance from './appearance.svelte';
	import Editor from './editor.svelte';
	import General from './general.svelte';
	import HapticSync from './haptic-sync.svelte';

	let { isOpen, activePage } = $derived($settingsStore);

	const settings: Record<string, { name: string; icon: IconKey; content: Component }[]> = {
		App: [
			{
				name: 'General',
				icon: 'settingsSolid',
				content: General
			},
			{
				name: 'Appearance',
				icon: 'opactiySolid',
				content: Appearance
			},
			{
				name: 'Editor',
				icon: 'editPencilSolid',
				content: Editor
			}
		],
		Syncronization: [
			{
				name: 'Haptic Sync',
				icon: 'cloudSolid',
				content: HapticSync
			}
		]
	};
</script>

<Dialog.Root
	open={isOpen}
	onOpenChange={(value) => {
		settingsStore.set({ isOpen: value, activePage: 'general' });
	}}
>
	<Dialog.Trigger>
		<Button
			size="icon"
			variant="ghost"
			class="h-7 w-7 fill-muted-foreground hover:fill-foreground"
			scale="md"
		>
			<Shortcut options={SHORTCUTS['app:settings']} />
			<Icon name="settings" class="w-[18px] h-[18px]" />
		</Button>
	</Dialog.Trigger>
	<!-- Size only — the primitive centres itself with top/left 1/2 plus a -50%
	     translate, so overriding the insets instead knocks it off screen. -->
	<Dialog.Content
		class="flex items-center justify-center w-[90vw] max-w-5xl sm:max-w-5xl h-[85vh] pt-16"
	>
		<!-- Vertical orientation is what puts the tab list beside the panel instead of
		     above it, and it stops the list being clamped to the horizontal h-9. -->
		<Tabs.Root
			orientation="vertical"
			value={activePage}
			onValueChange={(value) => {
				settingsStore.update((store) => {
					store.activePage = value ?? 'general';
					return store;
				});
			}}
			class="flex items-stretch justify-start h-full w-full gap-10"
		>
			<!-- Categories as label, rest as tabtrigger & corresponding content -->
			<div class="flex flex-col items-center gap-4 h-full justify-start min-w-[160px]">
				{#each Object.keys(settings) as setting}
					<div class="flex flex-col items-start gap-2 w-full">
						<Label class="text-foreground/70 text-xs pl-2">
							{setting}
						</Label>
						<Tabs.List
							class="flex items-center justify-start flex-col w-full h-fit bg-transparent p-0 gap-1.5"
						>
							{#each settings[setting] as tab}
								<Tabs.Trigger
									value={tab.name.toLocaleLowerCase()}
									class="w-full h-7 rounded-lg px-3 hover:bg-accent hover:text-accent-foreground transition-transform active:scale-[98%] data-[state=active]:bg-accent text-foreground data-[state=active]:fill-foreground fill-muted-foreground/80 text-foreground/70 hover:fill-foreground items-center justify-start gap-2 text-sm font-normal"
								>
									<Icon name={tab.icon} class="w-4 h-4" />
									{tab.name}
								</Tabs.Trigger>
							{/each}
						</Tabs.List>
					</div>
					{#if setting !== Object.keys(settings)[Object.keys(settings).length - 1]}
						<Separator />
					{/if}
				{/each}
			</div>
			<div class="flex flex-col items-center justify-start gap-2 h-full flex-1 min-w-0">
				{#each Object.keys(settings) as setting}
					{#each settings[setting] as tab}
						<Tabs.Content
							value={tab.name.toLocaleLowerCase()}
							class="w-full h-full -mt-2.5 overflow-y-auto pb-10"
						>
							<div class="flex flex-col items-start justify-start h-full w-full gap-3 px-1">
								<h1 class="text-lg font-medium">{tab.name}</h1>
								<tab.content />
							</div>
						</Tabs.Content>
					{/each}
				{/each}
			</div>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
