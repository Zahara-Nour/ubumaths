<script lang="ts">
	/**
	 * AnnotatableSlide - Adds annotation capability to any slide content
	 *
	 * Wraps any slide content with an annotation layer that allows
	 * teachers to draw on top during presentations.
	 *
	 * @module slides/core/AnnotatableSlide
	 */

	import { onMount } from 'svelte';
	import type { Snippet } from 'svelte';
	import Slide from './Slide.svelte';
	import type { SlideProps } from './types.js';
	import SlideAnnotationLayer, {
		type SlideAnnotationToolType,
		type AnnotationStyle
	} from '../components/SlideAnnotationLayer.svelte';
	import SlideAnnotationToolbar from '../components/SlideAnnotationToolbar.svelte';
	import type { AnnotationElement } from '$lib/whiteboard/types/document';

	// ==========================================================================
	// Props
	// ==========================================================================

	interface Props extends SlideProps {
		/** Whether annotation mode is available */
		annotatable?: boolean;
		/** Whether to show the annotation toolbar */
		showToolbar?: boolean;
		/** Initial annotations (if provided externally) */
		annotations?: AnnotationElement[];
		/** Callback when annotations change */
		onAnnotationsChange?: (annotations: AnnotationElement[]) => void;
		/** Content to render in the slide */
		content?: Snippet;
	}

	let {
		annotatable = true,
		showToolbar = true,
		annotations: externalAnnotations,
		onAnnotationsChange,
		content,
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

	/** Container dimensions */
	let containerWidth = $state(1920);
	let containerHeight = $state(1080);

	/** Track undo/redo state */
	let canUndo = $state(false);
	let canRedo = $state(false);

	// ==========================================================================
	// Derived State
	// ==========================================================================

	/** Use external annotations if provided, otherwise internal */
	let annotations = $derived(externalAnnotations ?? internalAnnotations);

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
	// Size Tracking
	// ==========================================================================

	function updateDimensions() {
		if (!containerRef) return;

		const width = containerRef.clientWidth;
		const height = containerRef.clientHeight;

		if (width > 0 && height > 0) {
			containerWidth = width;
			containerHeight = height;
		}
	}

	// ==========================================================================
	// Lifecycle
	// ==========================================================================

	onMount(() => {
		updateDimensions();

		// Track container size changes
		const resizeObserver = new ResizeObserver(() => {
			updateDimensions();
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
	class="annotatable-slide {className ?? ''}"
	{data}
>
	<div bind:this={containerRef} class="annotatable-slide-container">
		<!-- Slide content -->
		<div class="slide-content">
			{#if content}
				{@render content()}
			{/if}
		</div>

		<!-- Annotation layer (if enabled) -->
		{#if annotatable}
			<SlideAnnotationLayer
				bind:this={annotationLayerRef}
				{annotations}
				pageWidth={containerWidth}
				pageHeight={containerHeight}
				enabled={isAnnotating}
				tool={annotationTool}
				style={annotationStyle}
				onchange={handleAnnotationsChange}
			/>
		{/if}

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
	</div>
</Slide>

<style>
	:global(.annotatable-slide) {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 100%;
	}

	.annotatable-slide-container {
		position: relative;
		width: 100%;
		height: 100%;
		overflow: hidden;
	}

	.slide-content {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}
</style>
