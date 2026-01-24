<script lang="ts">
	import { getContext } from 'svelte';
	import { DECK_CONTEXT_KEY } from '../core/context.js';
	import type { DeckContext } from '../core/types.js';

	// ============================================================================
	// Props
	// ============================================================================

	interface Props {
		/** Position of the controls */
		position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
		/** Show vertical navigation arrows */
		showVertical?: boolean;
	}

	let { position = 'bottom-right', showVertical = true }: Props = $props();

	// ============================================================================
	// Context
	// ============================================================================

	const deckContext = getContext<DeckContext>(DECK_CONTEXT_KEY);
	const store = deckContext?.getStore();

	// ============================================================================
	// Navigation
	// ============================================================================

	function handlePrev() {
		store?.prev();
	}

	function handleNext() {
		store?.next();
	}

	function handleUp() {
		store?.up();
	}

	function handleDown() {
		store?.down();
	}

	// ============================================================================
	// Derived State
	// ============================================================================

	const canGoLeft = $derived(store ? store.h > 0 || store.v > 0 || store.f >= 0 : false);
	const canGoRight = $derived(
		store ? store.h < store.totalH - 1 || store.f < store.getTotalFragments() - 1 : false
	);
	const canGoUp = $derived(store ? store.v > 0 : false);
	const canGoDown = $derived(
		store ? store.hasVerticalSlides && store.v < store.verticalCount - 1 : false
	);
	const showVerticalControls = $derived(showVertical && store?.hasVerticalSlides);
</script>

<div class="controls controls-{position}" role="navigation" aria-label="Slide navigation">
	<!-- Horizontal navigation -->
	<div class="controls-row">
		<button
			type="button"
			class="control-button"
			onclick={handlePrev}
			disabled={!canGoLeft}
			aria-label="Previous slide"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M15 18l-6-6 6-6" />
			</svg>
		</button>

		{#if showVerticalControls}
			<div class="controls-column">
				<button
					type="button"
					class="control-button control-button-small"
					onclick={handleUp}
					disabled={!canGoUp}
					aria-label="Previous vertical slide"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M18 15l-6-6-6 6" />
					</svg>
				</button>
				<button
					type="button"
					class="control-button control-button-small"
					onclick={handleDown}
					disabled={!canGoDown}
					aria-label="Next vertical slide"
				>
					<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M6 9l6 6 6-6" />
					</svg>
				</button>
			</div>
		{/if}

		<button
			type="button"
			class="control-button"
			onclick={handleNext}
			disabled={!canGoRight}
			aria-label="Next slide"
		>
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<path d="M9 18l6-6-6-6" />
			</svg>
		</button>
	</div>
</div>

<style>
	.controls {
		position: absolute;
		bottom: 1rem;
		z-index: 100;
		display: flex;
		gap: 0.5rem;
		pointer-events: auto;
	}

	.controls-bottom-right {
		right: 1rem;
	}

	.controls-bottom-left {
		left: 1rem;
	}

	.controls-bottom-center {
		left: 50%;
		transform: translateX(-50%);
	}

	.controls-row {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.controls-column {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.control-button {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		border: none;
		border-radius: 0.375rem;
		background: rgba(0, 0, 0, 0.3);
		color: white;
		cursor: pointer;
		transition:
			background-color 0.2s,
			opacity 0.2s;
	}

	.control-button:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.5);
	}

	.control-button:focus-visible {
		outline: 2px solid white;
		outline-offset: 2px;
	}

	.control-button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.control-button svg {
		width: 1.5rem;
		height: 1.5rem;
	}

	.control-button-small {
		width: 1.75rem;
		height: 1.75rem;
	}

	.control-button-small svg {
		width: 1rem;
		height: 1rem;
	}
</style>
