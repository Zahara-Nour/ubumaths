<script lang="ts">
	import { Switch as SwitchPrimitive } from 'bits-ui';
	import { cn, type WithoutChildrenOrChild } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		checked = $bindable(false),
		...restProps
	}: WithoutChildrenOrChild<SwitchPrimitive.RootProps> = $props();
</script>

<div class="switch-wrapper">
	<SwitchPrimitive.Root
		bind:ref
		bind:checked
		data-slot="switch"
		class={cn(
			'peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input dark:data-[state=unchecked]:bg-input/80',
			className
		)}
		{...restProps}
	>
		<SwitchPrimitive.Thumb
			data-slot="switch-thumb"
			class={cn(
				'pointer-events-none block size-4 rounded-full bg-background ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0 dark:data-[state=checked]:bg-primary-foreground dark:data-[state=unchecked]:bg-foreground'
			)}
		/>
	</SwitchPrimitive.Root>
</div>

<style>
	/* Touch-friendly: extend clickable area on touch devices */
	.switch-wrapper {
		display: inline-flex;
		align-items: center;
		position: relative;
	}

	@media (pointer: coarse) {
		.switch-wrapper {
			min-height: var(--min-touch-target, 44px);
			padding-inline: 0.5rem;
		}

		/* Invisible extended hit area */
		.switch-wrapper::before {
			content: '';
			position: absolute;
			inset: -0.75rem;
			z-index: -1;
		}
	}
</style>
