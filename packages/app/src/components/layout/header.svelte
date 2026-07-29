<script lang="ts">
	import { collection, isDesktopApp } from '@haptic/core/store';
	import { Button } from '@haptic/ui/components/button';
	import { cn } from '@haptic/ui/lib/utils';
</script>

<header
	class={cn(
		'absolute top-0 w-full flex items-center h-9 border-b bg-background z-40',
		$isDesktopApp ? 'justify-center pl-12' : 'justify-end px-1.5'
	)}
	data-tauri-drag-region
>
	<p
		class={cn(
			'pointer-events-none text-sm text-foreground/85 hover:text-foreground/100 transition-all cursor-default outline-none',
			// Centred against the header rather than the leftover flex space, so the
			// title stays put no matter what sits next to it.
			!$isDesktopApp && 'absolute left-1/2 -translate-x-1/2'
		)}
	>
		{$collection?.split('/').pop() || ''}
	</p>
	{#if !$isDesktopApp}
		<a href="https://go.haptic.md/download" target="_blank" rel="noopener noreferrer">
			<Button size="sm" scale="sm" class="rounded-full h-[27px] px-2.5">Download</Button>
		</a>
	{/if}
</header>
