/**
 * Choreographies for the `perpendiculaire(P, A, B)` builtin.
 *
 * Deux voies sous `@euclide` :
 *
 * ─── Voie 1 : `arcs_egaux` (alias `via_pa`) ────────────────────────────
 *
 * Construction au compas en réutilisant l'ouverture `|PA|` partout :
 *
 *   1. Mesure |PA| (compas en P, fourchette vers A).
 *   2. Petit arc en P (même ouverture) qui coupe (AB) en B' (symétrique
 *      de A par rapport au pied F de la perpendiculaire issue de P).
 *   3. Petits arcs en A puis en B' (même ouverture) qui se croisent en
 *      Q = symétrique de P par rapport à (AB).
 *   4. Règle (P, Q) trace la perpendiculaire.
 *
 * Justification : `|QA| = |QB'| = |PA|` (puisque Q = 2F − P et F = milieu
 * de [AB']) donc Q est sur les cercles de centre A et B' de rayon `|PA|`.
 *
 * Limitation : si `A` est loin de `P` (ou hors viewport), l'arc en P
 * traverse l'écran et n'est plus pédagogiquement lisible. Cas dégénéré
 * `P ∈ (AB)` : `Q = P` (arcs tangents en P).
 *
 * Sub-step layout (7 sub-steps) :
 *   SS1 — compass-measure |PA|.
 *   SS2 — compass-draw petit arc en P → B'.
 *   SS3 — point-fade-in B'.
 *   SS4 — compass-draw petit arc en A → Q.
 *   SS5 — compass-draw petit arc en B' → Q.
 *   SS6 — point-fade-in Q.
 *   SS7 — ruler-trace P→Q (line-fade-in m).
 *
 * ─── Voie 2 : `rayon_libre` (défaut) ────────────────────────────────────
 *
 * Même séquence pédagogique que `arcs_egaux` (4 petits arcs + règle), mais
 * sans dépendance à `|PA|` :
 *
 *   1. Choix d'un rayon `r = max(1.5 × d(P, (AB)), 1.5)` indépendant de la
 *      position de A sur la droite (donc viewport-safe).
 *   2. Deux petits arcs en P (un de chaque côté du pied F) qui coupent
 *      (AB) en A* et B*.
 *   3. Deux petits arcs en A* puis B*, **même ouverture `r`**, qui se
 *      croisent en Q = symétrique de P par rapport à (AB).
 *   4. Règle (P, Q) trace la perpendiculaire (on a déjà P, Q est le 2e point).
 *
 * Justification : `|PA*| = |PB*| = r` (par construction) et
 * `|QA*| = |QB*| = r` (puisque Q = 2F − P, symétrique de P), donc tous
 * les arcs partagent la même ouverture. Q est l'autre intersection des
 * cercles de centre A* et B* (l'autre étant P lui-même).
 *
 * Sub-step layout (7 sub-steps) :
 *   SS1 — compass-draw petit arc en P côté A*.
 *   SS2 — compass-draw petit arc en P côté B*.
 *   SS3 — point-fade-in A*, B*.
 *   SS4 — compass-draw petit arc en A* → Q.
 *   SS5 — compass-draw petit arc en B* → Q.
 *   SS6 — point-fade-in Q.
 *   SS7 — ruler-trace P→Q (line-fade-in m).
 */

import type { Voie, ChoreographyFn, ChoreographyResult, SubStep, ChoreographyCtx } from './types';

const SEGMENT_TRACE_LENGTH_DEFAULT = 15;
const SMALL_ARC_SWEEP_RAD = Math.PI / 6; // 30° total
const RAYON_LIBRE_MIN = 1.5;
const RAYON_LIBRE_FACTOR = 1.5;
// Équerre vertical edge length in math units. The SetSquare component
// renders at HAUTEUR = 223 SVG pixels at scale 1 ; with the executor's
// PPU = 40, that's ≈ 5.6 math units. We use a slightly smaller value
// (5) so the segment-trace stays comfortably inside the équerre.
const EQUERRE_EDGE_MATH_UNITS = 5;
// Overlap (in math units) of the ruler over the already-traced portion
// of the perpendicular, so the swap looks like "lay the ruler over the
// existing trace, then continue". Positions the ruler's origin on the
// P side of F by this amount.
const RULER_OVERLAP_MATH_UNITS = 2;

