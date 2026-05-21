/**
 * Choreographies for the `perpendiculaire(P, A, B)` builtin.
 *
 * V1 voie under `@euclide` (single canonical path, no method override) :
 *
 * - Compass at P traces an arc that crosses (AB) at A' and B' (so
 *   |PA'| = |PB'| = r).
 * - The perpendicular passing through P IS the perpendicular bisector
 *   of [A'B'] (because P, being equidistant from A' and B', lies on
 *   the perpendicular bisector). The chorégraphie therefore composes
 *   `mediatrice(A', B') @euclide` via `ctx.sub`.
 *
 * Sub-step layout :
 *   SS1   — compass at P traces arc crossing (AB).
 *   SS2   — A' and B' fade-in.
 *   SS3..SS6 — sub-mediatrice(A', B') : 4 sub-steps.
 *   SS7   — line-fade-in m (the perpendicular line).
 *
 * Total : 7 sub-steps.
 */

import type { Voie, ChoreographyFn, ChoreographyResult, SubStep, ChoreographyCtx } from './types';

const SMALL_ARC_SWEEP_RAD = Math.PI / 6; // 30° default for the arc at P

function buildArcsEgaux(ctx: ChoreographyCtx): ChoreographyResult {
	const { figure, args, principalId, visibilite, sub } = ctx;
	const [Pid, Aid, Bid] = args.ids;
	const [P, A, B] = args.coords;

	// Hide the perpendicular line — revealed by SS7 line-fade-in.
	figure.hideElement(principalId);

	// ─── Initial values ───
	const ABx = B.x - A.x;
	const ABy = B.y - A.y;
	const ABlen = Math.hypot(ABx, ABy);
	// Unit vector along (AB).
	const ux = ABx / ABlen;
	const uy = ABy / ABlen;
	// Perpendicular distance from P to line (AB) using the projection.
	const APx = P.x - A.x;
	const APy = P.y - A.y;
	const projScalar = APx * ux + APy * uy; // signed projection along (AB)
	const projX = A.x + projScalar * ux;
	const projY = A.y + projScalar * uy;
	const dPlinex = P.x - projX;
	const dPliney = P.y - projY;
	const distPtoAB = Math.hypot(dPlinex, dPliney);
	// Compass radius : large enough to clearly cross (AB). Use max(1.5×d, 1)
	// to handle the case P ∈ (AB) (then d=0).
	const r0 = Math.max(distPtoAB * 1.5, 1);
	// A' and B' = (projection on (AB)) ± (√(r² - d²)) along û.
	// Since (A'B') ⊂ (AB), they are symmetric around the foot of perp from P.
	const halfChord0 = Math.sqrt(Math.max(0, r0 * r0 - distPtoAB * distPtoAB));
	const Apx0 = projX - halfChord0 * ux;
	const Apy0 = projY - halfChord0 * uy;
	const Bpx0 = projX + halfChord0 * ux;
	const Bpy0 = projY + halfChord0 * uy;
	// Arc start/end angles : centered on the direction P → foot of perp,
	// span enough to reach A' and B' on both sides.
	// Direction P → A' is angle(P→A'). Same for P → B'. Compute both, then
	// sweep from one to the other.
	const angleToAp = Math.atan2(Apy0 - P.y, Apx0 - P.x);
	const angleToBp = Math.atan2(Bpy0 - P.y, Bpx0 - P.x);
	// Sweep from angleToAp to angleToBp the short way (through the foot
	// direction). Normalize to keep sweep < π.
	let arcSweep = angleToBp - angleToAp;
	while (arcSweep > Math.PI) arcSweep -= 2 * Math.PI;
	while (arcSweep < -Math.PI) arcSweep += 2 * Math.PI;
	// Pad slightly on each side so A' and B' are clearly inside the arc.
	const padding = SMALL_ARC_SWEEP_RAD / 2;
	const arcStart_0 = angleToAp - Math.sign(arcSweep) * padding;
	const arcEnd_0 = angleToBp + Math.sign(arcSweep) * padding;
	const arcSweepWithPad = arcEnd_0 - arcStart_0;
	const arcLength = r0 * Math.abs(arcSweepWithPad);

	// ─── Reactive scalars ───
	const Px = figure.createScalarCoordinate(Pid, 'x');
	const Py = figure.createScalarCoordinate(Pid, 'y');
	const Ax = figure.createScalarCoordinate(Aid, 'x');
	const Ay = figure.createScalarCoordinate(Aid, 'y');
	const Bx = figure.createScalarCoordinate(Bid, 'x');
	const By = figure.createScalarCoordinate(Bid, 'y');

	// |AB| (reactive).
	const dABScalar = figure.createScalarDistance(Aid, Bid);
	// Unit direction (AB) : (B-A) / |AB|.
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
	// Projection of P on (AB) : foot of perpendicular.
	const projScalarS = figure.createScalarExpression(
		(vals) => {
			const apx = (vals.get(Px) ?? 0) - (vals.get(Ax) ?? 0);
			const apy = (vals.get(Py) ?? 0) - (vals.get(Ay) ?? 0);
			return apx * (vals.get(uxScalar) ?? 0) + apy * (vals.get(uyScalar) ?? 0);
		},
		[Px, Py, Ax, Ay, uxScalar, uyScalar]
	);
	const projXScalar = figure.createScalarExpression(
		(vals) => (vals.get(Ax) ?? 0) + (vals.get(projScalarS) ?? 0) * (vals.get(uxScalar) ?? 0),
		[Ax, projScalarS, uxScalar]
	);
	const projYScalar = figure.createScalarExpression(
		(vals) => (vals.get(Ay) ?? 0) + (vals.get(projScalarS) ?? 0) * (vals.get(uyScalar) ?? 0),
		[Ay, projScalarS, uyScalar]
	);
	// distPtoAB (reactive).
	const distPABScalar = figure.createScalarExpression(
		(vals) => {
			const dx = (vals.get(Px) ?? 0) - (vals.get(projXScalar) ?? 0);
			const dy = (vals.get(Py) ?? 0) - (vals.get(projYScalar) ?? 0);
			return Math.hypot(dx, dy);
		},
		[Px, Py, projXScalar, projYScalar]
	);
	// Radius r = max(1.5 × distPtoAB, 1).
	const rScalar = figure.createScalarExpression(
		(vals) => Math.max((vals.get(distPABScalar) ?? 0) * 1.5, 1),
		[distPABScalar]
	);
	// halfChord = √(r² - d²).
	const halfChordScalar = figure.createScalarExpression(
		(vals) => {
			const r = vals.get(rScalar) ?? 0;
			const d = vals.get(distPABScalar) ?? 0;
			return Math.sqrt(Math.max(0, r * r - d * d));
		},
		[rScalar, distPABScalar]
	);
	// A' = projection - halfChord × û.
	const ApxScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(projXScalar) ?? 0) - (vals.get(halfChordScalar) ?? 0) * (vals.get(uxScalar) ?? 0),
		[projXScalar, halfChordScalar, uxScalar]
	);
	const ApyScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(projYScalar) ?? 0) - (vals.get(halfChordScalar) ?? 0) * (vals.get(uyScalar) ?? 0),
		[projYScalar, halfChordScalar, uyScalar]
	);
	// B' = projection + halfChord × û.
	const BpxScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(projXScalar) ?? 0) + (vals.get(halfChordScalar) ?? 0) * (vals.get(uxScalar) ?? 0),
		[projXScalar, halfChordScalar, uxScalar]
	);
	const BpyScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(projYScalar) ?? 0) + (vals.get(halfChordScalar) ?? 0) * (vals.get(uyScalar) ?? 0),
		[projYScalar, halfChordScalar, uyScalar]
	);
	const Aprime = figure.createComputedPoint({ scalarRef: ApxScalar }, { scalarRef: ApyScalar });
	figure.hideElement(Aprime);
	const Bprime = figure.createComputedPoint({ scalarRef: BpxScalar }, { scalarRef: BpyScalar });
	figure.hideElement(Bprime);

	// Arc at P : start/end angles centered on direction P→foot, sweeping
	// enough to clearly cross (AB) on both sides.
	const angleToApScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(ApyScalar) ?? 0) - (vals.get(Py) ?? 0),
				(vals.get(ApxScalar) ?? 0) - (vals.get(Px) ?? 0)
			),
		[Px, Py, ApxScalar, ApyScalar]
	);
	const angleToBpScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(BpyScalar) ?? 0) - (vals.get(Py) ?? 0),
				(vals.get(BpxScalar) ?? 0) - (vals.get(Px) ?? 0)
			),
		[Px, Py, BpxScalar, BpyScalar]
	);
	const arcStartScalar = figure.createScalarExpression(
		(vals) => {
			let sweep = (vals.get(angleToBpScalar) ?? 0) - (vals.get(angleToApScalar) ?? 0);
			while (sweep > Math.PI) sweep -= 2 * Math.PI;
			while (sweep < -Math.PI) sweep += 2 * Math.PI;
			return (vals.get(angleToApScalar) ?? 0) - Math.sign(sweep) * (SMALL_ARC_SWEEP_RAD / 2);
		},
		[angleToApScalar, angleToBpScalar]
	);
	const arcEndScalar = figure.createScalarExpression(
		(vals) => {
			let sweep = (vals.get(angleToBpScalar) ?? 0) - (vals.get(angleToApScalar) ?? 0);
			while (sweep > Math.PI) sweep -= 2 * Math.PI;
			while (sweep < -Math.PI) sweep += 2 * Math.PI;
			return (vals.get(angleToBpScalar) ?? 0) + Math.sign(sweep) * (SMALL_ARC_SWEEP_RAD / 2);
		},
		[angleToApScalar, angleToBpScalar]
	);

	const arcAtP = figure.createArcByAngles(
		Pid,
		{ scalarRef: rScalar },
		{ scalarRef: arcStartScalar },
		{ scalarRef: arcEndScalar }
	);
	figure.hideElement(arcAtP);

	// ─── Sub-chorégraphie mediatrice(A', B') ───
	// The principal of the sub-mediatrice IS our perpendicular (same line).
	const subTriple = { contrainte: 'euclide' as const, methode: null, visibilite } as const;
	const subResult = sub(
		'mediatrice',
		{
			ids: [Aprime, Bprime],
			coords: [
				{ x: Apx0, y: Apy0 },
				{ x: Bpx0, y: Bpy0 }
			]
		},
		principalId,
		subTriple
	);

	// ─── Sub-steps ───
	const subSteps: SubStep[] = [
		// SS1 : compass at P, arc crossing (AB).
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: P.x, y: P.y, rotation: (arcStart_0 * 180) / Math.PI },
			compassRadius: r0,
			geometricDistance: arcLength,
			animateDrawableIds: [arcAtP],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'Compas en P, on trace un arc qui coupe (AB) en deux points'
		},
		// SS2 : A' and B' fade-in.
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [Aprime, Bprime],
			animateLineIds: [],
			instruction: "L'arc coupe (AB) en A' et B' (équidistants de P)"
		},
		// SS3..SS6 : sub-mediatrice(A', B')
		...subResult.subSteps,
		// SS7 : reveal the perpendicular line.
		{
			kind: 'line-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [principalId],
			instruction: 'La perpendiculaire à (AB) passant par P apparaît'
		}
	];

	return {
		subSteps,
		produced: {
			principal: principalId,
			// A' B' are construction traces (visible in @complet, hidden in @squelette).
			// Sub-mediatrice's charnieres (I1, I2) are also construction artifacts at
			// this composition level — hide always.
			charnieres: [],
			traces: [arcAtP, Aprime, Bprime, ...subResult.produced.traces],
			hiddenSupport: [
				...(subResult.produced.hiddenSupport ?? []),
				...subResult.produced.charnieres,
				// Own reactive scalars.
				Px,
				Py,
				Ax,
				Ay,
				Bx,
				By,
				dABScalar,
				uxScalar,
				uyScalar,
				projScalarS,
				projXScalar,
				projYScalar,
				distPABScalar,
				rScalar,
				halfChordScalar,
				ApxScalar,
				ApyScalar,
				BpxScalar,
				BpyScalar,
				angleToApScalar,
				angleToBpScalar,
				arcStartScalar,
				arcEndScalar
			]
		}
	};
}

const arcsEgauxChoreography: ChoreographyFn = (ctx) => buildArcsEgaux(ctx);

export const VOIES_PERPENDICULAIRE_EUCLIDE: readonly Voie[] = [
	{
		id: 'arcs_egaux',
		nom_humain: "Arcs égaux d'Euclide",
		source: 'Construction canonique',
		description:
			"Le compas en `P` trace un arc qui coupe `(AB)` en deux points `A'` et `B'` équidistants de `P`. La perpendiculaire à `(AB)` passant par `P` est la médiatrice de `[A'B']` (par symétrie). La chorégraphie compose une médiatrice via `ctx.sub`.",
		defaut: true,
		choreography: arcsEgauxChoreography
	}
];
