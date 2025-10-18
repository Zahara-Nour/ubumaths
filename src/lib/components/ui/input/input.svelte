<script lang="ts">
	import type { HTMLInputAttributes, HTMLInputTypeAttribute } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	type InputType = Exclude<HTMLInputTypeAttribute, 'file'>;

	type Props = WithElementRef<
		Omit<HTMLInputAttributes, 'type'> &
			({ type: 'file'; files?: FileList } | { type?: InputType; files?: undefined })
	>;

	let {
		ref = $bindable(null),
		value = $bindable(),
		type,
		files = $bindable(),
		class: className,
		'data-slot': dataSlot = 'input',
		...restProps
	}: Props = $props();
</script>

{#if type === 'file'}
	<input
		bind:this={ref}
		data-slot={dataSlot}
		class={cn(
			'flex h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 pt-1.5 text-sm font-normal shadow-sm transition-all duration-300 outline-none selection:bg-accent selection:text-accent-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card',
			'hover:border-ring/50 focus:border-ring focus:ring-4 focus:ring-ring/30',
			'aria-invalid:border-destructive aria-invalid:ring-destructive/30',
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
			'flex h-10 w-full min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-sm transition-all duration-300 outline-none selection:bg-accent selection:text-accent-foreground placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 dark:bg-card',
			'hover:border-ring/50 focus:border-ring focus:ring-4 focus:ring-ring/30',
			'aria-invalid:border-destructive aria-invalid:ring-destructive/30',
			className
		)}
		{type}
		bind:value
		{...restProps}
	/>
{/if}