function buildArcsEgaux(ctx: ChoreographyCtx): ChoreographyResult {
	const { figure, args, principalId } = ctx;
	const [Pid, Aid, Bid] = args.ids;
	const [P, A, B] = args.coords;

	// Hide the perpendicular line — revealed by SS7 line-fade-in.
	figure.hideElement(principalId);

	// ─── Initial values (used for first-frame instrument positioning) ───
	const ABx = B.x - A.x;
	const ABy = B.y - A.y;
	const ABlen0 = Math.hypot(ABx, ABy);
	const ux0 = ABx / ABlen0;
	const uy0 = ABy / ABlen0;
	const APx = P.x - A.x;
	const APy = P.y - A.y;
	const proj0 = APx * ux0 + APy * uy0;
	const Fx0 = A.x + proj0 * ux0;
	const Fy0 = A.y + proj0 * uy0;
	// B' = 2F − A (symétrique de A par rapport à F).
	const Bpx0 = 2 * Fx0 - A.x;
	const Bpy0 = 2 * Fy0 - A.y;
	// Q = 2F − P (symétrique de P par rapport à (AB)).
	const Qx0 = 2 * Fx0 - P.x;
	const Qy0 = 2 * Fy0 - P.y;
	const r0 = Math.hypot(P.x - A.x, P.y - A.y); // |PA|

	// Directions initiales pour les petits arcs.
	const halfSweep = SMALL_ARC_SWEEP_RAD / 2;
	const angleAB_0 = Math.atan2(A.y - P.y, A.x - P.x); // direction P→A (pour la mesure)
	const angleToBp_0 = Math.atan2(Bpy0 - P.y, Bpx0 - P.x); // direction P→B'
	const angleAtoQ_0 = Math.atan2(Qy0 - A.y, Qx0 - A.x); // direction A→Q
	const angleBptoQ_0 = Math.atan2(Qy0 - Bpy0, Qx0 - Bpx0); // direction B'→Q
	const arcAtPStart_0 = angleToBp_0 - halfSweep;
	const arcAtAStart_0 = angleAtoQ_0 - halfSweep;
	const arcAtBpStart_0 = angleBptoQ_0 - halfSweep;
	const arcLengthSmall = r0 * SMALL_ARC_SWEEP_RAD;

	// Direction P→Q (= unit normal to (AB) on opposite side from P) pour
	// la règle.
	const PQx0 = Qx0 - P.x;
	const PQy0 = Qy0 - P.y;
	const PQlen0 = Math.hypot(PQx0, PQy0);
	const dirPQx0 = PQlen0 > 0 ? PQx0 / PQlen0 : 0;
	const dirPQy0 = PQlen0 > 0 ? PQy0 / PQlen0 : 1;

	// ─── Reactive scalars ───
	const Px = figure.createScalarCoordinate(Pid, 'x');
	const Py = figure.createScalarCoordinate(Pid, 'y');
	const Ax = figure.createScalarCoordinate(Aid, 'x');
	const Ay = figure.createScalarCoordinate(Aid, 'y');
	const Bx = figure.createScalarCoordinate(Bid, 'x');
	const By = figure.createScalarCoordinate(Bid, 'y');

	const dABScalar = figure.createScalarDistance(Aid, Bid);
	const dPAScalar = figure.createScalarDistance(Pid, Aid); // = r (l'ouverture commune)

	// Unit direction (AB).
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
	// Foot F = projection of P on (AB) : F = A + ((P − A)·û)·û.
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
	// B' = 2F − A.
	const BpxScalar = figure.createScalarExpression(
		(vals) => 2 * (vals.get(FxScalar) ?? 0) - (vals.get(Ax) ?? 0),
		[FxScalar, Ax]
	);
	const BpyScalar = figure.createScalarExpression(
		(vals) => 2 * (vals.get(FyScalar) ?? 0) - (vals.get(Ay) ?? 0),
		[FyScalar, Ay]
	);
	// Q = 2F − P.
	const QxScalar = figure.createScalarExpression(
		(vals) => 2 * (vals.get(FxScalar) ?? 0) - (vals.get(Px) ?? 0),
		[FxScalar, Px]
	);
	const QyScalar = figure.createScalarExpression(
		(vals) => 2 * (vals.get(FyScalar) ?? 0) - (vals.get(Py) ?? 0),
		[FyScalar, Py]
	);
	const Bprime = figure.createComputedPoint({ scalarRef: BpxScalar }, { scalarRef: BpyScalar });
	figure.hideElement(Bprime);
	const Q = figure.createComputedPoint({ scalarRef: QxScalar }, { scalarRef: QyScalar });
	figure.hideElement(Q);

	// Angles réactifs pour les 3 arcs courts.
	const angleToBpScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(BpyScalar) ?? 0) - (vals.get(Py) ?? 0),
				(vals.get(BpxScalar) ?? 0) - (vals.get(Px) ?? 0)
			),
		[Px, Py, BpxScalar, BpyScalar]
	);
	const angleAtoQScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(QyScalar) ?? 0) - (vals.get(Ay) ?? 0),
				(vals.get(QxScalar) ?? 0) - (vals.get(Ax) ?? 0)
			),
		[Ax, Ay, QxScalar, QyScalar]
	);
	const angleBptoQScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(QyScalar) ?? 0) - (vals.get(BpyScalar) ?? 0),
				(vals.get(QxScalar) ?? 0) - (vals.get(BpxScalar) ?? 0)
			),
		[BpxScalar, BpyScalar, QxScalar, QyScalar]
	);

	const arcAtPStart = figure.createScalarExpression(
		(vals) => (vals.get(angleToBpScalar) ?? 0) - halfSweep,
		[angleToBpScalar]
	);
	const arcAtPEnd = figure.createScalarExpression(
		(vals) => (vals.get(angleToBpScalar) ?? 0) + halfSweep,
		[angleToBpScalar]
	);
	const arcAtAStart = figure.createScalarExpression(
		(vals) => (vals.get(angleAtoQScalar) ?? 0) - halfSweep,
		[angleAtoQScalar]
	);
	const arcAtAEnd = figure.createScalarExpression(
		(vals) => (vals.get(angleAtoQScalar) ?? 0) + halfSweep,
		[angleAtoQScalar]
	);
	const arcAtBpStart = figure.createScalarExpression(
		(vals) => (vals.get(angleBptoQScalar) ?? 0) - halfSweep,
		[angleBptoQScalar]
	);
	const arcAtBpEnd = figure.createScalarExpression(
		(vals) => (vals.get(angleBptoQScalar) ?? 0) + halfSweep,
		[angleBptoQScalar]
	);

	// Création des 3 arcs (radius commun = |PA|).
	const arcAtP = figure.createArcByAngles(
		Pid,
		{ scalarRef: dPAScalar },
		{ scalarRef: arcAtPStart },
		{ scalarRef: arcAtPEnd }
	);
	figure.hideElement(arcAtP);
	const arcAtA = figure.createArcByAngles(
		Aid,
		{ scalarRef: dPAScalar },
		{ scalarRef: arcAtAStart },
		{ scalarRef: arcAtAEnd }
	);
	figure.hideElement(arcAtA);
	const arcAtBp = figure.createArcByAngles(
		Bprime,
		{ scalarRef: dPAScalar },
		{ scalarRef: arcAtBpStart },
		{ scalarRef: arcAtBpEnd }
	);
	figure.hideElement(arcAtBp);

	// ─── Segment-trace : centré sur le midpoint de [PQ], orienté PQ ───
	const PQxScalar = figure.createScalarExpression(
		(vals) => (vals.get(QxScalar) ?? 0) - (vals.get(Px) ?? 0),
		[Px, QxScalar]
	);
	const PQyScalar = figure.createScalarExpression(
		(vals) => (vals.get(QyScalar) ?? 0) - (vals.get(Py) ?? 0),
		[Py, QyScalar]
	);
	const PQlenScalar = figure.createScalarExpression(
		(vals) => Math.hypot(vals.get(PQxScalar) ?? 0, vals.get(PQyScalar) ?? 0),
		[PQxScalar, PQyScalar]
	);
	const dirPQxScalar = figure.createScalarExpression(
		(vals) => {
			const len = Math.max(vals.get(PQlenScalar) ?? 1, 1e-12);
			return (vals.get(PQxScalar) ?? 0) / len;
		},
		[PQxScalar, PQlenScalar]
	);
	const dirPQyScalar = figure.createScalarExpression(
		(vals) => {
			const len = Math.max(vals.get(PQlenScalar) ?? 1, 1e-12);
			return (vals.get(PQyScalar) ?? 0) / len;
		},
		[PQyScalar, PQlenScalar]
	);
	const halfTraceScalar = figure.createScalarExpression(
		(vals) => Math.max(SEGMENT_TRACE_LENGTH_DEFAULT / 2, (vals.get(PQlenScalar) ?? 0) * 1.2),
		[PQlenScalar]
	);
	// Midpoint of [PQ] = F (foot of perp) by construction. We center the
	// trace on F for symmetry.
	const Iext1xScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(FxScalar) ?? 0) - (vals.get(dirPQxScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[FxScalar, dirPQxScalar, halfTraceScalar]
	);
	const Iext1yScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(FyScalar) ?? 0) - (vals.get(dirPQyScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[FyScalar, dirPQyScalar, halfTraceScalar]
	);
	const Iext2xScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(FxScalar) ?? 0) + (vals.get(dirPQxScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[FxScalar, dirPQxScalar, halfTraceScalar]
	);
	const Iext2yScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(FyScalar) ?? 0) + (vals.get(dirPQyScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[FyScalar, dirPQyScalar, halfTraceScalar]
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

	// Initial values for SS7 ruler positioning.
	const traceLen0 = 2 * Math.max(SEGMENT_TRACE_LENGTH_DEFAULT / 2, PQlen0 * 1.2);
	const halfTrace0 = traceLen0 / 2;
	const Iext1X0 = Fx0 - dirPQx0 * halfTrace0;
	const Iext1Y0 = Fy0 - dirPQy0 * halfTrace0;
	const segRotationDeg0 = (Math.atan2(dirPQy0, dirPQx0) * 180) / Math.PI;

	// ─── Sub-steps ───
	const subSteps: SubStep[] = [
		// SS1 : mesure |PA|.
		{
			kind: 'compass-measure',
			instrument: 'compass',
			instrumentTarget: { x: P.x, y: P.y, rotation: (angleAB_0 * 180) / Math.PI },
			compassRadius: r0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'Compas en P, on prend la mesure |PA|'
		},
		// SS2 : petit arc en P (même ouverture) qui coupe (AB) en B'.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: P.x, y: P.y, rotation: (arcAtPStart_0 * 180) / Math.PI },
			compassRadius: r0,
			geometricDistance: arcLengthSmall,
			animateDrawableIds: [arcAtP],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "On trace un petit arc qui coupe (AB) en B'"
		},
		// SS3 : B' fade-in.
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [Bprime],
			animateLineIds: [],
			instruction: "B' apparaît : un autre point de (AB), équidistant de P comme A"
		},
		// SS4 : compass à A, petit arc orienté vers Q (même ouverture |PA|).
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: A.x, y: A.y, rotation: (arcAtAStart_0 * 180) / Math.PI },
			compassRadius: r0,
			geometricDistance: arcLengthSmall,
			animateDrawableIds: [arcAtA],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'On reporte cette ouverture en A et on trace un petit arc'
		},
		// SS5 : compass à B', petit arc orienté vers Q (même ouverture |PA|).
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: Bpx0, y: Bpy0, rotation: (arcAtBpStart_0 * 180) / Math.PI },
			compassRadius: r0,
			geometricDistance: arcLengthSmall,
			animateDrawableIds: [arcAtBp],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "On reporte en B' : les deux petits arcs se croisent"
		},
		// SS6 : Q fade-in.
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [Q],
			animateLineIds: [],
			instruction: 'Les arcs se croisent en Q (symétrique de P par rapport à (AB))'
		},
		// SS7 : ruler trace de la perpendiculaire (P, Q).
		{
			kind: 'ruler-trace',
			instrument: 'ruler',
			secondaryInstrument: 'pencil',
			instrumentTarget: { x: Iext1X0, y: Iext1Y0, rotation: segRotationDeg0 },
			geometricDistance: traceLen0,
			animateDrawableIds: [segmentTrace],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'Règle par P et Q : on trace la perpendiculaire'
		}
	];

	return {
		subSteps,
		produced: {
			principal: principalId,
			// Q est utile pédagogiquement à voir en @squelette (= charnière qui
			// définit la perpendiculaire avec P).
			charnieres: [Q],
			// B' est un point de construction, les 3 petits arcs sont les
			// gestes au compas. Visibles en @complet.
			traces: [arcAtP, arcAtA, arcAtBp, Bprime],
			hiddenSupport: [
				// Animation-only.
				segmentTrace,
				Iext1,
				Iext2,
				// Reactive scalars (tous).
				Px,
				Py,
				Ax,
				Ay,
				Bx,
				By,
				dABScalar,
				dPAScalar,
				uxScalar,
				uyScalar,
				projScalar,
				FxScalar,
				FyScalar,
				BpxScalar,
				BpyScalar,
				QxScalar,
				QyScalar,
				angleToBpScalar,
				angleAtoQScalar,
				angleBptoQScalar,
				arcAtPStart,
				arcAtPEnd,
				arcAtAStart,
				arcAtAEnd,
				arcAtBpStart,
				arcAtBpEnd,
				PQxScalar,
				PQyScalar,
				PQlenScalar,
				dirPQxScalar,
				dirPQyScalar,
				halfTraceScalar,
				Iext1xScalar,
				Iext1yScalar,
				Iext2xScalar,
				Iext2yScalar
			]
		}
	};
}

