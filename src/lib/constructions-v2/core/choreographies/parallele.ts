/**
 * Choreographies for the `parallele(P, A, B)` builtin.
 *
 * V1 voies under `@euclide` :
 *
 * - `parallelogramme` (default, Euclid I.31) : compass at P with radius
 *   |AB| traces a small arc near Q ; compass at A with radius |BP| traces
 *   another small arc near Q ; the two arcs cross at Q (which makes PAQB
 *   a parallelogram, so (PQ) ∥ (AB)) ; ruler traces the parallel through
 *   P and Q.
 *
 * - `double_perpendiculaire` : perpendicular through P to (AB) → line e ;
 *   then perpendicular through P to e → parallel to (AB). Requires
 *   composition (`ctx.sub`) — left as stub for V1.
 */

import type { Voie, ChoreographyFn, ChoreographyResult, SubStep } from './types';

const SEGMENT_TRACE_LENGTH_DEFAULT = 15;
const SMALL_ARC_SWEEP_RAD = Math.PI / 6; // 30° total (small arcs near Q)

/**
 * `parallele @euclide @parallelogramme` choreography (Euclid I.31).
 *
 * Construction : Q = P + (B − A). Then PAQB is a parallelogram, so the
 * sides PA and QB are parallel and equal, and the sides PQ and AB are
 * parallel and equal. The compass construction uses :
 *
 * - Circle at P, radius |AB| : passes through Q (since |PQ| = |AB|).
 * - Circle at A, radius |BP| : passes through Q (since |AQ| = |BP|, as
 *   the diagonal of the parallelogram).
 *
 * Both circles' two intersections are Q and its reflection across line
 * (PA). Q is computed analytically here (P + B − A), so no ambiguity.
 *
 * Sub-steps :
 *   SS1 — compass at P, small arc near direction P→Q, radius |AB|.
 *   SS2 — compass at A, small arc near direction A→Q, radius |BP|.
 *   SS3 — Q fade-in.
 *   SS4 — ruler + pencil trace the parallel through P (and Q, by
 *         construction).
 */
