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
 * - `double_perpendiculaire` : perpendicular through P to (AB) → line e
 *   (sub-choreography `perpendiculaire @euclide @rayon_libre`) ; then
 *   perpendicular to e AT P → parallel to (AB). P lies on e, so
 *   `rayon_libre` would degenerate : two small arcs at P cut e in C*, D* ;
 *   a wider opening gives two arcs at C*, D* crossing at R ; ruler (PR).
 *
 * Voies under `@equerre` :
 *
 * - `pose_equerre` (default) : équerre slid along a ruler (see below).
 * - `double_perpendiculaire` : sub-choreography `perpendiculaire @equerre`
 *   traces e ; then the équerre is laid on e, right angle at P, and the
 *   pencil traces the parallel ; the ruler extends it.
 *
 * Both `double_perpendiculaire` voies refuse `P ∈ (AB)` with a
 * `ChoreographyError` (the parallel is (AB) itself, nothing to animate).
 */

import type { Figure } from '$lib/geometry-core/graph/figure';
import { exact, numeric } from '$lib/geometry-core/types/geo-value';
import { numericNode } from '$lib/mathAST/common/numeric';
import { ChoreographyError } from './types';
import { revealHiddenUsedPoints } from './reveal-points';
import { capitalize, de, en, labelAux, lineFormRoles, mesure, nom, type Role } from './names';
import type {
	Voie,
	ChoreographyFn,
	ChoreographyCtx,
	ChoreographyProduced,
	ChoreographyResult,
	SubStep,
	TraceTag
} from './types';

