<script lang="ts">
	/**
	 * ItemCard - Display a polymorphic grid item with different visual states
	 *
	 * Supports all item types:
	 * - number: Plain number display
	 * - fraction: LaTeX fraction via MarkdownRenderer
	 * - shape2d: SVG shape rendering
	 * - expression: LaTeX expression via MarkdownRenderer
	 * - function: LaTeX function formula via MarkdownRenderer
	 * - polyhedron: French name text display
	 *
	 * States:
	 * - normal: Default state (white background)
	 * - eliminated: Greyed out and crossed (user marked as not the secret)
	 * - secret: Highlighted with primary color (player's own secret item)
	 */

	import { cn } from '$lib/utils';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import type { GridItem } from '$lib/utils/guess-who/grid-item';
	import { gridItemToUbumark } from '$lib/utils/guess-who/grid-item';

	interface Props {
		item: GridItem;
		state: 'normal' | 'eliminated' | 'secret';
		onclick?: () => void;
		class?: string;
	}

	let { item, state, onclick, class: className = '' }: Props = $props();

	const isClickable = $derived(state !== 'secret');

	// Get display content based on item type
	const displayContent = $derived.by(() => {
		switch (item.type) {
			case 'number':
				return { type: 'text' as const, content: String(item.value) };
			case 'fraction':
				return {
					type: 'latex' as const,
					content: `$\\frac{${item.numerator}}{${item.denominator}}$`
				};
			case 'shape2d':
				return { type: 'svg' as const, content: item.svgPath, label: item.nameFr };
			case 'expression':
				return { type: 'latex' as const, content: `$${item.latex}$` };
			case 'function':
				return { type: 'latex' as const, content: `$y = ${item.latex}$` };
			case 'polyhedron':
				return { type: 'text' as const, content: item.nameFr };
		}
	});

	// Get aria-label for accessibility
	const ariaLabel = $derived.by(() => {
		const itemDescription = gridItemToUbumark(item);
		if (state === 'secret') {
			return `Votre element secret: ${itemDescription}`;
		} else if (state === 'eliminated') {
			return `Element elimine: ${itemDescription}`;
		}
		return itemDescription;
	});
</script>

<button
	class={cn(
		'item-card group relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border-2 transition-all',
		// Base states
		state === 'normal' && 'border-border bg-background text-foreground hover:border-primary',
		state === 'eliminated' && 'border-border bg-muted text-muted-foreground opacity-30',
		state === 'secret' && 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20',
		// Clickability
		isClickable && 'cursor-pointer hover:scale-105',
		!isClickable && 'cursor-default',
		// Size adjustments based on content type
		displayContent.type === 'latex' && 'p-1',
		displayContent.type === 'svg' && 'p-2',
		displayContent.type === 'text' && item.type === 'number' && 'text-2xl font-bold',
		displayContent.type === 'text' &&
			item.type === 'polyhedron' &&
			'p-1 text-center text-xs leading-tight',
		className
	)}
	{onclick}
	disabled={!isClickable}
	aria-label={ariaLabel}
>
	<!-- Content display -->
	<div
		class={cn(
			'relative z-10 flex h-full w-full items-center justify-center',
			state === 'eliminated' && 'opacity-50'
		)}
	>
		{#if displayContent.type === 'text'}
			<span
				class={cn('transition-transform', state === 'eliminated' && 'line-through decoration-2')}
			>
				{displayContent.content}
			</span>
		{:else if displayContent.type === 'latex'}
			<div class="latex-content flex h-full w-full items-center justify-center text-sm">
				<MarkdownRenderer content={displayContent.content} />
			</div>
		{:else if displayContent.type === 'svg'}
			<svg
				viewBox="0 0 100 100"
				class={cn('h-full max-h-[80%] w-full max-w-[80%]', state === 'eliminated' && 'opacity-50')}
				aria-label={displayContent.label}
			>
				<path
					d={displayContent.content}
					fill="currentColor"
					stroke="currentColor"
					stroke-width="2"
					fill-opacity="0.2"
				/>
			</svg>
		{/if}
	</div>

	<!-- Eliminated overlay with X mark -->
	{#if state === 'eliminated'}
		<div
			class="absolute inset-0 flex items-center justify-center text-4xl text-muted-foreground opacity-50"
		>
			<span class="text-3xl">&#10005;</span>
		</div>
	{/if}

	<!-- Secret indicator badge -->
	{#if state === 'secret'}
		<div
			class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
			aria-hidden="true"
		>
			<span class="text-[10px]">&#9733;</span>
		</div>
	{/if}
</button>

<style>
	/* Touch-friendly sizing */
	@media (pointer: coarse) {
		.item-card {
			min-height: var(--min-touch-target, 44px);
			min-width: var(--min-touch-target, 44px);
		}
	}

	/* LaTeX content sizing */
	.latex-content :global(.math) {
		font-size: inherit;
	}

	/* Ensure LaTeX doesn't overflow */
	.latex-content {
		overflow: hidden;
	}
</style>
