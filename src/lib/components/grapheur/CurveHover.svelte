<script lang="ts">
	/**
	 * CurveHover Component
	 *
	 * Displays point coordinates when hovering near a curve.
	 * Shows a marker and label when cursor is within snap threshold of a function curve.
	 *
	 * Features:
	 * - Snap to nearest curve point
	 * - PRIORITY snap to special points (roots, extrema, intersections)
	 * - PRIORITY snap to the terms of a sequence, labelled u_n = value
	 * - Display (x, y) coordinates with point type label
	 * - Marker in function color (or gray for intersections)
	 * - Instant snap (no animation)
	 * - Updates store's snappedPoint for coordination with other components
	 *
	 * @component
	 */

	import { useGrapheurStore } from '$lib/stores/grapheur-context';

	// L'instance de l'atelier qui nous contient, ou celle par défaut.
	const grapheurStore = useGrapheurStore();
	import type { CoordinateTransformer } from '$lib/grapheur/viewport';
	import type { Point } from '$lib/geometry-core/viewport';
	import type {
		ExplicitFunction,
		SequencePlottable,
		SnappedPointType,
		SnappedPoint
	} from '$lib/grapheur/types';
	import { isCobwebEnabled, isExplicitFunction, isSequence } from '$lib/grapheur/types';
	import {
		computeSequenceTerms,
		toComputeSpec,
		type SequenceComputeSpec
	} from '$lib/grapheur/sequence';
	import { exactTermValue } from '$lib/grapheur/exact';
	import { formatGraphValue } from '$lib/grapheur/format';
	import {
		isSameTarget,
		type PinnedLabel,
		type PinnedLabelTarget
	} from '$lib/grapheur/pinned-labels';
	import GraphLabel, { type GraphLabelContent } from './GraphLabel.svelte';
	import { createEvaluator } from '$lib/grapheur/evaluator';
	import { analyzeAllFunctions, toAnalysisInputs } from '$lib/grapheur/analysis';
	import { toLatex } from '$lib/mathAST/latex-generator';
	import type { MathNode } from '$lib/mathAST/types';
	import {
		findAllIntersections,
		deduplicateIntersections,
		type IntersectionResult
	} from '$lib/grapheur/intersections';

	// Props
	let {
		transformer,
		width,
		height,
		onhoveredtargetchange
	}: {
		transformer: CoordinateTransformer;
		width: number;
		height: number;
		/**
		 * Term currently under the cursor, or null.
		 *
		 * The click lives in GraphSVG, which owns the pointer gestures and can
		 * tell a click from the end of a pan; it needs to know what is being
		 * pointed at.
		 */
		onhoveredtargetchange?: (target: PinnedLabelTarget | null) => void;
	} = $props();

	// ==========================================================================
	// Constants
	// ==========================================================================

	/** Snap threshold in pixels for curve points */
	const SNAP_THRESHOLD = 20;

	/** Snap threshold in pixels for special points (slightly larger for priority) */
	const SPECIAL_POINT_SNAP_THRESHOLD = 25;

	/**
	 * Snap threshold in pixels for the term of a sequence.
	 *
	 * Deliberately smaller than the one for special points: a sequence has one
	 * point per rank, so a generous radius would blanket the whole strip and
	 * steal every hover from the curves underneath. This one stays close to the
	 * drawn dot.
	 */
	const SEQUENCE_TERM_SNAP_THRESHOLD = 12;

	/** Maximum functions for intersection detection */
	const MAX_FUNCTIONS_FOR_INTERSECTIONS = 10;

	// ==========================================================================
	// Special Points Computation
	// ==========================================================================

	/**
	 * Collect all special points (roots, extrema) from analysis.
	 * Computed only when not interacting.
	 */
	const analysisResults = $derived.by(() => {
		if (grapheurStore.isInteracting) return [];

		return analyzeAllFunctions(
			toAnalysisInputs(grapheurStore.functions, grapheurStore.parameterBindings),
			grapheurStore.viewport
		);
	});

	/**
	 * Collect all intersection points.
	 * Computed only when not interacting.
	 */
	const intersections = $derived.by((): IntersectionResult[] => {
		if (grapheurStore.isInteracting) return [];

		const validFuncs = toAnalysisInputs(grapheurStore.functions, grapheurStore.parameterBindings);

		if (validFuncs.length < 2 || validFuncs.length > MAX_FUNCTIONS_FOR_INTERSECTIONS) {
			return [];
		}

		const rawIntersections = findAllIntersections(validFuncs, grapheurStore.viewport);
		return deduplicateIntersections(rawIntersections, 0.01);
	});

	/**
	 * Highest rank worth computing, as an integer.
	 *
	 * Read on its own so a pan only recomputes the terms when a rank is actually
	 * crossed, instead of on every frame — the same reasoning as SequencePlot.
	 */
	const sequenceLastIndex = $derived(Math.ceil(grapheurStore.viewport.xMax));

	/**
	 * Terms of every sequence.
	 *
	 * Deliberately kept out of `hoverPoint`, and depending on the highest rank
	 * rather than on the viewport itself: recomputing them at each mouse move —
	 * or at each frame of a pan — would iterate the recurrences for nothing.
	 * Terms off screen cost nothing: the cursor is never near them, and a
	 * pinned label checks the viewport before drawing.
	 */
	const computedSequenceTerms = $derived.by(() =>
		grapheurStore.functions.filter(isSequence).flatMap((sequence: SequencePlottable) => {
			// The staircase puts u_n on the abscissa instead of the rank: there is
			// no (n, u_n) point to hover over there.
			if (!sequence.visible || !sequence.ast || isCobwebEnabled(sequence)) return [];

			const spec = toComputeSpec(sequence, grapheurStore.parameterBindings);
			if (!spec) return [];

			return [{ sequence, spec, terms: computeSequenceTerms(spec, sequenceLastIndex) }];
		})
	);

	// ==========================================================================
	// Hover Point Detection
	// ==========================================================================

	/**
	 * Represents a candidate point to snap to
	 */
	interface SnapCandidateBase {
		mathX: number;
		mathY: number;
		svgX: number;
		svgY: number;
		distance: number;
		func: ExplicitFunction | null;
		functionIds: string[];
		color: string;
		/** Symbolic abscissa, when the point was found by exact solving. */
		exactX?: MathNode;
		/** Symbolic ordinate, simplified, when known exactly. */
		exactY?: MathNode;
		/**
		 * How to recompute the sequence, for a term.
		 *
		 * The exact value is deliberately not computed here: there is one point
		 * per rank, and only the one being named needs it.
		 */
		sequenceSpec?: SequenceComputeSpec;
	}

	/**
	 * A candidate point to snap to.
	 *
	 * Discriminated on `type` so a term cannot be pushed without the name that
	 * labels it — an optional field would let `getLabel` fall back in silence to
	 * the plain `(3, 0.375)` of a curve point.
	 */
	type SnapCandidate = SnapCandidateBase &
		(
			| { type: 'sequence'; sequenceName: string }
			| { type: 'curve' | SnappedPointType; sequenceName?: undefined }
		) & {
			/**
			 * What a click would pin, carried from the candidate.
			 *
			 * Absent on a free curve point, which has no identity to keep.
			 */
			target?: PinnedLabelTarget;
		};

	/** A point that a click can pin: special points and terms, never a free curve point. */
	type PinnableCandidate = Omit<SnapCandidate, 'distance' | 'svgX' | 'svgY'> & {
		/** What identifies it for a pinned label. */
		target: PinnedLabelTarget;
	};

	/**
	 * Every point a click could pin, cursor notwithstanding.
	 *
	 * Kept apart from the hover so the labels a click left behind can be drawn
	 * from the same list, instead of a second copy of the analyses.
	 */
	const pinnableCandidates = $derived.by((): PinnableCandidate[] => {
		const candidates: PinnableCandidate[] = [];

		for (const analysis of analysisResults) {
			// Analyses only ever cover explicit functions, but the store holds
			// sequences too — narrow while searching.
			const func = grapheurStore.functions.find(
				(f): f is ExplicitFunction => isExplicitFunction(f) && f.id === analysis.functionId
			);
			const color = func?.color ?? '#888';

			for (const root of analysis.roots) {
				candidates.push({
					mathX: root.x,
					mathY: 0,
					type: 'root',
					func: func ?? null,
					functionIds: [analysis.functionId],
					color,
					target: {
						kind: 'point',
						functionIds: [analysis.functionId],
						pointType: 'root',
						x: root.x
					},
					...(root.exactX ? { exactX: root.exactX } : {})
				});
			}

			for (const extremum of analysis.extrema) {
				candidates.push({
					mathX: extremum.x,
					mathY: extremum.y,
					type: extremum.type,
					func: func ?? null,
					functionIds: [analysis.functionId],
					color,
					target: {
						kind: 'point',
						functionIds: [analysis.functionId],
						pointType: extremum.type,
						x: extremum.x
					},
					...(extremum.exactX ? { exactX: extremum.exactX } : {}),
					...(extremum.exactY ? { exactY: extremum.exactY } : {})
				});
			}
		}

		for (const intersection of intersections) {
			candidates.push({
				mathX: intersection.point.x,
				mathY: intersection.point.y,
				type: 'intersection',
				func: null,
				functionIds: [...intersection.functionIds],
				color: '#6b7280', // Gray for intersections
				target: {
					kind: 'point',
					// Both curves name it: it dies with either of them, and
					// reordering the functions must not rename it.
					functionIds: [...intersection.functionIds],
					pointType: 'intersection',
					x: intersection.point.x
				}
			});
		}

		for (const { sequence, spec, terms } of computedSequenceTerms) {
			for (const term of terms) {
				candidates.push({
					mathX: term.n,
					mathY: term.value,
					type: 'sequence',
					func: null,
					functionIds: [sequence.id],
					color: sequence.color,
					sequenceName: sequence.name,
					sequenceSpec: spec,
					target: { kind: 'term', functionId: sequence.id, rank: term.n }
				});
			}
		}

		return candidates;
	});

	/**
	 * Screen position and distance to the cursor, for a candidate within reach.
	 *
	 * Returns null beyond the threshold, comparing squared distances so the
	 * candidates the cursor is nowhere near cost no allocation at all — this
	 * runs over every term of every sequence on each mouse move.
	 */
	function toSnapCandidate(
		candidate: PinnableCandidate,
		cursorSvg: Point,
		threshold: number
	): SnapCandidate | null {
		const svg = transformer.mathToSvg(candidate.mathX, candidate.mathY);
		const dx = cursorSvg.x - svg.x;
		const dy = cursorSvg.y - svg.y;
		const squared = dx * dx + dy * dy;

		if (squared >= threshold * threshold) return null;

		return {
			...candidate,
			svgX: svg.x,
			svgY: svg.y,
			distance: Math.sqrt(squared)
		} as SnapCandidate;
	}

	/**
	 * Find the best point to snap to: prioritizes special points over curve points.
	 * Returns null if cursor is not hovering or no point is within threshold.
	 */
	const hoverPoint = $derived.by((): SnapCandidate | null => {
		const cursor = grapheurStore.cursor;
		if (!cursor) {
			return null;
		}

		const cursorSvg = transformer.mathToSvg(cursor.x, cursor.y);
		const candidates: SnapCandidate[] = [];

		// =======================================================================
		// 1. Special points and terms, each with its own reach
		// =======================================================================
		for (const candidate of pinnableCandidates) {
			// A sequence has one point per rank: a generous radius would blanket
			// the whole strip and steal every hover from the curves underneath.
			const threshold =
				candidate.type === 'sequence' ? SEQUENCE_TERM_SNAP_THRESHOLD : SPECIAL_POINT_SNAP_THRESHOLD;

			const snapped = toSnapCandidate(candidate, cursorSvg, threshold);
			if (snapped) candidates.push(snapped);
		}

		// =======================================================================
		// 2. Check curve points (regular hover on curve)
		// =======================================================================
		for (const func of grapheurStore.functions) {
			if (!isExplicitFunction(func) || !func.visible || !func.ast) continue;

			const evaluator = createEvaluator(func.ast, grapheurStore.parameterBindings);
			const y = evaluator(cursor.x);

			if (y === null) continue;

			const pointSvg = transformer.mathToSvg(cursor.x, y);
			const distance = Math.abs(cursorSvg.y - pointSvg.y);

			if (distance < SNAP_THRESHOLD) {
				candidates.push({
					mathX: cursor.x,
					mathY: y,
					svgX: pointSvg.x,
					svgY: pointSvg.y,
					distance,
					type: 'curve',
					func,
					functionIds: [func.id],
					color: func.color
				});
			}
		}

		// =======================================================================
		// 3. Select best candidate
		// =======================================================================
		if (candidates.length === 0) {
			return null;
		}

		// Sort by priority: special points first, then by distance
		// Priority order: sequence term / intersection > root > max/min > curve
		// A term of a sequence is an exact, isolated point: it wins over a curve,
		// which the cursor can follow anywhere.
		// Typed on the candidate kinds: a new one cannot be forgotten here, where
		// a missing key would silently sort as undefined.
		const priorityOrder: Record<SnapCandidate['type'], number> = {
			sequence: 0,
			intersection: 0,
			root: 1,
			max: 2,
			min: 2,
			curve: 3
		};

		candidates.sort((a, b) => {
			const priorityDiff = priorityOrder[a.type] - priorityOrder[b.type];
			if (priorityDiff !== 0) {
				// Only use priority if both are within threshold
				// and the priority difference is significant
				if (
					a.distance < SPECIAL_POINT_SNAP_THRESHOLD &&
					b.distance < SPECIAL_POINT_SNAP_THRESHOLD
				) {
					return priorityDiff;
				}
			}
			// Otherwise, prefer closer points
			return a.distance - b.distance;
		});

		return candidates[0];
	});

	/**
	 * Whether the hovered point already carries a label from a click.
	 *
	 * The two are drawn at the same place: letting the hover keep its own label
	 * on top would hide the value the click just chose, and make the click look
	 * like it did nothing.
	 */
	const hoverIsPinned = $derived(
		hoverPoint?.target
			? grapheurStore.pinnedLabels.some((pinned) => isSameTarget(pinned, hoverPoint.target!))
			: false
	);

	/** A key that survives a re-render: what the label names, not where it is. */
	function pinnedKey(pinned: PinnedLabel): string {
		return pinned.kind === 'term'
			? `term:${pinned.functionId}:${pinned.rank}`
			: `point:${[...pinned.functionIds].sort().join('+')}:${pinned.pointType}:${pinned.x}`;
	}

	/**
	 * The labels a click left behind, matched to the points they name.
	 *
	 * A label whose point is gone — the curve edited, the rank out of range,
	 * the sequence switched to its staircase — draws nothing rather than a
	 * value that is no longer true.
	 */
	const pinnedDrawables = $derived.by(() =>
		grapheurStore.pinnedLabels.flatMap((pinned) => {
			const candidate = pinnableCandidates.find((c) => isSameTarget(c.target, pinned));
			if (!candidate) return [];

			// Off screen, the label would be dragged back inside the canvas and
			// name a point nobody can see.
			const { viewport } = grapheurStore;
			const inView =
				candidate.mathX >= viewport.xMin &&
				candidate.mathX <= viewport.xMax &&
				candidate.mathY >= viewport.yMin &&
				candidate.mathY <= viewport.yMax;
			if (!inView) return [];

			const svg = transformer.mathToSvg(candidate.mathX, candidate.mathY);

			return [
				{
					key: pinnedKey(pinned),
					candidate,
					svg,
					content: getLabel(candidate, pinned.showsExact)
				}
			];
		})
	);

	/**
	 * Report what the cursor is on, so a click knows what it would pin.
	 *
	 * A free point on a curve has no identity to pin: only the points the
	 * solvers named, and the terms of a sequence.
	 */
	$effect(() => {
		onhoveredtargetchange?.(hoverPoint?.target ?? null);
	});

	/**
	 * Update the store's snapped point when hoverPoint changes.
	 * This is done in an effect because it's a side effect.
	 */

	$effect(() => {
		if (!hoverPoint) {
			grapheurStore.setSnappedPoint(null);
			return;
		}

		// `sequence` and `curve` are not analysis results: the store only carries
		// the special points other components draw.
		if (hoverPoint.type !== 'curve' && hoverPoint.type !== 'sequence') {
			const newSnapped: SnappedPoint = {
				x: hoverPoint.mathX,
				y: hoverPoint.mathY,
				type: hoverPoint.type,
				functionIds: hoverPoint.functionIds
			};
			grapheurStore.setSnappedPoint(newSnapped);
		} else {
			grapheurStore.setSnappedPoint(null);
		}
	});

	// ==========================================================================
	// Formatting
	// ==========================================================================

	/** A label: text form, plus LaTeX when the value is worth rendering. */
	type HoverLabel = GraphLabelContent;

	/**
	 * What naming a point needs: its values and its kind, never its position.
	 *
	 * Shared by the hovered point and the pinned ones, so both are worded the
	 * same way.
	 */
	type LabelSource = Pick<
		SnapCandidate,
		'type' | 'mathX' | 'mathY' | 'exactX' | 'exactY' | 'sequenceSpec'
	> & {
		sequenceName?: string;
	};

	/** French prefix shown before the coordinates, by point type. */
	const LABEL_PREFIX: Record<string, string> = {
		root: 'Racine',
		max: 'Max',
		min: 'Min',
		intersection: 'Inter'
	};

	/**
	 * Build the tooltip label for a hover point.
	 *
	 * A root or an extremum found by symbolic solving knows its abscissa
	 * exactly: showing `1,414` there would throw away what the solver computed.
	 * The LaTeX form is offered alongside the text one, and the template renders
	 * it when present.
	 */
	function getLabel(point: LabelSource, showsExact = true): HoverLabel {
		// A term is read as `u_3 = 0.375`: the rank is what names it, and it is
		// exact — no need to go through the curve formatting.
		if (point.type === 'sequence') {
			// The exact value is what the maths say: -3/8, not -0.375. Computed for
			// the term being named only, and the decimal stands in when asked for
			// or when no exact form is readable.
			const exact =
				showsExact && point.sequenceSpec ? exactTermValue(point.sequenceSpec, point.mathX) : null;
			const value = exact ? toLatex(exact) : formatGraphValue(point.mathY);
			return {
				text: `${point.sequenceName}${point.mathX} = ${formatGraphValue(point.mathY)}`,
				latex: `${point.sequenceName}_{${point.mathX}} = ${value}`
			};
		}

		const prefix = LABEL_PREFIX[point.type];
		const isRoot = point.type === 'root';

		const text = isRoot
			? `Racine : x = ${formatGraphValue(point.mathX)}`
			: `${prefix ? `${prefix} : ` : ''}(${formatGraphValue(point.mathX)}, ${formatGraphValue(point.mathY)})`;

		if (!showsExact || !point.exactX) return { text, latex: null };

		const x = toLatex(point.exactX);
		const latex = isRoot
			? `\\text{Racine : } x = ${x}`
			: `\\text{${prefix ?? ''} : } \\left( ${x} \\, ; \\, ${
					point.exactY ? toLatex(point.exactY) : formatGraphValue(point.mathY)
				} \\right)`;

		return { text, latex };
	}

	/**
	 * Get the marker path based on point type.
	 */
	function getMarkerPath(x: number, y: number, type: string): string {
		const size = 8;
		const half = size / 2;
		const triangleHeight = size * 0.866;

		switch (type) {
			case 'root':
				// Diamond
				return `M ${x} ${y - half} L ${x + half} ${y} L ${x} ${y + half} L ${x - half} ${y} Z`;
			case 'max':
				// Triangle up
				return `M ${x} ${y - triangleHeight / 2} L ${x + half} ${y + triangleHeight / 2} L ${x - half} ${y + triangleHeight / 2} Z`;
			case 'min':
				// Triangle down
				return `M ${x} ${y + triangleHeight / 2} L ${x + half} ${y - triangleHeight / 2} L ${x - half} ${y - triangleHeight / 2} Z`;
			default:
				// Circle will be used for intersection and curve
				return '';
		}
	}
