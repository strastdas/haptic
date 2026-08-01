<script lang="ts">
	interface Props { [key: string]: any }
	let { ...props }: Props = $props();
</script>

<svg
	class={props.class}
	width="1em"
	height="1em"
	viewBox="0 0 15 15"
	aria-hidden="true"
	{...props}
><path fill="none" stroke="currentColor" stroke-linecap="square" d="m14 5l-6.5 7L1 5"/></svg>
