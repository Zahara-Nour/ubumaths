<script lang="ts">
	/**
	 * WhiteboardSlide - Displays a whiteboard Page in a slide with annotation support
	 *
	 * Integrates PageRenderer for read-only display and SlideAnnotationLayer
	 * for interactive teacher annotations during presentations.
	 * The toolbar is rendered at the Deck level via slideAnnotationStore.
	 *
	 * @module slides/core/WhiteboardSlide
	 */

	import { onMount, getContext } from 'svelte';
	import type { Snippet } from 'svelte';
	import Slide from './Slide.svelte';
	import type { SlideProps } from './types.js';
	import { DECK_CONTEXT_KEY } from './context.js';
	import type { DeckContext } from './types.js';
	import PageRenderer from '$lib/whiteboard/components/PageRenderer.svelte';
	import SlideAnnotationLayer from '../components/SlideAnnotationLayer.svelte';
	import { slideAnnotationStore } from '../stores/slideAnnotationStore.svelte.js';
	import type { Page, AnnotationElement } from '$lib/whiteboard/types/document';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props extends SlideProps {
		/** The whiteboard page to display */
		page: Page;
		/** Whether annotation mode is available */
		annotatable?: boolean;
		/** Initial annotations (if provided externally) */
		annotations?: AnnotationElement[];
		/** Callback when annotations change */
		onAnnotationsChange?: (annotations: AnnotationElement[]) => void;
		/** Additional content to render on top */
		overlay?: Snippet;
	}

	let {
		page,
		annotatable = true,
		annotations: externalAnnotations,
		onAnnotationsChange,
		overlay,
		// SlideProps
		transition,
		transitionSpeed,
		background,
		backgroundImage,
		backgroundVideo,
		backgroundIframe,
		backgroundSize,
		backgroundPosition,
		backgroundRepeat,
		backgroundOpacity,
		state: slideState,
		autoSlide,
		autoAnimate,
		autoAnimateId,
		visibility,
		class: className,
		data
	}: Props = $props();

	// ==========================================================================
	// Context
	// ==========================================================================

	const deckContext = getContext<DeckContext>(DECK_CONTEXT_KEY);

	// ==========================================================================
	// Local State
	// ==========================================================================

	/** Container element reference for measuring */
	let containerRef: HTMLDivElement | null = $state(null);
	let annotationLayerRef: SlideAnnotationLayer | null = $state(null);
	let slideElement: HTMLElement | null = $state(null);

	/** Internal annotations state (used if no external state provided) */
	let internalAnnotations = $state<AnnotationElement[]>([]);

	/** Computed scale based on container size */
	let computedScale = $state(1);

	/** Whether this slide is currently visible */
	let isCurrentSlide = $state(false);

	// ==========================================================================
	// Derived State
	// ==========================================================================

	/** Use external annotations if provided, otherwise internal */
	let annotations = $derived(externalAnnotations ?? internalAnnotations);

	let pageWidth = $derived(page?.width ?? 794);
	let pageHeight = $derived(page?.height ?? 1123);

	// ==========================================================================
	// Handlers
	// ==========================================================================

	function handleAnnotationsChange(newAnnotations: AnnotationElement[]) {
		if (externalAnnotations !== undefined) {
			// External state management
			onAnnotationsChange?.(newAnnotations);
		} else {
			// Internal state management
			internalAnnotations = newAnnotations;
		}
		updateUndoRedoState();
	}

	function handleClear() {
		annotationLayerRef?.clearAll();
		updateUndoRedoState();
	}

	function handleUndo() {
		annotationLayerRef?.undo();
		updateUndoRedoState();
	}

	function handleRedo() {
		annotationLayerRef?.redo();
		updateUndoRedoState();
	}

	function updateUndoRedoState() {
		const canUndo = annotationLayerRef?.canUndo() ?? false;
		const canRedo = annotationLayerRef?.canRedo() ?? false;
		slideAnnotationStore.setUndoRedoState(canUndo, canRedo);
	}

	// ==========================================================================
	// Scale Calculation
	// ==========================================================================

	function calculateScale() {
		if (!containerRef) return;

		const containerWidth = containerRef.clientWidth;
		const containerHeight = containerRef.clientHeight;

		if (containerWidth === 0 || containerHeight === 0) return;

		// Calculate scale to fit page in container while maintaining aspect ratio
		const scaleX = containerWidth / pageWidth;
		const scaleY = containerHeight / pageHeight;
		computedScale = Math.min(scaleX, scaleY); // Scale to fit container
	}

	// ==========================================================================
	// Slide Visibility Detection
	// ==========================================================================

	function checkIfCurrentSlide() {
		if (!slideElement || !deckContext) return false;

		// Find the section element (the actual slide)
		const section = slideElement.closest('section');
		if (!section) return false;

		// Check if this section has the 'present' class (reveal.js adds this to current slide)
		return section.classList.contains('present');
	}

	// ==========================================================================
	// Lifecycle
	// ==========================================================================

	onMount(() => {
		calculateScale();

		// Recalculate on resize
		const resizeObserver = new ResizeObserver(() => {
			calculateScale();
		});

		if (containerRef) {
			resizeObserver.observe(containerRef);
		}

		// Initial check
		isCurrentSlide = checkIfCurrentSlide();
		if (isCurrentSlide && annotatable) {
			slideAnnotationStore.setAvailable(true);
			slideAnnotationStore.registerCallbacks({
				undo: handleUndo,
				redo: handleRedo,
				clear: handleClear
			});
		}

		return () => {
			resizeObserver.disconnect();
			if (isCurrentSlide) {
				slideAnnotationStore.setAvailable(false);
				slideAnnotationStore.unregisterCallbacks();
			}
		};
	});

	// Watch for slide changes using MutationObserver
	$effect(() => {
		if (!slideElement) return;

		const section = slideElement.closest('section');
		if (!section) return;

		const observer = new MutationObserver(() => {
			const nowCurrent = section.classList.contains('present');

			if (nowCurrent !== isCurrentSlide) {
				isCurrentSlide = nowCurrent;

				if (isCurrentSlide && annotatable) {
					slideAnnotationStore.setAvailable(true);
					slideAnnotationStore.registerCallbacks({
						undo: handleUndo,
						redo: handleRedo,
						clear: handleClear
					});
					updateUndoRedoState();
				} else if (!isCurrentSlide) {
					slideAnnotationStore.setAvailable(false);
					slideAnnotationStore.unregisterCallbacks();
				}
			}
		});

		observer.observe(section, { attributes: true, attributeFilter: ['class'] });

		return () => observer.disconnect();
	});
