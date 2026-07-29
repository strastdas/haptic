<script lang="ts">
	import { tooltipsOpen } from '@haptic/core/store';
	import type { ShortcutParams } from '@haptic/core/types';
	import { shortcutToString } from '@haptic/core/utils';
	import * as Tooltip from '@haptic/ui/components/tooltip';
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

<!-- bits-ui 2: delay lives on the Provider (openDelay/closeDelay/transitionConfig
     are gone); the open-counter keeps the historical instant-open behavior when
     another tooltip is already showing. -->
<Tooltip.Provider delayDuration={$tooltipsOpen >= 1 ? 0 : 300} skipDelayDuration={500}>
	<Tooltip.Root onOpenChange={handleOpenChange}>
		<Tooltip.Trigger>{@render children?.()}</Tooltip.Trigger>
		<Tooltip.Content {...rest}>
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
</Tooltip.Provider>
