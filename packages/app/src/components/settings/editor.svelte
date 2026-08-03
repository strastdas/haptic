<script lang="ts">
	import { setSettings } from '@haptic/core/adapter';
	import { collectionSettings } from '@haptic/core/store';
	import { cn } from '@haptic/core/utils';
	import { Label } from '@haptic/ui/components/label';
	import * as Select from '@haptic/ui/components/select';
	import { Switch } from '@haptic/ui/components/switch';

	// The control is locked, so it lists the font actually in use rather than a
	// menu of fonts the app doesn't ship.
	const fontLabels: Record<string, string> = {
		lilgrotesk: 'LilGrotesk'
	};
	const fontSizeLabels: Record<string, string> = {
		smaller: 'Smaller',
		small: 'Small',
		normal: 'Normal',
		large: 'Large',
		larger: 'Larger'
	};

	let selectedFont = $state('lilgrotesk');
	let selectedFontSize = $state('normal');
</script>

<div class="space-y-5">
	<div class="space-y-1">
		<Label class="text-sm">Font</Label>
		<p class="text-muted-foreground text-xs">Change the editor font.</p>
		<div class="flex items-center gap-2 pt-2">
			<Select.Root type="single" bind:value={selectedFont} disabled>
				<Select.Trigger class="text-sm text-foreground/85">
					{fontLabels[selectedFont]}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="lilgrotesk">LilGrotesk</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<div class="space-y-1">
		<Label class="text-sm">Font size</Label>
		<p class="text-muted-foreground text-xs">Change the editor font size.</p>
		<div class="flex items-center gap-2 pt-2">
			<Select.Root type="single" bind:value={selectedFontSize} disabled>
				<Select.Trigger class="text-sm text-foreground/85">
					{fontSizeLabels[selectedFontSize]}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="smaller">Smaller</Select.Item>
					<Select.Item value="small">Small</Select.Item>
					<Select.Item value="normal">Normal</Select.Item>
					<Select.Item value="large">Large</Select.Item>
					<Select.Item value="larger">Larger</Select.Item>
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<div class="space-y-1">
		<Label class="text-sm">Text correction</Label>
		<p class="text-muted-foreground text-xs">Enable or disable various text correction features.</p>
		<div class="flex flex-col items-start gap-2.5 pt-2">
			<div class="flex items-center gap-2">
				<Switch
					checked={$collectionSettings.editor.auto_correct}
					onCheckedChange={(value) =>
						setSettings('collection', {
							...$collectionSettings,
							editor: { ...$collectionSettings.editor, auto_correct: value }
						})}
				/>
				<Label
					class={cn(
						'text-sm font-normal transition-colors',
						$collectionSettings.editor.auto_correct ? 'text-foreground/90' : 'text-foreground/60'
					)}
				>
					Auto Correct
				</Label>
			</div>
			<div class="flex items-center gap-2">
				<Switch
					checked={$collectionSettings.editor.spell_check}
					onCheckedChange={(value) =>
						setSettings('collection', {
							...$collectionSettings,
							editor: { ...$collectionSettings.editor, spell_check: value }
						})}
				/>
				<Label
					class={cn(
						'text-sm font-normal transition-colors',
						$collectionSettings.editor.spell_check ? 'text-foreground/90' : 'text-foreground/60'
					)}
				>
					Spell Check
				</Label>
			</div>
		</div>
	</div>

	<div class="space-y-1">
		<Label class="text-sm">Additional settings</Label>
		<p class="text-muted-foreground text-xs">Additional settings for the editor.</p>
		<div class="flex flex-col items-start gap-2.5 pt-2">
			<div class="flex items-center gap-2">
				<Switch
					disabled
					checked={$collectionSettings.editor.show_line_numbers}
					onCheckedChange={(value) =>
						setSettings('collection', {
							...$collectionSettings,
							editor: { ...$collectionSettings.editor, show_line_numbers: value }
						})}
				/>
				<Label class={cn('text-sm font-normal transition-colors text-foreground/60')}
					>Show line numbers</Label
				>
			</div>
			<div class="flex items-center gap-2">
				<Switch
					checked={$collectionSettings.editor.show_toolbar}
					onCheckedChange={(value) =>
						setSettings('collection', {
							...$collectionSettings,
							editor: { ...$collectionSettings.editor, show_toolbar: value }
						})}
				/>
				<Label
					class={cn(
						'text-sm font-normal transition-colors',
						$collectionSettings.editor.show_toolbar ? 'text-foreground/90' : 'text-foreground/60'
					)}
				>
					Show editor toolbar
				</Label>
			</div>
		</div>
	</div>
</div>