function buildRayonLibre(ctx: ChoreographyCtx): ChoreographyResult {
	const { figure, args, principalId } = ctx;
	const [Pid, Aid, Bid] = args.ids;
	const [P, A, B] = args.coords;

	// Hide the perpendicular line — revealed by SS7 ruler-trace.
	figure.hideElement(principalId);

	// ─── Initial values (used for first-frame instrument positioning) ───
	const ABx = B.x - A.x;
	const ABy = B.y - A.y;
	const ABlen0 = Math.hypot(ABx, ABy);
	const ux0 = ABx / ABlen0;
	const uy0 = ABy / ABlen0;
	// n = (−uy, ux). dPerp = (A − P) · n.
	const dPerp0 = -(A.x - P.x) * uy0 + (A.y - P.y) * ux0;
	const r0 = Math.max(Math.abs(dPerp0) * RAYON_LIBRE_FACTOR, RAYON_LIBRE_MIN);
	const Fx0 = P.x - dPerp0 * uy0;
	const Fy0 = P.y + dPerp0 * ux0;
	const halfChord0 = Math.sqrt(Math.max(r0 * r0 - dPerp0 * dPerp0, 1e-12));
	// A* = F + halfChord × u ; B* = F − halfChord × u.
	const Astar0x = Fx0 + halfChord0 * ux0;
	const Astar0y = Fy0 + halfChord0 * uy0;
	const Bstar0x = Fx0 - halfChord0 * ux0;
	const Bstar0y = Fy0 - halfChord0 * uy0;
	// Q = 2F − P (symétrique de P par rapport à (AB)).
	const Qx0 = 2 * Fx0 - P.x;
	const Qy0 = 2 * Fy0 - P.y;

	// Directions initiales pour les 4 petits arcs.
	const halfSweep = SMALL_ARC_SWEEP_RAD / 2;
	const angleToAstar_0 = Math.atan2(Astar0y - P.y, Astar0x - P.x);
	const angleToBstar_0 = Math.atan2(Bstar0y - P.y, Bstar0x - P.x);
	const angleAstarToQ_0 = Math.atan2(Qy0 - Astar0y, Qx0 - Astar0x);
	const angleBstarToQ_0 = Math.atan2(Qy0 - Bstar0y, Qx0 - Bstar0x);
	const arcAtPtoAstarStart_0 = angleToAstar_0 - halfSweep;
	const arcAtPtoBstarStart_0 = angleToBstar_0 - halfSweep;
	const arcAtAstarStart_0 = angleAstarToQ_0 - halfSweep;
	const arcAtBstarStart_0 = angleBstarToQ_0 - halfSweep;
	const arcLengthSmall = r0 * SMALL_ARC_SWEEP_RAD;

	// Direction P→Q (pour la règle).
	const PQx0 = Qx0 - P.x;
	const PQy0 = Qy0 - P.y;
	const PQlen0 = Math.hypot(PQx0, PQy0);
	const dirPQx0 = PQlen0 > 0 ? PQx0 / PQlen0 : 0;
	const dirPQy0 = PQlen0 > 0 ? PQy0 / PQlen0 : 1;

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
	// Signed perpendicular distance from P to (AB) : (A − P) · n where
	// n = (−uy, ux).
	const dPerpScalar = figure.createScalarExpression(
		(vals) =>
			-((vals.get(Ax) ?? 0) - (vals.get(Px) ?? 0)) * (vals.get(uyScalar) ?? 0) +
			((vals.get(Ay) ?? 0) - (vals.get(Py) ?? 0)) * (vals.get(uxScalar) ?? 0),
		[Ax, Ay, Px, Py, uxScalar, uyScalar]
	);
	// Viewport-safe radius : r = max(|dPerp| × factor, min). Independent
	// de la position de A sur la droite (AB).
	const rScalar = figure.createScalarExpression(
		(vals) => Math.max(Math.abs(vals.get(dPerpScalar) ?? 0) * RAYON_LIBRE_FACTOR, RAYON_LIBRE_MIN),
		[dPerpScalar]
	);
	// Foot F = P + dPerp × n.
	const FxScalar = figure.createScalarExpression(
		(vals) => (vals.get(Px) ?? 0) - (vals.get(dPerpScalar) ?? 0) * (vals.get(uyScalar) ?? 0),
		[Px, dPerpScalar, uyScalar]
	);
	const FyScalar = figure.createScalarExpression(
		(vals) => (vals.get(Py) ?? 0) + (vals.get(dPerpScalar) ?? 0) * (vals.get(uxScalar) ?? 0),
		[Py, dPerpScalar, uxScalar]
	);
	// halfChord = √(r² − dPerp²).
	const halfChordScalar = figure.createScalarExpression(
		(vals) => {
			const r = vals.get(rScalar) ?? 1;
			const d = vals.get(dPerpScalar) ?? 0;
			return Math.sqrt(Math.max(r * r - d * d, 1e-12));
		},
		[rScalar, dPerpScalar]
	);
	// A* = F + halfChord × u.
	const AstarX = figure.createScalarExpression(
		(vals) =>
			(vals.get(FxScalar) ?? 0) + (vals.get(halfChordScalar) ?? 0) * (vals.get(uxScalar) ?? 0),
		[FxScalar, halfChordScalar, uxScalar]
	);
	const AstarY = figure.createScalarExpression(
		(vals) =>
			(vals.get(FyScalar) ?? 0) + (vals.get(halfChordScalar) ?? 0) * (vals.get(uyScalar) ?? 0),
		[FyScalar, halfChordScalar, uyScalar]
	);
	// B* = F − halfChord × u.
	const BstarX = figure.createScalarExpression(
		(vals) =>
			(vals.get(FxScalar) ?? 0) - (vals.get(halfChordScalar) ?? 0) * (vals.get(uxScalar) ?? 0),
		[FxScalar, halfChordScalar, uxScalar]
	);
	const BstarY = figure.createScalarExpression(
		(vals) =>
			(vals.get(FyScalar) ?? 0) - (vals.get(halfChordScalar) ?? 0) * (vals.get(uyScalar) ?? 0),
		[FyScalar, halfChordScalar, uyScalar]
	);
	// Q = 2F − P.
	const QxScalar = figure.createScalarExpression(
		(vals) => 2 * (vals.get(FxScalar) ?? 0) - (vals.get(Px) ?? 0),
		[FxScalar, Px]
	);
	const QyScalar = figure.createScalarExpression(
		(vals) => 2 * (vals.get(FyScalar) ?? 0) - (vals.get(Py) ?? 0),
		[FyScalar, Py]
	);

	const Astar = figure.createComputedPoint({ scalarRef: AstarX }, { scalarRef: AstarY });
	figure.hideElement(Astar);
	const Bstar = figure.createComputedPoint({ scalarRef: BstarX }, { scalarRef: BstarY });
	figure.hideElement(Bstar);
	const Q = figure.createComputedPoint({ scalarRef: QxScalar }, { scalarRef: QyScalar });
	figure.hideElement(Q);

	// Reactive angles for the 4 small arcs.
	const angleToAstarScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(AstarY) ?? 0) - (vals.get(Py) ?? 0),
				(vals.get(AstarX) ?? 0) - (vals.get(Px) ?? 0)
			),
		[AstarY, Py, AstarX, Px]
	);
	const angleToBstarScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(BstarY) ?? 0) - (vals.get(Py) ?? 0),
				(vals.get(BstarX) ?? 0) - (vals.get(Px) ?? 0)
			),
		[BstarY, Py, BstarX, Px]
	);
	const angleAstarToQScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(QyScalar) ?? 0) - (vals.get(AstarY) ?? 0),
				(vals.get(QxScalar) ?? 0) - (vals.get(AstarX) ?? 0)
			),
		[QyScalar, AstarY, QxScalar, AstarX]
	);
	const angleBstarToQScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(QyScalar) ?? 0) - (vals.get(BstarY) ?? 0),
				(vals.get(QxScalar) ?? 0) - (vals.get(BstarX) ?? 0)
			),
		[QyScalar, BstarY, QxScalar, BstarX]
	);
	const arcAtPtoAstarStart = figure.createScalarExpression(
		(vals) => (vals.get(angleToAstarScalar) ?? 0) - halfSweep,
		[angleToAstarScalar]
	);
	const arcAtPtoAstarEnd = figure.createScalarExpression(
		(vals) => (vals.get(angleToAstarScalar) ?? 0) + halfSweep,
		[angleToAstarScalar]
	);
	const arcAtPtoBstarStart = figure.createScalarExpression(
		(vals) => (vals.get(angleToBstarScalar) ?? 0) - halfSweep,
		[angleToBstarScalar]
	);
	const arcAtPtoBstarEnd = figure.createScalarExpression(
		(vals) => (vals.get(angleToBstarScalar) ?? 0) + halfSweep,
		[angleToBstarScalar]
	);
	const arcAtAstarStart = figure.createScalarExpression(
		(vals) => (vals.get(angleAstarToQScalar) ?? 0) - halfSweep,
		[angleAstarToQScalar]
	);
	const arcAtAstarEnd = figure.createScalarExpression(
		(vals) => (vals.get(angleAstarToQScalar) ?? 0) + halfSweep,
		[angleAstarToQScalar]
	);
	const arcAtBstarStart = figure.createScalarExpression(
		(vals) => (vals.get(angleBstarToQScalar) ?? 0) - halfSweep,
		[angleBstarToQScalar]
	);
	const arcAtBstarEnd = figure.createScalarExpression(
		(vals) => (vals.get(angleBstarToQScalar) ?? 0) + halfSweep,
		[angleBstarToQScalar]
	);

	// Création des 4 arcs (radius commun = r, viewport-safe).
	const arcAtPtoAstar = figure.createArcByAngles(
		Pid,
		{ scalarRef: rScalar },
		{ scalarRef: arcAtPtoAstarStart },
		{ scalarRef: arcAtPtoAstarEnd }
	);
	figure.hideElement(arcAtPtoAstar);
	const arcAtPtoBstar = figure.createArcByAngles(
		Pid,
		{ scalarRef: rScalar },
		{ scalarRef: arcAtPtoBstarStart },
		{ scalarRef: arcAtPtoBstarEnd }
	);
	figure.hideElement(arcAtPtoBstar);
	const arcAtAstar = figure.createArcByAngles(
		Astar,
		{ scalarRef: rScalar },
		{ scalarRef: arcAtAstarStart },
		{ scalarRef: arcAtAstarEnd }
	);
	figure.hideElement(arcAtAstar);
	const arcAtBstar = figure.createArcByAngles(
		Bstar,
		{ scalarRef: rScalar },
		{ scalarRef: arcAtBstarStart },
		{ scalarRef: arcAtBstarEnd }
	);
	figure.hideElement(arcAtBstar);

	// ─── Segment-trace P→Q (centré sur F, orienté PQ) ───
	const PQxScalar = figure.createScalarExpression(
		(vals) => (vals.get(QxScalar) ?? 0) - (vals.get(Px) ?? 0),
		[Px, QxScalar]
	);
	const PQyScalar = figure.createScalarExpression(
		(vals) => (vals.get(QyScalar) ?? 0) - (vals.get(Py) ?? 0),
		[Py, QyScalar]
	);
	const PQlenScalar = figure.createScalarExpression(
		(vals) => Math.hypot(vals.get(PQxScalar) ?? 0, vals.get(PQyScalar) ?? 0),
		[PQxScalar, PQyScalar]
	);
	const dirPQxScalar = figure.createScalarExpression(
		(vals) => {
			const len = Math.max(vals.get(PQlenScalar) ?? 1, 1e-12);
			return (vals.get(PQxScalar) ?? 0) / len;
		},
		[PQxScalar, PQlenScalar]
	);
	const dirPQyScalar = figure.createScalarExpression(
		(vals) => {
			const len = Math.max(vals.get(PQlenScalar) ?? 1, 1e-12);
			return (vals.get(PQyScalar) ?? 0) / len;
		},
		[PQyScalar, PQlenScalar]
	);
	const halfTraceScalar = figure.createScalarExpression(
		(vals) => Math.max(SEGMENT_TRACE_LENGTH_DEFAULT / 2, (vals.get(PQlenScalar) ?? 0) * 1.2),
		[PQlenScalar]
	);
	const Iext1xScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(FxScalar) ?? 0) - (vals.get(dirPQxScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[FxScalar, dirPQxScalar, halfTraceScalar]
	);
	const Iext1yScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(FyScalar) ?? 0) - (vals.get(dirPQyScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[FyScalar, dirPQyScalar, halfTraceScalar]
	);
	const Iext2xScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(FxScalar) ?? 0) + (vals.get(dirPQxScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[FxScalar, dirPQxScalar, halfTraceScalar]
	);
	const Iext2yScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(FyScalar) ?? 0) + (vals.get(dirPQyScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[FyScalar, dirPQyScalar, halfTraceScalar]
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

	const traceLen0 = 2 * Math.max(SEGMENT_TRACE_LENGTH_DEFAULT / 2, PQlen0 * 1.2);
	const halfTrace0 = traceLen0 / 2;
	const Iext1X0 = Fx0 - dirPQx0 * halfTrace0;
	const Iext1Y0 = Fy0 - dirPQy0 * halfTrace0;
	const segRotationDeg0 = (Math.atan2(dirPQy0, dirPQx0) * 180) / Math.PI;

	// ─── Sub-steps ───
	const subSteps: SubStep[] = [
		// SS1 : petit arc en P côté A*.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: P.x, y: P.y, rotation: (arcAtPtoAstarStart_0 * 180) / Math.PI },
			compassRadius: r0,
			geometricDistance: arcLengthSmall,
			animateDrawableIds: [arcAtPtoAstar],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'Compas en P, on trace un petit arc qui coupe (AB) en A*'
		},
		// SS2 : petit arc en P côté B*.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: P.x, y: P.y, rotation: (arcAtPtoBstarStart_0 * 180) / Math.PI },
			compassRadius: r0,
			geometricDistance: arcLengthSmall,
			animateDrawableIds: [arcAtPtoBstar],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'Même ouverture, second petit arc qui coupe (AB) en B*'
		},
		// SS3 : A* et B* apparaissent.
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [Astar, Bstar],
			animateLineIds: [],
			instruction: 'A* et B* apparaissent (équidistants de P)'
		},
		// SS4 : petit arc en A* (même ouverture) vers Q.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: Astar0x, y: Astar0y, rotation: (arcAtAstarStart_0 * 180) / Math.PI },
			compassRadius: r0,
			geometricDistance: arcLengthSmall,
			animateDrawableIds: [arcAtAstar],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'On reporte la même ouverture en A* et on trace un petit arc'
		},
		// SS5 : petit arc en B* vers Q.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: Bstar0x, y: Bstar0y, rotation: (arcAtBstarStart_0 * 180) / Math.PI },
			compassRadius: r0,
			geometricDistance: arcLengthSmall,
			animateDrawableIds: [arcAtBstar],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'On reporte en B* : les deux petits arcs se croisent'
		},
		// SS6 : Q fade-in.
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [Q],
			animateLineIds: [],
			instruction: 'Les arcs se croisent en Q (symétrique de P par rapport à (AB))'
		},
		// SS7 : règle P→Q.
		{
			kind: 'ruler-trace',
			instrument: 'ruler',
			secondaryInstrument: 'pencil',
			instrumentTarget: { x: Iext1X0, y: Iext1Y0, rotation: segRotationDeg0 },
			geometricDistance: traceLen0,
			animateDrawableIds: [segmentTrace],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'Règle par P et Q : on trace la perpendiculaire'
		}
	];

	return {
		subSteps,
		produced: {
			principal: principalId,
			// Q est utile en @squelette (charnière qui définit la perpendiculaire avec P).
			charnieres: [Q],
			// Les 4 petits arcs + A* + B* sont les gestes au compas, visibles en @complet.
			traces: [arcAtPtoAstar, arcAtPtoBstar, arcAtAstar, arcAtBstar, Astar, Bstar],
			hiddenSupport: [
				// Animation-only.
				segmentTrace,
				Iext1,
				Iext2,
				// Reactive scalars.
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
				rScalar,
				FxScalar,
				FyScalar,
				halfChordScalar,
				AstarX,
				AstarY,
				BstarX,
				BstarY,
				QxScalar,
				QyScalar,
				angleToAstarScalar,
				angleToBstarScalar,
				angleAstarToQScalar,
				angleBstarToQScalar,
				arcAtPtoAstarStart,
				arcAtPtoAstarEnd,
				arcAtPtoBstarStart,
				arcAtPtoBstarEnd,
				arcAtAstarStart,
				arcAtAstarEnd,
				arcAtBstarStart,
				arcAtBstarEnd,
				PQxScalar,
				PQyScalar,
				PQlenScalar,
				dirPQxScalar,
				dirPQyScalar,
				halfTraceScalar,
				Iext1xScalar,
				Iext1yScalar,
				Iext2xScalar,
				Iext2yScalar
			]
		}
	};
}