const SEGMENT_TRACE_LENGTH_DEFAULT = 15;
const SMALL_ARC_SWEEP_RAD = Math.PI / 6; // 30° total (small arcs near Q)
// Équerre horizontal edge length in math units. Since 2026-05-21 the
// SetSquare component scales with `pixelsPerUnit` so its math-unit size
// is constant regardless of canvas zoom : LARGEUR = 131/40 ≈ 3.275 math
// units. We use a slightly smaller value (3) so the segment-trace stays
// comfortably inside the équerre's horizontal edge.
const EQUERRE_HORIZONTAL_MATH_UNITS = 3;
// Overlap of the ruler over the already-traced portion (same as
// perpendiculaire @equerre).
const RULER_OVERLAP_MATH_UNITS = 2;
// Ruler body thickness in math units. The Ruler component scales with
// `pixelsPerUnit` so its math width = 57/40 ≈ 1.425 at any zoom.
const RULER_WIDTH_MATH_UNITS = 57 / 40;
// Double perpendiculaire @euclide : ouverture des deux petits arcs en P
// (qui coupent e en C*, D*), puis ouverture plus grande pour les arcs en
// C* et D*. Constantes : P est sur e, aucune distance de la figure ne
// s'impose, et des rayons fixes restent lisibles quel que soit le décor.
const DP_INNER_RADIUS = 1.5;
const DP_OUTER_RADIUS = 2.5;
// Double perpendiculaire @equerre : longueur tracée le long du bord
// vertical de l'équerre (HAUTEUR ≈ 5.575 unités, cf. perpendiculaire.ts).
const EQUERRE_VERTICAL_MATH_UNITS = 5;
// En deçà de cette distance de P à (AB), P est tenu pour être sur (AB).
const P_ON_LINE_EPSILON = 1e-9;

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
	const N = lineFormRoles(ctx, true);

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
	const nQ = labelAux(ctx, Q, 'Q');

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
			instruction: `Compas ${en(N.A)}, on prend ${mesure(N.A, N.B)}`
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
			instruction: `On reporte cette ouverture ${en(N.P)} et on trace un arc vers ${nQ}`
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
			instruction: `Compas ${en(N.P)}, on prend ${mesure(N.P, N.A)}`
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
			instruction: `On reporte ${en(N.B)} et on trace un arc qui croise le précédent`
		},
		// SS5 : Q fade-in (intersection of the 2 arcs).
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [Q],
			animateLineIds: [],
			instruction: `Les arcs se croisent en ${nQ}`
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
			instruction: `Règle par ${nom(N.P)} et ${nQ} : on trace la parallèle`
		}
	];

	return {
		subSteps,
		produced: {
			principal: principalId,
			charnieres: [Q],
			// 2 small arcs are pedagogically valuable (compass gestures).
			traces: [arcAtP, arcAtB],
			traceTags: new Map<string, TraceTag>([
				[arcAtP, 'arc'],
				[arcAtB, 'arc']
			]),
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
	const N = lineFormRoles(ctx, false);

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
	// Horizontal-edge direction after rotation : -sign(dPerp) × u_AB
	// (= +u_AB if dPerp < 0, -u_AB if dPerp > 0).
	const hEdgeSign0 = dPerp0 > 0 ? -1 : 1;
	const hEdgeDirX0 = hEdgeSign0 * ux0;
	const hEdgeDirY0 = hEdgeSign0 * uy0;
	// Projection F of P on (AB).
	const proj0 = (P.x - A.x) * ux0 + (P.y - A.y) * uy0;
	const Fx0 = A.x + proj0 * ux0;
	const Fy0 = A.y + proj0 * uy0;
	// Équerre's initial corner : near F (projection of P on (AB)), shifted
	// half a horizontal-edge length so that P ends up roughly centered on
	// the trace after the perpendicular slide.
	const equerreInitialX0 = Fx0 - (EQUERRE_HORIZONTAL_MATH_UNITS / 2) * hEdgeDirX0;
	const equerreInitialY0 = Fy0 - (EQUERRE_HORIZONTAL_MATH_UNITS / 2) * hEdgeDirY0;
	// Slide vector (perpendicular to (AB), toward P).
	// slide = -dPerp × n_ccw = -dPerp × (-uy, ux) = (dPerp·uy, -dPerp·ux).
	const slideVecX0 = dPerp0 * uy0;
	const slideVecY0 = -dPerp0 * ux0;
	const Cfinal_x0 = equerreInitialX0 + slideVecX0;
	const Cfinal_y0 = equerreInitialY0 + slideVecY0;

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
	// Projection F = A + ((P − A) · u_AB) × u_AB.
	const projScalar = figure.createScalarExpression(
		(vals) => {
			const apx = (vals.get(Px) ?? 0) - (vals.get(Ax) ?? 0);
			const apy = (vals.get(Py) ?? 0) - (vals.get(Ay) ?? 0);
			return apx * (vals.get(uxScalar) ?? 0) + apy * (vals.get(uyScalar) ?? 0);
		},
		[Px, Py, Ax, Ay, uxScalar, uyScalar]
	);
	const FxScalar = figure.createScalarExpression(
		(vals) => (vals.get(Ax) ?? 0) + (vals.get(projScalar) ?? 0) * (vals.get(uxScalar) ?? 0),
		[Ax, projScalar, uxScalar]
	);
	const FyScalar = figure.createScalarExpression(
		(vals) => (vals.get(Ay) ?? 0) + (vals.get(projScalar) ?? 0) * (vals.get(uyScalar) ?? 0),
		[Ay, projScalar, uyScalar]
	);
	// equerreInitial = F − (LARGEUR/2) × hEdgeDir.
	const equerreInitialXScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(FxScalar) ?? 0) -
			(EQUERRE_HORIZONTAL_MATH_UNITS / 2) * (vals.get(hEdgeDirXScalar) ?? 0),
		[FxScalar, hEdgeDirXScalar]
	);
	const equerreInitialYScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(FyScalar) ?? 0) -
			(EQUERRE_HORIZONTAL_MATH_UNITS / 2) * (vals.get(hEdgeDirYScalar) ?? 0),
		[FyScalar, hEdgeDirYScalar]
	);
	// C_final = equerreInitial + slide_vec.
	// slide = -dPerp × n_ccw = (dPerp·uy, -dPerp·ux).
	const CfinalXScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(equerreInitialXScalar) ?? 0) +
			(vals.get(dPerpScalar) ?? 0) * (vals.get(uyScalar) ?? 0),
		[equerreInitialXScalar, dPerpScalar, uyScalar]
	);
	const CfinalYScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(equerreInitialYScalar) ?? 0) -
			(vals.get(dPerpScalar) ?? 0) * (vals.get(uxScalar) ?? 0),
		[equerreInitialYScalar, dPerpScalar, uxScalar]
	);
	const Cfinal = figure.createComputedPoint(
		{ scalarRef: CfinalXScalar },
		{ scalarRef: CfinalYScalar }
	);
	figure.hideElement(Cfinal);
	// equerreInitial as a point (used as endpoint for the slide segment
	// and as vertex/arm of the right-angle markers in @complet mode).
	const EquerreCorner = figure.createComputedPoint(
		{ scalarRef: equerreInitialXScalar },
		{ scalarRef: equerreInitialYScalar }
	);
	figure.hideElement(EquerreCorner);

	// ─── Slide-guide segment (equerreInitial → Cfinal) ─────────────────────
	// Visible only in @complet as a trace, showing the perpendicular axis
	// along which the équerre slid. Length = |dPerp|.
	const slideSegment = figure.createSegment(EquerreCorner, Cfinal);
	figure.hideElement(slideSegment);

	// ─── Right-angle markers (@complet only) ───────────────────────────────
	// Right angle at equerreInitial : between (AB) and the slide segment.
	// Vertex = equerreInitial, arms = B (along u_AB) and Cfinal (along n_toP).
	const rightAngleAtBase = figure.createAngle(Bid, EquerreCorner, Cfinal, { marque: 'carre' });
	figure.hideElement(rightAngleAtBase);

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

	// Right angle at Cfinal : between the slide segment and the parallel.
	// Vertex = Cfinal, arms = trace1End (along hEdgeDir = parallel direction)
	// and EquerreCorner (along -n_toP = back along slide).
	const rightAngleAtTop = figure.createAngle(trace1End, Cfinal, EquerreCorner, {
		marque: 'carre'
	});
	figure.hideElement(rightAngleAtTop);

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
	// edge at equerreInitial, but SHIFTED away from the équerre's body
	// (in -hEdgeDir direction by RULER_WIDTH_MATH_UNITS) so the ruler's
	// body sits next to the équerre rather than overlapping with it.
	// Rotation = équerre's vertical-edge direction (= setSquareRotation
	// + 90°). The ruler stays in place during the equerre slide (SS3).
	const guideRulerOriginX0 = equerreInitialX0 - hEdgeDirX0 * RULER_WIDTH_MATH_UNITS;
	const guideRulerOriginY0 = equerreInitialY0 - hEdgeDirY0 * RULER_WIDTH_MATH_UNITS;
	const guideRulerRotationDeg = setSquareRotation + 90;
	// Parallel-aligned ruler position (for SS5/SS6 extension) : origin
	// offset from C_final toward trace1 by RULER_OVERLAP, rotation
	// opposite to hEdgeDir (so the ruler extends backward).
	const rulerOriginX0 = Cfinal_x0 + hEdgeDirX0 * RULER_OVERLAP_MATH_UNITS;
	const rulerOriginY0 = Cfinal_y0 + hEdgeDirY0 * RULER_OVERLAP_MATH_UNITS;
	const rulerRotationDeg = (Math.atan2(-hEdgeDirY0, -hEdgeDirX0) * 180) / Math.PI;

	// ─── Sub-steps ───
	const subSteps: SubStep[] = [
		// SS1 : pose de l'équerre — coin près du projeté F de P sur (AB)
		// (décalé d'une demi-LARGEUR pour centrer P sur le tracé après
		// glissement). Bord horizontal aligné avec (AB), bord vertical
		// pointant vers P.
		{
			kind: 'compass-measure',
			instrument: 'setSquare',
			instrumentTarget: {
				x: equerreInitialX0,
				y: equerreInitialY0,
				rotation: setSquareRotation
			},
			compassRadius: 0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `On pose l'équerre avec son bord horizontal sur ${nom(N.d)}, près du projeté ${de(N.P)} sur ${nom(N.d)}`
		},
		// SS2 : on pose la règle contre le bord vertical de l'équerre
		// (décalée de RULER_WIDTH pour ne pas la chevaucher) — elle
		// servira de glissière pour le déplacement perpendiculaire.
		// `secondaryInstrument: 'setSquare'` garde l'équerre visible.
		{
			kind: 'compass-measure',
			instrument: 'ruler',
			secondaryInstrument: 'setSquare',
			instrumentTarget: {
				x: guideRulerOriginX0,
				y: guideRulerOriginY0,
				rotation: guideRulerRotationDeg
			},
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
			instruction: `On fait glisser l'équerre le long de la règle jusqu'à ce que le bord horizontal passe par ${nom(N.P)}`
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
			// Traces (visibles en @complet) : les deux portions tracées + le
			// segment-glissière (axe perpendiculaire le long duquel l'équerre
			// a glissé) + les deux marqueurs d'angle droit (montrent que la
			// parallèle est obtenue par double perpendicularité).
			traces: [segmentTrace1, segmentTrace2, slideSegment, rightAngleAtBase, rightAngleAtTop],
			traceTags: new Map<string, TraceTag>([
				[segmentTrace1, 'segment-trace'],
				[segmentTrace2, 'segment-trace'],
				[slideSegment, 'segment-trace'],
				[rightAngleAtBase, 'marker'],
				[rightAngleAtTop, 'marker']
			]),
			hiddenSupport: [
				EquerreCorner,
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
				projScalar,
				FxScalar,
				FyScalar,
				equerreInitialXScalar,
				equerreInitialYScalar,
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

// Compas en A puis en B : les deux points de d servent (révélés s'ils sont cachés).
const parallelogrammeChoreography: ChoreographyFn = (ctx) =>
	revealHiddenUsedPoints(ctx, ctx.args.ids.slice(1, 3), buildParallelogramme);
const equerreChoreography: ChoreographyFn = (ctx) => buildEquerre(ctx);

// ─── Double perpendiculaire (@euclide et @equerre) ─────────────────────────

type Vals = ReadonlyMap<string, number>;

function val(vals: Vals, id: string): number {
	return vals.get(id) ?? 0;
}

/**
 * Petite fabrique réactive : chaque scalaire créé est noté dans `support`
 * (rangé ensuite en `hiddenSupport`), chaque point calculé naît masqué.
 */
function reactiveKit(figure: Figure) {
	const support: string[] = [];
	const expr = (compute: (vals: Vals) => number, deps: string[]): string => {
		const id = figure.createScalarExpression(compute, deps);
		support.push(id);
		return id;
	};
	const point = (
		fx: (vals: Vals) => number,
		fy: (vals: Vals) => number,
		deps: string[]
	): string => {
		const id = figure.createComputedPoint(
			{ scalarRef: expr(fx, deps) },
			{ scalarRef: expr(fy, deps) }
		);
		figure.hideElement(id);
		return id;
	};
	/** Petit arc de centre `centerId`, ±15° autour de la direction `angle`. */
	const smallArc = (
		centerId: string,
		radius: number,
		angle: (vals: Vals) => number,
		deps: string[]
	): string => {
		const halfSweep = SMALL_ARC_SWEEP_RAD / 2;
		const start = expr((vals) => angle(vals) - halfSweep, deps);
		const end = expr((vals) => angle(vals) + halfSweep, deps);
		const id = figure.createArcByAngles(
			centerId,
			numeric(radius),
			{ scalarRef: start },
			{ scalarRef: end }
		);
		figure.hideElement(id);
		return id;
	};
	return { support, expr, point, smallArc };
}

/**
 * Repère réactif commun : coordonnées de P, A, B et vecteur unitaire
 * `u` de (AB).
 */
function reactiveFrame(
	kit: ReturnType<typeof reactiveKit>,
	figure: Figure,
	ids: readonly string[]
) {
	const [Pid, Aid, Bid] = ids;
	const Px = figure.createScalarCoordinate(Pid, 'x');
	const Py = figure.createScalarCoordinate(Pid, 'y');
	const Ax = figure.createScalarCoordinate(Aid, 'x');
	const Ay = figure.createScalarCoordinate(Aid, 'y');
	const Bx = figure.createScalarCoordinate(Bid, 'x');
	const By = figure.createScalarCoordinate(Bid, 'y');
	const dAB = figure.createScalarDistance(Aid, Bid);
	kit.support.push(Px, Py, Ax, Ay, Bx, By, dAB);
	const ux = kit.expr(
		(v) => (val(v, Bx) - val(v, Ax)) / Math.max(val(v, dAB), 1e-12),
		[Ax, Bx, dAB]
	);
	const uy = kit.expr(
		(v) => (val(v, By) - val(v, Ay)) / Math.max(val(v, dAB), 1e-12),
		[Ay, By, dAB]
	);
	return { Px, Py, Ax, Ay, ux, uy };
}

/** Vecteur unitaire de (AB), valeurs initiales. */
function unitAB(A: { x: number; y: number }, B: { x: number; y: number }) {
	const len = Math.hypot(B.x - A.x, B.y - A.y);
	return { x: (B.x - A.x) / len, y: (B.y - A.y) / len };
}

/**
 * Cas limite `P ∈ (AB)` : la parallèle est (AB) elle-même et la première
 * perpendiculaire n'a plus de sens (pas d'animation fausse).
 */
function assertPOffLine(
	P: { x: number; y: number },
	A: { x: number; y: number },
	B: { x: number; y: number },
	N: { P: Role; A: Role; B: Role; d: Role },
	methode: '@euclide' | '@equerre'
): void {
	const u = unitAB(A, B);
	const dist = Math.abs(u.x * (P.y - A.y) - u.y * (P.x - A.x));
	if (!(dist > P_ON_LINE_EPSILON)) {
		throw new ChoreographyError(
			`\`${callText(N)} ${methode} @double_perpendiculaire\` : ${capitalize(nom(N.P))} est sur ${laDroite(N.d)} : la parallèle est ${nom(N.d)} elle-même, il n’y a rien à construire.`
		);
	}
}

/**
 * Droite auxiliaire `e` = perpendiculaire à (AB) par P, bâtie comme dans
 * le builtin `perpendiculaire` : T = P + (B − A), puis rotation de T
 * autour de P d'un quart de tour. Créée masquée ; la sous-chorégraphie
 * l'anime, puis elle apparaît (line-fade-in).
 */
function createLineE(ctx: ChoreographyCtx): { e: string; nE: string; helpers: string[] } {
	const { figure } = ctx;
	const [Pid, Aid, Bid] = ctx.args.ids;
	const T = figure.createTranslatedPoint(Pid, Aid, Bid);
	figure.hideElement(T);
	const E2 = figure.createRotatedPoint(T, Pid, exact(numericNode(Math.PI / 2)));
	figure.hideElement(E2);
	const e = figure.createLine(Pid, E2);
	figure.hideElement(e);
	return { e, nE: labelAux(ctx, e, 'e'), helpers: [T, E2] };
}

/**
 * Reclasse le produit de la sous-perpendiculaire : ses traces gardent leur
 * étiquette, sa charnière (Q ou le pied F) devient un point auxiliaire de
 * la parallèle, son support reste masqué.
 */
function absorbSub(
	subProduced: ChoreographyProduced,
	traces: string[],
	tags: Map<string, TraceTag>,
	hidden: string[]
): void {
	traces.push(...subProduced.traces, ...subProduced.charnieres);
	if (subProduced.traceTags) {
		for (const [id, tag] of subProduced.traceTags) tags.set(id, tag);
	}
	for (const id of subProduced.charnieres) tags.set(id, 'auxiliary-point');
	hidden.push(...(subProduced.hiddenSupport ?? []));
}

/** « parallele(P, A, B) », « parallele(P, d) », ou « parallele » sans nom lisible. */
function callText(N: { P: Role; A: Role; B: Role; d: Role }): string {
	const { P, A, B, d } = N;
	if (!P.name || !d.name) return 'parallele';
	if (A.name && B.name && d.name === `(${A.name}${B.name})`) {
		return `parallele(${P.name}, ${A.name}, ${B.name})`;
	}
	return `parallele(${P.name}, ${d.name})`;
}

/**
 * Lettres de la paire C*, D* : « C*, D* » se lirait comme le point C du
 * script (« Compas en C… plus grand que MC* »). Si C ou D est un nom pris,
 * la paire passe aux deux premières lettres consécutives libres (E*, F*…),
 * à partir de C. Aucune paire libre : C, D (les primes départagent).
 */
function starPairStems(ctx: ChoreographyCtx): [string, string] {
	for (let code = 'C'.charCodeAt(0); code < 'Z'.charCodeAt(0); code++) {
		const x = String.fromCharCode(code);
		const y = String.fromCharCode(code + 1);
		if (!ctx.nameTaken(x) && !ctx.nameTaken(y)) return [x, y];
	}
	return ['C', 'D'];
}

/** « la droite (AB) », « la droite d » ou « la droite ». */
function laDroite(d: Role): string {
	return d.name ? `la droite ${d.name}` : d.neutral;
}

/** Consigne de l'apparition de e (« La perpendiculaire e à (AB) passant par P apparaît »). */
function lineEInstruction(N: { P: Role; d: Role }, nE: string): string {
	return `La perpendiculaire ${nE} à ${nom(N.d)} passant par ${nom(N.P)} apparaît`;
}

/**
 * `parallele @euclide @double_perpendiculaire`.
 *
 *   SS1..SS7 — sous-chorégraphie `perpendiculaire(P, A, B) @euclide
 *              @rayon_libre` : elle trace e.
 *   SS8      — line-fade-in e.
 *   SS9      — petit arc en P (rayon `DP_INNER_RADIUS`) qui coupe e en C*.
 *   SS10     — même ouverture, petit arc qui coupe e en D*.
 *   SS11     — C*, D* apparaissent.
 *   SS12     — le compas s'ouvre davantage (`DP_OUTER_RADIUS`), en C*.
 *   SS13     — arc en C* vers R.
 *   SS14     — même ouverture, arc en D* : il croise le précédent en R.
 *   SS15     — R apparaît.
 *   SS16     — règle (PR) : la parallèle.
 *
 * Justification : R est équidistant de C* et D*, symétriques par rapport
 * à P sur e, donc R est sur la médiatrice de [C*D*], c'est-à-dire la
 * perpendiculaire à e en P ; perpendiculaire à e, elle est parallèle à (AB).
 * Avec u unitaire de (AB) et v = u tourné d'un quart de tour (direction
 * de e) : C* = P + r₁v, D* = P − r₁v, R = P + √(r₂² − r₁²)·u.
 */
function buildDoublePerpendiculaireEuclide(ctx: ChoreographyCtx): ChoreographyResult {
	const { figure, args, principalId, visibilite, sub } = ctx;
	const [Pid, Aid, Bid] = args.ids;
	const [P, A, B] = args.coords;
	const N = lineFormRoles(ctx, false);
	assertPOffLine(P, A, B, N, '@euclide');

	figure.hideElement(principalId);

	// ─── 1re perpendiculaire : e ───
	const { e, nE, helpers } = createLineE(ctx);
	const perp = sub(
		'perpendiculaire',
		{ ids: [Pid, Aid, Bid], coords: [P, A, B], lineName: args.lineName },
		e,
		{
			contrainte: 'euclide',
			methode: 'rayon_libre',
			visibilite
		}
	);

	// ─── Valeurs initiales (position des instruments) ───
	const r1 = DP_INNER_RADIUS;
	const r2 = DP_OUTER_RADIUS;
	const h = Math.sqrt(r2 * r2 - r1 * r1);
	const u0 = unitAB(A, B);
	const v0 = { x: -u0.y, y: u0.x };
	const Cs0 = { x: P.x + r1 * v0.x, y: P.y + r1 * v0.y };
	const Ds0 = { x: P.x - r1 * v0.x, y: P.y - r1 * v0.y };
	const halfSweep = SMALL_ARC_SWEEP_RAD / 2;
	const toDeg = (rad: number) => (rad * 180) / Math.PI;
	const angPC0 = Math.atan2(v0.y, v0.x);
	const angPD0 = Math.atan2(-v0.y, -v0.x);
	// R − C* = h·u − r₁·v ; R − D* = h·u + r₁·v.
	const angCR0 = Math.atan2(h * u0.y - r1 * v0.y, h * u0.x - r1 * v0.x);
	const angDR0 = Math.atan2(h * u0.y + r1 * v0.y, h * u0.x + r1 * v0.x);
	const halfTrace = SEGMENT_TRACE_LENGTH_DEFAULT / 2;
	const Iext1X0 = P.x - u0.x * halfTrace;
	const Iext1Y0 = P.y - u0.y * halfTrace;

	// ─── Éléments réactifs ───
	const kit = reactiveKit(figure);
	const { Px, Py, ux, uy } = reactiveFrame(kit, figure, args.ids);
	const deps = [Px, Py, ux, uy];
	// v = (−uy, ux).
	const Cstar = kit.point(
		(v) => val(v, Px) - val(v, uy) * r1,
		(v) => val(v, Py) + val(v, ux) * r1,
		deps
	);
	const Dstar = kit.point(
		(v) => val(v, Px) + val(v, uy) * r1,
		(v) => val(v, Py) - val(v, ux) * r1,
		deps
	);
	const R = kit.point(
		(v) => val(v, Px) + val(v, ux) * h,
		(v) => val(v, Py) + val(v, uy) * h,
		deps
	);
	const [stemC, stemD] = starPairStems(ctx);
	const nC = labelAux(ctx, Cstar, `${stemC}*`);
	const nD = labelAux(ctx, Dstar, `${stemD}*`);
	const nR = labelAux(ctx, R, 'R');
	const arcPC = kit.smallArc(Pid, r1, (v) => Math.atan2(val(v, ux), -val(v, uy)), [ux, uy]);
	const arcPD = kit.smallArc(Pid, r1, (v) => Math.atan2(-val(v, ux), val(v, uy)), [ux, uy]);
	const arcC = kit.smallArc(
		Cstar,
		r2,
		(v) => Math.atan2(h * val(v, uy) - r1 * val(v, ux), h * val(v, ux) + r1 * val(v, uy)),
		[ux, uy]
	);
	const arcD = kit.smallArc(
		Dstar,
		r2,
		(v) => Math.atan2(h * val(v, uy) + r1 * val(v, ux), h * val(v, ux) - r1 * val(v, uy)),
		[ux, uy]
	);
	// Tracé de la règle : centré sur P, porté par u.
	const Iext1 = kit.point(
		(v) => val(v, Px) - val(v, ux) * halfTrace,
		(v) => val(v, Py) - val(v, uy) * halfTrace,
		deps
	);
	const Iext2 = kit.point(
		(v) => val(v, Px) + val(v, ux) * halfTrace,
		(v) => val(v, Py) + val(v, uy) * halfTrace,
		deps
	);
	const segmentTrace = figure.createSegment(Iext1, Iext2);
	figure.hideElement(segmentTrace);

	const arcSmall1 = r1 * SMALL_ARC_SWEEP_RAD;
	const arcSmall2 = r2 * SMALL_ARC_SWEEP_RAD;
	const ownSubSteps: SubStep[] = [
		{
			kind: 'line-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [e],
			instruction: lineEInstruction(N, nE)
		},
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: P.x, y: P.y, rotation: toDeg(angPC0 - halfSweep) },
			compassRadius: r1,
			geometricDistance: arcSmall1,
			animateDrawableIds: [arcPC],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `Compas ${en(N.P)}, petite ouverture : un petit arc coupe ${nE} en ${nC}`
		},
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: P.x, y: P.y, rotation: toDeg(angPD0 - halfSweep) },
			compassRadius: r1,
			geometricDistance: arcSmall1,
			animateDrawableIds: [arcPD],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `Même ouverture, de l’autre côté ${de(N.P)} : un petit arc coupe ${nE} en ${nD}`
		},
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [Cstar, Dstar],
			animateLineIds: [],
			instruction: `${nC} et ${nD} apparaissent sur ${nE}, à égale distance ${de(N.P)}`
		},
		{
			kind: 'compass-measure',
			instrument: 'compass',
			instrumentTarget: { x: Cs0.x, y: Cs0.y, rotation: toDeg(angCR0) },
			compassRadius: r2,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: N.P.name
				? `Compas en ${nC}, on l’ouvre davantage (plus grand que ${N.P.name}${nC})`
				: `Compas en ${nC}, on l’ouvre davantage (plus que la première ouverture)`
		},
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: Cs0.x, y: Cs0.y, rotation: toDeg(angCR0 - halfSweep) },
			compassRadius: r2,
			geometricDistance: arcSmall2,
			animateDrawableIds: [arcC],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `On trace un arc de centre ${nC}`
		},
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: Ds0.x, y: Ds0.y, rotation: toDeg(angDR0 - halfSweep) },
			compassRadius: r2,
			geometricDistance: arcSmall2,
			animateDrawableIds: [arcD],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `Même ouverture en ${nD} : l’arc croise le précédent`
		},
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [R],
			animateLineIds: [],
			instruction: `Les arcs se croisent en ${nR}`
		},
		{
			kind: 'ruler-trace',
			instrument: 'ruler',
			secondaryInstrument: 'pencil',
			instrumentTarget: { x: Iext1X0, y: Iext1Y0, rotation: toDeg(Math.atan2(u0.y, u0.x)) },
			geometricDistance: 2 * halfTrace,
			animateDrawableIds: [segmentTrace],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `Règle par ${nom(N.P)} et ${nR} : on trace la parallèle à ${nom(N.d)}`
		}
	];

	// ─── Classement ───
	const traces: string[] = [];
	const traceTags = new Map<string, TraceTag>();
	const hiddenSupport: string[] = [];
	absorbSub(perp.produced, traces, traceTags, hiddenSupport);
	traces.push(arcPC, arcPD, arcC, arcD, Cstar, Dstar);
	for (const id of [arcPC, arcPD, arcC, arcD]) traceTags.set(id, 'arc');
	for (const id of [Cstar, Dstar]) traceTags.set(id, 'auxiliary-point');
	hiddenSupport.push(...helpers, ...kit.support, segmentTrace, Iext1, Iext2);

	return {
		subSteps: [...perp.subSteps, ...ownSubSteps],
		produced: {
			principal: principalId,
			// e (droite auxiliaire) et R (2e point de la parallèle).
			charnieres: [e, R],
			traces,
			traceTags,
			hiddenSupport
		}
	};
}

