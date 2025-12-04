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

	// Props
	let {
		class: className = ''
	}: {
		class?: string;
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

	/** Whether user is currently panning */
	let isPanning = $state(false);

	/** Starting position of pan gesture (in screen coordinates) */
	let panStart = $state<{ x: number; y: number } | null>(null);

	/** Viewport state at the start of pan gesture */
	let viewportStart = $state<Viewport | null>(null);

	// ==========================================================================
	// Interaction Handlers
	// ==========================================================================

	/**
	 * Handle pointer down - initiate panning
	 */
	function handlePointerDown(e: PointerEvent): void {
		if (e.button !== 0) return; // Left click only
		isPanning = true;
		panStart = { x: e.clientX, y: e.clientY };
		viewportStart = { ...grapheurStore.viewport };
		grapheurStore.setInteracting(true);
		(e.target as Element).setPointerCapture(e.pointerId);
	}

	/**
	 * Handle pointer move - update cursor position and pan if dragging
	 */
	function handlePointerMove(e: PointerEvent): void {
		const rect = (e.currentTarget as Element).getBoundingClientRect();
		const svgX = e.clientX - rect.left;
		const svgY = e.clientY - rect.top;

		// Update cursor position in math coordinates
		const mathPoint = transformer.svgToMath(svgX, svgY);
		grapheurStore.setCursor(mathPoint);

		// Handle panning
		if (isPanning && panStart && viewportStart) {
			const dx = e.clientX - panStart.x;
			const dy = e.clientY - panStart.y;

			// Convert pixel delta to math delta
			const mathDx = -dx / transformer.scaleX;
			const mathDy = dy / transformer.scaleY; // Y inverted

			grapheurStore.setViewport({
				xMin: viewportStart.xMin + mathDx,
				xMax: viewportStart.xMax + mathDx,
				yMin: viewportStart.yMin + mathDy,
				yMax: viewportStart.yMax + mathDy
			});
		}
	}

	/**
	 * Handle pointer up - end panning
	 */
	function handlePointerUp(e: PointerEvent): void {
		isPanning = false;
		panStart = null;
		viewportStart = null;
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
		viewBox="0 0 {width} {height}"
		class="graph-svg"
		preserveAspectRatio="xMidYMid meet"
		aria-hidden="true"
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointerleave={handlePointerLeave}
		onwheel={handleWheel}
		style="touch-action: none; cursor: {isPanning ? 'grabbing' : 'crosshair'}"
	>
		<!-- Background grid (conditional) -->
		{#if grapheurStore.showGrid}
			<GridLines viewport={grapheurStore.viewport} {transformer} {width} {height} />
		{/if}

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
