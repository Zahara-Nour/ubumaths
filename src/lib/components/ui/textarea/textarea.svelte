<script lang="ts">
	import { cn, type WithElementRef, type WithoutChildren } from "$lib/utils.js";
	import type { HTMLTextareaAttributes } from "svelte/elements";

	let {
		ref = $bindable(null),
		value = $bindable(),
		class: className,
		"data-slot": dataSlot = "textarea",
		...restProps
	}: WithoutChildren<WithElementRef<HTMLTextareaAttributes>> = $props();
</script>

<textarea
	bind:this={ref}
	data-slot={dataSlot}
	class={cn(
		"border-border bg-background dark:bg-card placeholder:text-muted-foreground focus:border-ring focus:ring-4 focus:ring-ring/30 aria-invalid:ring-destructive/30 aria-invalid:border-destructive field-sizing-content shadow-sm flex min-h-20 w-full rounded-lg border px-3 py-2 text-sm outline-none transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 hover:border-ring/50 resize-y",
		className
	)}
	bind:value
	{...restProps}
></textarea>
