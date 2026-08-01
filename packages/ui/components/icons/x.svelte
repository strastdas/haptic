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
><path fill="none" stroke="currentColor" d="m1.5 1.5l12 12m-12 0l12-12"/></svg>
