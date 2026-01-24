<script lang="ts">
	/**
	 * Deck - UbuSlides container component
	 *
	 * Native Svelte 5 slide deck implementation (no reveal.js dependency).
	 * Manages scaling, navigation, and provides context to child slides.
	 *
	 * @module slides/core/Deck
	 */

	import { onMount, setContext, type Snippet } from 'svelte';
	import { mergeConfig } from './config.js';
	import { DECK_CONTEXT_KEY } from './context.js';
	import type { DeckConfig, DeckContext, SlideChangedEvent } from './types.js';
	import { createDeckStore } from '../stores/deckStore.svelte.js';
	import { createHashNavigation, parseHash, syncHashEffect } from '../navigation/hash.js';
	import { keyboard } from '../actions/keyboard.js';
	import { swipe, createSwipeHandlers } from '../actions/swipe.js';
	import SlideAnnotationToolbar from '../components/SlideAnnotationToolbar.svelte';
	import { slideAnnotationStore } from '../stores/slideAnnotationStore.svelte.js';

	// ==========================================================================
	// Types
	// ==========================================================================

	interface Props {
		/** Deck configuration */
		config?: Partial<DeckConfig>;
		/** Slides content */
		children: Snippet;
		/** Called when deck is ready */
		onready?: () => void;
		/** Called when slide changes */
		onslidechanged?: (event: SlideChangedEvent) => void;
	}

	// ==========================================================================
	// Props
	// ==========================================================================

	let { config = {}, children, onready, onslidechanged }: Props = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	let wrapperElement: HTMLDivElement | undefined = $state();
	let viewportElement: HTMLDivElement | undefined = $state();
	let scale = $state(1);
	let ready = $state(false);

	// Create store instance for this deck
	const store = createDeckStore();

	// Merged configuration
	const mergedConfig = $derived(mergeConfig(config));

	// Track previous indices for slidechanged event
	let previousH = $state(0);
	let previousV = $state(0);

	// ==========================================================================
	// Context
	// ==========================================================================

	const context: DeckContext = {
		getStore: () => store,
		getIndices: () => store.state,
		slide: (h, v, f) => store.goTo(h, v, f),
		next: () => store.next(),
		prev: () => store.prev(),
		getScale: () => store.scale,
		isOverview: () => store.overview
	};

	setContext(DECK_CONTEXT_KEY, context);

	// ==========================================================================
	// Scale Calculation
	// ==========================================================================

	/**
	 * Calculate scale based on container size and configured dimensions
	 */
	function calculateScale(containerWidth: number, containerHeight: number): number {
		const {
			width = 1920,
			height = 1080,
			margin = 0.04,
			minScale = 0.2,
			maxScale = 2.0
		} = mergedConfig;

		// Account for margin
		const availableWidth = containerWidth * (1 - margin * 2);
		const availableHeight = containerHeight * (1 - margin * 2);

		// Calculate scale to fit
		const scaleX = availableWidth / width;
		const scaleY = availableHeight / height;
		const computedScale = Math.min(scaleX, scaleY);

		// Clamp to min/max
		return Math.max(minScale, Math.min(computedScale, maxScale));
	}

	// ==========================================================================
	// Lifecycle
	// ==========================================================================

	onMount(() => {
		if (!wrapperElement) return;

		// Set up ResizeObserver on wrapper to track container size
		const resizeObserver = new ResizeObserver((entries) => {
			for (const entry of entries) {
				const { width, height } = entry.contentRect;
				if (width > 0 && height > 0) {
					scale = calculateScale(width, height);
					store.setScale(scale);
				}
			}
		});

		resizeObserver.observe(wrapperElement);

		// Initial scale calculation
		const rect = wrapperElement.getBoundingClientRect();
		if (rect.width > 0 && rect.height > 0) {
			scale = calculateScale(rect.width, rect.height);
			store.setScale(scale);
		}

		// Hash navigation setup
		let cleanupHash: (() => void) | undefined;
		if (mergedConfig.hash) {
			// Parse initial hash and navigate if present
			const initialState = parseHash(window.location.hash, mergedConfig.hashOneBasedIndex);
			if (initialState) {
				store.goTo(initialState.h, initialState.v, initialState.f);
			}

			cleanupHash = createHashNavigation(store, {
				respondToHashChanges: mergedConfig.respondToHashChanges,
				fragmentInURL: mergedConfig.fragmentInURL,
				oneBasedIndex: mergedConfig.hashOneBasedIndex
			});
		}

		// Mark as ready
		ready = true;
		onready?.();

		return () => {
			resizeObserver.disconnect();
			cleanupHash?.();
		};
	});

	// ==========================================================================
	// Effects
	// ==========================================================================

	// Sync hash with store state when it changes
	$effect(() => {
		if (!ready || !mergedConfig.hash) return;

		syncHashEffect(store, {
			fragmentInURL: mergedConfig.fragmentInURL,
			oneBasedIndex: mergedConfig.hashOneBasedIndex
		});
	});

	// Fire slidechanged event when position changes
	$effect(() => {
		const h = store.h;
		const v = store.v;
		const f = store.f;

		if (!ready) return;

		// Only fire if position actually changed
		if (h !== previousH || v !== previousV) {
			const event: SlideChangedEvent = {
				h,
				v,
				f,
				previousH,
				previousV
			};

			onslidechanged?.(event);

			previousH = h;
			previousV = v;
		}
	});

	// ==========================================================================
	// Navigation Handlers
	// ==========================================================================

	function handlePrev() {
		store.prev();
	}

	function handleNext() {
		store.next();
	}

	function handleUp() {
		store.up();
	}

	function handleDown() {
		store.down();
	}

	// ==========================================================================
	// Computed Values
	// ==========================================================================

	const viewportStyle = $derived.by(() => {
		const { width = 1920, height = 1080 } = mergedConfig;
		return `width: ${width}px; height: ${height}px; transform: scale(${scale});`;
	});

	const isFullscreen = $derived(mergedConfig.fullscreen ?? false);
	const showControls = $derived(mergedConfig.controls ?? true);
	const showProgress = $derived(mergedConfig.progress ?? true);
	const keyboardEnabled = $derived(mergedConfig.keyboard ?? true);
	const touchEnabled = $derived(mergedConfig.touch ?? true);

	// Swipe handlers for touch navigation
	const swipeHandlers = $derived(createSwipeHandlers(store));

	// Progress calculation
	const progressPercent = $derived.by(() => {
		const total = store.totalH;
		if (total <= 1) return 0;
		return (store.h / (total - 1)) * 100;
	});

	// Vertical navigation state
	const hasVerticalSlides = $derived(store.hasVerticalSlides);
	const canGoUp = $derived(store.v > 0);
	const canGoDown = $derived(store.v < store.verticalCount - 1);
