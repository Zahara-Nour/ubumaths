<script lang="ts">
	/**
	 * SequencePlot Component
	 *
	 * Renders a numeric sequence as a cloud of points (n, u_n) and, for a
	 * first-order recurrence, the staircase (cobweb) diagram used to conjecture
	 * convergence: the curve of f, the line y = x, and the bouncing polyline.
	 *
	 * @component
	 */

	import type { Point, SequencePlottable, Viewport } from '$lib/grapheur/types';
	import { LINE_STYLE_DASHARRAY, supportsCobweb } from '$lib/grapheur/types';
	import type { CoordinateTransformer } from '$lib/grapheur/viewport';
	import {
		computeCobwebPath,
		computeSequenceTerms,
		createRecurrenceFunctionEvaluator,
		toComputeSpec
	} from '$lib/grapheur/sequence';
	import { sampleFunction } from '$lib/grapheur/sampler';
	import { curveToPolylinePath, curveToSVGPath } from '$lib/grapheur/bezier';

	// Props
	let {
		sequence,
		viewport,
		transformer,
		isInteracting = false
	}: {
		sequence: SequencePlottable;
		viewport: Viewport;
		transformer: CoordinateTransformer;
		isInteracting?: boolean;
	} = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Number of sample points for the curve of f, at rest and while panning. */
	const HIGH_QUALITY_POINTS = 300;
	const LOW_QUALITY_POINTS = 100;

	/**
	 * Pixel bound applied to staircase coordinates.
	 *
	 * A diverging recurrence produces terms far outside the viewport; clamping
	 * keeps the SVG path renderable instead of emitting astronomical numbers.
	 */
	const SVG_COORD_LIMIT = 100_000;

	// ==========================================================================
	// Functions
	// ==========================================================================

	function clampToCanvas(point: Point): Point {
		return {
			x: Math.max(-SVG_COORD_LIMIT, Math.min(SVG_COORD_LIMIT, point.x)),
			y: Math.max(-SVG_COORD_LIMIT, Math.min(SVG_COORD_LIMIT, point.y))
		};
	}

	// ==========================================================================
	// Derived State
	// ==========================================================================

	/** Whether the staircase is the representation in use. */
	const cobwebEnabled = $derived(sequence.representation === 'cobweb' && supportsCobweb(sequence));

	/**
	 * Highest rank worth computing.
	 *
	 * The cloud of points stops at the right edge of the viewport. The staircase
	 * lives in the (u_n, u_{n+1}) plane instead, where the range of ranks on
	 * screen means nothing: it needs exactly the steps the user asked for.
	 *
	 * Derived as an integer so a pan only recomputes the terms when a rank is
	 * actually crossed, instead of on every frame.
	 */
	const lastIndex = $derived(
		cobwebEnabled ? sequence.firstIndex + sequence.cobwebSteps : Math.ceil(viewport.xMax)
	);

	/** Terms of the sequence. */
	const terms = $derived.by(() => {
		const spec = toComputeSpec(sequence);
		if (!spec) return [];

		return computeSequenceTerms(spec, lastIndex);
	});

	/**
	 * Points actually inside the viewport, already in SVG coordinates.
	 *
	 * Empty in cobweb representation: there the abscissa carries u_n, not the
	 * rank, so plotting (n, u_n) on the same axes would be meaningless.
	 */
	const visiblePoints = $derived.by(() =>
		cobwebEnabled
			? []
			: terms
					.filter(
						(term) =>
							term.n >= viewport.xMin - 1 &&
							term.n <= viewport.xMax + 1 &&
							term.value >= viewport.yMin &&
							term.value <= viewport.yMax
					)
					.map((term) => ({
						n: term.n,
						value: term.value,
						svg: transformer.mathToSvg(term.n, term.value)
					}))
	);

	/** Staircase polyline. */
	const cobwebPathData = $derived.by(() => {
		if (!cobwebEnabled) return '';

		const path = computeCobwebPath(terms, sequence.cobwebSteps);
		if (path.length < 2) return '';

		return path
			.map((point, index) => {
				const { x, y } = clampToCanvas(transformer.mathToSvg(point.x, point.y));
				return `${index === 0 ? 'M' : 'L'}${x},${y}`;
			})
			.join(' ');
	});

	/** Curve of f, on which the staircase bounces. */
	const functionPathData = $derived.by(() => {
		if (!cobwebEnabled || !sequence.ast) return '';

		const evaluator = createRecurrenceFunctionEvaluator(sequence.ast);
		const numPoints = isInteracting ? LOW_QUALITY_POINTS : HIGH_QUALITY_POINTS;
		const sampled = sampleFunction(evaluator, viewport, numPoints);

		if (sampled.points.length === 0) return '';

		const toSvg = (point: Point) => transformer.mathToSvg(point.x, point.y);
		return isInteracting ? curveToPolylinePath(sampled, toSvg) : curveToSVGPath(sampled, toSvg);
	});

	/** The line y = x, drawn across the viewport. */
	const identityLine = $derived.by(() => {
		if (!cobwebEnabled) return null;

		const start = clampToCanvas(transformer.mathToSvg(viewport.xMin, viewport.xMin));
		const end = clampToCanvas(transformer.mathToSvg(viewport.xMax, viewport.xMax));
		return { x1: start.x, y1: start.y, x2: end.x, y2: end.y };
	});

	const pointRadius = $derived(Math.max(2.5, sequence.lineWidth + 1.5));

	const strokeDasharray = $derived(LINE_STYLE_DASHARRAY[sequence.lineStyle]);

	const ariaLabel = $derived(
		sequence.latex
			? `Suite ${sequence.name} définie par ${sequence.latex}`
			: `Suite ${sequence.name}`
	);
</script>

{#if sequence.visible && sequence.ast}
	<g class="sequence-plot" role="img" aria-label={ariaLabel}>
		<!-- Cobweb underlay: y = x, then the curve of f -->
		{#if identityLine}
			<line
				x1={identityLine.x1}
				y1={identityLine.y1}
				x2={identityLine.x2}
				y2={identityLine.y2}
				class="identity-line"
				stroke-dasharray="4 4"
			/>
		{/if}

		{#if functionPathData}
			<path
				d={functionPathData}
				stroke={sequence.color}
				stroke-width={sequence.lineWidth}
				fill="none"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="cobweb-function"
			/>
		{/if}

		{#if cobwebPathData}
			<path
				d={cobwebPathData}
				stroke={sequence.color}
				stroke-width={Math.max(1, sequence.lineWidth - 0.5)}
				stroke-dasharray={strokeDasharray}
				fill="none"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="cobweb-path"
			/>
		{/if}

		<!-- Terms of the sequence -->
		{#each visiblePoints as point (point.n)}
			<circle
				cx={point.svg.x}
				cy={point.svg.y}
				r={pointRadius}
				fill={sequence.color}
				class="sequence-point"
			/>
		{/each}
	</g>
{/if}

<style>
	.sequence-plot {
		vector-effect: non-scaling-stroke;
	}

	.identity-line {
		stroke: var(--color-muted-foreground);
		stroke-width: 1;
		opacity: 0.5;
	}

	.cobweb-function {
		opacity: 0.55;
	}

	.cobweb-path {
		opacity: 0.85;
	}

	.sequence-point {
		transition: opacity 0.15s ease-out;
	}
</style>
