<script lang="ts">
	/**
	 * GraphSVG Component
	 *
	 * Main SVG container that composes all graphing elements:
	 * - GridLines for background grid
	 * - AxisLines for coordinate axes
	 * - FunctionCurve for each plotted function
	 *
	 * Handles responsive sizing via ResizeObserver and coordinates
	 * all child components with the current viewport state.
	 *
	 * @component
	 */

	import { grapheurStore } from '$lib/stores/grapheur.svelte';
	import { createTransformer } from '$lib/grapheur/viewport';
	import type { Viewport } from '$lib/grapheur/types';
	import GridLines from './GridLines.svelte';
	import AxisLines from './AxisLines.svelte';
	import FunctionCurve from './FunctionCurve.svelte';
	import CurveHover from './CurveHover.svelte';
	import IntersectionPoints from './IntersectionPoints.svelte';
	import AsymptoteLines from './AsymptoteLines.svelte';
	import SpecialPoints from './SpecialPoints.svelte';

	// Props
	let {
		class: className = '',
		onSvgReady
	}: {
		class?: string;
		onSvgReady?: (svg: SVGSVGElement, width: number, height: number) => void;
	} = $props();

	// ==========================================================================
	// State
	// ==========================================================================

	/** Reference to the container div for ResizeObserver */
	let containerRef: HTMLDivElement | undefined = $state();

	/** Current SVG width in pixels */
	let width = $state(800);

	/** Current SVG height in pixels */
	let height = $state(600);

	/** Reference to the SVG element for export */
	let svgRef: SVGSVGElement | undefined = $state();

	// ==========================================================================
	// Responsive Sizing
	// ==========================================================================

	/**
	 * Set up ResizeObserver to track container dimensions.
	 * Updates width/height state when container size changes.
	 */
	$effect(() => {
		if (!containerRef) return;

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (entry) {
				const rect = entry.contentRect;
				// Only update if dimensions actually changed (avoids unnecessary rerenders)
				if (rect.width !== width || rect.height !== height) {
					width = rect.width;
					height = rect.height;
				}
			}
		});

		observer.observe(containerRef);

		return () => {
			observer.disconnect();
		};
	});

	/**
	 * Notify parent when SVG element is available for export.
	 * Triggers when svgRef, width, or height change.
	 */
	$effect(() => {
		if (svgRef && onSvgReady && width > 0 && height > 0) {
			onSvgReady(svgRef, width, height);
		}
	});

	// ==========================================================================
	// Coordinate Transformer
	// ==========================================================================

	/**
	 * Create a coordinate transformer based on current viewport and SVG dimensions.
	 * This is memoized to avoid recreating the transformer on every render.
	 */
	const transformer = $derived(createTransformer(grapheurStore.viewport, width, height));

	// ==========================================================================
	// Interaction State
	// ==========================================================================

	/** Drag mode types */
	type DragMode = 'pan' | 'scale-x' | 'scale-y';

	/** Threshold in pixels for detecting axis proximity */
	const AXIS_THRESHOLD = 20;

	/** Whether user is currently dragging */
	let isDragging = $state(false);

	/** Current drag mode */
	let dragMode = $state<DragMode>('pan');

	/** Starting position of drag gesture (in screen coordinates) */
	let dragStart = $state<{ x: number; y: number } | null>(null);

	/** Viewport state at the start of drag gesture */
	let viewportStart = $state<Viewport | null>(null);

	/** Math coordinate where axis scaling is centered */
	let scaleCenter = $state<{ x: number; y: number } | null>(null);

	/** Hover mode for cursor display (when not dragging) */
	let hoverMode = $state<DragMode>('pan');

	/**
	 * Get cursor style based on current mode
	 */
	const cursorStyle = $derived.by(() => {
		if (isDragging) {
			switch (dragMode) {
				case 'scale-x':
					return 'ew-resize';
				case 'scale-y':
					return 'ns-resize';
				default:
					return 'grabbing';
			}
		}
		// Show appropriate cursor on hover
		switch (hoverMode) {
			case 'scale-x':
				return 'ew-resize';
			case 'scale-y':
				return 'ns-resize';
			default:
				return 'crosshair';
		}
	});

	// ==========================================================================
	// Axis Position Helpers
	// ==========================================================================

	/**
	 * Get the SVG Y position of the X-axis
	 */
	function getXAxisSvgY(): number {
		const vp = grapheurStore.viewport;
		if (vp.yMin > 0) return height;
		if (vp.yMax < 0) return 0;
		return transformer.mathToSvg(0, 0).y;
	}

	/**
	 * Get the SVG X position of the Y-axis
	 */
	function getYAxisSvgX(): number {
		const vp = grapheurStore.viewport;
		if (vp.xMin > 0) return 0;
		if (vp.xMax < 0) return width;
		return transformer.mathToSvg(0, 0).x;
	}

	/**
	 * Determine drag mode based on click position
	 */
	function detectDragMode(svgX: number, svgY: number): DragMode {
		const xAxisY = getXAxisSvgY();
		const yAxisX = getYAxisSvgX();

		const nearXAxis = Math.abs(svgY - xAxisY) < AXIS_THRESHOLD;
		const nearYAxis = Math.abs(svgX - yAxisX) < AXIS_THRESHOLD;

		// If near both axes (near origin), prefer pan
		if (nearXAxis && nearYAxis) return 'pan';

		// Near X-axis: scale X
		if (nearXAxis) return 'scale-x';

		// Near Y-axis: scale Y
		if (nearYAxis) return 'scale-y';

		// Otherwise: pan
		return 'pan';
	}

	// ==========================================================================
	// Interaction Handlers
	// ==========================================================================

	/**
	 * Handle pointer down - initiate dragging (pan or axis scale)
	 */
	function handlePointerDown(e: PointerEvent): void {
		if (e.button !== 0) return; // Left click only

		const rect = (e.currentTarget as Element).getBoundingClientRect();
		const svgX = e.clientX - rect.left;
		const svgY = e.clientY - rect.top;

		// Determine drag mode based on position
		dragMode = detectDragMode(svgX, svgY);

		isDragging = true;
		dragStart = { x: e.clientX, y: e.clientY };
		viewportStart = { ...grapheurStore.viewport };
		scaleCenter = transformer.svgToMath(svgX, svgY);

		grapheurStore.setInteracting(true);
		(e.target as Element).setPointerCapture(e.pointerId);
	}

	/**
	 * Handle pointer move - update cursor position and handle drag
	 */
	function handlePointerMove(e: PointerEvent): void {
		const rect = (e.currentTarget as Element).getBoundingClientRect();
		const svgX = e.clientX - rect.left;
		const svgY = e.clientY - rect.top;

		// Update cursor position in math coordinates
		const mathPoint = transformer.svgToMath(svgX, svgY);
		grapheurStore.setCursor(mathPoint);

		// Update hover mode for cursor display (only when not dragging)
		if (!isDragging) {
			hoverMode = detectDragMode(svgX, svgY);
		}

		// Handle dragging
		if (isDragging && dragStart && viewportStart) {
			const dx = e.clientX - dragStart.x;
			const dy = e.clientY - dragStart.y;

			if (dragMode === 'pan') {
				// Normal panning: move viewport
				const mathDx = -dx / transformer.scaleX;
				const mathDy = dy / transformer.scaleY; // Y inverted

				grapheurStore.setViewport({
					xMin: viewportStart.xMin + mathDx,
					xMax: viewportStart.xMax + mathDx,
					yMin: viewportStart.yMin + mathDy,
					yMax: viewportStart.yMax + mathDy
				});
			} else if (dragMode === 'scale-x') {
				// Scale X axis only: drag right = zoom in, drag left = zoom out
				// Scale factor based on horizontal movement
				const scaleFactor = Math.pow(1.005, -dx);
				const xCenter = scaleCenter?.x ?? (viewportStart.xMin + viewportStart.xMax) / 2;

				const newXMin = xCenter + (viewportStart.xMin - xCenter) * scaleFactor;
				const newXMax = xCenter + (viewportStart.xMax - xCenter) * scaleFactor;

				grapheurStore.setViewport({
					xMin: newXMin,
					xMax: newXMax,
					yMin: viewportStart.yMin,
					yMax: viewportStart.yMax
				});
			} else if (dragMode === 'scale-y') {
				// Scale Y axis only: drag up = zoom in, drag down = zoom out
				const scaleFactor = Math.pow(1.005, dy);
				const yCenter = scaleCenter?.y ?? (viewportStart.yMin + viewportStart.yMax) / 2;

				const newYMin = yCenter + (viewportStart.yMin - yCenter) * scaleFactor;
				const newYMax = yCenter + (viewportStart.yMax - yCenter) * scaleFactor;

				grapheurStore.setViewport({
					xMin: viewportStart.xMin,
					xMax: viewportStart.xMax,
					yMin: newYMin,
					yMax: newYMax
				});
			}
		}
	}

	/**
	 * Handle pointer up - end dragging
	 */
	function handlePointerUp(e: PointerEvent): void {
		isDragging = false;
		dragStart = null;
		viewportStart = null;
		scaleCenter = null;
		dragMode = 'pan';
		grapheurStore.setInteracting(false);
		(e.target as Element).releasePointerCapture(e.pointerId);
	}

	/**
	 * Handle pointer leave - clear cursor position
	 */
	function handlePointerLeave(): void {
		grapheurStore.setCursor(null);
	}

	/**
	 * Handle wheel - zoom in/out centered on cursor
	 */
	function handleWheel(e: WheelEvent): void {
		e.preventDefault();

		const rect = (e.currentTarget as Element).getBoundingClientRect();
		const svgX = e.clientX - rect.left;
		const svgY = e.clientY - rect.top;
		const mathPoint = transformer.svgToMath(svgX, svgY);

		// Zoom factor: scroll up = zoom in, scroll down = zoom out
		const factor = e.deltaY < 0 ? 0.9 : 1.1;
		grapheurStore.zoom(factor, mathPoint.x, mathPoint.y);
	}

	// ==========================================================================
	// Accessibility
	// ==========================================================================

	/**
	 * Generate accessible description of the graph.
	 */
	const graphDescription = $derived.by(() => {
		const funcs = grapheurStore.visibleFunctions;
		const { xMin, xMax, yMin, yMax } = grapheurStore.viewport;

		if (funcs.length === 0) {
			return `Graphique mathematique vide. Fenetre de x=${xMin} a ${xMax}, y=${yMin} a ${yMax}.`;
		}

		const funcDescriptions = funcs.map((f) => f.latex || 'fonction inconnue').join(', ');

		return `Graphique mathematique avec ${funcs.length} fonction(s): ${funcDescriptions}. Fenetre de x=${xMin} a ${xMax}, y=${yMin} a ${yMax}.`;
	});
