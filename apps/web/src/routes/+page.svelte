<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Static-adapter fallback for the prerendered server redirect in
	// +page.server.ts: when this shell is served directly, forward to /notes.
	onMount(() => {
		goto('/notes', { replaceState: true });
	});
</script>

<noscript><a href="/notes">Continue to your notes</a></noscript>
