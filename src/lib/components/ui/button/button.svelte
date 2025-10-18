<script lang="ts" module>
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAnchorAttributes, HTMLButtonAttributes } from 'svelte/elements';
	import { type VariantProps, tv } from 'tailwind-variants';

	export const buttonVariants = tv({
		base: "cursor-pointer inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium outline-none transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&_svg:not([class*='size-'])]:size-4 [&_svg]:pointer-events-none [&_svg]:shrink-0 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/30",
		variants: {
			variant: {
				default:
					'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md active:scale-[0.98]',
				destructive:
					'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-md focus-visible:ring-destructive/30 active:scale-[0.98]',
				outline:
					'bg-transparent border border-border hover:bg-muted hover:border-muted-foreground/20 shadow-sm hover:shadow active:scale-[0.98]',
				secondary:
					'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 hover:shadow-md active:scale-[0.98]',
				ghost: 'hover:bg-muted/60 dark:hover:bg-muted/40 active:bg-muted/80',
				link: 'text-primary underline-offset-4 hover:underline hover:text-primary/80'
			},
			size: {
				default: 'h-10 px-4 py-2 has-[>svg]:px-3',
				sm: 'h-9 gap-1.5 rounded-md px-3 text-xs has-[>svg]:px-2.5',
				lg: 'h-11 rounded-lg px-6 text-base has-[>svg]:px-5',
				icon: 'size-10',
				'icon-sm': 'size-9',
				'icon-lg': 'size-11'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	});

	export type ButtonVariant = VariantProps<typeof buttonVariants>['variant'];
	export type ButtonSize = VariantProps<typeof buttonVariants>['size'];

	export type ButtonProps = WithElementRef<HTMLButtonAttributes> &
		WithElementRef<HTMLAnchorAttributes> & {
			variant?: ButtonVariant;
			size?: ButtonSize;
		};
</script>

<script lang="ts">
	let {
		class: className,
		variant = 'default',
		size = 'default',
		ref = $bindable(null),
		href = undefined,
		type = 'button',
		disabled,
		children,
		...restProps
	}: ButtonProps = $props();
</script>

{#if href}
	<a
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		href={disabled ? undefined : href}
		aria-disabled={disabled}
		role={disabled ? 'link' : undefined}
		tabindex={disabled ? -1 : undefined}
		{...restProps}
	>
		{@render children?.()}
	</a>
{:else}
	<button
		bind:this={ref}
		data-slot="button"
		class={cn(buttonVariants({ variant, size }), className)}
		{type}
		{disabled}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
