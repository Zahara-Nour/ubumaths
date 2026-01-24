<script lang="ts">
	import { onMount, getContext, setContext, type Snippet } from 'svelte';
	import type { SlideProps } from './types.js';
	import { DECK_CONTEXT_KEY, SLIDE_POSITION_KEY } from './context.js';
	import type { DeckStore } from '../stores/deckStore.svelte.js';
	import { TRANSITION_DURATIONS } from './types.js';

	// ============================================================================
	// Types
	// ============================================================================

	interface Props extends SlideProps {
		/** Slide content */
		children: Snippet;
		/** Nested vertical slides */
		vertical?: Snippet;
	}

	interface SlidePositionContext {
		h: number;
		nextV: () => number;
	}

	// ============================================================================
	// Props
	// ============================================================================

	let {
		children,
		vertical,
		transition = 'fade',
		transitionSpeed = 'default',
		background,
		backgroundImage,
		backgroundVideo,
		backgroundIframe,
		backgroundSize = 'cover',
		backgroundPosition = 'center',
		backgroundRepeat = 'no-repeat',
		backgroundOpacity = 1,
		backgroundInteractive = false,
		state: slideState,
		autoSlide,
		autoAnimate,
		autoAnimateId,
		visibility,
		class: className,
		data,
		onActiveChange
	}: Props = $props();

	// ============================================================================
	// Context & State
	// ============================================================================

	const deckContext = getContext<{ getStore: () => DeckStore }>(DECK_CONTEXT_KEY);
	const deckStore = deckContext?.getStore();
	const positionContext = getContext<SlidePositionContext | undefined>(SLIDE_POSITION_KEY);
	const hasVerticalSlides = vertical !== undefined;

	let slideH = $state(0);
	let slideV = $state(0);
	let slideElement: HTMLElement | undefined = $state();

	// Claim h index during script execution for correct ordering
	if (!positionContext && deckStore) {
		slideH = deckStore.claimNextH();
		slideV = 0;
	}

	// Is this slide currently active?
	const isActive = $derived(deckStore ? deckStore.h === slideH && deckStore.v === slideV : false);
	const isInActiveStack = $derived(deckStore ? deckStore.h === slideH : false);

	// Is this slide before or after the current slide? (for directional transitions)
	const isPast = $derived(
		deckStore ? slideH < deckStore.h || (slideH === deckStore.h && slideV < deckStore.v) : false
	);
	const isFuture = $derived(
		deckStore ? slideH > deckStore.h || (slideH === deckStore.h && slideV > deckStore.v) : false
	);

	// Notify parent components when active state changes
	$effect(() => {
		onActiveChange?.(isActive);
	});

	// ============================================================================
	// Transition Configuration
	// ============================================================================

	const transitionDuration = $derived(TRANSITION_DURATIONS[transitionSpeed]);

	// CSS transition style based on transition type
	const transitionStyle = $derived.by(() => {
		if (transition === 'none') return '';
		return `transition: opacity ${transitionDuration}ms ease, visibility ${transitionDuration}ms ease, transform ${transitionDuration}ms ease;`;
	});

	// ============================================================================
	// Fragment Management
	// ============================================================================

	function updateFragmentVisibility(element: HTMLElement, currentF: number) {
		const fragments = element.querySelectorAll('.fragment');
		fragments.forEach((fragment, index) => {
			const isVisible = index <= currentF;
			const isCurrent = index === currentF;
			fragment.classList.toggle('visible', isVisible);
			fragment.classList.toggle('current-fragment', isCurrent);
		});
	}

	function initFragments(node: HTMLElement) {
		updateFragmentVisibility(node, deckStore?.f ?? -1);
	}

	function handleSlideClick() {
		if (deckStore?.overview) {
			deckStore.goTo(slideH, slideV);
			deckStore.setOverview(false);
		}
	}

	// ============================================================================
	// Background Style
	// ============================================================================

	// Check if we have any background media (separate layer needed)
	const hasBackgroundMedia = $derived(
		!!background || !!backgroundImage || !!backgroundVideo || !!backgroundIframe
	);

	// Style for the background layer
	const backgroundLayerStyle = $derived.by(() => {
		const styles: string[] = [];

		if (background) {
			styles.push(`background: ${background}`);
		}
		if (backgroundImage) {
			styles.push(`background-image: url('${backgroundImage}')`);
			styles.push(`background-size: ${backgroundSize}`);
			styles.push(`background-position: ${backgroundPosition}`);
			styles.push(`background-repeat: ${backgroundRepeat}`);
		}
		if (backgroundOpacity !== 1) {
			styles.push(`opacity: ${backgroundOpacity}`);
		}

		return styles.length > 0 ? styles.join('; ') : undefined;
	});

	// Slide style (just the transition, no background when we have a separate background layer)
	const slideStyle = $derived.by(() => {
		const parts: string[] = [];
		if (transitionStyle) parts.push(transitionStyle);
		return parts.length > 0 ? parts.join('; ') : undefined;
	});

	// ============================================================================
	// Data Attributes
	// ============================================================================

	const dataAttributes = $derived.by(() => {
		const attrs: Record<string, string> = {};

		if (slideState) attrs['data-state'] = slideState;
		if (autoSlide !== undefined) attrs['data-autoslide'] = String(autoSlide);
		if (autoAnimate) attrs['data-auto-animate'] = '';
		if (autoAnimateId) attrs['data-auto-animate-id'] = autoAnimateId;
		if (visibility) attrs['data-visibility'] = visibility;

		if (data) {
			for (const [key, value] of Object.entries(data)) {
				attrs[`data-${key}`] = value;
			}
		}

		return attrs;
	});

	// ============================================================================
	// Vertical Stack Context
	// ============================================================================

	let verticalIndex = $state(0);

	if (hasVerticalSlides) {
		setContext(SLIDE_POSITION_KEY, {
			get h() {
				return slideH;
			},
			nextV: () => {
				const v = verticalIndex;
				verticalIndex++;
				return v + 1;
			}
		} satisfies SlidePositionContext);
	}

	// ============================================================================
	// Lifecycle
	// ============================================================================

	onMount(() => {
		if (!deckStore) {
			console.warn('Slide: No deck store found in context');
			return;
		}

		if (positionContext) {
			slideH = positionContext.h;
			slideV = positionContext.nextV();
		}

		deckStore.registerSlide({
			h: slideH,
			v: slideV,
			element: slideElement ?? null
		});

		return () => {
			deckStore.unregisterSlide(slideH, slideV);
		};
	});

	$effect(() => {
		if (slideElement && deckStore) {
			const slide = deckStore.getSlide(slideH, slideV);
			if (slide) {
				slide.element = slideElement;
			}
		}
	});

	$effect(() => {
		if (isActive && slideElement && deckStore) {
			updateFragmentVisibility(slideElement, deckStore.f);
		}
	});