/**
 * `parallele @equerre @double_perpendiculaire`.
 *
 *   SS1..SS5 — sous-chorégraphie `perpendiculaire(P, A, B) @equerre` :
 *              équerre sur (AB), angle droit au pied F, tracé de e.
 *   SS6      — line-fade-in e.
 *   SS7      — équerre posée avec un bord sur e, l'angle droit en P
 *              (bord horizontal orienté de F vers P, pour ne pas
 *              chevaucher (AB)).
 *   SS8      — le crayon trace une portion de la parallèle le long du
 *              bord vertical (direction w = (F→P) tournée d'un quart de
 *              tour, parallèle à (AB)).
 *   SS9      — on retire l'équerre, on pose la règle sur la portion tracée.
 *   SS10     — le crayon prolonge la parallèle de l'autre côté de P.
 *
 * Deux marqueurs d'angle droit (en F et en P) montrent la double
 * perpendicularité en `@complet`.
 */
function buildDoublePerpendiculaireEquerre(ctx: ChoreographyCtx): ChoreographyResult {
	const { figure, args, principalId, visibilite, sub } = ctx;
	const [Pid, Aid, Bid] = args.ids;
	const [P, A, B] = args.coords;
	const N = lineFormRoles(ctx, false);
	assertPOffLine(P, A, B, N, '@equerre');

	figure.hideElement(principalId);

	// ─── 1re perpendiculaire : e ───
	const { e, nE, helpers } = createLineE(ctx);
	const perp = sub(
		'perpendiculaire',
		{ ids: [Pid, Aid, Bid], coords: [P, A, B], lineName: args.lineName },
		e,
		{
			contrainte: 'equerre',
			methode: 'pose_equerre',
			visibilite
		}
	);

	// ─── Valeurs initiales ───
	const u0 = unitAB(A, B);
	const proj0 = (P.x - A.x) * u0.x + (P.y - A.y) * u0.y;
	const F0 = { x: A.x + proj0 * u0.x, y: A.y + proj0 * u0.y };
	const PFlen0 = Math.hypot(P.x - F0.x, P.y - F0.y);
	const dirFP0 = { x: (P.x - F0.x) / PFlen0, y: (P.y - F0.y) / PFlen0 };
	// Bord vertical de l'équerre = bord horizontal tourné de +90°.
	const w0 = { x: -dirFP0.y, y: dirFP0.x };
	const toDeg = (rad: number) => (rad * 180) / Math.PI;
	const setSquareRotation = toDeg(Math.atan2(dirFP0.y, dirFP0.x));
	const halfTrace = SEGMENT_TRACE_LENGTH_DEFAULT / 2;
	const rulerOrigin0 = {
		x: P.x + w0.x * RULER_OVERLAP_MATH_UNITS,
		y: P.y + w0.y * RULER_OVERLAP_MATH_UNITS
	};
	const rulerRotation = toDeg(Math.atan2(-w0.y, -w0.x));

	// ─── Éléments réactifs ───
	const kit = reactiveKit(figure);
	const { Px, Py, Ax, Ay, ux, uy } = reactiveFrame(kit, figure, args.ids);
	// F = A + ((P − A)·u)·u.
	const proj = kit.expr(
		(v) => (val(v, Px) - val(v, Ax)) * val(v, ux) + (val(v, Py) - val(v, Ay)) * val(v, uy),
		[Px, Py, Ax, Ay, ux, uy]
	);
	const Fx = kit.expr((v) => val(v, Ax) + val(v, proj) * val(v, ux), [Ax, proj, ux]);
	const Fy = kit.expr((v) => val(v, Ay) + val(v, proj) * val(v, uy), [Ay, proj, uy]);
	const F = figure.createComputedPoint({ scalarRef: Fx }, { scalarRef: Fy });
	figure.hideElement(F);
	// w = (F→P) unitaire tourné de +90° = −side·u, où side = côté de P par
	// rapport à (AB). Tiré de u plutôt que de F→P : exact même quand P frôle
	// (AB), et jamais nul si P est glissé sur (AB) après coup (side = 1).
	const side = kit.expr(
		(v) =>
			(val(v, Px) - val(v, Ax)) * -val(v, uy) + (val(v, Py) - val(v, Ay)) * val(v, ux) >= 0
				? 1
				: -1,
		[Px, Py, Ax, Ay, ux, uy]
	);
	const wx = kit.expr((v) => -val(v, side) * val(v, ux), [side, ux]);
	const wy = kit.expr((v) => -val(v, side) * val(v, uy), [side, uy]);
	const along = [Px, Py, wx, wy];
	const trace1End = kit.point(
		(v) => val(v, Px) + val(v, wx) * EQUERRE_VERTICAL_MATH_UNITS,
		(v) => val(v, Py) + val(v, wy) * EQUERRE_VERTICAL_MATH_UNITS,
		along
	);
	const trace2End = kit.point(
		(v) => val(v, Px) - val(v, wx) * halfTrace,
		(v) => val(v, Py) - val(v, wy) * halfTrace,
		along
	);
	const segmentTrace1 = figure.createSegment(Pid, trace1End);
	figure.hideElement(segmentTrace1);
	const segmentTrace2 = figure.createSegment(Pid, trace2End);
	figure.hideElement(segmentTrace2);
	// Marqueurs d'angle droit : en F entre (AB) et e, en P entre e et la
	// parallèle, dans le coin de l'équerre : du côté opposé à (AB), le long
	// de w tourné de −90° (= F→P unitaire, jamais nul).
	const FonAB = kit.point(
		(v) => val(v, Fx) + val(v, ux),
		(v) => val(v, Fy) + val(v, uy),
		[Fx, Fy, ux, uy]
	);
	const rightAngleAtF = figure.createAngle(FonAB, F, Pid, { marque: 'carre' });
	figure.hideElement(rightAngleAtF);
	const awayFromAB = kit.point(
		(v) => val(v, Px) + val(v, wy),
		(v) => val(v, Py) - val(v, wx),
		along
	);
	const rightAngleAtP = figure.createAngle(awayFromAB, Pid, trace1End, { marque: 'carre' });
	figure.hideElement(rightAngleAtP);

	const ownSubSteps: SubStep[] = [
		{
			kind: 'line-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [e],
			instruction: lineEInstruction(N, nE)
		},
		{
			kind: 'compass-measure',
			instrument: 'setSquare',
			instrumentTarget: { x: P.x, y: P.y, rotation: setSquareRotation },
			compassRadius: 0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `On pose l'équerre avec un bord sur ${nE}, l'angle droit ${en(N.P)}`
		},
		{
			kind: 'ruler-trace',
			instrument: 'setSquare',
			secondaryInstrument: 'pencil',
			instrumentTarget: { x: P.x, y: P.y, rotation: setSquareRotation },
			geometricDistance: EQUERRE_VERTICAL_MATH_UNITS,
			animateDrawableIds: [segmentTrace1],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "Le long de l'autre bord de l'équerre, on trace une portion de la parallèle"
		},
		{
			kind: 'compass-measure',
			instrument: 'ruler',
			instrumentTarget: { x: rulerOrigin0.x, y: rulerOrigin0.y, rotation: rulerRotation },
			compassRadius: 0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "On retire l'équerre et on pose la règle le long de la portion tracée"
		},
		{
			kind: 'ruler-trace',
			instrument: 'ruler',
			secondaryInstrument: 'pencil',
			instrumentTarget: { x: rulerOrigin0.x, y: rulerOrigin0.y, rotation: rulerRotation },
			geometricDistance: halfTrace,
			animateDrawableIds: [segmentTrace2],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `On prolonge le tracé le long de la règle : c’est la parallèle à ${nom(N.d)}`
		}
	];

	// ─── Classement ───
	const traces: string[] = [];
	const traceTags = new Map<string, TraceTag>();
	const hiddenSupport: string[] = [];
	absorbSub(perp.produced, traces, traceTags, hiddenSupport);
	traces.push(segmentTrace1, segmentTrace2, rightAngleAtF, rightAngleAtP);
	traceTags.set(segmentTrace1, 'segment-trace');
	traceTags.set(segmentTrace2, 'segment-trace');
	traceTags.set(rightAngleAtF, 'marker');
	traceTags.set(rightAngleAtP, 'marker');
	hiddenSupport.push(...helpers, ...kit.support, F, FonAB, trace1End, trace2End);

	return {
		subSteps: [...perp.subSteps, ...ownSubSteps],
		produced: {
			principal: principalId,
			charnieres: [e],
			traces,
			traceTags,
			hiddenSupport
		}
	};
}

