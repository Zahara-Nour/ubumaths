/**
 * Choreographies for the `mediatrice(A, B)` builtin.
 *
 * V1 voies under `@euclide` :
 *
 * - `arcs_egaux` (default, Euclid I.10) : two short arcs (120°) of equal
 *   radius `r = 0.7 × |AB|` centered at A and B intersect at two points
 *   equidistant from A and B. A ruler placed on these two points traces
 *   the perpendicular bisector.
 *
 * - `cercles_rayon_ab` : variation where `r = |AB|` exactly. Visually
 *   neater (each circle would pass through the other endpoint if drawn
 *   in full) ; same sub-step structure, different radius factor.
 *
 * Both voies expand into 4 sequential sub-steps :
 *   SS1 — compass at A traces arc 1
 *   SS2 — compass at B traces arc 2
 *   SS3 — the 2 intersection points fade in
 *   SS4 — ruler + pencil trace a segment between the 2 intersections
 *         while the final median line fades in.
 */

import { exact, numeric } from '$lib/geometry-core/types/geo-value';
import { numericNode } from '$lib/mathAST/common/numeric';
import type { Voie, ChoreographyFn, ChoreographyResult, SubStep } from './types';

/**
 * Length of the segment-trace (math units). Matches the default `Ruler`
 * component length (`length=15` in `Ruler.svelte`), so the ruler exactly
 * frames the traced segment. The segment is centered on the midpoint of
 * I1/I2 (= midpoint of the median line) and serves as the visual surrogate
 * of the principal LINE during the SS4 ruler trace ; lines are infinite
 * (extended to viewport by `lineToSVG`), so this 15-math-unit segment
 * approximates the visible portion of the line on a typical canvas
 * (default viewport spans ~20×15 math units at 800×600px / PPU=40).
 *
 * For configurations where |I1I2| is larger than this default (e.g. very
 * wide |AB|), the segment is grown to `1.2 × |I1I2|` instead.
 */
const SEGMENT_TRACE_LENGTH_DEFAULT = 15;

/**
 * Build the `arcs_egaux` choreography for a given radius factor.
 *
 * @param ctx Standard choreography context (figure + args + principal id).
 * @param radiusFactor `0.7` for the canonical `@arcs_egaux` voie ;
 *                    `1.0` for the `@cercles_rayon_ab` variant.
 */
