<script lang="ts">
	/**
	 * NumberCard - Display a single number with different visual states
	 *
	 * States:
	 * - normal: Default state (white background)
	 * - eliminated: Greyed out and crossed (user marked as not the secret)
	 * - secret: Highlighted with primary color (player's own secret number)
	 */

	import { cn } from '$lib/utils';

	interface Props {
		number: number;
		state: 'normal' | 'eliminated' | 'secret';
		onclick?: () => void;
		class?: string;
	}

	let { number, state, onclick, class: className = '' }: Props = $props();

	const isClickable = $derived(state !== 'secret');
</script>

<button
	class={cn(
		'number-card group relative flex aspect-square items-center justify-center rounded-lg border-2 text-2xl font-bold transition-all',
		// Base states
		state === 'normal' && 'border-border bg-background text-foreground hover:border-primary',
		state === 'eliminated' && 'border-border bg-muted text-muted-foreground opacity-30',
		state === 'secret' && 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20',
		// Clickability
		isClickable && 'cursor-pointer hover:scale-105',
		!isClickable && 'cursor-default',
		className
	)}
	{onclick}
	disabled={!isClickable}
	aria-label={state === 'secret'
		? `Votre nombre secret: ${number}`
		: state === 'eliminated'
			? `Nombre ${number} éliminé`
			: `Nombre ${number}`}
>
	<!-- Number display -->
	<span
		class={cn(
			'relative z-10 transition-transform',
			state === 'eliminated' && 'line-through decoration-2'
		)}
	>
		{number}
	</span>

	<!-- Eliminated overlay with X mark -->
	{#if state === 'eliminated'}
		<div
			class="absolute inset-0 flex items-center justify-center text-4xl text-muted-foreground opacity-50"
		>
			✕
		</div>
	{/if}

	<!-- Secret indicator badge -->
	{#if state === 'secret'}
		<div
			class="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground"
			aria-hidden="true"
		>
			★
		</div>
	{/if}
</button>

<style>
	/* Touch-friendly sizing */
	@media (pointer: coarse) {
		.number-card {
			min-height: var(--min-touch-target, 44px);
			min-width: var(--min-touch-target, 44px);
		}
	}
</style>
