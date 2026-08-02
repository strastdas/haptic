<script lang="ts">
	import { canStartSignIn, startSignIn } from '@haptic/core/adapter';
	import { Button } from '@haptic/ui/components/button';
	import { Label } from '@haptic/ui/components/label';
	import * as Select from '@haptic/ui/components/select';
	import { Switch } from '@haptic/ui/components/switch';
	import Tooltip from '../shared/tooltip.svelte';

	const syncIntervalLabels: Record<string, string> = {
		'5m': '5 minutes',
		'10m': '10 minutes',
		'15m': '15 minutes',
		'30m': '30 minutes',
		'1h': '1 hour',
		'2h': '2 hours',
		'4h': '4 hours',
		'6h': '6 hours',
		'12h': '12 hours',
		'24h': '24 hours'
	};
	const backupIntervalLabels: Record<string, string> = {
		'1w': '1 week',
		'2w': '2 weeks',
		'1m': '1 month'
	};

	let autoSync = $state(false);
	let autoBackup = $state(false);
	let selectedSyncInterval = $state('5m');
	let selectedBackupInterval = $state('1w');
</script>

<div class="space-y-5">
	{#if canStartSignIn()}
		<section class="rounded-lg border border-border/70 bg-muted/30 p-3">
			<div class="flex items-center justify-between gap-4">
				<div class="space-y-0.5">
					<Label class="text-sm">Haptic account</Label>
					<p class="text-muted-foreground text-xs">
						Private beta access is required before Haptic Sync can connect this device.
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					class="shrink-0 text-sm"
					onclick={() => {
						void startSignIn();
					}}
				>
					Sign in
				</Button>
			</div>
		</section>
	{/if}

	<div class="space-y-1">
		<Label class="text-sm">Auto sync</Label>
		<p class="text-muted-foreground text-xs">Automatically sync your notes.</p>
		<div class="flex items-center gap-2 pt-2">
			<Tooltip text="Coming soon">
				<Switch bind:checked={autoSync} disabled />
			</Tooltip>
		</div>
	</div>

	<div class="space-y-1">
		<Label class="text-sm">Sync interval</Label>
		<p class="text-muted-foreground text-xs">How often to sync your notes.</p>
		<div class="flex items-center gap-2 pt-2">
			<Select.Root type="single" bind:value={selectedSyncInterval} disabled={!autoSync}>
				<Select.Trigger class="text-sm text-foreground/85">
					{syncIntervalLabels[selectedSyncInterval]}
				</Select.Trigger>
				<Select.Content>
					{#each Object.entries(syncIntervalLabels) as [value, label]}
						<Select.Item {value}>{label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>

	<div class="space-y-1">
		<Label class="text-sm">Backups</Label>
		<p class="text-muted-foreground text-xs">Wheter or not to create scheduled backups.</p>
		<div class="flex items-center gap-2 pt-2">
			<Tooltip text="Coming soon">
				<Switch bind:checked={autoBackup} disabled />
			</Tooltip>
		</div>
	</div>

	<div class="space-y-1">
		<Label class="text-sm">Backup interval</Label>
		<p class="text-muted-foreground text-xs">How often to create backups of your notes.</p>
		<div class="flex items-center gap-2 pt-2">
			<Select.Root type="single" bind:value={selectedBackupInterval} disabled={!autoBackup}>
				<Select.Trigger class="text-sm text-foreground/85">
					{backupIntervalLabels[selectedBackupInterval]}
				</Select.Trigger>
				<Select.Content>
					{#each Object.entries(backupIntervalLabels) as [value, label]}
						<Select.Item {value}>{label}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>

			<Button
				variant="default"
				size="sm"
				class="h-7 text-primary-foreground/85 hover:text-primary-foreground text-sm font-normal"
				scale="sm"
				disabled={!autoBackup}
			>
				Backup now
			</Button>
		</div>
	</div>
</div>
