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

	import type { ExplicitFunction, Viewport, Point } from '$lib/grapheur/types';
	import { LINE_STYLE_DASHARRAY } from '$lib/grapheur/types';
	import type { CoordinateTransformer } from '$lib/grapheur/viewport';
	import { bindParameters, cachedEvaluator, sampleCached } from '$lib/grapheur/analysis';
	import { endpointMarkers, pieceViewports } from '$lib/grapheur/restriction';
	import type { VariableBindings } from '$lib/grapheur/evaluator';
	import { curveToSVGPath, curveToPolylinePath } from '$lib/grapheur/bezier';
	import { curveColorValue } from '$lib/grapheur/colors';

	// Props
	let {
		func,
		viewport,
		transformer,
		isInteracting = false,
		bindings = {}
	}: {
		func: ExplicitFunction;
		viewport: Viewport;
		transformer: CoordinateTransformer;
		isInteracting?: boolean;
		/** Parameter values to bind before evaluating — `a`, `b`, … */
		bindings?: VariableBindings;
	} = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Number of sample points for high quality rendering */
	const HIGH_QUALITY_POINTS = 300;

	/** Number of sample points for fast rendering during interaction */
	const LOW_QUALITY_POINTS = 100;

	/** Rayon minimal d'un point de bord (celui de geometry-core), en pixels. */
	const ENDPOINT_RADIUS = 4;

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
	/** The expression with its parameters bound: the caches key on it. */
	const bound = $derived(func.ast ? bindParameters(func.ast, bindings) : undefined);

	const pathData = $derived.by(() => {
		// Skip if no valid AST
		if (!bound) return '';

		// Adjust quality based on interaction state
		const numPoints = isInteracting ? LOW_QUALITY_POINTS : HIGH_QUALITY_POINTS;

		// Create transformer for math -> SVG coordinates
		const pointTransformer = createPointTransformer(transformer);

		// Un morceau par intervalle de l'ensemble (la fenêtre entière sans
		// restriction), chacun ouvrant son propre sous-chemin `M…`.
		const pieces: string[] = [];
		for (const piece of pieceViewports(func.restriction, viewport)) {
			// Sample the function across the piece. Cached on the expression: the
			// panel hands over a fresh object at every render — moving a slider that
			// changes nothing here would otherwise re-sample the whole curve.
			const sampledCurve = sampleCached(bound, piece, numPoints);
			if (sampledCurve.points.length === 0) continue;

			// Use polyline for fast rendering during interaction, Bezier otherwise
			pieces.push(
				isInteracting
					? curveToPolylinePath(sampledCurve, pointTransformer)
					: curveToSVGPath(sampledCurve, pointTransformer)
			);
		}
		return pieces.join(' ');
	});

	/** Les points de bord de l'ensemble, en coordonnées SVG (aucun sans restriction). */
	const markers = $derived.by(() => {
		if (!bound || func.restriction === undefined) return [];
		return endpointMarkers(func.restriction, cachedEvaluator(bound), viewport).map((m) => ({
			...transformer.mathToSvg(m.x, m.y),
			filled: m.filled
		}));
	});

	/** Le point grossit avec le trait, pour rester visible autour de lui. */
	const markerRadius = $derived(Math.max(ENDPOINT_RADIUS, func.lineWidth + 1));

	/**
	 * Compute accessibility label for the curve.
	 */
	const ariaLabel = $derived(
		func.latex ? `Courbe de la fonction ${func.latex}` : 'Courbe de fonction'
	);

	/**
	 * Compute stroke-dasharray for the line style.
	 */
	const strokeDasharray = $derived(LINE_STYLE_DASHARRAY[func.lineStyle]);
</script>

{#if func.visible && func.ast && pathData}
	<path
		d={pathData}
		style:stroke={curveColorValue(func.color)}
		stroke-width={func.lineWidth}
		stroke-dasharray={strokeDasharray}
		fill="none"
		stroke-linecap="round"
		stroke-linejoin="round"
		class="function-curve"
		class:interacting={isInteracting}
		role="img"
		aria-label={ariaLabel}
	/>
	<!-- Bornes de l'ensemble : plein = fermée (atteinte), creux = ouverte. -->
	{#each markers as marker (`${marker.x},${marker.y}`)}
		<circle
			cx={marker.x}
			cy={marker.y}
			r={markerRadius}
			style:stroke={curveColorValue(func.color)}
			style:fill={marker.filled ? curveColorValue(func.color) : undefined}
			stroke-width={2}
			class={marker.filled ? 'endpoint-closed' : 'endpoint-open'}
			aria-hidden="true"
		/>
	{/each}
{/if}

<style>
	.function-curve {
		vector-effect: non-scaling-stroke;
		transition: opacity 0.15s ease-out;
	}

	/* Intérieur du point creux : la couleur du fond du graphe, clair ou sombre. */
	.endpoint-open {
		fill: var(--color-graph-bg);
	}

	.function-curve.interacting {
		/* Slightly reduce quality perception during panning */
		opacity: 0.9;
	}
</style>
