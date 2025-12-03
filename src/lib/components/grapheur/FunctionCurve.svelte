<script lang="ts">
	/**
	 * FunctionCurve Component
	 *
	 * Renders a single function as a smooth Bezier curve using
	 * Catmull-Rom spline interpolation. Handles discontinuities
	 * by breaking the path at asymptotes.
	 *
	 * @component
	 */

	import type { Plottable, Viewport, Point } from '$lib/grapheur/types';
	import type { CoordinateTransformer } from '$lib/grapheur/viewport';
	import { createEvaluator } from '$lib/grapheur/evaluator';
	import { sampleFunction } from '$lib/grapheur/sampler';
	import { curveToSVGPath, curveToPolylinePath } from '$lib/grapheur/bezier';

	// Props
	let {
		func,
		viewport,
		transformer,
		isInteracting = false
	}: {
		func: Plottable;
		viewport: Viewport;
		transformer: CoordinateTransformer;
		isInteracting?: boolean;
	} = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Number of sample points for high quality rendering */
	const HIGH_QUALITY_POINTS = 300;

	/** Number of sample points for fast rendering during interaction */
	const LOW_QUALITY_POINTS = 100;

	// ==========================================================================
	// Coordinate Transformation
	// ==========================================================================

	/**
	 * Create a point transformer function from math to SVG coordinates.
	 */
	function createPointTransformer(t: CoordinateTransformer): (p: Point) => Point {
		return (p: Point) => t.mathToSvg(p.x, p.y);
	}

	// ==========================================================================
	// Derived State - Memoized curve calculation
	// ==========================================================================

	/**
	 * Generate the SVG path data for the function curve.
	 * Recomputes when viewport, function, or interaction state changes.
	 */
	const pathData = $derived.by(() => {
		// Skip if no valid AST
		if (!func.ast) {
			return '';
		}

		// Create evaluator from the function's AST
		const evaluator = createEvaluator(func.ast);

		// Adjust quality based on interaction state
		const numPoints = isInteracting ? LOW_QUALITY_POINTS : HIGH_QUALITY_POINTS;

		// Sample the function across the viewport
		const sampledCurve = sampleFunction(evaluator, viewport, numPoints);

		// If no points, return empty path
		if (sampledCurve.points.length === 0) {
			return '';
		}

		// Create transformer for math -> SVG coordinates
		const pointTransformer = createPointTransformer(transformer);

		// Convert to SVG path
		// Use polyline for fast rendering during interaction, Bezier otherwise
		if (isInteracting) {
			return curveToPolylinePath(sampledCurve, pointTransformer);
		} else {
			return curveToSVGPath(sampledCurve, pointTransformer);
		}
	});

	/**
	 * Compute accessibility label for the curve.
	 */
	const ariaLabel = $derived(
		func.latex ? `Courbe de la fonction ${func.latex}` : 'Courbe de fonction'
	);
</script>

{#if func.visible && func.ast && pathData}
	<path
		d={pathData}
		stroke={func.color}
		stroke-width={func.lineWidth}
		fill="none"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="function-curve"
		class:interacting={isInteracting}
		role="img"
		aria-label={ariaLabel}
	/>
{/if}

<style>
	.function-curve {
		vector-effect: non-scaling-stroke;
		transition: opacity 0.15s ease-out;
	}

	.function-curve.interacting {
		/* Slightly reduce quality perception during panning */
		opacity: 0.9;
	}
</style>
