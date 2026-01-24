<script lang="ts">
	import { getContext } from 'svelte';
	import { DECK_CONTEXT_KEY } from '../core/context.js';
	import type { DeckContext } from '../core/types.js';

	// ============================================================================
	// Props
	// ============================================================================

	interface Props {
		/** Position of the progress bar */
		position?: 'bottom' | 'top';
		/** Height of the progress bar */
		height?: string;
		/** Background color */
		backgroundColor?: string;
		/** Progress color */
		progressColor?: string;
	}

	let {
		position = 'bottom',
		height = '3px',
		backgroundColor = 'rgba(255, 255, 255, 0.2)',
		progressColor = 'var(--color-primary, #3b82f6)'
	}: Props = $props();

	// ============================================================================
	// Context
	// ============================================================================

	const deckContext = getContext<DeckContext>(DECK_CONTEXT_KEY);
	const store = deckContext?.getStore();

	// ============================================================================
	// Progress Calculation
	// ============================================================================

	const progress = $derived.by(() => {
		if (!store || store.totalH === 0) return 0;

		// Calculate total slides including vertical ones
		let totalSlides = 0;
		let currentSlideIndex = 0;

		for (let h = 0; h < store.totalH; h++) {
			const verticalCount = store.getVerticalCount(h);
			const slidesInStack = Math.max(1, verticalCount);

			if (h < store.h) {
				currentSlideIndex += slidesInStack;
			} else if (h === store.h) {
				currentSlideIndex += store.v;
			}

			totalSlides += slidesInStack;
		}

		// Avoid division by zero
		if (totalSlides <= 1) return store.h === 0 ? 0 : 100;

		return (currentSlideIndex / (totalSlides - 1)) * 100;
	});
</script>

<div
	class="progress-bar"
	class:progress-top={position === 'top'}
	class:progress-bottom={position === 'bottom'}
	style:height
	style:background-color={backgroundColor}
	role="progressbar"
	aria-valuenow={progress}
	aria-valuemin={0}
	aria-valuemax={100}
	aria-label="Presentation progress"
>
	<div class="progress-fill" style:width="{progress}%" style:background-color={progressColor}></div>
</div>

<style>
	.progress-bar {
		position: absolute;
		left: 0;
		right: 0;
		z-index: 100;
		overflow: hidden;
	}

	.progress-top {
		top: 0;
	}

	.progress-bottom {
		bottom: 0;
	}

	.progress-fill {
		height: 100%;
		transition: width 0.3s ease-out;
	}
</style>