/**
 * Voie sous `@equerre` : tracé direct à l'équerre puis prolongement
 * à la règle.
 *
 * Décomposée en cinq temps :
 *   SS1 — pose : l'équerre arrive avec son bord horizontal sur (AB),
 *         coin sur A.
 *   SS2 — glissement : l'équerre glisse le long de (AB) jusqu'à F
 *         (projection de P sur (AB)), bord vertical passant par P.
 *   SS3 — tracé inside : le crayon trace la portion de la perpendiculaire
 *         qui rentre dans la hauteur du bord vertical de l'équerre
 *         (longueur = `EQUERRE_EDGE_MATH_UNITS`).
 *   SS4 — swap : on retire l'équerre, on pose la règle alignée sur
 *         la portion tracée (rotation = direction F→Iext1 = − F→P).
 *   SS5 — prolongement : le crayon prolonge la perpendiculaire le long
 *         de la règle, du côté opposé à P (F → Iext1). La ligne
 *         complète est ensuite révélée par `applyFinalVisibility`.
 *
 * Positionnement de l'équerre :
 * - Coin (origine locale) = A (SS1) puis F (SS2 et SS3).
 * - Rotation = angle de u_AB si P est du côté `n_ccw` de (AB), sinon
 *   `angle(u_AB) + 180°` pour que le bord vertical de l'équerre pointe
 *   vers P (l'équerre n'a pas de flip horizontal).
 */
