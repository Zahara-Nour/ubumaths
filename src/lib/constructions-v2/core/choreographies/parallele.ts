/**
 * Choreographies for the `parallele(P, A, B)` builtin.
 *
 * V1 voies under `@euclide` :
 *
 * - `parallelogramme` (default, Euclid I.31) : compass at P with radius
 *   |AB| traces a small arc near Q ; compass at B with radius |PA| traces
 *   another small arc near Q ; the two arcs cross at Q (which makes PABQ
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
// Équerre horizontal edge length in math units. SetSquare renders at
// LARGEUR = 131 SVG pixels at scale 1 ; with the executor's PPU = 40,
// that's ≈ 3.3 math units. We use a slightly smaller value (3) so the
// segment-trace stays comfortably inside the équerre's horizontal edge.
const EQUERRE_HORIZONTAL_MATH_UNITS = 3;
// Overlap of the ruler over the already-traced portion (same as
// perpendiculaire @equerre).
const RULER_OVERLAP_MATH_UNITS = 2;

/**
 * `parallele @euclide @parallelogramme` choreography (Euclid I.31).
 *
 * Construction : Q = P + (B − A). Then PABQ is a parallelogram (vertex
 * order P → A → B → Q), so the opposite sides PA ∥ QB and AB ∥ PQ are
 * equal in length. The compass construction uses :
 *
 * - Circle at P, radius |AB| : passes through Q (since |PQ| = |AB|).
 * - Circle at B, radius |PA| : passes through Q (since |BQ| = |PA|).
 *
 * Both circles' two intersections are Q and its reflection across line
 * (PB). Q is computed analytically here (P + B − A), so no ambiguity.
 *
 * Sub-steps (pedagogically explicit : each compass measure is shown
 * BEFORE the compass moves to draw the corresponding arc, so the user
 * sees the gesture "I take this distance, then I report it elsewhere") :
 *
 *   SS1 — compass at A, opens to B (measures |AB|).
 *   SS2 — compass moves to P keeping opening, draws small arc near Q.
 *   SS3 — compass at P, opens to A (measures |PA|).
 *   SS4 — compass moves to B keeping opening, draws small arc near Q.
 *   SS5 — Q fade-in.
 *   SS6 — ruler + pencil trace the parallel through P (and Q, by
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
	const PAx = A.x - P.x;
	const PAy = A.y - P.y;
	const dPA_0 = Math.hypot(PAx, PAy);
	// Q = P + (B − A)
	const Qx0 = P.x + dx;
	const Qy0 = P.y + dy;
	// Direction P→Q (unit) = direction (B−A) / |AB| = (AB) direction.
	const dirPQx0 = dAB_0 > 0 ? dx / dAB_0 : 0;
	const dirPQy0 = dAB_0 > 0 ? dy / dAB_0 : 0;
	// Direction B→Q (unit). Q − B = (P + B − A) − B = P − A = −PA.
	// So B→Q = −(A→P) = P→A direction... wait no, B→Q = (Q−B) = (P−A).
	const BQx0 = Qx0 - B.x;
	const BQy0 = Qy0 - B.y;
	const dBQ_0 = Math.hypot(BQx0, BQy0);
	const dirBQx0 = dBQ_0 > 0 ? BQx0 / dBQ_0 : 0;
	const dirBQy0 = dBQ_0 > 0 ? BQy0 / dBQ_0 : 0;
	// Initial arc angles (centered on direction toward Q).
	const halfSweep = SMALL_ARC_SWEEP_RAD / 2;
	const anglePQ_0 = Math.atan2(dirPQy0, dirPQx0);
	const angleBQ_0 = Math.atan2(dirBQy0, dirBQx0);
	const arcPStart_0 = anglePQ_0 - halfSweep;
	const arcBStart_0 = angleBQ_0 - halfSweep;
	const arcPLength_0 = dAB_0 * SMALL_ARC_SWEEP_RAD;
	const arcBLength_0 = dPA_0 * SMALL_ARC_SWEEP_RAD;
	// Initial measure angles : direction from compass source toward the
	// "measured" point (spike at source, opening reaching the target).
	const angleAB_0 = Math.atan2(B.y - A.y, B.x - A.x); // A → B
	const anglePA_0 = Math.atan2(A.y - P.y, A.x - P.x); // P → A
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

	// |AB| (radius of circle at P, equal to |PQ|).
	const dABScalar = figure.createScalarDistance(Aid, Bid);
	// |PA| (radius of circle at B, equal to |BQ| — sides PA and BQ of the
	// parallelogram PABQ are opposite and equal).
	const dPAScalar = figure.createScalarDistance(Pid, Aid);

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
	// Direction B→Q angle (= direction A→P angle, since BQ ∥ AP in
	// parallelogram PABQ).
	const angleBQScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(QyScalar) ?? 0) - (vals.get(By) ?? 0),
				(vals.get(QxScalar) ?? 0) - (vals.get(Bx) ?? 0)
			),
		[Bx, By, QxScalar, QyScalar]
	);

	// Arc start/end angles : ±15° around direction P→Q (resp. B→Q).
	const arcPStartScalar = figure.createScalarExpression(
		(vals) => (vals.get(anglePQScalar) ?? 0) - halfSweep,
		[anglePQScalar]
	);
	const arcPEndScalar = figure.createScalarExpression(
		(vals) => (vals.get(anglePQScalar) ?? 0) + halfSweep,
		[anglePQScalar]
	);
	const arcBStartScalar = figure.createScalarExpression(
		(vals) => (vals.get(angleBQScalar) ?? 0) - halfSweep,
		[angleBQScalar]
	);
	const arcBEndScalar = figure.createScalarExpression(
		(vals) => (vals.get(angleBQScalar) ?? 0) + halfSweep,
		[angleBQScalar]
	);

	// Small arc centered at P with radius |AB|, sweep 30° around P→Q.
	const arcAtP = figure.createArcByAngles(
		Pid,
		{ scalarRef: dABScalar },
		{ scalarRef: arcPStartScalar },
		{ scalarRef: arcPEndScalar }
	);
	figure.hideElement(arcAtP);
	// Small arc centered at B with radius |PA|, sweep 30° around B→Q.
	const arcAtB = figure.createArcByAngles(
		Bid,
		{ scalarRef: dPAScalar },
		{ scalarRef: arcBStartScalar },
		{ scalarRef: arcBEndScalar }
	);
	figure.hideElement(arcAtB);

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
		// SS1 : compass at A, opens to B (measures |AB|).
		{
			kind: 'compass-measure',
			instrument: 'compass',
			instrumentTarget: { x: A.x, y: A.y, rotation: (angleAB_0 * 180) / Math.PI },
			compassRadius: dAB_0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'Compas en A, on prend la mesure |AB|'
		},
		// SS2 : compass at P, small arc near Q direction (radius |AB|, kept from SS1).
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: P.x, y: P.y, rotation: (arcPStart_0 * 180) / Math.PI },
			compassRadius: dAB_0,
			geometricDistance: arcPLength_0,
			animateDrawableIds: [arcAtP],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'On reporte cette ouverture en P et on trace un arc vers Q'
		},
		// SS3 : compass at P, opens to A (measures |PA|).
		{
			kind: 'compass-measure',
			instrument: 'compass',
			instrumentTarget: { x: P.x, y: P.y, rotation: (anglePA_0 * 180) / Math.PI },
			compassRadius: dPA_0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'Compas en P, on prend la mesure |PA|'
		},
		// SS4 : compass at B, small arc near Q direction (radius |PA|, kept from SS3).
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: B.x, y: B.y, rotation: (arcBStart_0 * 180) / Math.PI },
			compassRadius: dPA_0,
			geometricDistance: arcBLength_0,
			animateDrawableIds: [arcAtB],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'On reporte en B et on trace un arc qui croise le précédent'
		},
		// SS5 : Q fade-in (intersection of the 2 arcs).
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [Q],
			animateLineIds: [],
			instruction: 'Les arcs se croisent en Q'
		},
		// SS6 : ruler + pencil trace the parallel.
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
			traces: [arcAtP, arcAtB],
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
				dPAScalar,
				QxScalar,
				QyScalar,
				anglePQScalar,
				angleBQScalar,
				arcPStartScalar,
				arcPEndScalar,
				arcBStartScalar,
				arcBEndScalar,
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

/**
 * `parallele @equerre` choreography.
 *
 * Construction classique à l'équerre + règle (la règle sert de glissière
 * pour le déplacement perpendiculaire de l'équerre) :
 *
 *   SS1 — pose équerre : bord horizontal sur (AB), coin sur A, bord
 *         vertical orienté vers P.
 *   SS2 — pose règle : contre le bord vertical de l'équerre. La règle
 *         joue le rôle de glissière. L'équerre reste visible
 *         (`secondaryInstrument: 'setSquare'`).
 *   SS3 — glissement : l'équerre glisse le long de la règle jusqu'à
 *         `C_final = A + n_toP × |d_perp|`. La règle reste fixe
 *         (`secondaryInstrument: 'ruler'`).
 *   SS4 — tracé inside : crayon trace la portion de la parallèle
 *         couverte par le bord horizontal (longueur =
 *         `EQUERRE_HORIZONTAL_MATH_UNITS`). La règle se masque.
 *   SS5 — swap : on retire l'équerre, on pose la règle alignée sur la
 *         portion tracée (origine décalée de `RULER_OVERLAP_MATH_UNITS`
 *         vers le tracé pour le chevauchement).
 *   SS6 — prolongement : crayon prolonge la parallèle le long de la
 *         règle. `applyFinalVisibility` révèle ensuite la ligne complète.
 *
 * Positionnement de l'équerre :
 * - Coin (origine locale) = A (SS1, SS2), `C_final` (SS3, SS4).
 * - Rotation = angle de u_AB si P est du côté `n_ccw` de (AB), sinon
 *   `angle(u_AB) + 180°` pour orienter le bord vertical vers P.
 *
 * La règle-glissière en SS2/SS3 est alignée avec le bord vertical de
 * l'équerre (rotation = `setSquareRotation + 90°`).
 */