function buildParallelogramme(ctx: Parameters<ChoreographyFn>[0]): ChoreographyResult {
	const { figure, args, principalId } = ctx;
	const [Pid, Aid, Bid] = args.ids;
	const [P, A, B] = args.coords;

	// Hide the parallel line — revealed at end by `applyFinalVisibility`.
	figure.hideElement(principalId);

	// ─── Initial values (used for first-frame instrument positioning) ───
	const dx = B.x - A.x;
	const dy = B.y - A.y;
	const dAB_0 = Math.hypot(dx, dy);
	const PBx = B.x - P.x;
	const PBy = B.y - P.y;
	const dBP_0 = Math.hypot(PBx, PBy);
	// Q = P + (B − A)
	const Qx0 = P.x + dx;
	const Qy0 = P.y + dy;
	// Direction P→Q (unit) = direction (B−A) / |AB| = (AB) direction.
	const dirPQx0 = dAB_0 > 0 ? dx / dAB_0 : 0;
	const dirPQy0 = dAB_0 > 0 ? dy / dAB_0 : 0;
	// Direction A→Q (unit). Q − A = (P + B − A) − A = P + B − 2A.
	const AQx0 = Qx0 - A.x;
	const AQy0 = Qy0 - A.y;
	const dAQ_0 = Math.hypot(AQx0, AQy0);
	const dirAQx0 = dAQ_0 > 0 ? AQx0 / dAQ_0 : 0;
	const dirAQy0 = dAQ_0 > 0 ? AQy0 / dAQ_0 : 0;
	// Initial arc angles (centered on direction toward Q).
	const halfSweep = SMALL_ARC_SWEEP_RAD / 2;
	const anglePQ_0 = Math.atan2(dirPQy0, dirPQx0);
	const angleAQ_0 = Math.atan2(dirAQy0, dirAQx0);
	const arcPStart_0 = anglePQ_0 - halfSweep;
	const arcAStart_0 = angleAQ_0 - halfSweep;
	const arcPLength_0 = dAB_0 * SMALL_ARC_SWEEP_RAD;
	const arcALength_0 = dBP_0 * SMALL_ARC_SWEEP_RAD;
	// Ruler trace : through P along (AB) direction (= (PQ) direction).
	const traceLen0 = Math.max(SEGMENT_TRACE_LENGTH_DEFAULT, Math.hypot(Qx0 - P.x, Qy0 - P.y) * 1.2);
	const halfTrace0 = traceLen0 / 2;
	const Iext1X0 = P.x - dirPQx0 * halfTrace0;
	const Iext1Y0 = P.y - dirPQy0 * halfTrace0;
	const segRotationDeg0 = (anglePQ_0 * 180) / Math.PI;

	// ─── Reactive scalars derived from P, A, B ───
	const Px = figure.createScalarCoordinate(Pid, 'x');
	const Py = figure.createScalarCoordinate(Pid, 'y');
	const Ax = figure.createScalarCoordinate(Aid, 'x');
	const Ay = figure.createScalarCoordinate(Aid, 'y');
	const Bx = figure.createScalarCoordinate(Bid, 'x');
	const By = figure.createScalarCoordinate(Bid, 'y');

	// |AB| (radius of circle at P).
	const dABScalar = figure.createScalarDistance(Aid, Bid);
	// |BP| (radius of circle at A).
	const dBPScalar = figure.createScalarDistance(Bid, Pid);

	// Q = P + (B − A). Reactive coordinates via computed point.
	const QxScalar = figure.createScalarExpression(
		(vals) => (vals.get(Px) ?? 0) + (vals.get(Bx) ?? 0) - (vals.get(Ax) ?? 0),
		[Px, Bx, Ax]
	);
	const QyScalar = figure.createScalarExpression(
		(vals) => (vals.get(Py) ?? 0) + (vals.get(By) ?? 0) - (vals.get(Ay) ?? 0),
		[Py, By, Ay]
	);
	const Q = figure.createComputedPoint({ scalarRef: QxScalar }, { scalarRef: QyScalar });
	figure.hideElement(Q);

	// Direction P→Q angle (= direction A→B angle, since PQ ∥ AB).
	const anglePQScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(QyScalar) ?? 0) - (vals.get(Py) ?? 0),
				(vals.get(QxScalar) ?? 0) - (vals.get(Px) ?? 0)
			),
		[Px, Py, QxScalar, QyScalar]
	);
	// Direction A→Q angle.
	const angleAQScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(QyScalar) ?? 0) - (vals.get(Ay) ?? 0),
				(vals.get(QxScalar) ?? 0) - (vals.get(Ax) ?? 0)
			),
		[Ax, Ay, QxScalar, QyScalar]
	);

	// Arc start/end angles : ±15° around direction P→Q (resp. A→Q).
	const arcPStartScalar = figure.createScalarExpression(
		(vals) => (vals.get(anglePQScalar) ?? 0) - halfSweep,
		[anglePQScalar]
	);
	const arcPEndScalar = figure.createScalarExpression(
		(vals) => (vals.get(anglePQScalar) ?? 0) + halfSweep,
		[anglePQScalar]
	);
	const arcAStartScalar = figure.createScalarExpression(
		(vals) => (vals.get(angleAQScalar) ?? 0) - halfSweep,
		[angleAQScalar]
	);
	const arcAEndScalar = figure.createScalarExpression(
		(vals) => (vals.get(angleAQScalar) ?? 0) + halfSweep,
		[angleAQScalar]
	);

	// Small arc centered at P with radius |AB|, sweep 30° around P→Q.
	const arcAtP = figure.createArcByAngles(
		Pid,
		{ scalarRef: dABScalar },
		{ scalarRef: arcPStartScalar },
		{ scalarRef: arcPEndScalar }
	);
	figure.hideElement(arcAtP);
	// Small arc centered at A with radius |BP|, sweep 30° around A→Q.
	const arcAtA = figure.createArcByAngles(
		Aid,
		{ scalarRef: dBPScalar },
		{ scalarRef: arcAStartScalar },
		{ scalarRef: arcAEndScalar }
	);
	figure.hideElement(arcAtA);

	// ─── Segment-trace : centered on P along (PQ) direction ───
	// Length max(15, 1.2 × |PQ|). Reactive.
	const halfTraceScalar = figure.createScalarExpression(
		(vals) => {
			const pqLen = Math.hypot(
				(vals.get(QxScalar) ?? 0) - (vals.get(Px) ?? 0),
				(vals.get(QyScalar) ?? 0) - (vals.get(Py) ?? 0)
			);
			return Math.max(SEGMENT_TRACE_LENGTH_DEFAULT / 2, pqLen * 1.2);
		},
		[Px, Py, QxScalar, QyScalar]
	);
	const dirPQxScalar = figure.createScalarExpression(
		(vals) => {
			const dxLocal = (vals.get(QxScalar) ?? 0) - (vals.get(Px) ?? 0);
			const dyLocal = (vals.get(QyScalar) ?? 0) - (vals.get(Py) ?? 0);
			const len = Math.hypot(dxLocal, dyLocal);
			return len > 1e-12 ? dxLocal / len : 0;
		},
		[Px, Py, QxScalar, QyScalar]
	);
	const dirPQyScalar = figure.createScalarExpression(
		(vals) => {
			const dxLocal = (vals.get(QxScalar) ?? 0) - (vals.get(Px) ?? 0);
			const dyLocal = (vals.get(QyScalar) ?? 0) - (vals.get(Py) ?? 0);
			const len = Math.hypot(dxLocal, dyLocal);
			return len > 1e-12 ? dyLocal / len : 0;
		},
		[Px, Py, QxScalar, QyScalar]
	);
	const Iext1xScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(Px) ?? 0) - (vals.get(dirPQxScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[Px, dirPQxScalar, halfTraceScalar]
	);
	const Iext1yScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(Py) ?? 0) - (vals.get(dirPQyScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[Py, dirPQyScalar, halfTraceScalar]
	);
	const Iext2xScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(Px) ?? 0) + (vals.get(dirPQxScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[Px, dirPQxScalar, halfTraceScalar]
	);
	const Iext2yScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(Py) ?? 0) + (vals.get(dirPQyScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[Py, dirPQyScalar, halfTraceScalar]
	);
	const Iext1 = figure.createComputedPoint(
		{ scalarRef: Iext1xScalar },
		{ scalarRef: Iext1yScalar }
	);
	figure.hideElement(Iext1);
	const Iext2 = figure.createComputedPoint(
		{ scalarRef: Iext2xScalar },
		{ scalarRef: Iext2yScalar }
	);
	figure.hideElement(Iext2);
	const segmentTrace = figure.createSegment(Iext1, Iext2);
	figure.hideElement(segmentTrace);

	const subSteps: SubStep[] = [
		// SS1 : compass at P, small arc near Q direction (radius |AB|).
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: P.x, y: P.y, rotation: (arcPStart_0 * 180) / Math.PI },
			compassRadius: dAB_0,
			geometricDistance: arcPLength_0,
			animateDrawableIds: [arcAtP],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'Compas en P, ouverture |AB|, on trace un arc vers Q'
		},
		// SS2 : compass at A, small arc near Q direction (radius |BP|).
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: A.x, y: A.y, rotation: (arcAStart_0 * 180) / Math.PI },
			compassRadius: dBP_0,
			geometricDistance: arcALength_0,
			animateDrawableIds: [arcAtA],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'Compas en A, ouverture |BP|, on trace un arc qui croise le précédent'
		},
		// SS3 : Q fade-in (intersection of the 2 arcs).
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [Q],
			animateLineIds: [],
			instruction: 'Les arcs se croisent en Q'
		},
		// SS4 : ruler + pencil trace the parallel.
		// Ruler at Iext1 (one extension end) rotated toward Iext2 — same
		// convention as `rulerPosition`. The pencil traverses through P
		// and Q during the trace ; the line `d` is revealed at the end by
		// `applyFinalVisibility`.
		{
			kind: 'ruler-trace',
			instrument: 'ruler',
			secondaryInstrument: 'pencil',
			instrumentTarget: { x: Iext1X0, y: Iext1Y0, rotation: segRotationDeg0 },
			geometricDistance: traceLen0,
			animateDrawableIds: [segmentTrace],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'Règle par P et Q : on trace la parallèle'
		}
	];

	return {
		subSteps,
		produced: {
			principal: principalId,
			charnieres: [Q],
			// 2 small arcs are pedagogically valuable (compass gestures).
			traces: [arcAtP, arcAtA],
			hiddenSupport: [
				// Animation-only / structural plumbing.
				segmentTrace,
				Iext1,
				Iext2,
				// All reactive scalars.
				Px,
				Py,
				Ax,
				Ay,
				Bx,
				By,
				dABScalar,
				dBPScalar,
				QxScalar,
				QyScalar,
				anglePQScalar,
				angleAQScalar,
				arcPStartScalar,
				arcPEndScalar,
				arcAStartScalar,
				arcAEndScalar,
				halfTraceScalar,
				dirPQxScalar,
				dirPQyScalar,
				Iext1xScalar,
				Iext1yScalar,
				Iext2xScalar,
				Iext2yScalar
			]
		}
	};
}