function buildEquerre(ctx: ChoreographyCtx): ChoreographyResult {
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
	// n_ccw = (-uy, ux). dPerp = (A − P) · n_ccw.
	const dPerp0 = -(A.x - P.x) * uy0 + (A.y - P.y) * ux0;
	const Fx0 = P.x - dPerp0 * uy0;
	const Fy0 = P.y + dPerp0 * ux0;
	const uAngleDeg = (Math.atan2(uy0, ux0) * 180) / Math.PI;
	// Si dPerp > 0, P est du côté CW de u_AB ; flip 180° pour orienter le
	// bord vertical de l'équerre vers P.
	const setSquareRotation = dPerp0 > 0 ? uAngleDeg + 180 : uAngleDeg;
	// Direction F→P (utilisée pour positionner la règle et les segment-traces).
	const PFx = P.x - Fx0;
	const PFy = P.y - Fy0;
	const PFlen0 = Math.hypot(PFx, PFy);
	const dirFPx0 = PFlen0 > 1e-12 ? PFx / PFlen0 : -uy0;
	const dirFPy0 = PFlen0 > 1e-12 ? PFy / PFlen0 : ux0;

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
	const FxScalar = figure.createScalarExpression(
		(vals) => (vals.get(Px) ?? 0) - (vals.get(dPerpScalar) ?? 0) * (vals.get(uyScalar) ?? 0),
		[Px, dPerpScalar, uyScalar]
	);
	const FyScalar = figure.createScalarExpression(
		(vals) => (vals.get(Py) ?? 0) + (vals.get(dPerpScalar) ?? 0) * (vals.get(uxScalar) ?? 0),
		[Py, dPerpScalar, uxScalar]
	);
	// F as a computed point — exposed as charnière (pied de la perpendiculaire).
	const F = figure.createComputedPoint({ scalarRef: FxScalar }, { scalarRef: FyScalar });
	figure.hideElement(F);

	// Direction F→P pour le segment-trace.
	const PFxScalar = figure.createScalarExpression(
		(vals) => (vals.get(Px) ?? 0) - (vals.get(FxScalar) ?? 0),
		[Px, FxScalar]
	);
	const PFyScalar = figure.createScalarExpression(
		(vals) => (vals.get(Py) ?? 0) - (vals.get(FyScalar) ?? 0),
		[Py, FyScalar]
	);
	const PFlenScalar = figure.createScalarExpression(
		(vals) => Math.hypot(vals.get(PFxScalar) ?? 0, vals.get(PFyScalar) ?? 0),
		[PFxScalar, PFyScalar]
	);
	const dirFPxScalar = figure.createScalarExpression(
		(vals) => {
			const len = vals.get(PFlenScalar) ?? 0;
			return len > 1e-12 ? (vals.get(PFxScalar) ?? 0) / len : -(vals.get(uyScalar) ?? 0);
		},
		[PFxScalar, PFlenScalar, uyScalar]
	);
	const dirFPyScalar = figure.createScalarExpression(
		(vals) => {
			const len = vals.get(PFlenScalar) ?? 0;
			return len > 1e-12 ? (vals.get(PFyScalar) ?? 0) / len : (vals.get(uxScalar) ?? 0);
		},
		[PFyScalar, PFlenScalar, uxScalar]
	);
	const halfTraceScalar = figure.createScalarExpression(
		(vals) =>
			Math.max(SEGMENT_TRACE_LENGTH_DEFAULT / 2, Math.abs(vals.get(dPerpScalar) ?? 0) * 1.2),
		[dPerpScalar]
	);
	// ─── Segment-trace 1 : portion inside the équerre (F → top of vertical edge) ───
	// Length matches the équerre's vertical edge in math coords. The
	// constant `EQUERRE_EDGE_MATH_UNITS` is calibrated for the executor's
	// PPU = 40 (équerre vertical edge = 223 SVG px ≈ 5.6 math units).
	const trace1EndxScalar = figure.createScalarExpression(
		(vals) => (vals.get(FxScalar) ?? 0) + (vals.get(dirFPxScalar) ?? 0) * EQUERRE_EDGE_MATH_UNITS,
		[FxScalar, dirFPxScalar]
	);
	const trace1EndyScalar = figure.createScalarExpression(
		(vals) => (vals.get(FyScalar) ?? 0) + (vals.get(dirFPyScalar) ?? 0) * EQUERRE_EDGE_MATH_UNITS,
		[FyScalar, dirFPyScalar]
	);
	const trace1End = figure.createComputedPoint(
		{ scalarRef: trace1EndxScalar },
		{ scalarRef: trace1EndyScalar }
	);
	figure.hideElement(trace1End);
	const segmentTrace1 = figure.createSegment(F, trace1End);
	figure.hideElement(segmentTrace1);

	// ─── Segment-trace 2 : backward extension F → Iext1 (drawn by ruler in SS5) ───
	const Iext1xScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(FxScalar) ?? 0) - (vals.get(dirFPxScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[FxScalar, dirFPxScalar, halfTraceScalar]
	);
	const Iext1yScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(FyScalar) ?? 0) - (vals.get(dirFPyScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[FyScalar, dirFPyScalar, halfTraceScalar]
	);
	const Iext1 = figure.createComputedPoint(
		{ scalarRef: Iext1xScalar },
		{ scalarRef: Iext1yScalar }
	);
	figure.hideElement(Iext1);
	const segmentTrace2 = figure.createSegment(F, Iext1);
	figure.hideElement(segmentTrace2);

	// Initial geometric distances (used by executor for animation timing).
	const trace1Len0 = EQUERRE_EDGE_MATH_UNITS;
	const trace2Len0 = Math.max(SEGMENT_TRACE_LENGTH_DEFAULT / 2, Math.abs(dPerp0) * 1.2);
	// Ruler position for SS4/SS5 : origin offset from F toward P by
	// RULER_OVERLAP so the ruler covers (slightly) the portion already
	// traced by the équerre. The ruler extends from this origin toward
	// Iext1 (opposite side from P).
	const rulerOriginX0 = Fx0 + dirFPx0 * RULER_OVERLAP_MATH_UNITS;
	const rulerOriginY0 = Fy0 + dirFPy0 * RULER_OVERLAP_MATH_UNITS;
	const rulerRotationDeg = (Math.atan2(-dirFPy0, -dirFPx0) * 180) / Math.PI;

	// ─── Sub-steps ───
	// Kind `compass-measure` = move + pause sans tracé (sémantique
	// générique « instrument se positionne »). Utilisé pour SS1, SS2, SS4
	// (pose + glissement + swap équerre → règle).
	const subSteps: SubStep[] = [
		// SS1 : pose de l'équerre — coin sur A, bord aligné avec (AB),
		// bord vertical déjà orienté vers le côté de P. À ce stade le
		// bord vertical ne passe pas (encore) par P.
		{
			kind: 'compass-measure',
			instrument: 'setSquare',
			instrumentTarget: { x: A.x, y: A.y, rotation: setSquareRotation },
			compassRadius: 0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "On pose l'équerre avec son bord sur (AB), le coin sur A"
		},
		// SS2 : glissement de l'équerre le long de (AB) jusqu'à F, pour
		// que le bord vertical passe par P. La rotation reste inchangée.
		{
			kind: 'compass-measure',
			instrument: 'setSquare',
			instrumentTarget: { x: Fx0, y: Fy0, rotation: setSquareRotation },
			compassRadius: 0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction:
				"On fait glisser l'équerre le long de (AB) jusqu'à ce que le bord vertical passe par P"
		},
		// SS3 : crayon trace la portion DANS l'équerre (longueur = bord
		// vertical, ne déborde pas).
		{
			kind: 'ruler-trace',
			instrument: 'setSquare',
			secondaryInstrument: 'pencil',
			instrumentTarget: { x: Fx0, y: Fy0, rotation: setSquareRotation },
			geometricDistance: trace1Len0,
			animateDrawableIds: [segmentTrace1],
			animatePointIds: [],
			animateLineIds: [],
			instruction:
				"Le long du bord vertical de l'équerre, on trace une portion de la perpendiculaire"
		},
		// SS4 : on enlève l'équerre, on la remplace par la règle alignée
		// sur la perpendiculaire (origine décalée de RULER_OVERLAP unités
		// vers P pour que la règle chevauche un peu la portion déjà
		// tracée, comme un vrai geste de remplacement d'instrument).
		// `hideAutoInstruments()` au début du sub-step cache setSquare
		// (qui était dans `_autoInstruments` de SS3). La règle prend sa
		// place.
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
		// SS5 : crayon prolonge la perpendiculaire (côté opposé à P) le
		// long de la règle. `applyFinalVisibility` révèle ensuite la
		// ligne complète qui couvre l'éventuelle extension manquante.
		{
			kind: 'ruler-trace',
			instrument: 'ruler',
			secondaryInstrument: 'pencil',
			instrumentTarget: { x: rulerOriginX0, y: rulerOriginY0, rotation: rulerRotationDeg },
			geometricDistance: trace2Len0,
			animateDrawableIds: [segmentTrace2],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'On prolonge le tracé le long de la règle pour compléter la perpendiculaire'
		}
	];

	return {
		subSteps,
		produced: {
			principal: principalId,
			// F = pied de la perpendiculaire (visible en @squelette).
			charnieres: [F],
			// Les deux portions tracées (visibles en @complet).
			traces: [segmentTrace1, segmentTrace2],
			hiddenSupport: [
				trace1End,
				Iext1,
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
				FxScalar,
				FyScalar,
				PFxScalar,
				PFyScalar,
				PFlenScalar,
				dirFPxScalar,
				dirFPyScalar,
				halfTraceScalar,
				trace1EndxScalar,
				trace1EndyScalar,
				Iext1xScalar,
				Iext1yScalar
			]
		}
	};
}

