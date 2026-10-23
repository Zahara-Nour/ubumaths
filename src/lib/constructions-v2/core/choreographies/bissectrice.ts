/**
 * Choreographies for the `bissectrice(A, V, B)` builtin.
 *
 * V1 voies under `@euclide` :
 *
 * - `arcs_egaux` (default, Euclid I.9) : circle at V crosses (VA) and (VB)
 *   at A', B'. Two equal arcs from A' and B' meet at P. Ruler V→P.
 *
 * - `arc_milieu` : same start (circle at V → A', B') but instead of two
 *   equal arcs, take the midpoint M of [A'B']. Ruler V→M.
 *
 * Both voies share the same first 2 sub-steps (compass at V + fade-in
 * A', B') and the same last sub-step (ruler trace of the bisector). They
 * differ in the middle : `arcs_egaux` adds 2 more arcs + P fade-in,
 * `arc_milieu` just fades in M (the midpoint of A'B', which is on the
 * bisector by symmetry of |VA'| = |VB'|).
 */

import {
	ChoreographyError,
	type Voie,
	type ChoreographyFn,
	type ChoreographyCtx,
	type ChoreographyResult,
	type SubStep,
	type TraceTag
} from './types';
import { isAngle, isLine, isRay, isSegment } from '$lib/geometry-core/types/elements';
import type { Figure } from '$lib/geometry-core/graph/figure';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { de, droite, en, labelAux, nom, role } from './names';
import { PROTRACTOR_RADIUS } from '../../constants';

const SEGMENT_TRACE_LENGTH_DEFAULT = 15;
/** Distance V → repère `@mesure` : juste hors du bord du rapporteur. */
const REPERE_DISTANCE = PROTRACTOR_RADIUS + 0.3;
/** Tolérance des comparaisons `@mesure` (unités math, degrés). */
const MESURE_EPS = 1e-9;
const CERCLE_V_RADIUS_FACTOR = 0.6; // r1 = 0.6 × min(|VA|, |VB|)
const ARC_RADIUS_FACTOR = 0.7; // r2 = 0.7 × |A'B'|
const SMALL_ARC_SWEEP_RAD = Math.PI / 6; // 30° default for the small arcs (at V, A', B')

/**
 * V3a — `bissectrice(α)` input dispatch.
 *
 * When the choreography is invoked with a single `GeoAngle` argument
 * (forme V3a : `α = angle(A, V, B); d = bissectrice(α) @euclide`), expand
 * the ctx into the canonical 3-point form `(p1, vertex, p2)` so the rest
 * of the choreography (designed in V2 for 3 points) runs unchanged.
 *
 * Returns the original ctx when the input is already the 3-point form
 * `bissectrice(A, V, B)`. Returns the original ctx unchanged when the
 * 1-arg input is not a `GeoAngle` (the builtin layer rejects this case
 * with a structured error before the choreography runs, so we just bail
 * out and let the rest of the flow surface whatever runtime error the
 * builtin produces).
 */
function normalizeBissectriceCtx(ctx: ChoreographyCtx): ChoreographyCtx {
	const { figure, args } = ctx;
	if (args.ids.length !== 1) return ctx;
	const angleEl = figure.getElementById(args.ids[0]);
	if (!angleEl || !isAngle(angleEl)) return ctx;
	const p1Pos = figure.getPosition(angleEl.p1Id);
	const vertexPos = figure.getPosition(angleEl.vertexId);
	const p2Pos = figure.getPosition(angleEl.p2Id);
	if (!p1Pos || !vertexPos || !p2Pos) return ctx;
	return {
		...ctx,
		args: {
			ids: [angleEl.p1Id, angleEl.vertexId, angleEl.p2Id],
			coords: [
				{ x: geoToNumber(p1Pos.x), y: geoToNumber(p1Pos.y) },
				{ x: geoToNumber(vertexPos.x), y: geoToNumber(vertexPos.y) },
				{ x: geoToNumber(p2Pos.x), y: geoToNumber(p2Pos.y) }
			],
			named: args.named
		}
	};
}

/**
 * Noms des arguments (forme canonique `(A, V, B)`) : le sommet V et les
 * côtés (VA), (VB), ou leurs tournures neutres.
 */
function bissectriceRoles(ctx: ChoreographyCtx) {
	const [Aid, Vid, Bid] = ctx.args.ids;
	const V = role(ctx.figure, Vid, 'le sommet');
	const A = role(ctx.figure, Aid, '');
	const B = role(ctx.figure, Bid, '');
	return {
		V,
		VA: droite(V, A, undefined, 'le premier côté'),
		VB: droite(V, B, undefined, 'le second côté')
	};
}

/**
 * Half-sweep of the small arcs at V (clamped to a fraction of the angle
 * AVB so the arcs near VA and VB never overlap with the bisector
 * direction).
 */
function smallArcHalfSweep(angleAVB: number): number {
	return Math.min(SMALL_ARC_SWEEP_RAD / 2, angleAVB * 0.4);
}

/**
 * Set up the common geometry shared by both voies : reactive A', B'
 * (intersections of the circle at V with rays VA, VB), the cercleV
 * trace, the segment-trace endpoints, and all underlying scalars.
 *
 * Returns the ids needed by both voies to assemble their sub-steps.
 */