function buildEquerre(ctx: Parameters<ChoreographyFn>[0]): ChoreographyResult {
	const { figure, args, principalId } = ctx;
	const [Pid, Aid, Bid] = args.ids;
	const [P, A, B] = args.coords;

	figure.hideElement(principalId);

	// ─── Initial values ───
	const ABx = B.x - A.x;
	const ABy = B.y - A.y;
	const ABlen0 = Math.hypot(ABx, ABy);
	const ux0 = ABx / ABlen0;
	const uy0 = ABy / ABlen0;
	// n_ccw = (-uy, ux). dPerp = (A − P) · n_ccw. Sign indicates which
	// side of (AB) P is on (>0 = CW side, <0 = CCW side).
	const dPerp0 = -(A.x - P.x) * uy0 + (A.y - P.y) * ux0;
	const uAngleDeg = (Math.atan2(uy0, ux0) * 180) / Math.PI;
	const setSquareRotation = dPerp0 > 0 ? uAngleDeg + 180 : uAngleDeg;
	// Slide vector (perpendicular to (AB), toward P).
	// slide = -dPerp × n_ccw = -dPerp × (-uy, ux) = (dPerp·uy, -dPerp·ux).
	const slideVecX0 = dPerp0 * uy0;
	const slideVecY0 = -dPerp0 * ux0;
	const Cfinal_x0 = A.x + slideVecX0;
	const Cfinal_y0 = A.y + slideVecY0;
	// Horizontal-edge direction after rotation : -sign(dPerp) × u_AB
	// (= +u_AB if dPerp < 0, -u_AB if dPerp > 0).
	const hEdgeSign0 = dPerp0 > 0 ? -1 : 1;
	const hEdgeDirX0 = hEdgeSign0 * ux0;
	const hEdgeDirY0 = hEdgeSign0 * uy0;

	// ─── Reactive scalars ───
	const Px = figure.createScalarCoordinate(Pid, 'x');
	const Py = figure.createScalarCoordinate(Pid, 'y');
	const Ax = figure.createScalarCoordinate(Aid, 'x');
	const Ay = figure.createScalarCoordinate(Aid, 'y');
	const Bx = figure.createScalarCoordinate(Bid, 'x');
	const By = figure.createScalarCoordinate(Bid, 'y');

	const dABScalar = figure.createScalarDistance(Aid, Bid);
	const uxScalar = figure.createScalarExpression(
		(vals) => {
			const len = Math.max(vals.get(dABScalar) ?? 1, 1e-12);
			return ((vals.get(Bx) ?? 0) - (vals.get(Ax) ?? 0)) / len;
		},
		[Ax, Bx, dABScalar]
	);
	const uyScalar = figure.createScalarExpression(
		(vals) => {
			const len = Math.max(vals.get(dABScalar) ?? 1, 1e-12);
			return ((vals.get(By) ?? 0) - (vals.get(Ay) ?? 0)) / len;
		},
		[Ay, By, dABScalar]
	);
	const dPerpScalar = figure.createScalarExpression(
		(vals) =>
			-((vals.get(Ax) ?? 0) - (vals.get(Px) ?? 0)) * (vals.get(uyScalar) ?? 0) +
			((vals.get(Ay) ?? 0) - (vals.get(Py) ?? 0)) * (vals.get(uxScalar) ?? 0),
		[Ax, Ay, Px, Py, uxScalar, uyScalar]
	);
	// C_final = A + (dPerp·uy, -dPerp·ux).
	const CfinalXScalar = figure.createScalarExpression(
		(vals) => (vals.get(Ax) ?? 0) + (vals.get(dPerpScalar) ?? 0) * (vals.get(uyScalar) ?? 0),
		[Ax, dPerpScalar, uyScalar]
	);
	const CfinalYScalar = figure.createScalarExpression(
		(vals) => (vals.get(Ay) ?? 0) - (vals.get(dPerpScalar) ?? 0) * (vals.get(uxScalar) ?? 0),
		[Ay, dPerpScalar, uxScalar]
	);
	const Cfinal = figure.createComputedPoint(
		{ scalarRef: CfinalXScalar },
		{ scalarRef: CfinalYScalar }
	);
	figure.hideElement(Cfinal);
	// Horizontal-edge direction (sign flips if équerre is flipped).
	const hEdgeDirXScalar = figure.createScalarExpression(
		(vals) => {
			const d = vals.get(dPerpScalar) ?? 0;
			const sign = d > 0 ? -1 : 1;
			return sign * (vals.get(uxScalar) ?? 0);
		},
		[dPerpScalar, uxScalar]
	);
	const hEdgeDirYScalar = figure.createScalarExpression(
		(vals) => {
			const d = vals.get(dPerpScalar) ?? 0;
			const sign = d > 0 ? -1 : 1;
			return sign * (vals.get(uyScalar) ?? 0);
		},
		[dPerpScalar, uyScalar]
	);

	// ─── Segment-trace 1 : portion inside the équerre (along horizontal edge) ───
	const trace1EndxScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(CfinalXScalar) ?? 0) +
			(vals.get(hEdgeDirXScalar) ?? 0) * EQUERRE_HORIZONTAL_MATH_UNITS,
		[CfinalXScalar, hEdgeDirXScalar]
	);
	const trace1EndyScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(CfinalYScalar) ?? 0) +
			(vals.get(hEdgeDirYScalar) ?? 0) * EQUERRE_HORIZONTAL_MATH_UNITS,
		[CfinalYScalar, hEdgeDirYScalar]
	);
	const trace1End = figure.createComputedPoint(
		{ scalarRef: trace1EndxScalar },
		{ scalarRef: trace1EndyScalar }
	);
	figure.hideElement(trace1End);
	const segmentTrace1 = figure.createSegment(Cfinal, trace1End);
	figure.hideElement(segmentTrace1);

	// ─── Segment-trace 2 : backward extension along parallel (C_final → -hEdgeDir) ───
	const halfTraceScalar = figure.createScalarExpression(
		(vals) =>
			Math.max(SEGMENT_TRACE_LENGTH_DEFAULT / 2, Math.abs(vals.get(dPerpScalar) ?? 0) * 1.2),
		[dPerpScalar]
	);
	const trace2EndxScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(CfinalXScalar) ?? 0) -
			(vals.get(hEdgeDirXScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[CfinalXScalar, hEdgeDirXScalar, halfTraceScalar]
	);
	const trace2EndyScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(CfinalYScalar) ?? 0) -
			(vals.get(hEdgeDirYScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[CfinalYScalar, hEdgeDirYScalar, halfTraceScalar]
	);
	const trace2End = figure.createComputedPoint(
		{ scalarRef: trace2EndxScalar },
		{ scalarRef: trace2EndyScalar }
	);
	figure.hideElement(trace2End);
	const segmentTrace2 = figure.createSegment(Cfinal, trace2End);
	figure.hideElement(segmentTrace2);

	// Initial geometric distances.
	const trace1Len0 = EQUERRE_HORIZONTAL_MATH_UNITS;
	const trace2Len0 = Math.max(SEGMENT_TRACE_LENGTH_DEFAULT / 2, Math.abs(dPerp0) * 1.2);
	// Slide-guide ruler position : laid against the équerre's vertical
	// edge at A. Origin = A, rotation = équerre's vertical-edge direction
	// (= setSquareRotation + 90°). This ruler stays in place during the
	// equerre slide (SS3) and serves as the visual slide track.
	const guideRulerRotationDeg = setSquareRotation + 90;
	// Parallel-aligned ruler position (for SS5/SS6 extension) : origin
	// offset from C_final toward trace1 by RULER_OVERLAP, rotation
	// opposite to hEdgeDir (so the ruler extends backward).
	const rulerOriginX0 = Cfinal_x0 + hEdgeDirX0 * RULER_OVERLAP_MATH_UNITS;
	const rulerOriginY0 = Cfinal_y0 + hEdgeDirY0 * RULER_OVERLAP_MATH_UNITS;
	const rulerRotationDeg = (Math.atan2(-hEdgeDirY0, -hEdgeDirX0) * 180) / Math.PI;

	// ─── Sub-steps ───
	const subSteps: SubStep[] = [
		// SS1 : pose de l'équerre — coin sur A, bord horizontal aligné
		// avec (AB), bord vertical pointant vers P.
		{
			kind: 'compass-measure',
			instrument: 'setSquare',
			instrumentTarget: { x: A.x, y: A.y, rotation: setSquareRotation },
			compassRadius: 0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "On pose l'équerre avec son bord horizontal sur (AB), le coin sur A"
		},
		// SS2 : on pose la règle contre le bord vertical de l'équerre :
		// elle servira de glissière pour le déplacement perpendiculaire.
		// `secondaryInstrument: 'setSquare'` garde l'équerre visible.
		{
			kind: 'compass-measure',
			instrument: 'ruler',
			secondaryInstrument: 'setSquare',
			instrumentTarget: { x: A.x, y: A.y, rotation: guideRulerRotationDeg },
			compassRadius: 0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "On pose la règle contre le bord vertical de l'équerre"
		},
		// SS3 : glissement de l'équerre le long de la règle (la règle
		// reste fixe ; `secondaryInstrument: 'ruler'` la maintient visible).
		{
			kind: 'compass-measure',
			instrument: 'setSquare',
			secondaryInstrument: 'ruler',
			instrumentTarget: { x: Cfinal_x0, y: Cfinal_y0, rotation: setSquareRotation },
			compassRadius: 0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction:
				"On fait glisser l'équerre le long de la règle jusqu'à ce que le bord horizontal passe par P"
		},
		// SS4 : tracé le long du bord horizontal de l'équerre.
		// La règle se masque ici (`hideAutoInstruments`), le crayon
		// devient le secondaire pour suivre la pointe du tracé.
		{
			kind: 'ruler-trace',
			instrument: 'setSquare',
			secondaryInstrument: 'pencil',
			instrumentTarget: { x: Cfinal_x0, y: Cfinal_y0, rotation: setSquareRotation },
			geometricDistance: trace1Len0,
			animateDrawableIds: [segmentTrace1],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "Le long du bord horizontal de l'équerre, on trace une portion de la parallèle"
		},
		// SS5 : swap équerre → règle, alignée sur la portion tracée.
		{
			kind: 'compass-measure',
			instrument: 'ruler',
			instrumentTarget: { x: rulerOriginX0, y: rulerOriginY0, rotation: rulerRotationDeg },
			compassRadius: 0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "On retire l'équerre et on pose la règle le long de la portion tracée"
		},
		// SS6 : prolongement de la parallèle le long de la règle.
		{
			kind: 'ruler-trace',
			instrument: 'ruler',
			secondaryInstrument: 'pencil',
			instrumentTarget: { x: rulerOriginX0, y: rulerOriginY0, rotation: rulerRotationDeg },
			geometricDistance: trace2Len0,
			animateDrawableIds: [segmentTrace2],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'On prolonge le tracé le long de la règle pour compléter la parallèle'
		}
	];

	return {
		subSteps,
		produced: {
			principal: principalId,
			// C_final = coin de l'équerre après glissement (sur la parallèle).
			charnieres: [Cfinal],
			traces: [segmentTrace1, segmentTrace2],
			hiddenSupport: [
				trace1End,
				trace2End,
				Px,
				Py,
				Ax,
				Ay,
				Bx,
				By,
				dABScalar,
				uxScalar,
				uyScalar,
				dPerpScalar,
				CfinalXScalar,
				CfinalYScalar,
				hEdgeDirXScalar,
				hEdgeDirYScalar,
				trace1EndxScalar,
				trace1EndyScalar,
				trace2EndxScalar,
				trace2EndyScalar,
				halfTraceScalar
			]
		}
	};
}

const parallelogrammeChoreography: ChoreographyFn = (ctx) => buildParallelogramme(ctx);
const equerreChoreography: ChoreographyFn = (ctx) => buildEquerre(ctx);

const NOT_YET_IMPLEMENTED: ChoreographyFn = (ctx) => ({
	subSteps: [],
	produced: { principal: ctx.principalId, charnieres: [], traces: [] }
});

export const VOIES_PARALLELE_EQUERRE: readonly Voie[] = [
	{
		id: 'pose_equerre',
		nom_humain: "Tracé à l'équerre",
		source: 'Construction directe',
		description:
			"On pose l'équerre avec son bord horizontal sur `(AB)`, le coin sur `A`. On la fait glisser perpendiculairement à `(AB)` jusqu'à ce que le bord horizontal passe par `P`. Le crayon trace une portion de la parallèle ; on remplace ensuite l'équerre par la règle pour prolonger.",
		defaut: true,
		choreography: equerreChoreography
	}
];

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