</script>

<div
	bind:this={containerRef}
	class="graph-container {className}"
	role="img"
	aria-label={graphDescription}
>
	<svg
		bind:this={svgRef}
		viewBox="0 0 {width} {height}"
		class="graph-svg"
		preserveAspectRatio="xMidYMid meet"
		aria-hidden="true"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointerleave={handlePointerLeave}
		onwheel={handleWheel}
		style="touch-action: none; cursor: {cursorStyle}"
	>
		<!-- Background grid (conditional) -->
		{#if grapheurStore.showGrid}
			<GridLines viewport={grapheurStore.viewport} {transformer} {width} {height} />
		{/if}

		<!-- Asymptote lines (behind curves) -->
		<AsymptoteLines {transformer} {width} {height} />

		<!-- Coordinate axes -->
		<AxisLines viewport={grapheurStore.viewport} {transformer} {width} {height} />

		<!-- Function curves -->
		<g class="function-curves">
			{#each grapheurStore.visibleFunctions as func (func.id)}
				<FunctionCurve
					{func}
					viewport={grapheurStore.viewport}
					{transformer}
					isInteracting={grapheurStore.isInteracting}
				/>
			{/each}
		</g>

		<!-- Special points (roots, extrema) -->
		<SpecialPoints {transformer} />

		<!-- Curve hover point -->
		<CurveHover {transformer} {width} {height} />

		<!-- Intersection points -->
		<IntersectionPoints {transformer} />
	</svg>
</div>

<style>
	.graph-container {
		width: 100%;
		height: 100%;
		min-height: 400px;
		position: relative;
		overflow: hidden;
		border-radius: 0.5rem;
		background: var(--graph-bg, #ffffff);
	}

	.graph-svg {
		width: 100%;
		height: 100%;
		display: block;
	}

	/* Dark mode support */
	:global(.dark) .graph-container {
		background: var(--graph-bg-dark, #1a1a2e);
	}
</style>