function setupCommonGeometry(ctx: Parameters<ChoreographyFn>[0]) {
	const { figure, args, principalId } = ctx;
	const [Aid, Vid, Bid] = args.ids;
	const [A, V, B] = args.coords;

	// Hide the bisector line — revealed at end by `applyFinalVisibility`.
	figure.hideElement(principalId);

	// ─── Initial values (used for first-frame instrument positioning) ───
	const VAx = A.x - V.x;
	const VAy = A.y - V.y;
	const VBx = B.x - V.x;
	const VBy = B.y - V.y;
	const dVA0 = Math.hypot(VAx, VAy);
	const dVB0 = Math.hypot(VBx, VBy);
	const r1_0 = CERCLE_V_RADIUS_FACTOR * Math.min(dVA0, dVB0);
	const ApX0 = V.x + (r1_0 / dVA0) * VAx;
	const ApY0 = V.y + (r1_0 / dVA0) * VAy;
	const BpX0 = V.x + (r1_0 / dVB0) * VBx;
	const BpY0 = V.y + (r1_0 / dVB0) * VBy;

	// Bisector direction (unit vector) : (VA/|VA| + VB/|VB|) normalized.
	const uHatX = VAx / dVA0;
	const uHatY = VAy / dVA0;
	const wHatX = VBx / dVB0;
	const wHatY = VBy / dVB0;
	const bisRawX0 = uHatX + wHatX;
	const bisRawY0 = uHatY + wHatY;
	const bisLen0 = Math.hypot(bisRawX0, bisRawY0);
	const bisDirX0 = bisLen0 > 0 ? bisRawX0 / bisLen0 : 0;
	const bisDirY0 = bisLen0 > 0 ? bisRawY0 / bisLen0 : 0;

	// ─── Reactive scalars derived from V, A, B ───
	const Vx = figure.createScalarCoordinate(Vid, 'x');
	const Vy = figure.createScalarCoordinate(Vid, 'y');
	const Axs = figure.createScalarCoordinate(Aid, 'x');
	const Ays = figure.createScalarCoordinate(Aid, 'y');
	const Bxs = figure.createScalarCoordinate(Bid, 'x');
	const Bys = figure.createScalarCoordinate(Bid, 'y');
	const dVAScalar = figure.createScalarDistance(Vid, Aid);
	const dVBScalar = figure.createScalarDistance(Vid, Bid);

	// r1 = CERCLE_V_RADIUS_FACTOR × min(|VA|, |VB|)
	const r1Scalar = figure.createScalarExpression(
		(vals) => CERCLE_V_RADIUS_FACTOR * Math.min(vals.get(dVAScalar) ?? 0, vals.get(dVBScalar) ?? 0),
		[dVAScalar, dVBScalar]
	);

	// A' = V + (r1 / |VA|) × (A − V). Reactive coordinates.
	const ApxScalar = figure.createScalarExpression(
		(vals) => {
			const vx = vals.get(Vx) ?? 0;
			const ax = vals.get(Axs) ?? 0;
			const dva = vals.get(dVAScalar) ?? 1;
			const r1 = vals.get(r1Scalar) ?? 0;
			return vx + (r1 / Math.max(dva, 1e-12)) * (ax - vx);
		},
		[Vx, Axs, dVAScalar, r1Scalar]
	);
	const ApyScalar = figure.createScalarExpression(
		(vals) => {
			const vy = vals.get(Vy) ?? 0;
			const ay = vals.get(Ays) ?? 0;
			const dva = vals.get(dVAScalar) ?? 1;
			const r1 = vals.get(r1Scalar) ?? 0;
			return vy + (r1 / Math.max(dva, 1e-12)) * (ay - vy);
		},
		[Vy, Ays, dVAScalar, r1Scalar]
	);
	const BpxScalar = figure.createScalarExpression(
		(vals) => {
			const vx = vals.get(Vx) ?? 0;
			const bx = vals.get(Bxs) ?? 0;
			const dvb = vals.get(dVBScalar) ?? 1;
			const r1 = vals.get(r1Scalar) ?? 0;
			return vx + (r1 / Math.max(dvb, 1e-12)) * (bx - vx);
		},
		[Vx, Bxs, dVBScalar, r1Scalar]
	);
	const BpyScalar = figure.createScalarExpression(
		(vals) => {
			const vy = vals.get(Vy) ?? 0;
			const by = vals.get(Bys) ?? 0;
			const dvb = vals.get(dVBScalar) ?? 1;
			const r1 = vals.get(r1Scalar) ?? 0;
			return vy + (r1 / Math.max(dvb, 1e-12)) * (by - vy);
		},
		[Vy, Bys, dVBScalar, r1Scalar]
	);

	const Aprime = figure.createComputedPoint({ scalarRef: ApxScalar }, { scalarRef: ApyScalar });
	figure.hideElement(Aprime);
	const Bprime = figure.createComputedPoint({ scalarRef: BpxScalar }, { scalarRef: BpyScalar });
	figure.hideElement(Bprime);
	const nAprime = labelAux(ctx, Aprime, 'A′');
	const nBprime = labelAux(ctx, Bprime, 'B′');

	// Bisector direction (reactive unit vector).
	const bisDirRawXScalar = figure.createScalarExpression(
		(vals) => {
			const dva = vals.get(dVAScalar) ?? 1;
			const dvb = vals.get(dVBScalar) ?? 1;
			const ax = vals.get(Axs) ?? 0;
			const bx = vals.get(Bxs) ?? 0;
			const vx = vals.get(Vx) ?? 0;
			return (ax - vx) / Math.max(dva, 1e-12) + (bx - vx) / Math.max(dvb, 1e-12);
		},
		[Vx, Axs, Bxs, dVAScalar, dVBScalar]
	);
	const bisDirRawYScalar = figure.createScalarExpression(
		(vals) => {
			const dva = vals.get(dVAScalar) ?? 1;
			const dvb = vals.get(dVBScalar) ?? 1;
			const ay = vals.get(Ays) ?? 0;
			const by = vals.get(Bys) ?? 0;
			const vy = vals.get(Vy) ?? 0;
			return (ay - vy) / Math.max(dva, 1e-12) + (by - vy) / Math.max(dvb, 1e-12);
		},
		[Vy, Ays, Bys, dVAScalar, dVBScalar]
	);
	const bisDirLenScalar = figure.createScalarExpression(
		(vals) => Math.hypot(vals.get(bisDirRawXScalar) ?? 0, vals.get(bisDirRawYScalar) ?? 0),
		[bisDirRawXScalar, bisDirRawYScalar]
	);
	const bisDirXScalar = figure.createScalarExpression(
		(vals) => {
			const len = vals.get(bisDirLenScalar) ?? 0;
			return len > 1e-12 ? (vals.get(bisDirRawXScalar) ?? 0) / len : 0;
		},
		[bisDirRawXScalar, bisDirLenScalar]
	);
	const bisDirYScalar = figure.createScalarExpression(
		(vals) => {
			const len = vals.get(bisDirLenScalar) ?? 0;
			return len > 1e-12 ? (vals.get(bisDirRawYScalar) ?? 0) / len : 0;
		},
		[bisDirRawYScalar, bisDirLenScalar]
	);

	// Two small arcs at V, each crossing one side of the angle. The "near
	// VA" arc is centered on the direction (V → A), small sweep on each
	// side. Same for the "near VB" arc. Each arc creates one intersection
	// point with its respective side : A' (on VA) and B' (on VB).
	// Sweep is clamped to a fraction of the angle AVB so the two arcs
	// never overlap (they stay close to their respective sides).
	const angleVAScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(Ays) ?? 0) - (vals.get(Vy) ?? 0),
				(vals.get(Axs) ?? 0) - (vals.get(Vx) ?? 0)
			),
		[Vx, Vy, Axs, Ays]
	);
	const angleVBScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(Bys) ?? 0) - (vals.get(Vy) ?? 0),
				(vals.get(Bxs) ?? 0) - (vals.get(Vx) ?? 0)
			),
		[Vx, Vy, Bxs, Bys]
	);
	const angleAVBScalar = figure.createScalarExpression(
		(vals) => {
			const dva = vals.get(dVAScalar) ?? 1;
			const dvb = vals.get(dVBScalar) ?? 1;
			const vx = vals.get(Vx) ?? 0;
			const vy = vals.get(Vy) ?? 0;
			const dot =
				((vals.get(Axs) ?? 0) - vx) * ((vals.get(Bxs) ?? 0) - vx) +
				((vals.get(Ays) ?? 0) - vy) * ((vals.get(Bys) ?? 0) - vy);
			const cosAngle = dot / Math.max(dva * dvb, 1e-12);
			return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
		},
		[Vx, Vy, Axs, Ays, Bxs, Bys, dVAScalar, dVBScalar]
	);
	const halfSweepScalar = figure.createScalarExpression(
		(vals) => smallArcHalfSweep(vals.get(angleAVBScalar) ?? 0),
		[angleAVBScalar]
	);

	const arcNearAStartScalar = figure.createScalarExpression(
		(vals) => (vals.get(angleVAScalar) ?? 0) - (vals.get(halfSweepScalar) ?? 0),
		[angleVAScalar, halfSweepScalar]
	);
	const arcNearAEndScalar = figure.createScalarExpression(
		(vals) => (vals.get(angleVAScalar) ?? 0) + (vals.get(halfSweepScalar) ?? 0),
		[angleVAScalar, halfSweepScalar]
	);
	const arcNearBStartScalar = figure.createScalarExpression(
		(vals) => (vals.get(angleVBScalar) ?? 0) - (vals.get(halfSweepScalar) ?? 0),
		[angleVBScalar, halfSweepScalar]
	);
	const arcNearBEndScalar = figure.createScalarExpression(
		(vals) => (vals.get(angleVBScalar) ?? 0) + (vals.get(halfSweepScalar) ?? 0),
		[angleVBScalar, halfSweepScalar]
	);

	const arcNearA = figure.createArcByAngles(
		Vid,
		{ scalarRef: r1Scalar },
		{ scalarRef: arcNearAStartScalar },
		{ scalarRef: arcNearAEndScalar }
	);
	figure.hideElement(arcNearA);
	const arcNearB = figure.createArcByAngles(
		Vid,
		{ scalarRef: r1Scalar },
		{ scalarRef: arcNearBStartScalar },
		{ scalarRef: arcNearBEndScalar }
	);
	figure.hideElement(arcNearB);

	const supportScalars = [
		Vx,
		Vy,
		Axs,
		Ays,
		Bxs,
		Bys,
		dVAScalar,
		dVBScalar,
		r1Scalar,
		ApxScalar,
		ApyScalar,
		BpxScalar,
		BpyScalar,
		bisDirRawXScalar,
		bisDirRawYScalar,
		bisDirLenScalar,
		bisDirXScalar,
		bisDirYScalar,
		angleVAScalar,
		angleVBScalar,
		angleAVBScalar,
		halfSweepScalar,
		arcNearAStartScalar,
		arcNearAEndScalar,
		arcNearBStartScalar,
		arcNearBEndScalar
	];

	// Initial values for the 2 small arcs at V (SS1, SS2).
	const angleVA_0 = Math.atan2(VAy, VAx);
	const angleVB_0 = Math.atan2(VBy, VBx);
	const angleAVB_0 = Math.acos(
		Math.max(-1, Math.min(1, (VAx * VBx + VAy * VBy) / Math.max(dVA0 * dVB0, 1e-12)))
	);
	const halfSweep_0 = smallArcHalfSweep(angleAVB_0);
	const arcNearAStart_0 = angleVA_0 - halfSweep_0;
	const arcNearBStart_0 = angleVB_0 - halfSweep_0;
	const smallArcLength_0 = r1_0 * 2 * halfSweep_0;

	return {
		// Reactive elements
		Aprime,
		Bprime,
		// Noms affichés de A′, B′ (lettres des consignes).
		nAprime,
		nBprime,
		arcNearA,
		arcNearB,
		// Reactive scalars (for downstream use + hidden support).
		Vx,
		Vy,
		Axs,
		Ays,
		Bxs,
		Bys,
		dVAScalar,
		dVBScalar,
		r1Scalar,
		ApxScalar,
		ApyScalar,
		BpxScalar,
		BpyScalar,
		bisDirXScalar,
		bisDirYScalar,
		supportScalars,
		// Initial values (for first-frame positioning).
		V,
		r1_0,
		ApX0,
		ApY0,
		BpX0,
		BpY0,
		bisDirX0,
		bisDirY0,
		arcNearAStart_0,
		arcNearBStart_0,
		smallArcLength_0
	};
}

