<script lang="ts">
	import { onMount, getContext, setContext, type Snippet } from 'svelte';
	import type { SlideProps } from './types.js';
	import { DECK_CONTEXT_KEY, SLIDE_POSITION_KEY } from './context.js';
	import type { DeckStore } from '../stores/deckStore.svelte.js';
	import { slideIn, slideOut } from '../transitions/slide.js';
	import { fadeIn, fadeOut } from '../transitions/fade.js';
	import { zoomIn, zoomOut } from '../transitions/zoom.js';
	import { convexIn, convexOut } from '../transitions/convex.js';
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
		transition = 'slide',
		transitionSpeed = 'default',
		background,
		backgroundImage,
		backgroundVideo,
		backgroundIframe,
		backgroundSize = 'cover',
		backgroundPosition = 'center',
		backgroundRepeat = 'no-repeat',
		backgroundOpacity = 1,
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

	// Get deck store from context
	const deckContext = getContext<{ getStore: () => DeckStore }>(DECK_CONTEXT_KEY);
	const deckStore = deckContext?.getStore();

	// Get position context (for vertical slides in a stack)
	const positionContext = getContext<SlidePositionContext | undefined>(SLIDE_POSITION_KEY);

	// Track if this slide has vertical children (check once at init)
	const hasVerticalSlides = vertical !== undefined;

	// Determine slide indices
	let slideH = $state(0);
	let slideV = $state(0);
	let slideElement: HTMLElement | undefined = $state();

	// For root slides (not inside a vertical stack), claim h index NOW during script execution
	// This ensures correct ordering because scripts execute in DOM order
	// Vertical children will get their h from the parent's context
	if (!positionContext && deckStore) {
		slideH = deckStore.claimNextH();
		slideV = 0;
	}

	// Is this slide currently active?
	const isActive = $derived(deckStore ? deckStore.h === slideH && deckStore.v === slideV : false);

	// Is this slide in the current vertical stack (for overview mode)?
	const isInActiveStack = $derived(deckStore ? deckStore.h === slideH : false);

	// Notify parent components when active state changes
	$effect(() => {
		onActiveChange?.(isActive);
	});

	// ============================================================================
	// Transition Configuration
	// ============================================================================

	const transitionDuration = $derived(TRANSITION_DURATIONS[transitionSpeed]);
	const transitionParams = $derived({ duration: transitionDuration });

	// ============================================================================
	// Fragment Management (like reveal.js - just update visibility based on f)
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

	// Action to initialize fragments synchronously when slide element is created
	// This runs BEFORE the transition starts, preventing flash
	function initFragments(node: HTMLElement) {
		updateFragmentVisibility(node, deckStore?.f ?? -1);
	}

	// Handle click in overview mode to navigate to this slide
	function handleSlideClick() {
		if (deckStore?.overview) {
			deckStore.goTo(slideH, slideV);
			deckStore.setOverview(false);
		}
	}

	// ============================================================================
	// Background Style
	// ============================================================================

	const backgroundStyle = $derived.by(() => {
		const styles: string[] = [];

		if (background) {
			styles.push(`background-color: ${background}`);
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

		// Merge custom data attributes
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

	// If this slide has vertical children, provide context for them
	// Using a closure to capture slideH reactively
	let verticalIndex = $state(0);

	if (hasVerticalSlides) {
		setContext(SLIDE_POSITION_KEY, {
			get h() {
				return slideH;
			},
			nextV: () => {
				const v = verticalIndex;
				verticalIndex++;
				return v + 1; // Vertical slides start at v=1 (parent is v=0)
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

		// For vertical slides, determine position from parent context
		if (positionContext) {
			slideH = positionContext.h;
			slideV = positionContext.nextV();
		}
		// Root slides already have their h from claimNextH during script execution

		// Register with store (element will be updated via $effect when bound)
		deckStore.registerSlide({
			h: slideH,
			v: slideV,
			element: slideElement ?? null
		});

		// Cleanup on unmount
		return () => {
			deckStore.unregisterSlide(slideH, slideV);
		};
	});

	// Update slide element reference in store when it becomes available
	// (slideElement is only bound when the slide is active)
	$effect(() => {
		if (slideElement && deckStore) {
			const slide = deckStore.getSlide(slideH, slideV);
			if (slide) {
				slide.element = slideElement;
			}
		}
	});

	// Update fragment visibility when store.f changes (like reveal.js)
	$effect(() => {
		if (isActive && slideElement && deckStore) {
			updateFragmentVisibility(slideElement, deckStore.f);
		}
	});
</script>

{#if hasVerticalSlides}
	<!-- Vertical slide stack -->
	<div class="vertical-stack" class:active-stack={isInActiveStack}>
		<!-- Parent slide (v=0) -->
		{#if isActive || deckStore?.overview}
			{#if transition === 'fade'}
				<div
					bind:this={slideElement}
					use:initFragments
					class="slide {className ?? ''}"
					class:active={isActive}
					style={backgroundStyle}
					{...dataAttributes}
					onclick={handleSlideClick}
					in:fadeIn={transitionParams}
					out:fadeOut={transitionParams}
				>
					{@render slideContent()}
				</div>
			{:else if transition === 'none'}
				<div
					bind:this={slideElement}
					use:initFragments
					class="slide {className ?? ''}"
					class:active={isActive}
					style={backgroundStyle}
					{...dataAttributes}
					onclick={handleSlideClick}
				>
					{@render slideContent()}
				</div>
			{:else if transition === 'zoom'}
				<div
					bind:this={slideElement}
					use:initFragments
					class="slide {className ?? ''}"
					class:active={isActive}
					style={backgroundStyle}
					{...dataAttributes}
					onclick={handleSlideClick}
					in:zoomIn={transitionParams}
					out:zoomOut={transitionParams}
				>
					{@render slideContent()}
				</div>
			{:else if transition === 'convex'}
				<div
					bind:this={slideElement}
					use:initFragments
					class="slide {className ?? ''}"
					class:active={isActive}
					style={backgroundStyle}
					{...dataAttributes}
					onclick={handleSlideClick}
					in:convexIn={transitionParams}
					out:convexOut={transitionParams}
				>
					{@render slideContent()}
				</div>
			{:else}
				<div
					bind:this={slideElement}
					use:initFragments
					class="slide {className ?? ''}"
					class:active={isActive}
					style={backgroundStyle}
					{...dataAttributes}
					onclick={handleSlideClick}
					in:slideIn={transitionParams}
					out:slideOut={transitionParams}
				>
					{@render slideContent()}
				</div>
			{/if}
		{/if}

		<!-- Vertical children -->
		{@render vertical()}
	</div>
{:else}
	<!-- Single slide -->
	{#if isActive || deckStore?.overview}
		{#if transition === 'fade'}
			<div
				bind:this={slideElement}
				use:initFragments
				class="slide {className ?? ''}"
				class:active={isActive}
				class:past={deckStore
					? deckStore.h > slideH || (deckStore.h === slideH && deckStore.v > slideV)
					: false}
				class:future={deckStore
					? deckStore.h < slideH || (deckStore.h === slideH && deckStore.v < slideV)
					: false}
				style={backgroundStyle}
				{...dataAttributes}
				onclick={handleSlideClick}
				in:fadeIn={transitionParams}
				out:fadeOut={transitionParams}
			>
				{@render slideContent()}
			</div>
		{:else if transition === 'none'}
			<div
				bind:this={slideElement}
				use:initFragments
				class="slide {className ?? ''}"
				class:active={isActive}
				class:past={deckStore
					? deckStore.h > slideH || (deckStore.h === slideH && deckStore.v > slideV)
					: false}
				class:future={deckStore
					? deckStore.h < slideH || (deckStore.h === slideH && deckStore.v < slideV)
					: false}
				style={backgroundStyle}
				{...dataAttributes}
				onclick={handleSlideClick}
			>
				{@render slideContent()}
			</div>
		{:else if transition === 'zoom'}
			<div
				bind:this={slideElement}
				use:initFragments
				class="slide {className ?? ''}"
				class:active={isActive}
				class:past={deckStore
					? deckStore.h > slideH || (deckStore.h === slideH && deckStore.v > slideV)
					: false}
				class:future={deckStore
					? deckStore.h < slideH || (deckStore.h === slideH && deckStore.v < slideV)
					: false}
				style={backgroundStyle}
				{...dataAttributes}
				onclick={handleSlideClick}
				in:zoomIn={transitionParams}
				out:zoomOut={transitionParams}
			>
				{@render slideContent()}
			</div>
		{:else if transition === 'convex'}
			<div
				bind:this={slideElement}
				use:initFragments
				class="slide {className ?? ''}"
				class:active={isActive}
				class:past={deckStore
					? deckStore.h > slideH || (deckStore.h === slideH && deckStore.v > slideV)
					: false}
				class:future={deckStore
					? deckStore.h < slideH || (deckStore.h === slideH && deckStore.v < slideV)
					: false}
				style={backgroundStyle}
				{...dataAttributes}
				onclick={handleSlideClick}
				in:convexIn={transitionParams}
				out:convexOut={transitionParams}
			>
				{@render slideContent()}
			</div>
		{:else}
			<div
				bind:this={slideElement}
				use:initFragments
				class="slide {className ?? ''}"
				class:active={isActive}
				class:past={deckStore
					? deckStore.h > slideH || (deckStore.h === slideH && deckStore.v > slideV)
					: false}
				class:future={deckStore
					? deckStore.h < slideH || (deckStore.h === slideH && deckStore.v < slideV)
					: false}
				style={backgroundStyle}
				{...dataAttributes}
				onclick={handleSlideClick}
				in:slideIn={transitionParams}
				out:slideOut={transitionParams}
			>
				{@render slideContent()}
			</div>
		{/if}
	{/if}
{/if}

{#snippet slideContent()}
	{#if backgroundVideo}
		<video class="slide-background-video" src={backgroundVideo} autoplay loop muted playsinline
		></video>
	{/if}
	{#if backgroundIframe}
		<iframe
			class="slide-background-iframe"
			src={backgroundIframe}
			title="Background"
			frameborder="0"
		></iframe>
	{/if}
	<div class="slide-content">
		{@render children()}
	</div>
{/snippet}

<style>
	.vertical-stack {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
	}

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

		/* Visibility control */
		visibility: hidden;
		opacity: 0;
		pointer-events: none;
	}

	.slide.active {
		visibility: visible;
		opacity: 1;
		pointer-events: auto;
		z-index: 10;
	}

	.slide.past,
	.slide.future {
		/* Hidden but exists in DOM for transitions */
		visibility: hidden;
		opacity: 0;
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
	}

	.slide-background-iframe {
		border: none;
	}

	/* Fragment base styles */
	:global(.fragment) {
		opacity: 0;
		visibility: hidden;
	}

	:global(.fragment.visible) {
		opacity: 1;
		visibility: visible;
		transition:
			opacity 0.3s ease,
			transform 0.3s ease;
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
