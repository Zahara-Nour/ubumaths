<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from "svelte/elements";
	import { cn, type WithElementRef } from "$lib/utils.js";

	type InputType = Exclude<HTMLInputTypeAttribute, "file">;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, "type"> &
			({ type: "file"; files?: FileList } | { type?: InputType; files?: undefined })
	>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		"data-slot": dataSlot = "input",
		...restProps
	}: Props = $props();
</script>

{#if type === "file"}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			"selection:bg-accent selection:text-accent-foreground border-border bg-background dark:bg-card placeholder:text-muted-foreground shadow-sm flex h-10 w-full min-w-0 rounded-lg border px-3 pt-1.5 text-sm font-normal outline-none transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
			"focus:border-ring focus:ring-4 focus:ring-ring/30 hover:border-ring/50",
			"aria-invalid:ring-destructive/30 aria-invalid:border-destructive",
			className
		)}
		type="file"
		bind:files
		bind:value
		{...restProps}
	/>
{:else}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			"border-border bg-background dark:bg-card selection:bg-accent selection:text-accent-foreground placeholder:text-muted-foreground shadow-sm flex h-10 w-full min-w-0 rounded-lg border px-3 py-2 text-sm outline-none transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50",
			"focus:border-ring focus:ring-4 focus:ring-ring/30 hover:border-ring/50",
			"aria-invalid:ring-destructive/30 aria-invalid:border-destructive",
			className
		)}
		{type}
		bind:value
		{...restProps}
	/>
{/if}
