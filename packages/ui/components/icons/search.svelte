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
><path fill="none" stroke="currentColor" d="m14.5 14.5l-4-4m-4 2a6 6 0 1 1 0-12a6 6 0 0 1 0 12Z"/></svg>