</script>

{#if hasVerticalSlides}
	<div class="vertical-stack" class:active-stack={isInActiveStack}>
		<div
			bind:this={slideElement}
			use:initFragments
			class="slide {className ?? ''} transition-{transition}"
			class:active={isActive}
			class:past={isPast}
			class:future={isFuture}
			class:background-interactive={backgroundInteractive}
			style={slideStyle}
			{...dataAttributes}
			onclick={handleSlideClick}
		>
			{@render slideContent()}
		</div>
		{@render vertical()}
	</div>
{:else}
	<div
		bind:this={slideElement}
		use:initFragments
		class="slide {className ?? ''} transition-{transition}"
		class:active={isActive}
		class:past={isPast}
		class:future={isFuture}
		class:background-interactive={backgroundInteractive}
		style={slideStyle}
		{...dataAttributes}
		onclick={handleSlideClick}
	>
		{@render slideContent()}
	</div>
{/if}

{#snippet slideContent()}
	<!-- Background layer -->
	{#if hasBackgroundMedia}
		<div class="slide-background" style={backgroundLayerStyle}>
			{#if backgroundVideo}
				<video class="slide-background-video" src={backgroundVideo} autoplay loop muted playsinline
				></video>
			{/if}
			{#if backgroundIframe}
				<iframe
					class="slide-background-iframe"
					class:interactive={backgroundInteractive}
					src={backgroundIframe}
					title="Background"
					frameborder="0"
				></iframe>
			{/if}
		</div>
	{/if}
	<!-- Content layer -->
	<div class="slide-content" class:background-interactive={backgroundInteractive}>
		{@render children()}
	</div>
{/snippet}

<style>
	.vertical-stack {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
	}

	/*
	 * Slide visibility using pure CSS transitions (like reveal.js)
	 *
	 * All slides are always in the DOM. Active slide has opacity: 1,
	 * inactive slides have opacity: 0. CSS transition handles the fade.
	 */
	.slide {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-direction: column;
		box-sizing: border-box;
		overflow: hidden;

		/* Default background */
		background-color: var(--slide-background, transparent);

		/* Inactive state */
		opacity: 0;
		visibility: hidden;
		z-index: 1;
		pointer-events: none;
	}

	.slide.active {
		opacity: 1;
		visibility: visible;
		z-index: 2;
		pointer-events: auto;
		transform: none;
	}

	/* =========================================================================
	 * Transition: Slide (translateX)
	 * ========================================================================= */
	.slide.transition-slide.past {
		transform: translateX(-100%);
	}

	.slide.transition-slide.future {
		transform: translateX(100%);
	}

	/* =========================================================================
	 * Transition: Zoom (scale)
	 * ========================================================================= */
	.slide.transition-zoom.past {
		transform: scale(0.5);
	}

	.slide.transition-zoom.future {
		transform: scale(2);
	}

	/* =========================================================================
	 * Transition: Convex (3D rotation outward)
	 * ========================================================================= */
	.slide.transition-convex {
		transform-style: preserve-3d;
	}

	.slide.transition-convex.past {
		transform: perspective(1000px) rotateY(-90deg) translateZ(300px);
	}

	.slide.transition-convex.future {
		transform: perspective(1000px) rotateY(90deg) translateZ(300px);
	}

	/* =========================================================================
	 * Transition: Concave (3D rotation inward)
	 * ========================================================================= */
	.slide.transition-concave {
		transform-style: preserve-3d;
	}

	.slide.transition-concave.past {
		transform: perspective(1000px) rotateY(90deg) translateZ(300px);
	}

	.slide.transition-concave.future {
		transform: perspective(1000px) rotateY(-90deg) translateZ(300px);
	}

	/* =========================================================================
	 * Transition: Fade (opacity only, no transform)
	 * ========================================================================= */
	.slide.transition-fade.past,
	.slide.transition-fade.future {
		transform: none;
	}

	/* =========================================================================
	 * Transition: None (instant)
	 * ========================================================================= */
	.slide.transition-none {
		transition: none !important;
	}

	.slide-content {
		position: relative;
		z-index: 1;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: var(--slide-padding, 2rem);
		box-sizing: border-box;
	}

	/*
	 * Line-height override for slide content
	 */
	:global(.slide-content h1),
	:global(.slide-content h2),
	:global(.slide-content h3),
	:global(.slide-content h4),
	:global(.slide-content h5),
	:global(.slide-content h6) {
		line-height: 1.2 !important;
	}

	:global(.slide-content p),
	:global(.slide-content li) {
		line-height: 1.5 !important;
	}

	/* =========================================================================
	 * Background Layer (separate for independent transitions)
	 * ========================================================================= */
	.slide-background {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		z-index: 0;
		/* Note: background-size/position are set via inline styles to allow customization */

		/* Always visible when parent slide is active (parent controls visibility) */
		opacity: 1;
		visibility: visible;
	}

	/* Background media */
	.slide-background-video,
	.slide-background-iframe {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		z-index: 0;
		pointer-events: none;
	}

	.slide-background-iframe {
		border: none;
	}

	/* Interactive iframes */
	.slide-background-iframe.interactive {
		pointer-events: auto;
	}

	/* When background is interactive, content should allow clicks through */
	.slide-content.background-interactive {
		pointer-events: none;
	}

	.slide-content.background-interactive > * {
		pointer-events: auto;
	}

	/*
	 * Fragment visibility styles
	 */
	:global(.slide .fragment) {
		opacity: 0 !important;
		pointer-events: none !important;
		transition: none !important;
	}

	:global(.slide .fragment.visible) {
		opacity: 1 !important;
		pointer-events: auto !important;
		transition:
			opacity 0.3s ease,
			transform 0.3s ease !important;
	}

	:global(.fragment.current-fragment) {
		/* Additional styling for currently revealing fragment */
	}

	/* Fragment animation variants */
	:global(.fragment.fade-in) {
		opacity: 0;
	}

	:global(.fragment.fade-in.visible) {
		opacity: 1;
	}

	:global(.fragment.fade-out) {
		opacity: 1;
	}

	:global(.fragment.fade-out.visible) {
		opacity: 0;
	}

	:global(.fragment.grow) {
		transform: scale(0.5);
	}

	:global(.fragment.grow.visible) {
		transform: scale(1);
	}

	:global(.fragment.shrink) {
		transform: scale(1.5);
	}

	:global(.fragment.shrink.visible) {
		transform: scale(1);
	}

	:global(.fragment.slide-up) {
		transform: translateY(50px);
	}

	:global(.fragment.slide-up.visible) {
		transform: translateY(0);
	}

	:global(.fragment.slide-down) {
		transform: translateY(-50px);
	}

	:global(.fragment.slide-down.visible) {
		transform: translateY(0);
	}

	:global(.fragment.slide-left) {
		transform: translateX(50px);
	}

	:global(.fragment.slide-left.visible) {
		transform: translateX(0);
	}

	:global(.fragment.slide-right) {
		transform: translateX(-50px);
	}

	:global(.fragment.slide-right.visible) {
		transform: translateX(0);
	}

	:global(.fragment.highlight-red.visible) {
		color: #ff2c2d;
	}

	:global(.fragment.highlight-green.visible) {
		color: #17ff2e;
	}

	:global(.fragment.highlight-blue.visible) {
		color: #1b91ff;
	}

	:global(.fragment.highlight-current-red.current-fragment) {
		color: #ff2c2d;
	}

	:global(.fragment.highlight-current-green.current-fragment) {
		color: #17ff2e;
	}

	:global(.fragment.highlight-current-blue.current-fragment) {
		color: #1b91ff;
	}
</style>