/**
 * Build the segment-trace + last sub-step (ruler trace of the bisector).
 * Centers the trace on V and extends symmetrically along the bisector
 * direction. Returns the SubStep + the support ids (segmentTrace + Iext
 * points + scalars) to add to `hiddenSupport`.
 *
 * @param targetPointId Charnière point through which the bisector passes
 *                      (P for `arcs_egaux`, M for `arc_milieu`). Used
 *                      only for the instruction text and length lower
 *                      bound (1.2 × |V × target|).
 * @param targetPointDistanceScalar Reactive scalar = |V × target|.
 * @param targetPointDistance0 Initial value of `|V × target|`.
 */
function buildRulerTraceSubStep(
	ctx: Parameters<ChoreographyFn>[0],
	common: Pick<
		ReturnType<typeof setupCommonGeometry>,
		'V' | 'bisDirX0' | 'bisDirY0' | 'Vx' | 'Vy' | 'bisDirXScalar' | 'bisDirYScalar'
	>,
	targetPointDistanceScalar: string,
	targetPointDistance0: number,
	instruction: string
): { subStep: SubStep; supportIds: string[] } {
	const { figure } = ctx;
	const { V, bisDirX0, bisDirY0, Vx, Vy, bisDirXScalar, bisDirYScalar } = common;

	// halfTrace = max(default/2, 1.2 × distance V → target)
	const halfTraceScalar = figure.createScalarExpression(
		(vals) =>
			Math.max(SEGMENT_TRACE_LENGTH_DEFAULT / 2, (vals.get(targetPointDistanceScalar) ?? 0) * 1.2),
		[targetPointDistanceScalar]
	);
	const Iext1xScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(Vx) ?? 0) - (vals.get(bisDirXScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[Vx, bisDirXScalar, halfTraceScalar]
	);
	const Iext1yScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(Vy) ?? 0) - (vals.get(bisDirYScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[Vy, bisDirYScalar, halfTraceScalar]
	);
	const Iext2xScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(Vx) ?? 0) + (vals.get(bisDirXScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[Vx, bisDirXScalar, halfTraceScalar]
	);
	const Iext2yScalar = figure.createScalarExpression(
		(vals) =>
			(vals.get(Vy) ?? 0) + (vals.get(bisDirYScalar) ?? 0) * (vals.get(halfTraceScalar) ?? 0),
		[Vy, bisDirYScalar, halfTraceScalar]
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

	// Initial values for SS6 instrument positioning.
	const halfTrace0 = Math.max(SEGMENT_TRACE_LENGTH_DEFAULT / 2, targetPointDistance0 * 1.2);
	const Iext1X0 = V.x - bisDirX0 * halfTrace0;
	const Iext1Y0 = V.y - bisDirY0 * halfTrace0;
	const segRotationDeg0 = (Math.atan2(bisDirY0, bisDirX0) * 180) / Math.PI;
	const traceLen0 = 2 * halfTrace0;

	const subStep: SubStep = {
		kind: 'ruler-trace',
		instrument: 'ruler',
		secondaryInstrument: 'pencil',
		instrumentTarget: { x: Iext1X0, y: Iext1Y0, rotation: segRotationDeg0 },
		geometricDistance: traceLen0,
		animateDrawableIds: [segmentTrace],
		animatePointIds: [],
		animateLineIds: [],
		instruction
	};

	return {
		subStep,
		supportIds: [
			segmentTrace,
			Iext1,
			Iext2,
			halfTraceScalar,
			Iext1xScalar,
			Iext1yScalar,
			Iext2xScalar,
			Iext2yScalar
		]
	};
}

/**
 * `bissectrice @euclide @arcs_egaux` choreography (Euclid I.9).
 *
 * 6 sub-steps :
 *   SS1 — compass at V traces cercleV (full circle, radius r1).
 *   SS2 — A' and B' fade-in.
 *   SS3 — compass at A' traces arc (radius r2, 120° around A'→B').
 *   SS4 — compass at B' traces arc.
 *   SS5 — P fade-in (intersection of arcs, on the bisector axis).
 *   SS6 — ruler + pencil trace the bisector through V and P.
 */
function buildArcsEgaux(ctx: Parameters<ChoreographyFn>[0]): ChoreographyResult {
	const { figure, principalId } = ctx;
	const N = bissectriceRoles(ctx);
	const common = setupCommonGeometry(ctx);
	const { nAprime, nBprime } = common;
	const {
		Aprime,
		Bprime,
		arcNearA,
		arcNearB,
		V,
		r1_0,
		ApX0,
		ApY0,
		BpX0,
		BpY0,
		bisDirX0,
		bisDirY0,
		arcNearAStart_0,
		arcNearBStart_0,
		smallArcLength_0,
		ApxScalar,
		ApyScalar,
		BpxScalar,
		BpyScalar,
		r1Scalar,
		Vx,
		Vy,
		bisDirXScalar,
		bisDirYScalar,
		supportScalars
	} = common;

	// |A'B'| (reactive)
	const dApBpScalar = figure.createScalarExpression(
		(vals) =>
			Math.hypot(
				(vals.get(BpxScalar) ?? 0) - (vals.get(ApxScalar) ?? 0),
				(vals.get(BpyScalar) ?? 0) - (vals.get(ApyScalar) ?? 0)
			),
		[ApxScalar, ApyScalar, BpxScalar, BpyScalar]
	);

	// r2 = ARC_RADIUS_FACTOR × |A'B'|
	const r2Scalar = figure.createScalarExpression(
		(vals) => ARC_RADIUS_FACTOR * (vals.get(dApBpScalar) ?? 0),
		[dApBpScalar]
	);

	// |VP| = √(r1² − (|A'B'|/2)²) + √(r2² − (|A'B'|/2)²)
	// (P far from V on the bisector axis).
	const VPScalar = figure.createScalarExpression(
		(vals) => {
			const r1 = vals.get(r1Scalar) ?? 0;
			const r2 = vals.get(r2Scalar) ?? 0;
			const half = (vals.get(dApBpScalar) ?? 0) / 2;
			const VM = Math.sqrt(Math.max(0, r1 * r1 - half * half));
			const halfChordP = Math.sqrt(Math.max(0, r2 * r2 - half * half));
			return VM + halfChordP;
		},
		[r1Scalar, r2Scalar, dApBpScalar]
	);

	// P = V + bisDir × |VP|
	const PxScalar = figure.createScalarExpression(
		(vals) => (vals.get(Vx) ?? 0) + (vals.get(bisDirXScalar) ?? 0) * (vals.get(VPScalar) ?? 0),
		[Vx, bisDirXScalar, VPScalar]
	);
	const PyScalar = figure.createScalarExpression(
		(vals) => (vals.get(Vy) ?? 0) + (vals.get(bisDirYScalar) ?? 0) * (vals.get(VPScalar) ?? 0),
		[Vy, bisDirYScalar, VPScalar]
	);
	const P = figure.createComputedPoint({ scalarRef: PxScalar }, { scalarRef: PyScalar });
	figure.hideElement(P);
	const nP = labelAux(ctx, P, 'P');

	// Small arcs at A' and B' centered on the direction toward P. Two
	// such arcs cross exactly at P (the intersection that defines the
	// bisector). Much more economical than tracing the two full
	// intersection circles ; matches the classical compass gesture
	// where the user just makes a small mark crossing the other arc.
	const angleAptoPScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(PyScalar) ?? 0) - (vals.get(ApyScalar) ?? 0),
				(vals.get(PxScalar) ?? 0) - (vals.get(ApxScalar) ?? 0)
			),
		[ApxScalar, ApyScalar, PxScalar, PyScalar]
	);
	const angleBptoPScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(PyScalar) ?? 0) - (vals.get(BpyScalar) ?? 0),
				(vals.get(PxScalar) ?? 0) - (vals.get(BpxScalar) ?? 0)
			),
		[BpxScalar, BpyScalar, PxScalar, PyScalar]
	);
	const halfSweepAtP = SMALL_ARC_SWEEP_RAD / 2; // 15° each side (30° total)
	const arcAtApStartScalar = figure.createScalarExpression(
		(vals) => (vals.get(angleAptoPScalar) ?? 0) - halfSweepAtP,
		[angleAptoPScalar]
	);
	const arcAtApEndScalar = figure.createScalarExpression(
		(vals) => (vals.get(angleAptoPScalar) ?? 0) + halfSweepAtP,
		[angleAptoPScalar]
	);
	const arcAtBpStartScalar = figure.createScalarExpression(
		(vals) => (vals.get(angleBptoPScalar) ?? 0) - halfSweepAtP,
		[angleBptoPScalar]
	);
	const arcAtBpEndScalar = figure.createScalarExpression(
		(vals) => (vals.get(angleBptoPScalar) ?? 0) + halfSweepAtP,
		[angleBptoPScalar]
	);

	const arcAtAprime = figure.createArcByAngles(
		Aprime,
		{ scalarRef: r2Scalar },
		{ scalarRef: arcAtApStartScalar },
		{ scalarRef: arcAtApEndScalar }
	);
	figure.hideElement(arcAtAprime);
	const arcAtBprime = figure.createArcByAngles(
		Bprime,
		{ scalarRef: r2Scalar },
		{ scalarRef: arcAtBpStartScalar },
		{ scalarRef: arcAtBpEndScalar }
	);
	figure.hideElement(arcAtBprime);

	// Initial values for SS4/SS5 instrument positioning.
	const dApBp0 = Math.hypot(BpX0 - ApX0, BpY0 - ApY0);
	const r2_0 = ARC_RADIUS_FACTOR * dApBp0;
	const halfApBp0 = dApBp0 / 2;
	const VM0 = Math.sqrt(Math.max(0, r1_0 * r1_0 - halfApBp0 * halfApBp0));
	const halfChordP0 = Math.sqrt(Math.max(0, r2_0 * r2_0 - halfApBp0 * halfApBp0));
	const VP0 = VM0 + halfChordP0;
	const PX0 = V.x + bisDirX0 * VP0;
	const PY0 = V.y + bisDirY0 * VP0;
	const angleAptoP0 = Math.atan2(PY0 - ApY0, PX0 - ApX0);
	const angleBptoP0 = Math.atan2(PY0 - BpY0, PX0 - BpX0);
	const arcAtApStart0 = angleAptoP0 - halfSweepAtP;
	const arcAtBpStart0 = angleBptoP0 - halfSweepAtP;
	const smallArcLengthAtP_0 = r2_0 * SMALL_ARC_SWEEP_RAD;

	const rulerStep = buildRulerTraceSubStep(
		ctx,
		common,
		VPScalar,
		VP0,
		`Règle ${de(N.V)} à ${nP} : on trace la bissectrice`
	);
	// Ensure bisDir vars are referenced even when used only via the closure.
	void bisDirX0;
	void bisDirY0;

	const subSteps: SubStep[] = [
		// SS1 : compass at V, small arc near (VA) — intersects (VA) at A'.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: V.x, y: V.y, rotation: (arcNearAStart_0 * 180) / Math.PI },
			compassRadius: r1_0,
			geometricDistance: smallArcLength_0,
			animateDrawableIds: [arcNearA],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `Compas ${en(N.V)}, petit arc qui coupe ${nom(N.VA)}`
		},
		// SS2 : compass stays at V, small arc near (VB) — intersects (VB) at B'.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: V.x, y: V.y, rotation: (arcNearBStart_0 * 180) / Math.PI },
			compassRadius: r1_0,
			geometricDistance: smallArcLength_0,
			animateDrawableIds: [arcNearB],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `Compas ${en(N.V)} (même ouverture), petit arc qui coupe ${nom(N.VB)}`
		},
		// SS3 : A' and B' fade-in.
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [Aprime, Bprime],
			animateLineIds: [],
			instruction: `Les arcs coupent les côtés en ${nAprime} et ${nBprime}`
		},
		// SS4 : compass at A', petit arc orienté vers P.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: ApX0, y: ApY0, rotation: (arcAtApStart0 * 180) / Math.PI },
			compassRadius: r2_0,
			geometricDistance: smallArcLengthAtP_0,
			animateDrawableIds: [arcAtAprime],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `Compas en ${nAprime}, petit arc en direction du croisement`
		},
		// SS5 : compass at B', petit arc orienté vers P.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: BpX0, y: BpY0, rotation: (arcAtBpStart0 * 180) / Math.PI },
			compassRadius: r2_0,
			geometricDistance: smallArcLengthAtP_0,
			animateDrawableIds: [arcAtBprime],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `Compas en ${nBprime} (même ouverture), petit arc qui croise le précédent`
		},
		// SS6 : P fade-in (intersection of arcs, on the bisector).
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [P],
			animateLineIds: [],
			instruction: `Les arcs se coupent en ${nP}`
		},
		// SS7 : ruler + pencil trace the bisector.
		rulerStep.subStep
	];

	return {
		subSteps,
		produced: {
			principal: principalId,
			charnieres: [P],
			// The 4 small arcs (2 at V, 2 at A'/B') are pedagogically
			// valuable (compass gestures). A' and B' are construction points
			// — per the spec they are traces (visible in `@complet`).
			traces: [arcNearA, arcNearB, arcAtAprime, arcAtBprime, Aprime, Bprime],
			traceTags: new Map<string, TraceTag>([
				[arcNearA, 'arc'],
				[arcNearB, 'arc'],
				[arcAtAprime, 'arc'],
				[arcAtBprime, 'arc'],
				[Aprime, 'auxiliary-point'],
				[Bprime, 'auxiliary-point']
			]),
			hiddenSupport: [
				...rulerStep.supportIds,
				dApBpScalar,
				r2Scalar,
				VPScalar,
				PxScalar,
				PyScalar,
				angleAptoPScalar,
				angleBptoPScalar,
				arcAtApStartScalar,
				arcAtApEndScalar,
				arcAtBpStartScalar,
				arcAtBpEndScalar,
				...supportScalars
			]
		}
	};
}

