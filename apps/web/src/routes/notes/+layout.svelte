<script lang="ts">
	import NotesSidebar from './sidebar.svelte';
	import Layout from '@haptic/app/components/notes/layout.svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<svelte:head>
	<title>Haptic | Notes</title>
</svelte:head>

<Layout sidebar={NotesSidebar}>
	{@render children?.()}
</Layout>