const parallelogrammeChoreography: ChoreographyFn = (ctx) => buildParallelogramme(ctx);

const NOT_YET_IMPLEMENTED: ChoreographyFn = (ctx) => ({
	subSteps: [],
	produced: { principal: ctx.principalId, charnieres: [], traces: [] }
});

export const VOIES_PARALLELE_EUCLIDE: readonly Voie[] = [
	{
		id: 'parallelogramme',
		nom_humain: 'Parallélogramme d’Euclide (I.31)',
		source: 'Euclide, Éléments I.31',
		description:
			'Compas de centre `P` et rayon `|AB|` ; compas de centre `A` et rayon `|BP|`. Leur intersection `Q` forme un parallélogramme `PAQB`. La règle `P→Q` trace la parallèle.',
		defaut: true,
		choreography: parallelogrammeChoreography
	},
	{
		id: 'double_perpendiculaire',
		nom_humain: 'Double perpendiculaire',
		source: 'Variante moderne',
		description:
			'Tracer la perpendiculaire à `(AB)` par `P` (droite auxiliaire `e`), puis la perpendiculaire à `e` par `P` : c’est la parallèle à `(AB)`. Nécessite `ctx.sub` — non implémentée en V1.',
		defaut: false,
		choreography: NOT_YET_IMPLEMENTED
	}
];
