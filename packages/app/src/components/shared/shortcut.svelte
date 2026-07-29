<script lang="ts">
	import shortcut from '../../actions/shortcut';
	import type { ShortcutParams } from '../../actions/shortcut';
	interface Props {
		options: ShortcutParams;
		callback?: (() => void) | undefined;
	}

	let { options, callback = undefined }: Props = $props();
</script>

<div class="hidden" use:shortcut={{ ...options, callback }}></div>