function buildArcsEgaux(
	ctx: Parameters<ChoreographyFn>[0],
	radiusFactor: number
): ChoreographyResult {
	const { figure, args, principalId } = ctx;
	const [Aid, Bid] = args.ids;
	const [A, B] = args.coords;

	// Hide the principal line immediately — the builtin creates it visible,
	// but we want it to fade in only during SS4 (after the arcs and
	// intersections have appeared). `applySubStepToAnimationState` will
	// reveal it again at SS4 via `showElement` ; `applyFinalVisibility`
	// keeps it visible at the end.
	figure.hideElement(principalId);

	// ─── Geometric data captured at creation time ───
	const dx = B.x - A.x;
	const dy = B.y - A.y;
	const ab = Math.hypot(dx, dy);
	const r = radiusFactor * ab;

	// Arc angles (radians) : 120° sweep centered on the AB direction at A,
	// and on the BA direction at B. The angle values are static (not reactive
	// to drag in V1 — the radius is reactive via createScalarDistance, but the
	// angles capture the initial direction).
	const angleAB = Math.atan2(dy, dx);
	const angleBA = angleAB + Math.PI;
	const sweepRad = (2 * Math.PI) / 3; // 120°
	const arc1Start = angleAB - sweepRad / 2;
	const arc1End = angleAB + sweepRad / 2;
	const arc2Start = angleBA - sweepRad / 2;
	const arc2End = angleBA + sweepRad / 2;

	// Position of the two intersection points (above and below the AB line).
	// Lies on the perpendicular bisector of AB, at distance √(r² − (|AB|/2)²)
	// from the midpoint of AB. Guaranteed real because r > |AB|/2 when
	// radiusFactor ∈ {0.7, 1.0}.
	const midX = (A.x + B.x) / 2;
	const midY = (A.y + B.y) / 2;
	const halfChord = Math.sqrt(Math.max(0, r * r - (ab / 2) * (ab / 2)));
	// Perpendicular unit vector to AB (rotate 90° CCW).
	const perpX = ab > 0 ? -dy / ab : 0;
	const perpY = ab > 0 ? dx / ab : 0;
	const I1x = midX + perpX * halfChord;
	const I1y = midY + perpY * halfChord;
	const I2x = midX - perpX * halfChord;
	const I2y = midY - perpY * halfChord;
	const segLen = 2 * halfChord;
	// Ruler convention (`rulerPosition`) : positioned AT the start point,
	// rotated toward the end. Matches the existing pipeline so the pencil
	// drawing-tip starts at the segment's start.
	const segRotationDeg = (Math.atan2(I2y - I1y, I2x - I1x) * 180) / Math.PI;

	// ─── Reactive radius : 0.7 × |AB| (or 1.0 × |AB|) ───
	const distAB = figure.createScalarDistance(Aid, Bid);
	const radiusScalar = figure.createScalarExpression(
		(vals) => radiusFactor * (vals.get(distAB) ?? 0),
		[distAB]
	);

	// ─── Auxiliary elements (created hidden) ───
	// Note : createX defaults `visible: true` even when options pass false ;
	// we explicitly hide after creation.
	const arc1 = figure.createArcByAngles(
		Aid,
		{ scalarRef: radiusScalar },
		exact(numericNode(arc1Start)),
		exact(numericNode(arc1End))
	);
	figure.hideElement(arc1);
	const arc2 = figure.createArcByAngles(
		Bid,
		{ scalarRef: radiusScalar },
		exact(numericNode(arc2Start)),
		exact(numericNode(arc2End))
	);
	figure.hideElement(arc2);

	// createIntersectionCC requires circles (not arcs) ; create 2 hidden
	// circles purely to drive the intersection. They are never made visible.
	const circleA = figure.createCircleByRadius(Aid, { scalarRef: radiusScalar });
	figure.hideElement(circleA);
	const circleB = figure.createCircleByRadius(Bid, { scalarRef: radiusScalar });
	figure.hideElement(circleB);

	const I1 = figure.createIntersectionCC(circleA, circleB, 0);
	figure.hideElement(I1);
	const I2 = figure.createIntersectionCC(circleA, circleB, 1);
	figure.hideElement(I2);

	// Segment-trace endpoints : centered on the midpoint of I1/I2 (= the
	// midpoint of the median line) with total length matching the ruler's
	// default length (15 math units). The ruler is placed at Iext1 (one
	// end) ; its body then spans the entire segment-trace, framing it
	// visually. The 15-unit segment also matches the visible portion of
	// the principal line on a default 800×600 canvas (viewport ~20×15
	// math units), so the swap from segment to line at end of SS4 is
	// imperceptible. The points are non-reactive (computed once) —
	// acceptable since the segment-trace is hidden after SS4 in
	// `@squelette` mode, replaced by the reactive principal line.
	const dirX = segLen > 0 ? (I2x - I1x) / segLen : 0;
	const dirY = segLen > 0 ? (I2y - I1y) / segLen : 0;
	const traceLen = Math.max(SEGMENT_TRACE_LENGTH_DEFAULT, segLen * 1.2);
	const halfTrace = traceLen / 2;
	const Iext1x = midX - dirX * halfTrace;
	const Iext1y = midY - dirY * halfTrace;
	const Iext2x = midX + dirX * halfTrace;
	const Iext2y = midY + dirY * halfTrace;
	const Iext1 = figure.createFreePoint(
		{ x: numeric(Iext1x), y: numeric(Iext1y) },
		{ draggable: false }
	);
	figure.hideElement(Iext1);
	const Iext2 = figure.createFreePoint(
		{ x: numeric(Iext2x), y: numeric(Iext2y) },
		{ draggable: false }
	);
	figure.hideElement(Iext2);
	const segmentTrace = figure.createSegment(Iext1, Iext2);
	figure.hideElement(segmentTrace);

	// ─── Sub-steps ───
	const arcLength = r * sweepRad;
	const subSteps: SubStep[] = [
		// SS1 : compass at A, traces arc 1.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: A.x, y: A.y, rotation: (arc1Start * 180) / Math.PI },
			compassRadius: r,
			geometricDistance: arcLength,
			animateDrawableIds: [arc1],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "Compas en A, on trace l'arc"
		},
		// SS2 : compass moves to B, traces arc 2.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: B.x, y: B.y, rotation: (arc2Start * 180) / Math.PI },
			compassRadius: r,
			geometricDistance: arcLength,
			animateDrawableIds: [arc2],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "Compas en B, on trace l'arc"
		},
		// SS3 : 2 intersection points fade in.
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [I1, I2],
			animateLineIds: [],
			instruction: 'Les arcs se coupent en deux points'
		},
		// SS4 : ruler + pencil trace the extended segment-trace (spans the
		// visible portion of the median line). Ruler positioned at Iext1
		// (start of extended segment) rotated toward Iext2 — same convention
		// as `rulerPosition` in `instruments/positioning.ts`.
		//
		// The principal line is NOT in `animateLineIds` : a fade-in starting
		// at stepProgress=0 would make it bump in while the ruler is still
		// moving into place. Instead, `applyFinalVisibility` reveals the line
		// at the end of SS4 (drained at the next `step()` or by the player
		// when the timeline reaches the end). The segment-trace fully covers
		// the visible viewport so the swap is imperceptible in `@squelette`.
		{
			kind: 'ruler-trace',
			instrument: 'ruler',
			secondaryInstrument: 'pencil',
			instrumentTarget: { x: Iext1x, y: Iext1y, rotation: segRotationDeg },
			geometricDistance: traceLen,
			animateDrawableIds: [segmentTrace],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'Règle sur les 2 points : on trace la médiatrice'
		}
	];

	return {
		subSteps,
		produced: {
			principal: principalId,
			charnieres: [I1, I2],
			traces: [arc1, arc2, segmentTrace],
			hiddenSupport: [circleA, circleB, distAB, radiusScalar, Iext1, Iext2]
		}
	};
}

const arcsEgauxChoreography: ChoreographyFn = (ctx) => buildArcsEgaux(ctx, 0.7);

const cerclesRayonAbChoreography: ChoreographyFn = (ctx) => buildArcsEgaux(ctx, 1.0);

export const VOIES_MEDIATRICE_EUCLIDE: readonly Voie[] = [
	{
		id: 'arcs_egaux',
		nom_humain: 'Arcs égaux d’Euclide (I.10)',
		source: 'Euclide, Éléments I.10',
		description:
			'Deux arcs courts (120°) de même rayon `r = 0.7 × |AB|` centrés en `A` et `B` se coupent en deux points équidistants. Une règle posée sur ces deux points trace la médiatrice.',
		defaut: true,
		choreography: arcsEgauxChoreography
	},
	{
		id: 'cercles_rayon_ab',
		nom_humain: 'Cercles de rayon AB',
		source: 'Variante visuelle',
		description:
			'Cas particulier où `r = |AB|` : les deux cercles auxiliaires passent chacun par l’autre extrémité, le quadrilatère formé est un losange dont la médiatrice est l’une des diagonales.',
		defaut: false,
		choreography: cerclesRayonAbChoreography
	}
];