</script>

<Slide
	{transition}
	{transitionSpeed}
	{background}
	{backgroundImage}
	{backgroundVideo}
	{backgroundIframe}
	{backgroundSize}
	{backgroundPosition}
	{backgroundRepeat}
	{backgroundOpacity}
	state={slideState}
	{autoSlide}
	{autoAnimate}
	{autoAnimateId}
	{visibility}
	class="whiteboard-slide {className ?? ''}"
	{data}
>
	<div bind:this={containerRef} class="whiteboard-slide-container">
		<div bind:this={slideElement} class="slide-marker"></div>

		<div
			class="whiteboard-content"
			style="width: {pageWidth * computedScale}px; height: {pageHeight * computedScale}px;"
		>
			<!-- Read-only page content -->
			<PageRenderer {page} scale={computedScale} />

			<!-- Annotation layer (if enabled) -->
			{#if annotatable}
				<SlideAnnotationLayer
					bind:this={annotationLayerRef}
					{annotations}
					{pageWidth}
					{pageHeight}
					enabled={slideAnnotationStore.enabled && isCurrentSlide}
					tool={slideAnnotationStore.tool}
					style={slideAnnotationStore.style}
					onchange={handleAnnotationsChange}
				/>
			{/if}
		</div>

		<!-- Additional content -->
		{#if overlay}
			{@render overlay()}
		{/if}
	</div>
</Slide>

<style>
	:global(.whiteboard-slide) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.whiteboard-slide-container {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.slide-marker {
		display: none;
	}

	.whiteboard-content {
		position: relative;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		border-radius: 4px;
		overflow: hidden;
	}
</style>
