<script lang="ts">
	import { setTheme } from '@haptic/core/adapter';
	import { appTheme } from '@haptic/core/store';
	import { Button } from '@haptic/ui/components/button';
	import { Label } from '@haptic/ui/components/label';
	import * as Select from '@haptic/ui/components/select';
	import { cn } from '@haptic/ui/lib/utils';
	import Icon from '../shared/icon.svelte';
	import Tooltip from '../shared/tooltip.svelte';

	const themeLabels: Record<string, string> = { haptic: 'Haptic' };
	// The control is locked, so it lists the font actually in use rather than a
	// menu of fonts the app doesn't ship.
	const fontLabels: Record<string, string> = {
		lilgrotesk: 'LilGrotesk'
	};

	let selectedTheme = $state('haptic');
	let selectedFont = $state('lilgrotesk');
</script>

<div class="space-y-5">
	<div class="space-y-1">
		<Label class="text-sm">Color scheme</Label>
		<p class="text-muted-foreground text-xs">Change the color scheme of the app.</p>
		<div class="flex items-center gap-2 pt-2">
			<Tooltip text="System" side="bottom">
				<Button
					size="icon"
					variant="ghost"
					class={cn(
						'h-7 w-7 fill-muted-foreground hover:fill-foreground',
						$appTheme === 'auto' && 'bg-accent fill-foreground'
					)}
					scale="md"
					onclick={() => setTheme('auto')}
				>
					<Icon name="monitor" class="w-4 h-4" />
				</Button>
			</Tooltip>
			<Tooltip text="Light" side="bottom">
				<Button
					size="icon"
					variant="ghost"
					class={cn(
						'h-7 w-7 fill-muted-foreground hover:fill-foreground',
						$appTheme === 'light' && 'bg-accent fill-foreground'
					)}
					scale="md"
					onclick={() => setTheme('light')}
				>
					<Icon name="sun" class="w-4 h-4" />
				</Button>
			</Tooltip>
			<Tooltip text="Dark" side="bottom">
				<Button
					size="icon"
					variant="ghost"
					class={cn(
						'h-7 w-7 fill-muted-foreground hover:fill-foreground',
						$appTheme === 'dark' && 'bg-accent fill-foreground'
					)}
					scale="md"
					onclick={() => setTheme('dark')}
				>
					<Icon name="moon" class="w-4 h-4" />
				</Button>
			</Tooltip>
		</div>
	</div>

	<div class="space-y-1">
		<Label class="text-sm">Theme</Label>
		<p class="text-muted-foreground text-xs">Change the theme of the app.</p>
		<div class="flex items-center gap-2 pt-2">
			<Select.Root type="single" bind:value={selectedTheme}>
				<Select.Trigger class="text-sm text-foreground/85">
					{themeLabels[selectedTheme]}
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="haptic">Haptic</Select.Item>
				</Select.Content>
			</Select.Root>
			<Button
				variant="default"
				size="sm"
				class="h-7 text-primary-foreground/85 hover:text-primary-foreground text-sm font-normal"
				scale="sm"
				disabled
			>
				Browse
			</Button>
		</div>
	</div>

	<div class="space-y-1">
		<Label class="text-sm">Fonts</Label>
		<p class="text-muted-foreground text-xs">Change the interface font.</p>
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
</div>