const arcsEgauxChoreography: ChoreographyFn = (ctx) => buildArcsEgaux(ctx);
const rayonLibreChoreography: ChoreographyFn = (ctx) => buildRayonLibre(ctx);
const equerreChoreography: ChoreographyFn = (ctx) => buildEquerre(ctx);

export const VOIES_PERPENDICULAIRE_EQUERRE: readonly Voie[] = [
	{
		id: 'pose_equerre',
		nom_humain: "Tracé à l'équerre",
		source: 'Construction directe',
		description:
			"On pose l'équerre avec son bord sur `(AB)`, le sommet de l'angle droit positionné au pied de la perpendiculaire issue de `P`. Le crayon trace ensuite la perpendiculaire le long du bord vertical de l'équerre.",
		defaut: true,
		choreography: equerreChoreography
	}
];

export const VOIES_PERPENDICULAIRE_EUCLIDE: readonly Voie[] = [
	{
		id: 'rayon_libre',
		nom_humain: 'Rayon libre (viewport-safe)',
		source: 'Construction canonique',
		description:
			'Le compas en `P` choisit un rayon `r` calé sur la distance de `P` à `(AB)` (indépendant de la position de `A` sur la droite). Deux petits arcs en `P` coupent `(AB)` en `A*` et `B*`. La même ouverture reportée en `A*` puis en `B*` produit deux arcs qui se croisent en `Q`, symétrique de `P` par rapport à `(AB)`. La droite `(PQ)` est la perpendiculaire à `(AB)` passant par `P`. Cette voie reste lisible quand `A` est loin du pied de la perpendiculaire.',
		defaut: true,
		choreography: rayonLibreChoreography
	},
	{
		id: 'arcs_egaux',
		nom_humain: "Arcs égaux d'Euclide",
		source: 'Construction canonique',
		description:
			"Le compas en `P` ouvert à `|PA|` trace un petit arc qui coupe `(AB)` en `B'`. La même ouverture reportée en `A` puis en `B'` produit deux arcs qui se croisent en `Q`, symétrique de `P` par rapport à `(AB)`. La droite `(PQ)` est la perpendiculaire à `(AB)` passant par `P`. Variante compacte mais peu lisible si `A` est loin du pied de la perpendiculaire.",
		defaut: false,
		choreography: arcsEgauxChoreography
	}
];
