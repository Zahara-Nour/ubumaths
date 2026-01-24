<script lang="ts">
	/**
	 * WhiteboardSlide - Displays a whiteboard Page in a slide with annotation support
	 *
	 * Integrates PageRenderer for read-only display and SlideAnnotationLayer
	 * for interactive teacher annotations during presentations.
	 *
	 * @module slides/core/WhiteboardSlide
	 */

	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import Slide from './Slide.svelte';
	import type { SlideProps } from './types.js';
	import PageRenderer from '$lib/whiteboard/components/PageRenderer.svelte';
	import SlideAnnotationLayer, {
		type SlideAnnotationToolType,
		type AnnotationStyle
	} from '../components/SlideAnnotationLayer.svelte';
	import SlideAnnotationToolbar from '../components/SlideAnnotationToolbar.svelte';
	import type { Page, AnnotationElement } from '$lib/whiteboard/types/document';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props extends SlideProps {
		/** The whiteboard page to display */
		page: Page;
		/** Whether annotation mode is available */
		annotatable?: boolean;
		/** Whether to show the annotation toolbar */
		showToolbar?: boolean;
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
		showToolbar = true,
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
	// Local State
	// ==========================================================================

	/** Container element reference for measuring */
	let containerRef: HTMLDivElement | null = $state(null);
	let annotationLayerRef: SlideAnnotationLayer | null = $state(null);

	/** Internal annotations state (used if no external state provided) */
	let internalAnnotations = $state<AnnotationElement[]>([]);

	/** Annotation mode state */
	let isAnnotating = $state(false);
	let annotationTool = $state<SlideAnnotationToolType>('pen');
	let annotationStyle = $state<AnnotationStyle>({
		color: '#ff0000',
		strokeWidth: 3,
		opacity: 1
	});

	/** Computed scale based on container size */
	let computedScale = $state(1);

	/** Track undo/redo state */
	let canUndo = $state(false);
	let canRedo = $state(false);

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

	function handleToolChange(tool: SlideAnnotationToolType) {
		annotationTool = tool;
	}

	function handleStyleChange(style: AnnotationStyle) {
		annotationStyle = style;
	}

	function handleToggle(enabled: boolean) {
		isAnnotating = enabled;
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
		canUndo = annotationLayerRef?.canUndo() ?? false;
		canRedo = annotationLayerRef?.canRedo() ?? false;
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

	onMount(() => {
		calculateScale();

		// Recalculate on resize
		const resizeObserver = new ResizeObserver(() => {
			calculateScale();
		});

		if (containerRef) {
			resizeObserver.observe(containerRef);
		}

		return () => {
			resizeObserver.disconnect();
		};
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
					enabled={isAnnotating}
					tool={annotationTool}
					style={annotationStyle}
					onchange={handleAnnotationsChange}
				/>
			{/if}
		</div>

		<!-- Annotation toolbar -->
		{#if annotatable && showToolbar}
			<SlideAnnotationToolbar
				tool={annotationTool}
				style={annotationStyle}
				enabled={isAnnotating}
				{canUndo}
				{canRedo}
				ontoolchange={handleToolChange}
				onstylechange={handleStyleChange}
				ontoggle={handleToggle}
				onclear={handleClear}
				onundo={handleUndo}
				onredo={handleRedo}
			/>
		{/if}

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

	.whiteboard-content {
		position: relative;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
		border-radius: 4px;
		overflow: hidden;
	}
</style>
