<script lang="ts">
	import { collection, isDesktopApp } from '@haptic/core/store';
	import { Button } from '@haptic/ui/components/button';
	import { cn } from '@haptic/ui/lib/utils';
</script>

<header
	class={cn(
		'absolute top-0 w-full flex items-center h-9 border-b bg-background z-40',
		$isDesktopApp ? 'justify-center pl-12' : 'justify-between pl-20 px-1.5'
	)}
	data-tauri-drag-region
>
	{#if !$isDesktopApp}
		<div></div>
	{/if}
	<p
		class={cn(
			'pointer-events-none text-sm text-foreground/85 hover:text-foreground/100 transition-all cursor-default outline-none',
			!$isDesktopApp && '-mr-[159px]'
		)}
	>
		{$collection?.split('/').pop() || ''}
	</p>
	{#if !$isDesktopApp}
		<div class="flex gap-1">
			<a href="https://go.haptic.md/github" target="_blank" rel="noopener noreferrer">
				<Button variant="secondary" size="sm" scale="sm" class="rounded-full h-[27px] px-2.5"
					>Star on Github</Button
				>
			</a>
			<a href="https://go.haptic.md/download" target="_blank" rel="noopener noreferrer">
				<Button size="sm" scale="sm" class="rounded-full h-[27px] px-2.5">Download</Button>
			</a>
		</div>
	{/if}
</header>
