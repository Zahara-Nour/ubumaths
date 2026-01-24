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

	import type { Snippet } from 'svelte';
	import Slide from './Slide.svelte';
	import type { SlideProps } from './types.js';
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
	// Slide Active State
	// ==========================================================================

	/** Whether this slide is currently active (tracked via Slide's onActiveChange callback) */
	let isCurrentSlide = $state(false);

	function handleActiveChange(active: boolean) {
		isCurrentSlide = active;
	}

	// ==========================================================================
	// Local State
	// ==========================================================================

	/** Container element reference for measuring */
	let containerRef: HTMLDivElement | null = $state(null);
	let annotationLayerRef: SlideAnnotationLayer | null = $state(null);

	/** Internal annotations state (used if no external state provided) */
	let internalAnnotations = $state<AnnotationElement[]>([]);

	/** Computed scale based on container size */
	let computedScale = $state(1);

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
	// Lifecycle
	// ==========================================================================

	// Track ResizeObserver for cleanup
	let resizeObserver: ResizeObserver | null = null;

	// Use $effect to react when containerRef becomes available
	$effect(() => {
		if (!containerRef) return;

		// Calculate initial scale
		calculateScale();

		// Set up ResizeObserver
		resizeObserver = new ResizeObserver(() => {
			calculateScale();
		});
		resizeObserver.observe(containerRef);

		// Cleanup
		return () => {
			resizeObserver?.disconnect();
			resizeObserver = null;
		};
	});

	// Watch for slide active state changes and update annotation store
	$effect(() => {
		if (isCurrentSlide && annotatable) {
			slideAnnotationStore.setAvailable(true);
			slideAnnotationStore.registerCallbacks({
				undo: handleUndo,
				redo: handleRedo,
				clear: handleClear
			});
			updateUndoRedoState();

			// Cleanup when effect re-runs or component unmounts
			return () => {
				slideAnnotationStore.setAvailable(false);
				slideAnnotationStore.unregisterCallbacks();
			};
		}
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
	onActiveChange={handleActiveChange}
>
	<div bind:this={containerRef} class="whiteboard-slide-container">
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

	/* Remove padding and ensure full space for whiteboard */
	:global(.whiteboard-slide .slide-content) {
		padding: 0 !important;
	}

	.whiteboard-slide-container {
		/* Take all available space */
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	.whiteboard-content {
		position: relative;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		border-radius: 4px;
		overflow: hidden;
	}
</style>