</script>

<g class="pinned-labels" pointer-events="none">
	{#each pinnedDrawables as pinned (pinned.key)}
		<circle
			cx={pinned.svg.x}
			cy={pinned.svg.y}
			r={6}
			fill={pinned.candidate.color}
			stroke="white"
			stroke-width={2}
			class="pinned-marker"
		/>

		<GraphLabel
			x={pinned.svg.x}
			y={pinned.svg.y}
			content={pinned.content}
			canvasWidth={width}
			canvasHeight={height}
			pinned
		/>
	{/each}
</g>

{#if hoverPoint}
	{@const label = getLabel(hoverPoint)}
	{@const markerPath = getMarkerPath(hoverPoint.svgX, hoverPoint.svgY, hoverPoint.type)}
	<g class="curve-hover" pointer-events="none">
		<!-- Marker: shaped based on point type -->
		{#if markerPath}
			<!-- Special point marker (diamond, triangle) -->
			<path
				d={markerPath}
				fill={hoverPoint.color}
				stroke="white"
				stroke-width={2}
				class="hover-marker"
			/>
		{:else}
			<!-- Circle marker for curve and intersection points -->
			<circle
				cx={hoverPoint.svgX}
				cy={hoverPoint.svgY}
				r={6}
				fill={hoverPoint.color}
				stroke="white"
				stroke-width={2}
				class="hover-marker"
			/>
		{/if}

		<!--
			Value label, shared with the labels a click leaves behind. A point
			already pinned keeps the value its click chose: two boxes at the same
			place would just hide one another.
		-->
		{#if !hoverIsPinned}
			<GraphLabel
				x={hoverPoint.svgX}
				y={hoverPoint.svgY}
				content={label}
				canvasWidth={width}
				canvasHeight={height}
			/>
		{/if}
	</g>
{/if}

<style>
	.pinned-marker {
		filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2));
	}

	.hover-marker {
		filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.2));
	}
</style>
