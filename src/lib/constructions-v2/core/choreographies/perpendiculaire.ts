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
 * Voie viewport-safe qui ne dépend pas de la position de `A` sur (AB) :
 *
 *   1. Compas en P avec un rayon `r = max(1.5 × d(P, (AB)), 1.5)`. Cet
 *      arc coupe (AB) en deux nouveaux points A* et B', équidistants de P.
 *   2. Composition avec `sub-mediatrice(A*, B*)` : médiatrice de [A*B'] =
 *      perpendiculaire à (AB) passant par P (puisque |PA*| = |PB'|).
 *
 * Le rayon est calé sur la distance perpendiculaire de P à (AB), donc
 * borné par la fenêtre tant que P et la droite y sont visibles —
 * indépendant de la position de A sur la droite.
 *
 * Sub-step layout (7 sub-steps) :
 *   SS1 — compass-draw arc en P couvrant (AB) → A*, B'.
 *   SS2 — point-fade-in A*, B'.
 *   SS3..SS6 — sub-mediatrice(A*, B') (4 sub-steps).
 *   SS7 — line-fade-in m (la perpendiculaire principale).
 */

import type { Voie, ChoreographyFn, ChoreographyResult, SubStep, ChoreographyCtx } from './types';

const SEGMENT_TRACE_LENGTH_DEFAULT = 15;
const SMALL_ARC_SWEEP_RAD = Math.PI / 6; // 30° total
const RAYON_LIBRE_MIN = 1.5;
const RAYON_LIBRE_FACTOR = 1.5;

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
	const { figure, args, principalId, visibilite, sub } = ctx;
	const [Pid, Aid, Bid] = args.ids;
	const [P, A, B] = args.coords;

	// Hide the perpendicular line — revealed by the trailing line-fade-in.
	figure.hideElement(principalId);

	// ─── Initial values (used for SS1 instrument positioning) ───
	const ABx = B.x - A.x;
	const ABy = B.y - A.y;
	const ABlen0 = Math.hypot(ABx, ABy);
	const ux0 = ABx / ABlen0;
	const uy0 = ABy / ABlen0;
	// n = (-uy, ux). dPerp = (A - P) · n.
	const dPerp0 = -(A.x - P.x) * uy0 + (A.y - P.y) * ux0;
	const r0 = Math.max(Math.abs(dPerp0) * RAYON_LIBRE_FACTOR, RAYON_LIBRE_MIN);
	const Fx0 = P.x - dPerp0 * uy0;
	const Fy0 = P.y + dPerp0 * ux0;
	const halfChord0 = Math.sqrt(Math.max(r0 * r0 - dPerp0 * dPerp0, 1e-12));
	const Astar0 = { x: Fx0 + halfChord0 * ux0, y: Fy0 + halfChord0 * uy0 };
	const Bstar0 = { x: Fx0 - halfChord0 * ux0, y: Fy0 - halfChord0 * uy0 };
	const angleToF_0 = Math.atan2(Fy0 - P.y, Fx0 - P.x);
	const halfSweep0 = Math.atan2(halfChord0, Math.max(Math.abs(dPerp0), 1e-12));
	const arcStart0 = angleToF_0 - halfSweep0;
	const arcLength0 = r0 * 2 * halfSweep0;

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
	// Viewport-safe radius : r = max(|dPerp| × factor, min). Indépendant
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

	const Astar = figure.createComputedPoint({ scalarRef: AstarX }, { scalarRef: AstarY });
	figure.hideElement(Astar);
	const Bstar = figure.createComputedPoint({ scalarRef: BstarX }, { scalarRef: BstarY });
	figure.hideElement(Bstar);

	// Arc at P : centered on direction P→F with sweep ±halfSweep
	// (covering both A* and B*).
	const angleToFScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(FyScalar) ?? 0) - (vals.get(Py) ?? 0),
				(vals.get(FxScalar) ?? 0) - (vals.get(Px) ?? 0)
			),
		[FyScalar, Py, FxScalar, Px]
	);
	const halfSweepScalar = figure.createScalarExpression(
		(vals) => {
			const dAbs = Math.max(Math.abs(vals.get(dPerpScalar) ?? 0), 1e-12);
			const h = vals.get(halfChordScalar) ?? 1;
			return Math.atan2(h, dAbs);
		},
		[dPerpScalar, halfChordScalar]
	);
	const arcStartScalar = figure.createScalarExpression(
		(vals) => (vals.get(angleToFScalar) ?? 0) - (vals.get(halfSweepScalar) ?? 0),
		[angleToFScalar, halfSweepScalar]
	);
	const arcEndScalar = figure.createScalarExpression(
		(vals) => (vals.get(angleToFScalar) ?? 0) + (vals.get(halfSweepScalar) ?? 0),
		[angleToFScalar, halfSweepScalar]
	);

	const arcAtP = figure.createArcByAngles(
		Pid,
		{ scalarRef: rScalar },
		{ scalarRef: arcStartScalar },
		{ scalarRef: arcEndScalar }
	);
	figure.hideElement(arcAtP);

	// ─── Sub-chorégraphie : mediatrice(A*, B*) ───
	// Le sub-principal est la perpendiculaire elle-même (puisque la
	// médiatrice de [A*B*] est cette droite). Sub-mediatrice utilise sa
	// voie par défaut sous @euclide.
	const subTriple = { contrainte: 'euclide' as const, methode: null, visibilite } as const;
	const subResult = sub(
		'mediatrice',
		{ ids: [Astar, Bstar], coords: [Astar0, Bstar0] },
		principalId,
		subTriple
	);

	// ─── Own sub-steps ───
	const preSubSteps: SubStep[] = [
		// SS1 : grand arc en P qui coupe (AB) en A* et B*.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: P.x, y: P.y, rotation: (arcStart0 * 180) / Math.PI },
			compassRadius: r0,
			geometricDistance: arcLength0,
			animateDrawableIds: [arcAtP],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'Compas en P, on trace un arc qui coupe (AB) en deux points A* et B*'
		},
		// SS2 : A* et B* apparaissent.
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [Astar, Bstar],
			animateLineIds: [],
			instruction: 'A* et B* apparaissent (équidistants de P)'
		}
	];
	const postSubSteps: SubStep[] = [
		// SS7 : la perpendiculaire apparaît (= médiatrice de [A*B*]).
		{
			kind: 'line-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [principalId],
			instruction: 'La médiatrice de [A*B*] est la perpendiculaire cherchée'
		}
	];

	return {
		subSteps: [...preSubSteps, ...subResult.subSteps, ...postSubSteps],
		produced: {
			principal: principalId,
			// Charnières de la sous-médiatrice (I1, I2) restent visibles en
			// @squelette : elles définissent la perpendiculaire avec le pied
			// virtuel sur (AB).
			charnieres: [...subResult.produced.charnieres],
			// Arc en P, A*, B*, et les traces de la sous-médiatrice (arcs
			// aux extrémités, segment-trace).
			traces: [arcAtP, Astar, Bstar, ...subResult.produced.traces],
			hiddenSupport: [
				// Reactive scalars internes.
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
				angleToFScalar,
				halfSweepScalar,
				arcStartScalar,
				arcEndScalar,
				// Sub's hidden support (scalars, helper points, etc.).
				...(subResult.produced.hiddenSupport ?? [])
			]
		}
	};
}

const arcsEgauxChoreography: ChoreographyFn = (ctx) => buildArcsEgaux(ctx);
const rayonLibreChoreography: ChoreographyFn = (ctx) => buildRayonLibre(ctx);

export const VOIES_PERPENDICULAIRE_EUCLIDE: readonly Voie[] = [
	{
		id: 'rayon_libre',
		nom_humain: 'Rayon libre + médiatrice',
		source: 'Construction canonique (variante viewport-safe)',
		description:
			"Le compas en `P` choisit un rayon `r` calé sur la distance de `P` à `(AB)` (indépendant de la position de `A` sur la droite). L'arc coupe `(AB)` en deux points équidistants `A*` et `B*`, puis la médiatrice de `[A*B*]` est tracée — c'est la perpendiculaire à `(AB)` passant par `P`. Cette voie reste lisible quand `A` est loin du pied de la perpendiculaire.",
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