</script>

<div
	class="deck-wrapper"
	class:fullscreen={isFullscreen}
	class:overview={store.overview}
	class:paused={store.paused}
	bind:this={wrapperElement}
	tabindex="0"
	role="application"
	aria-label="Presentation slides"
	use:keyboard={{ store, enabled: keyboardEnabled }}
	use:swipe={touchEnabled ? swipeHandlers : undefined}
>
	<div class="slides-viewport" bind:this={viewportElement} style={viewportStyle}>
		<div class="slides-container" class:centered={mergedConfig.center}>
			{@render children()}
		</div>
	</div>

	<!-- Navigation controls -->
	{#if showControls}
		<div class="controls" class:edges={mergedConfig.controlsLayout === 'edges'}>
			<button
				type="button"
				class="control-btn control-prev"
				class:faded={mergedConfig.controlsBackArrows === 'faded' && store.h === 0 && store.v === 0}
				class:hidden={mergedConfig.controlsBackArrows === 'hidden' &&
					store.h === 0 &&
					store.v === 0}
				onclick={handlePrev}
				disabled={store.h === 0 && store.v === 0 && store.f < 0}
				aria-label="Diapositive précédente"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="15,18 9,12 15,6" />
				</svg>
			</button>

			{#if hasVerticalSlides}
				<div class="controls-vertical">
					<button
						type="button"
						class="control-btn control-btn-small control-up"
						onclick={handleUp}
						disabled={!canGoUp}
						aria-label="Diapositive verticale précédente"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="18,15 12,9 6,15" />
						</svg>
					</button>
					<button
						type="button"
						class="control-btn control-btn-small control-down"
						onclick={handleDown}
						disabled={!canGoDown}
						aria-label="Diapositive verticale suivante"
					>
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="6,9 12,15 18,9" />
						</svg>
					</button>
				</div>
			{/if}

			<button
				type="button"
				class="control-btn control-next"
				onclick={handleNext}
				aria-label="Diapositive suivante"
			>
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="9,6 15,12 9,18" />
				</svg>
			</button>
		</div>
	{/if}

	<!-- Progress bar -->
	{#if showProgress}
		<div
			class="progress-bar"
			role="progressbar"
			aria-valuenow={progressPercent}
			aria-valuemin={0}
			aria-valuemax={100}
		>
			<div class="progress-fill" style="width: {progressPercent}%"></div>
		</div>
	{/if}

	<!-- Slide number -->
	{#if mergedConfig.slideNumber}
		<div class="slide-number" aria-live="polite">
			{store.h + 1}{store.v > 0 ? `.${store.v + 1}` : ''} / {store.totalH}
		</div>
	{/if}

	<!-- Pause overlay -->
	{#if store.paused}
		<div class="pause-overlay" aria-label="Présentation en pause">
			<span class="pause-text">Pause</span>
		</div>
	{/if}

	<!-- Annotation toolbar rendered outside viewport transforms -->
	{#if slideAnnotationStore.available}
		<SlideAnnotationToolbar
			tool={slideAnnotationStore.tool}
			style={slideAnnotationStore.style}
			enabled={slideAnnotationStore.enabled}
			canUndo={slideAnnotationStore.canUndo}
			canRedo={slideAnnotationStore.canRedo}
			ontoolchange={(tool) => slideAnnotationStore.setTool(tool)}
			onstylechange={(style) => slideAnnotationStore.setStyle(style)}
			ontoggle={() => slideAnnotationStore.toggle()}
			onclear={() => slideAnnotationStore.clear()}
			onundo={() => slideAnnotationStore.undo()}
			onredo={() => slideAnnotationStore.redo()}
		/>
	{/if}
</div>

<style>
	/* =========================================================================
	 * Deck Wrapper
	 * ========================================================================= */

	.deck-wrapper {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
		background-color: var(--color-background, #1e1e2e);
		outline: none;
	}

	.deck-wrapper:focus {
		outline: 2px solid var(--color-primary, #3b82f6);
		outline-offset: -2px;
	}

	.deck-wrapper.fullscreen {
		position: fixed;
		inset: 0;
		z-index: 9999;
	}

	.deck-wrapper.paused {
		filter: brightness(0.3);
	}

	/* =========================================================================
	 * Slides Viewport
	 * ========================================================================= */

	.slides-viewport {
		position: absolute;
		top: 50%;
		left: 50%;
		transform-origin: center center;
		/* Scale transform applied via inline style */
		translate: -50% -50%;
	}

	.slides-container {
		position: relative;
		width: 100%;
		height: 100%;
	}

	.slides-container.centered {
		display: flex;
		align-items: center;
		justify-content: center;
	}

	/* =========================================================================
	 * Navigation Controls
	 * ========================================================================= */

	.controls {
		position: absolute;
		bottom: 16px;
		right: 16px;
		display: flex;
		gap: 8px;
		z-index: 100;
	}

	.controls.edges {
		/* Position controls at edges of screen */
		bottom: auto;
		right: auto;
	}

	.controls.edges .control-prev {
		position: fixed;
		left: 16px;
		top: 50%;
		transform: translateY(-50%);
	}

	.controls.edges .control-next {
		position: fixed;
		right: 16px;
		top: 50%;
		transform: translateY(-50%);
	}

	.control-btn {
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: none;
		background: rgba(255, 255, 255, 0.1);
		color: rgba(255, 255, 255, 0.8);
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition:
			background-color 0.2s,
			opacity 0.2s,
			transform 0.1s;
		backdrop-filter: blur(4px);
	}

	.control-btn:hover:not(:disabled) {
		background: rgba(255, 255, 255, 0.2);
		color: white;
	}

	.control-btn:active:not(:disabled) {
		transform: scale(0.95);
	}

	.control-btn:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}

	.control-btn.faded {
		opacity: 0.3;
	}

	.control-btn.hidden {
		visibility: hidden;
	}

	.control-btn svg {
		width: 24px;
		height: 24px;
	}

	.controls-vertical {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	.control-btn-small {
		width: 32px;
		height: 32px;
	}

	.control-btn-small svg {
		width: 18px;
		height: 18px;
	}

	/* =========================================================================
	 * Progress Bar
	 * ========================================================================= */

	.progress-bar {
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 4px;
		background: rgba(255, 255, 255, 0.1);
		z-index: 100;
	}

	.progress-fill {
		height: 100%;
		background: var(--color-primary, #3b82f6);
		transition: width 0.3s ease-out;
	}

	/* =========================================================================
	 * Slide Number
	 * ========================================================================= */

	.slide-number {
		position: absolute;
		bottom: 16px;
		left: 16px;
		font-size: 14px;
		font-family: system-ui, sans-serif;
		color: rgba(255, 255, 255, 0.5);
		z-index: 100;
		user-select: none;
	}

	/* =========================================================================
	 * Pause Overlay
	 * ========================================================================= */

	.pause-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.8);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 200;
	}

	.pause-text {
		font-size: 48px;
		font-weight: bold;
		color: white;
		text-transform: uppercase;
		letter-spacing: 0.2em;
	}

	/* =========================================================================
	 * Overview Mode
	 * ========================================================================= */

	.deck-wrapper.overview {
		cursor: pointer;
		overflow: auto;
	}

	.deck-wrapper.overview .slides-viewport {
		position: relative;
		top: 0;
		left: 0;
		width: 100%;
		height: auto;
		min-height: 100%;
		transform: none !important;
		translate: none;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 20px;
		padding: 40px;
		box-sizing: border-box;
	}

	.deck-wrapper.overview .slides-container {
		display: contents;
	}

	/* In overview mode, each slide becomes a grid item */
	.deck-wrapper.overview :global(.slide) {
		position: relative !important;
		width: 100% !important;
		height: auto !important;
		aspect-ratio: 16 / 9;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		visibility: visible !important;
		opacity: 1 !important;
	}

	.deck-wrapper.overview :global(.slide:hover) {
		transform: scale(1.05);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
		z-index: 10;
	}

	.deck-wrapper.overview :global(.slide.active) {
		outline: 3px solid var(--color-primary, #3b82f6);
		outline-offset: 2px;
	}

	.deck-wrapper.overview :global(.vertical-stack) {
		display: flex;
		flex-direction: column;
		gap: 10px;
	}

	.deck-wrapper.overview :global(.vertical-stack .slide) {
		aspect-ratio: 16 / 9;
	}

	/* =========================================================================
	 * Print Styles
	 * ========================================================================= */

	@media print {
		.deck-wrapper {
			position: static;
			overflow: visible;
		}

		.slides-viewport {
			position: static;
			transform: none !important;
			translate: none;
		}

		.controls,
		.progress-bar,
		.slide-number,
		.pause-overlay {
			display: none;
		}
	}
</style>