const doublePerpendiculaireEuclide: ChoreographyFn = (ctx) =>
	buildDoublePerpendiculaireEuclide(ctx);
const doublePerpendiculaireEquerre: ChoreographyFn = (ctx) =>
	buildDoublePerpendiculaireEquerre(ctx);

export const VOIES_PARALLELE_EQUERRE: readonly Voie[] = [
	{
		id: 'pose_equerre',
		nom_humain: "Tracé à l'équerre",
		source: 'Construction directe',
		description:
			"On pose l'équerre avec son bord horizontal sur `(AB)`, le coin sur `A`. On la fait glisser perpendiculairement à `(AB)` jusqu'à ce que le bord horizontal passe par `P`. Le crayon trace une portion de la parallèle ; on remplace ensuite l'équerre par la règle pour prolonger.",
		defaut: true,
		choreography: equerreChoreography
	},
	{
		id: 'double_perpendiculaire',
		nom_humain: 'Double perpendiculaire',
		source: 'Construction classique',
		description:
			"On pose l'équerre sur `(AB)`, l'angle droit au pied de la perpendiculaire issue de `P`, et on trace la perpendiculaire `e` à `(AB)` passant par `P`. On pose ensuite l'équerre avec un bord sur `e`, l'angle droit en `P`, et on trace la perpendiculaire à `e` en `P` : c'est la parallèle à `(AB)`. La règle prolonge le tracé.",
		defaut: false,
		choreography: doublePerpendiculaireEquerre
	}
];

export const VOIES_PARALLELE_EUCLIDE: readonly Voie[] = [
	{
		id: 'parallelogramme',
		nom_humain: 'Parallélogramme d’Euclide (I.31)',
		source: 'Euclide, Éléments I.31',
		description:
			'Compas de centre `P` et rayon `|AB|` ; compas de centre `B` et rayon `|PA|`. Leur intersection `Q` forme un parallélogramme `PABQ`. La règle `P→Q` trace la parallèle.',
		defaut: true,
		choreography: parallelogrammeChoreography
	},
	{
		id: 'double_perpendiculaire',
		nom_humain: 'Double perpendiculaire',
		source: 'Variante moderne',
		description:
			'Au compas, on trace la perpendiculaire à `(AB)` passant par `P` (droite auxiliaire `e`, voie `rayon_libre`). Puis la perpendiculaire à `e` en `P` : deux petits arcs de centre `P` coupent `e` en `C*` et `D*` ; avec une ouverture plus grande, deux arcs de centres `C*` et `D*` se croisent en `R`. La droite `(PR)` est la parallèle à `(AB)`.',
		defaut: false,
		choreography: doublePerpendiculaireEuclide
	}
];
