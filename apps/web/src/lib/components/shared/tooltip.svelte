<script lang="ts">
	import { tooltipsOpen } from '@/store';
	import * as Tooltip from '@haptic/ui/components/tooltip';
	import type { ShortcutParams } from '@/types';
	import { shortcutToString } from '@/utils';
	import { onDestroy } from 'svelte';
	import type { Snippet } from 'svelte';

	interface Props extends Record<string, unknown> {
		text?: string;
		shortcut?: ShortcutParams;
		children?: Snippet;
	}

	let { text = 'Tooltip', shortcut = undefined, children, ...rest }: Props = $props();

	// Track this instance's contribution to the global open-counter so it can
	// always be undone. Previously, destroying a component while its tooltip was
	// open (or during the 500ms close grace period) leaked an increment, leaving
	// every tooltip in instant-open mode until a full refresh.
	let counted = false;
	let pendingClose: ReturnType<typeof setTimeout> | null = null;

	function handleOpenChange(open: boolean) {
		if (open) {
			if (pendingClose) {
				clearTimeout(pendingClose);
				pendingClose = null;
			}
			if (!counted) {
				counted = true;
				tooltipsOpen.update((value) => value + 1);
			}
		} else if (counted && !pendingClose) {
			pendingClose = setTimeout(() => {
				pendingClose = null;
				counted = false;
				tooltipsOpen.update((value) => Math.max(0, value - 1));
			}, 500);
		}
	}

	onDestroy(() => {
		if (pendingClose) {
			clearTimeout(pendingClose);
			pendingClose = null;
		}
		if (counted) {
			counted = false;
			tooltipsOpen.update((value) => Math.max(0, value - 1));
		}
	});
</script>

<Tooltip.Root
	openDelay={$tooltipsOpen >= 1 ? 0 : 300}
	closeDelay={$tooltipsOpen >= 1 ? 0 : 50}
	onOpenChange={handleOpenChange}
>
	<Tooltip.Trigger>{@render children?.()}</Tooltip.Trigger>
	<Tooltip.Content {...rest} transitionConfig={{ duration: $tooltipsOpen > 1 ? 125 : 175 }}>
		{text}
		{#if shortcut}
			<span
				class="pointer-events-none inline-flex h-[18px] pl-1.5 tracking-widest -mr-2 select-none items-center gap-1 rounded bg-muted px-1 font-mono font-medium text-foreground/70 opacity-100"
			>
				{shortcutToString(shortcut)}
			</span>
		{/if}
	</Tooltip.Content>
</Tooltip.Root>