/**
 * `bissectrice @euclide @arc_milieu` choreography.
 *
 * 4 sub-steps :
 *   SS1 — compass at V traces cercleV.
 *   SS2 — A' and B' fade-in.
 *   SS3 — M (midpoint of A'B') fade-in.
 *   SS4 — ruler + pencil trace the bisector through V and M.
 *
 * Geometrically, since |VA'| = |VB'|, the midpoint M of [A'B'] is on the
 * angular bisector (perpendicular bisector of A'B' passes through V).
 */
function buildArcMilieu(ctx: Parameters<ChoreographyFn>[0]): ChoreographyResult {
	const { figure, principalId } = ctx;
	const N = bissectriceRoles(ctx);
	const common = setupCommonGeometry(ctx);
	const { nAprime, nBprime } = common;
	const {
		Aprime,
		Bprime,
		arcNearA,
		arcNearB,
		V,
		r1_0,
		ApX0,
		ApY0,
		BpX0,
		BpY0,
		arcNearAStart_0,
		arcNearBStart_0,
		smallArcLength_0,
		Vx,
		Vy,
		supportScalars
	} = common;

	// M = midpoint(A', B') — reactive via createMidpoint.
	const M = figure.createMidpoint(Aprime, Bprime);
	figure.hideElement(M);
	const nM = labelAux(ctx, M, 'M');

	// |VM| (reactive)
	const MxScalar = figure.createScalarCoordinate(M, 'x');
	const MyScalar = figure.createScalarCoordinate(M, 'y');
	const VMScalar = figure.createScalarExpression(
		(vals) =>
			Math.hypot(
				(vals.get(MxScalar) ?? 0) - (vals.get(Vx) ?? 0),
				(vals.get(MyScalar) ?? 0) - (vals.get(Vy) ?? 0)
			),
		[Vx, Vy, MxScalar, MyScalar]
	);

	// Initial |VM|
	const Mx0 = (ApX0 + BpX0) / 2;
	const My0 = (ApY0 + BpY0) / 2;
	const VM0 = Math.hypot(Mx0 - V.x, My0 - V.y);

	const rulerStep = buildRulerTraceSubStep(
		ctx,
		common,
		VMScalar,
		VM0,
		`Règle ${de(N.V)} à ${nM} : on trace la bissectrice`
	);

	const subSteps: SubStep[] = [
		// SS1 : compass at V, small arc near (VA).
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: V.x, y: V.y, rotation: (arcNearAStart_0 * 180) / Math.PI },
			compassRadius: r1_0,
			geometricDistance: smallArcLength_0,
			animateDrawableIds: [arcNearA],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `Compas ${en(N.V)}, petit arc qui coupe ${nom(N.VA)}`
		},
		// SS2 : compass stays at V, small arc near (VB).
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: V.x, y: V.y, rotation: (arcNearBStart_0 * 180) / Math.PI },
			compassRadius: r1_0,
			geometricDistance: smallArcLength_0,
			animateDrawableIds: [arcNearB],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `Compas ${en(N.V)} (même ouverture), petit arc qui coupe ${nom(N.VB)}`
		},
		// SS3 : A' and B' fade-in.
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [Aprime, Bprime],
			animateLineIds: [],
			instruction: `Les arcs coupent les côtés en ${nAprime} et ${nBprime}`
		},
		// SS4 : M fade-in (midpoint of A'B').
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [M],
			animateLineIds: [],
			instruction: `On marque le milieu ${nM} de [${nAprime}${nBprime}]`
		},
		// SS4 : ruler trace.
		rulerStep.subStep
	];

	return {
		subSteps,
		produced: {
			principal: principalId,
			charnieres: [M],
			// 2 small arcs at V : pedagogically valuable. A' B' : construction traces.
			traces: [arcNearA, arcNearB, Aprime, Bprime],
			traceTags: new Map<string, TraceTag>([
				[arcNearA, 'arc'],
				[arcNearB, 'arc'],
				[Aprime, 'auxiliary-point'],
				[Bprime, 'auxiliary-point']
			]),
			hiddenSupport: [...rulerStep.supportIds, MxScalar, MyScalar, VMScalar, ...supportScalars]
		}
	};
}

