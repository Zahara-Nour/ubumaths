<script lang="ts">
	/**
	 * SpecialPoints Component
	 *
	 * Renders special points on function curves:
	 * - Roots (zeros): Diamond markers where f(x) = 0
	 * - Local maxima: Upward triangle markers
	 * - Local minima: Downward triangle markers
	 *
	 * Points are rendered above function curves with tooltips.
	 * Points are hidden when CurveHover is snapped to them (to avoid duplicates).
	 *
	 * @component
	 */

	import { grapheurStore } from '$lib/stores/grapheur.svelte';
	import type { CoordinateTransformer } from '$lib/grapheur/viewport';
	import type { Root, Extremum, FunctionAnalysis, SnappedPointType } from '$lib/grapheur/types';
	import { analyzeAllFunctions } from '$lib/grapheur/analysis';
	import { createEvaluator } from '$lib/grapheur/evaluator';

	// Props
	let {
		transformer
	}: {
		transformer: CoordinateTransformer;
	} = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Size of marker shapes in pixels */
	const MARKER_SIZE = 8;

	// ==========================================================================
	// Analysis
	// ==========================================================================

	/**
	 * Analyze all visible functions for special points.
	 * Skips analysis during interaction for performance.
	 *
	 * Note: We access grapheurStore.functions directly (not visibleFunctions)
	 * to ensure Svelte 5 properly tracks the dependency on the source array.
	 */
	const analyses = $derived.by((): FunctionAnalysis[] => {
		// Skip during interaction for performance
		if (grapheurStore.isInteracting) return [];

		// Access functions directly and filter here for proper reactivity
		const functions = grapheurStore.functions
			.filter((f) => f.visible && f.ast)
			.map((f) => ({
				id: f.id,
				evaluator: createEvaluator(f.ast!)
			}));

		return analyzeAllFunctions(functions, grapheurStore.viewport);
	});

	/**
	 * Get function color by ID
	 */
	function getFunctionColor(functionId: string): string {
		const func = grapheurStore.functions.find((f) => f.id === functionId);
		return func?.color ?? '#888';
	}

	// ==========================================================================
	// Marker Path Generators
	// ==========================================================================

	/**
	 * Generate a diamond path centered at (cx, cy)
	 */
	function diamondPath(cx: number, cy: number, size: number = MARKER_SIZE): string {
		const half = size / 2;
		return `M ${cx} ${cy - half} L ${cx + half} ${cy} L ${cx} ${cy + half} L ${cx - half} ${cy} Z`;
	}

	/**
	 * Generate an upward triangle path centered at (cx, cy) for maxima
	 */
	function triangleUpPath(cx: number, cy: number, size: number = MARKER_SIZE): string {
		const half = size / 2;
		const height = size * 0.866; // sqrt(3)/2
		return `M ${cx} ${cy - height / 2} L ${cx + half} ${cy + height / 2} L ${cx - half} ${cy + height / 2} Z`;
	}

	/**
	 * Generate a downward triangle path centered at (cx, cy) for minima
	 */
	function triangleDownPath(cx: number, cy: number, size: number = MARKER_SIZE): string {
		const half = size / 2;
		const height = size * 0.866;
		return `M ${cx} ${cy + height / 2} L ${cx + half} ${cy - height / 2} L ${cx - half} ${cy - height / 2} Z`;
	}

	// ==========================================================================
	// Coordinate Conversion
	// ==========================================================================

	/**
	 * Convert a root to SVG coordinates
	 */
	function rootToSvg(root: Root): { x: number; y: number } {
		return transformer.mathToSvg(root.x, 0);
	}

	/**
	 * Convert an extremum to SVG coordinates
	 */
	function extremumToSvg(extremum: Extremum): { x: number; y: number } {
		return transformer.mathToSvg(extremum.x, extremum.y);
	}

	// ==========================================================================
	// Tooltips
	// ==========================================================================

	function formatNumber(n: number): string {
		if (Math.abs(n) < 0.0001 && n !== 0) {
			return n.toExponential(2);
		}
		if (Math.abs(n) >= 10000) {
			return n.toExponential(2);
		}
		return n.toPrecision(4);
	}

	function getRootLabel(root: Root): string {
		return `Zero: x = ${formatNumber(root.x)}`;
	}

	function getExtremumLabel(extremum: Extremum): string {
		const typeLabel = extremum.type === 'max' ? 'Max' : 'Min';
		return `${typeLabel}: (${formatNumber(extremum.x)}, ${formatNumber(extremum.y)})`;
	}

	// ==========================================================================
	// Snapped Point Detection
	// ==========================================================================

	/** Tolerance for matching snapped points (in math coordinates) */
	const SNAP_TOLERANCE = 0.001;

	/**
	 * Check if a point is currently being displayed by CurveHover (snapped).
	 * If so, we should hide this marker to avoid duplicates.
	 */
	function isPointSnapped(x: number, y: number, type: SnappedPointType): boolean {
		const snapped = grapheurStore.snappedPoint;
		if (!snapped) return false;

		return (
			snapped.type === type &&
			Math.abs(snapped.x - x) < SNAP_TOLERANCE &&
			Math.abs(snapped.y - y) < SNAP_TOLERANCE
		);
	}
</script>

<g class="special-points" pointer-events="none">
	{#each analyses as analysis (analysis.functionId)}
		{@const color = getFunctionColor(analysis.functionId)}

		<!-- Roots (diamonds) - hidden when CurveHover is snapped to them -->
		{#each analysis.roots as root, idx (`r-${analysis.functionId}-${idx}`)}
			{#if !isPointSnapped(root.x, 0, 'root')}
				{@const pos = rootToSvg(root)}
				<path
					d={diamondPath(pos.x, pos.y)}
					fill={color}
					stroke="white"
					stroke-width="2"
					class="root-marker"
				>
					<title>{getRootLabel(root)}</title>
				</path>
			{/if}
		{/each}

		<!-- Extrema (triangles) - hidden when CurveHover is snapped to them -->
		{#each analysis.extrema as extremum, idx (`e-${analysis.functionId}-${idx}`)}
			{#if !isPointSnapped(extremum.x, extremum.y, extremum.type)}
				{@const pos = extremumToSvg(extremum)}
				<path
					d={extremum.type === 'max'
						? triangleUpPath(pos.x, pos.y)
						: triangleDownPath(pos.x, pos.y)}
					fill={color}
					stroke="white"
					stroke-width="2"
					class="extremum-marker"
				>
					<title>{getExtremumLabel(extremum)}</title>
				</path>
			{/if}
		{/each}
	{/each}
</g>

<style>
	.root-marker,
	.extremum-marker {
		filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.2));
	}
</style>
