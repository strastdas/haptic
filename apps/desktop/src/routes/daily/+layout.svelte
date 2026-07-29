<script lang="ts">
	import NotesSidebar from './sidebar.svelte';
	import Layout from '$lib/components/notes/layout.svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<Layout sidebar={NotesSidebar}>
	{@render children?.()}
</Layout>