/** « 74 » · « 37,5 » : degrés écrits à la française, sans zéro inutile. */
function formatDeg(value: number): string {
	return value
		.toFixed(1)
		.replace(/\.?0+$/, '')
		.replace('.', ',');
}

/**
 * Le côté [VX) est-il tracé ? Segment [VX] (dans un sens ou l'autre),
 * demi-droite d'origine V passant par X, ou droite (VX), visibles.
 */
function hasVisibleSide(figure: Figure, Vid: string, Xid: string): boolean {
	const joins = (p: string, q: string) => (p === Vid && q === Xid) || (p === Xid && q === Vid);
	return figure
		.getAllElements()
		.some(
			(el) =>
				el.visible !== false &&
				((isSegment(el) && joins(el.startId, el.endId)) ||
					(isLine(el) && joins(el.point1Id, el.point2Id)) ||
					(isRay(el) && el.originId === Vid && el.throughId === Xid))
		);
}

/**
 * `bissectrice @mesure @rapporteur` : la méthode de 6e.
 *
 * 4 sous-étapes :
 *   SS1 — le rapporteur se pose, centre sur V, 0 sur [VA) ; on lit l'angle
 *         (arrondi au degré, comme l'élève le lit).
 *   SS2 — on divise la valeur lue par 2 ; le crayon va au bord du
 *         rapporteur, en face de cette graduation ; le rapporteur reste.
 *   SS3 — le repère P apparaît.
 *   SS4 — règle et crayon tracent la bissectrice par V et P.
 *
 * Le corps du rapporteur (`Protractor.svelte`) est du côté trigonométrique
 * de sa base, l'échelle extérieure part de 0 à droite. Si B est dans le
 * sens horaire de A, la base est retournée (rotation + 180°) : le 0 de
 * l'échelle intérieure tombe alors sur [VA), et le corps couvre l'angle.
 *
 * Le calcul de la consigne part de la valeur lue ; le repère, lui, est sur
 * la bissectrice exacte. Le codage des deux angles égaux, posé seulement si
 * les deux côtés sont tracés, est rangé avec les marqueurs : visible en
 * `@complet`, retiré par `-marqueurs`.
 */
