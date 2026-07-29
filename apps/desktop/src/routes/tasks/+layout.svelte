<script lang="ts">
	import TaskSidebar from './sidebar.svelte';
	import Layout from '$lib/components/notes/layout.svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<Layout sidebar={TaskSidebar}>
	{@render children?.()}
</Layout>
