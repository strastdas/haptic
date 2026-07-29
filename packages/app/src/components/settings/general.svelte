<script lang="ts">
	import { setSettings } from '@haptic/core/adapter';
	import { collectionSettings } from '@haptic/core/store';
	import { Button } from '@haptic/ui/components/button';
	import { Label } from '@haptic/ui/components/label';
	import * as Select from '@haptic/ui/components/select';
	import { Switch } from '@haptic/ui/components/switch';
	import { cn } from '@haptic/ui/lib/utils';
	import Icon from '../shared/icon.svelte';
	import Tooltip from '../shared/tooltip.svelte';

	const trashLocationLabels: Record<string, string> = {
		system: 'System trash',
		haptic: 'Haptic trash',
		delete: 'Permanently delete'
	};
</script>

<div class="space-y-5">
	<div class="space-y-1">
		<Label class="text-sm">Auto save</Label>
		<p class="text-muted-foreground text-xs">Automatically save your notes.</p>
		<div class="flex flex-col items-start gap-3 pt-2">
			<Switch
				checked={$collectionSettings.editor.auto_save}
				onCheckedChange={(value) => {
					setSettings('collection', {
						...$collectionSettings,
						editor: { ...$collectionSettings.editor, auto_save: value }
					});
				}}
			/>

			<Label
				class={cn(
					'text-destructive text-xs font-normal',
					$collectionSettings.editor.auto_save && 'hidden'
				)}
			>
				Note: Disabling auto save may result in data loss and is strongly discouraged.
			</Label>
		</div>
	</div>

	<div class="space-y-1">
		<Label class="text-sm">Auto save debounce</Label>
		<p class="text-muted-foreground text-xs">The delay before auto save is triggered.</p>
		<div class="flex items-center gap-1 pt-2">
			<Select.Root
				type="single"
				value={String($collectionSettings.editor.auto_save_debounce)}
				onValueChange={(value: string) => {
					if (!value) return;
					setSettings('collection', {
						...$collectionSettings,
						editor: { ...$collectionSettings.editor, auto_save_debounce: Number(value) }
					});
				}}
				disabled={!$collectionSettings.editor.auto_save}
			>
				<Select.Trigger class="text-xs text-foreground/85">
					{$collectionSettings.editor.auto_save_debounce}ms
				</Select.Trigger>
				<Select.Content align="start" class="!w-28">
					<Select.Item value="250">250ms</Select.Item>
					<Select.Item value="500">500ms</Select.Item>
					<Select.Item value="750">750ms</Select.Item>
					<Select.Item value="1000">1000ms</Select.Item>
					<Select.Item value="1500">1500ms</Select.Item>
					<Select.Item value="2000">2000ms</Select.Item>
					<Select.Item value="3000">3000ms</Select.Item>
				</Select.Content>
			</Select.Root>

			{#if $collectionSettings.editor.auto_save_debounce != 750}
				<Tooltip text="Reset to default" side="bottom">
					<Button
						variant="ghost"
						size="icon"
						class="h-7 w-7 fill-muted-foreground hover:fill-foreground"
						scale="md"
						disabled={!$collectionSettings.editor.auto_save}
						onclick={() => {
							setSettings('collection', {
								...$collectionSettings,
								editor: { ...$collectionSettings.editor, auto_save_debounce: 750 }
							});
						}}
					>
						<Icon name="undoCircle" class="h-3.5 w-3.5" />
					</Button>
				</Tooltip>
			{/if}
		</div>
	</div>

	<div class="space-y-1">
		<Label class="text-sm">Deleted files location</Label>
		<p class="text-muted-foreground text-xs">Where to move deleted files to.</p>
		<div class="flex items-center gap-2 pt-2">
			<Select.Root
				type="single"
				value={$collectionSettings.notes.trash_dir}
				onValueChange={(value: string) => {
					if (!value) return;
					setSettings('collection', {
						...$collectionSettings,
						notes: {
							...$collectionSettings.notes,
							trash_dir: value as 'system' | 'haptic' | 'delete'
						}
					});
				}}
			>
				<Select.Trigger class="text-xs text-foreground/85">
					{trashLocationLabels[$collectionSettings.notes.trash_dir]}
				</Select.Trigger>
				<Select.Content align="start" class="!w-40">
					<Select.Item value="system">System trash</Select.Item>
					<Select.Item value="haptic">Haptic trash</Select.Item>
					<Select.Item value="delete">Permanently delete</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<div class="space-y-1">
		<Label class="text-sm">Hidden files</Label>
		<p class="text-muted-foreground text-xs">Exclude files or extensions from the notes view.</p>
		<div class="flex items-center gap-2 pt-2">
			<Button
				variant="default"
				size="sm"
				class="h-7 text-primary-foreground/85 hover:text-primary-foreground text-sm font-normal"
				scale="sm"
				disabled
			>
				Add
			</Button>
		</div>
	</div>
</div>