function buildRapporteur(ctx: Parameters<ChoreographyFn>[0]): ChoreographyResult {
	const { figure, args, principalId } = ctx;
	const [Aid, Vid, Bid] = args.ids;
	const [A, V, B] = args.coords;
	const nV = role(figure, Vid, 'le sommet');
	const nA = role(figure, Aid, 'le premier point');
	const nB = role(figure, Bid, 'le second point');

	// A ou B confondu avec V : le builtin refuse avant la chorégraphie.
	const VAx = A.x - V.x;
	const VAy = A.y - V.y;
	const VBx = B.x - V.x;
	const VBy = B.y - V.y;
	const angleRad = Math.atan2(Math.abs(VAx * VBy - VAy * VBx), VAx * VBx + VAy * VBy);
	// Lecture au degré ; le calcul de la consigne part de cette valeur.
	const read = Math.round((angleRad * 180) / Math.PI + MESURE_EPS);
	if (read === 0) {
		throw new ChoreographyError("Les deux côtés sont confondus : il n'y a pas d'angle à mesurer.");
	}
	const half = read / 2;

	// Corps du rapporteur côté trigonométrique de sa base : retourné si B
	// est dans le sens horaire de A.
	const clockwise = VAx * VBy - VAy * VBx < -MESURE_EPS;
	const sideDeg = (Math.atan2(VAy, VAx) * 180) / Math.PI;
	const rotation = clockwise ? (sideDeg > 0 ? sideDeg - 180 : sideDeg + 180) : sideDeg;

	figure.hideElement(principalId);

	// ─── Direction de la bissectrice (réactive) ───
	// (VA/|VA| + VB/|VB|) normalisé. L'angle plat est refusé par le
	// builtin ; s'il survient en déplaçant un point, VA tourné d'un quart de tour.
	const Vx = figure.createScalarCoordinate(Vid, 'x');
	const Vy = figure.createScalarCoordinate(Vid, 'y');
	const Axs = figure.createScalarCoordinate(Aid, 'x');
	const Ays = figure.createScalarCoordinate(Aid, 'y');
	const Bxs = figure.createScalarCoordinate(Bid, 'x');
	const Bys = figure.createScalarCoordinate(Bid, 'y');
	const bisDir = (vals: ReadonlyMap<string, number>): { x: number; y: number } => {
		const vx = vals.get(Vx) ?? 0;
		const vy = vals.get(Vy) ?? 0;
		const ax = (vals.get(Axs) ?? 0) - vx;
		const ay = (vals.get(Ays) ?? 0) - vy;
		const bx = (vals.get(Bxs) ?? 0) - vx;
		const by = (vals.get(Bys) ?? 0) - vy;
		const la = Math.max(Math.hypot(ax, ay), 1e-12);
		const lb = Math.max(Math.hypot(bx, by), 1e-12);
		const rx = ax / la + bx / lb;
		const ry = ay / la + by / lb;
		const len = Math.hypot(rx, ry);
		if (len > 1e-9) return { x: rx / len, y: ry / len };
		return { x: -ay / la, y: ax / la };
	};
	const deps = [Vx, Vy, Axs, Ays, Bxs, Bys];
	const bisDirXScalar = figure.createScalarExpression((vals) => bisDir(vals).x, deps);
	const bisDirYScalar = figure.createScalarExpression((vals) => bisDir(vals).y, deps);

	// Repère P, juste hors du bord du rapporteur.
	const PxScalar = figure.createScalarExpression(
		(vals) => (vals.get(Vx) ?? 0) + (vals.get(bisDirXScalar) ?? 0) * REPERE_DISTANCE,
		[Vx, bisDirXScalar]
	);
	const PyScalar = figure.createScalarExpression(
		(vals) => (vals.get(Vy) ?? 0) + (vals.get(bisDirYScalar) ?? 0) * REPERE_DISTANCE,
		[Vy, bisDirYScalar]
	);
	const P = figure.createComputedPoint({ scalarRef: PxScalar }, { scalarRef: PyScalar });
	figure.hideElement(P);
	const nP = labelAux(ctx, P, 'P');
	const VPScalar = figure.createScalarExpression(() => REPERE_DISTANCE, []);

	// Valeurs initiales (positions des instruments).
	const la0 = Math.hypot(VAx, VAy);
	const lb0 = Math.hypot(VBx, VBy);
	const raw0 = { x: VAx / la0 + VBx / lb0, y: VAy / la0 + VBy / lb0 };
	const rawLen0 = Math.hypot(raw0.x, raw0.y);
	const bisDirX0 = rawLen0 > 1e-9 ? raw0.x / rawLen0 : -VAy / la0;
	const bisDirY0 = rawLen0 > 1e-9 ? raw0.y / rawLen0 : VAx / la0;

	// Codage des deux angles égaux, seulement si les deux côtés sont tracés ;
	// créé caché, la visibilité finale le range en marqueur.
	const marks: string[] = [];
	if (hasVisibleSide(figure, Vid, Aid) && hasVisibleSide(figure, Vid, Bid)) {
		marks.push(
			figure.createAngle(Aid, Vid, P, { marque: 'arcs2' }),
			figure.createAngle(P, Vid, Bid, { marque: 'arcs2' })
		);
		for (const mark of marks) figure.hideElement(mark);
	}

	const rulerStep = buildRulerTraceSubStep(
		ctx,
		{ V, bisDirX0, bisDirY0, Vx, Vy, bisDirXScalar, bisDirYScalar },
		VPScalar,
		REPERE_DISTANCE,
		`Règle ${de(nV)} à ${nP} : on trace la bissectrice`
	);

	const side = nV.name && nA.name ? `[${nV.name}${nA.name})` : 'le premier côté';
	const reading =
		nA.name && nV.name && nB.name
			? `l’angle ${nA.name}${nV.name}${nB.name} = ${formatDeg(read)}°`
			: `l’angle : ${formatDeg(read)}°`;
	const subSteps: SubStep[] = [
		{
			kind: 'compass-measure',
			instrument: 'protractor',
			instrumentTarget: { x: V.x, y: V.y, rotation },
			compassRadius: 0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `On place le centre du rapporteur sur ${nom(nV)}, le 0 sur ${side}, et on lit ${reading}`
		},
		{
			kind: 'compass-measure',
			instrument: 'pencil',
			secondaryInstrument: 'protractor',
			instrumentTarget: {
				x: V.x + bisDirX0 * REPERE_DISTANCE,
				y: V.y + bisDirY0 * REPERE_DISTANCE,
				rotation: 0
			},
			compassRadius: 0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: `${formatDeg(read)} ÷ 2 = ${formatDeg(half)} : on repère la graduation ${formatDeg(half)}°`
		},
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [P],
			animateLineIds: [],
			instruction: `On marque le repère ${nP} en face de ${formatDeg(half)}°`
		},
		rulerStep.subStep
	];

	return {
		subSteps,
		produced: {
			principal: principalId,
			charnieres: [P],
			traces: marks,
			traceTags: new Map<string, TraceTag>(marks.map((id) => [id, 'marker'])),
			hiddenSupport: [
				...rulerStep.supportIds,
				...deps,
				bisDirXScalar,
				bisDirYScalar,
				PxScalar,
				PyScalar,
				VPScalar
			]
		}
	};
}

