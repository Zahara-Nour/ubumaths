<script lang="ts">
	import { cn, type WithElementRef, type WithoutChildren } from '$lib/utils.js';
	import type { HTMLTextareaAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		'data-slot': dataSlot = 'textarea',
		...restProps
	}: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> = $props();
</script>

<textarea
	bind:this={ref}
	data-slot={dataSlot}
	class={cn(
		'flex field-sizing-content min-h-20 w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm transition-all duration-300 outline-none placeholder:text-muted-foreground hover:border-ring/50 focus:border-ring focus:ring-4 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/30 dark:bg-card',
		className
	)}
	bind:value
	{...restProps}
></textarea>
