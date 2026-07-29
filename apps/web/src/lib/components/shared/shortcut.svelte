<script lang="ts">
	import shortcut from '@/actions/shortcut';
import type { ShortcutParams } from '@/actions/shortcut';
	export let options: ShortcutParams;
	export let callback: (() => void) | undefined = undefined;
</script>

<div class="hidden" use:shortcut={{ ...options, callback }} />