const arcsEgauxChoreography: ChoreographyFn = (ctx) => buildArcsEgaux(normalizeBissectriceCtx(ctx));

const rapporteurChoreography: ChoreographyFn = (ctx) =>
	buildRapporteur(normalizeBissectriceCtx(ctx));

const arcMilieuChoreography: ChoreographyFn = (ctx) => buildArcMilieu(normalizeBissectriceCtx(ctx));

export const VOIES_BISSECTRICE_EUCLIDE: readonly Voie[] = [
	{
		id: 'arcs_egaux',
		nom_humain: 'Arcs égaux d’Euclide (I.9)',
		source: 'Euclide, Éléments I.9',
		description:
			'Cercle de centre `V` coupe `(VA)` en `A′` et `(VB)` en `B′`. Deux arcs égaux centrés en `A′` et `B′` se coupent en `P`. La bissectrice est la droite `(VP)`.',
		defaut: true,
		choreography: arcsEgauxChoreography
	},
	{
		id: 'arc_milieu',
		nom_humain: 'Arc et milieu',
		source: 'Variante par milieu',
		description:
			'Cercle de centre `V` coupe `(VA)` en `A′` et `(VB)` en `B′`. Le milieu `M` de `[A′B′]` est sur la bissectrice ; on trace `(VM)`.',
		defaut: false,
		choreography: arcMilieuChoreography
	}
];

export const VOIES_BISSECTRICE_MESURE: readonly Voie[] = [
	{
		id: 'rapporteur',
		nom_humain: 'Au rapporteur',
		source: 'Construction de 6e',
		description:
			'On pose le centre du rapporteur sur `V`, le 0 sur `[VA)`, on lit l’angle au degré, on le divise par 2 et on marque un repère `P` en face de cette graduation ; on trace `(VP)`. Le codage des deux angles égaux apparaît en `@complet` si les deux côtés de l’angle sont tracés.',
		defaut: true,
		choreography: rapporteurChoreography
	}
];
