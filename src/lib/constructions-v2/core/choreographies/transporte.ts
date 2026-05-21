/**
 * Choreographies for the `transporte(α, V', dir)` builtin.
 *
 * V1 voie under `@euclide` :
 *
 * - `compas_report` (default, Euclid I.23) : compass at V opens to radius
 *   `r = 1`, traces an arc that crosses (VA) at A' and (VB) at B'. The
 *   same opening is moved to V' and traces an arc crossing the target
 *   direction at A''. The compass is then re-opened to |A'B'|, placed at
 *   A'', and traces an arc that crosses the previous arc at B''. The
 *   ruler finally traces (V', B''), the 2nd side of β.
 *
 * The builtin (`handleTransporte`, V3a) has already created β = angle β
 * = (p1', V', p2') where `p1' = V' + dir` and `p2' = B''`. The
 * choreography reads β to recover V', the direction marker (= A'' since
 * we use r = 1), and B''. It only needs to create the auxiliary witness
 * points A' and B' (intersections of the hidden circle at V with the
 * rays VA and VB), the 3 visible arcs (at V, V', A''), and the segment
 * trace for the ruler step.
 */

import type { Voie, ChoreographyCtx, ChoreographyResult, SubStep, TraceTag } from './types';
import { isAngle, isPointElement } from '$lib/geometry-core/types/elements';
import { geoToNumber } from '$lib/geometry-core/compute/to-number';
import { numeric } from '$lib/geometry-core/types/geo-value';

const SEGMENT_TRACE_LENGTH_DEFAULT = 15;
/** Compass opening for the 2 first arcs (units of math). Q1 in the spec. */
const R_TRANSPORT = 1;
/** Half-sweep of the small arcs at V'/A'' (radians). 30° each side = 60° total. */
const SMALL_ARC_HALF_SWEEP = Math.PI / 6;
/** Minimum arc length used to keep the gesture readable on small openings. */
const MIN_ARC_LENGTH = 0.5;

/**
 * Resolved geometry the choreography needs after reading α and β from
 * the figure. Everything not directly available is created here (witness
 * points A', B', hidden support circles, visible animated arcs, segment
 * trace for the ruler).
 */
interface TransporteSetup {
	readonly V: { readonly x: number; readonly y: number };
	readonly Vprime: { readonly x: number; readonly y: number };
	/** β.p1Id (= V' + dir, also acts as A'' since r = 1). */
	readonly Adoubleprime: string;
	/** β.p2Id (= rotated marker = B''). */
	readonly Bdoubleprime: string;
	readonly Aprime: string;
	readonly Bprime: string;
	readonly arcV: string;
	readonly arcVp: string;
	readonly arcApp: string;
	readonly segmentTrace: string;
	readonly initial: {
		readonly Apx: number;
		readonly Apy: number;
		readonly Bpx: number;
		readonly Bpy: number;
		readonly Appx: number;
		readonly Appy: number;
		readonly Bppx: number;
		readonly Bppy: number;
		/** Sweep used for the arc at V (radians). */
		readonly sweepAtV: number;
		/** Start angle of the arc at V (radians). */
		readonly arcVStart: number;
		/** Start angle of the small arc at V' (radians). */
		readonly arcVpStart: number;
		/** Start angle of the arc at A'' (radians). */
		readonly arcAppStart: number;
		/** Reactive chord |A'B'| at t=0. */
		readonly chord0: number;
		/** Segment trace start point (math units). */
		readonly traceStartX: number;
		readonly traceStartY: number;
		readonly segLength: number;
		readonly segRotationDeg: number;
	};
	readonly hiddenSupport: readonly string[];
}

/**
 * Read the figure to recover α (passed via `ctx.args.ids[0]`) and β
 * (the principal element produced by the builtin). Returns null when
 * the inputs do not match the expected shape (the builtin has already
 * validated them, but the executor may call the choreography on a
 * partial figure during load-error recovery — staying defensive).
 */
function readTransporteInputs(ctx: ChoreographyCtx): {
	alphaP1: string;
	alphaV: string;
	alphaP2: string;
	V: { x: number; y: number };
	Vprime: { x: number; y: number };
	Adoubleprime: string;
	Bdoubleprime: string;
} | null {
	const { figure, args, principalId } = ctx;
	if (args.ids.length < 2) return null;
	const alphaEl = figure.getElementById(args.ids[0]);
	if (!alphaEl || !isAngle(alphaEl)) return null;
	const VprimeEl = figure.getElementById(args.ids[1]);
	if (!VprimeEl || !isPointElement(VprimeEl)) return null;
	const betaEl = figure.getElementById(principalId);
	if (!betaEl || !isAngle(betaEl)) return null;
	const Vpos = figure.getPosition(alphaEl.vertexId);
	const Vppos = figure.getPosition(args.ids[1]);
	if (!Vpos || !Vppos) return null;
	return {
		alphaP1: alphaEl.p1Id,
		alphaV: alphaEl.vertexId,
		alphaP2: alphaEl.p2Id,
		V: { x: geoToNumber(Vpos.x), y: geoToNumber(Vpos.y) },
		Vprime: { x: geoToNumber(Vppos.x), y: geoToNumber(Vppos.y) },
		// β.p1 = V' + dir (used as A'' since the chore picks r = 1).
		Adoubleprime: betaEl.p1Id,
		// β.p2 = rotated marker (= B'').
		Bdoubleprime: betaEl.p2Id
	};
}

/**
 * Build the reactive witnesses A' and B' (intersections of the hidden
 * circle at V with the rays V→alphaP1 and V→alphaP2), the 3 animated
 * arcs, and the segment trace from V' to B''. All auxiliaries are
 * hidden until the corresponding sub-step reveals them.
 */
function setupTransporteGeometry(ctx: ChoreographyCtx): TransporteSetup | null {
	const inputs = readTransporteInputs(ctx);
	if (!inputs) return null;
	const { figure, principalId } = ctx;
	const { alphaP1, alphaV, alphaP2, V, Vprime, Adoubleprime, Bdoubleprime } = inputs;

	// β was created visible by the builtin — hide it so `applyFinalVisibility`
	// can reveal it at the end of SS6 only.
	figure.hideElement(principalId);

	// Initial positions of the points already in the figure.
	const Appos0 = figure.getPosition(Adoubleprime);
	const Bppos0 = figure.getPosition(Bdoubleprime);
	const alphaP1pos = figure.getPosition(alphaP1);
	const alphaP2pos = figure.getPosition(alphaP2);
	if (!Appos0 || !Bppos0 || !alphaP1pos || !alphaP2pos) return null;
	const Appx = geoToNumber(Appos0.x);
	const Appy = geoToNumber(Appos0.y);
	const Bppx = geoToNumber(Bppos0.x);
	const Bppy = geoToNumber(Bppos0.y);
	const aP1x = geoToNumber(alphaP1pos.x);
	const aP1y = geoToNumber(alphaP1pos.y);
	const aP2x = geoToNumber(alphaP2pos.x);
	const aP2y = geoToNumber(alphaP2pos.y);

	const hiddenSupport: string[] = [];

	// ─── Witness points A' and B' on the sides of α ──────────────────────────
	// Build a hidden ray V→alphaP1 (resp. V→alphaP2) and a hidden circle at V
	// of radius R_TRANSPORT, then take the intersection. `createIntersectionLC`
	// returns 2 candidates ; we pick the one on the same side as alphaP1
	// (resp. alphaP2) — i.e. the candidate whose distance to alphaP1 is
	// smaller. Practically, with a ray the geometry library still returns the
	// two algebraic intersections of the supporting line — we resolve by
	// post-selecting the closest index.
	const rayVA = figure.createRay(alphaV, alphaP1, { color: 'transparent' });
	figure.hideElement(rayVA);
	const rayVB = figure.createRay(alphaV, alphaP2, { color: 'transparent' });
	figure.hideElement(rayVB);
	const circleVHidden = figure.createCircleByRadius(alphaV, numeric(R_TRANSPORT));
	figure.hideElement(circleVHidden);
	const circleVpHidden = figure.createCircleByRadius(ctx.args.ids[1], numeric(R_TRANSPORT));
	figure.hideElement(circleVpHidden);

	// Side selection : `(alphaP1 − V)` and the direction from V to the
	// chosen intersection should be co-oriented (positive dot product).
	const VAx = aP1x - V.x;
	const VAy = aP1y - V.y;
	const VBx = aP2x - V.x;
	const VBy = aP2y - V.y;
	const dVA = Math.hypot(VAx, VAy);
	const dVB = Math.hypot(VBx, VBy);
	const ApxRef = V.x + (R_TRANSPORT / Math.max(dVA, 1e-12)) * VAx;
	const ApyRef = V.y + (R_TRANSPORT / Math.max(dVA, 1e-12)) * VAy;
	const BpxRef = V.x + (R_TRANSPORT / Math.max(dVB, 1e-12)) * VBx;
	const BpyRef = V.y + (R_TRANSPORT / Math.max(dVB, 1e-12)) * VBy;

	// Probe index 0 vs index 1 to pick the right side. We rely on the
	// initial positions ; the geometry-core API guarantees the index
	// ordering is stable as long as the parents do not undergo a
	// topological flip.
	const probeAprime = figure.createIntersectionLC(rayVA, circleVHidden, 0, {
		color: 'transparent'
	});
	figure.hideElement(probeAprime);
	const probePos = figure.getPosition(probeAprime);
	const probeX = probePos ? geoToNumber(probePos.x) : V.x;
	const probeY = probePos ? geoToNumber(probePos.y) : V.y;
	const distIdx0ToA = Math.hypot(probeX - ApxRef, probeY - ApyRef);
	const distIdx1ToA = Math.hypot(
		probeX + (V.x - probeX) * 2 - ApxRef,
		probeY + (V.y - probeY) * 2 - ApyRef
	);
	const indexA: 0 | 1 = distIdx0ToA <= distIdx1ToA ? 0 : 1;
	// Same probe for B.
	const probeBprime = figure.createIntersectionLC(rayVB, circleVHidden, 0, {
		color: 'transparent'
	});
	figure.hideElement(probeBprime);
	const probeBpos = figure.getPosition(probeBprime);
	const probeBx = probeBpos ? geoToNumber(probeBpos.x) : V.x;
	const probeBy = probeBpos ? geoToNumber(probeBpos.y) : V.y;
	const distIdx0ToB = Math.hypot(probeBx - BpxRef, probeBy - BpyRef);
	const distIdx1ToB = Math.hypot(
		probeBx + (V.x - probeBx) * 2 - BpxRef,
		probeBy + (V.y - probeBy) * 2 - BpyRef
	);
	const indexB: 0 | 1 = distIdx0ToB <= distIdx1ToB ? 0 : 1;

	const Aprime = figure.createIntersectionLC(rayVA, circleVHidden, indexA);
	figure.hideElement(Aprime);
	const Bprime = figure.createIntersectionLC(rayVB, circleVHidden, indexB);
	figure.hideElement(Bprime);

	hiddenSupport.push(rayVA, rayVB, circleVHidden, circleVpHidden, probeAprime, probeBprime);

	// ─── Visible arcs (animated by the chore) ───────────────────────────────
	// Arc at V : reactive start/end = direction(V→A') and direction(V→B').
	const VxS = figure.createScalarCoordinate(alphaV, 'x');
	const VyS = figure.createScalarCoordinate(alphaV, 'y');
	const ApxS = figure.createScalarCoordinate(Aprime, 'x');
	const ApyS = figure.createScalarCoordinate(Aprime, 'y');
	const BpxS = figure.createScalarCoordinate(Bprime, 'x');
	const BpyS = figure.createScalarCoordinate(Bprime, 'y');
	const VpxS = figure.createScalarCoordinate(ctx.args.ids[1], 'x');
	const VpyS = figure.createScalarCoordinate(ctx.args.ids[1], 'y');
	const AppxS = figure.createScalarCoordinate(Adoubleprime, 'x');
	const AppyS = figure.createScalarCoordinate(Adoubleprime, 'y');
	const BppxS = figure.createScalarCoordinate(Bdoubleprime, 'x');
	const BppyS = figure.createScalarCoordinate(Bdoubleprime, 'y');

	const arcVStartScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(ApyS) ?? 0) - (vals.get(VyS) ?? 0),
				(vals.get(ApxS) ?? 0) - (vals.get(VxS) ?? 0)
			),
		[VxS, VyS, ApxS, ApyS]
	);
	const arcVEndScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(BpyS) ?? 0) - (vals.get(VyS) ?? 0),
				(vals.get(BpxS) ?? 0) - (vals.get(VxS) ?? 0)
			),
		[VxS, VyS, BpxS, BpyS]
	);
	const arcV = figure.createArcByAngles(
		alphaV,
		numeric(R_TRANSPORT),
		{ scalarRef: arcVStartScalar },
		{ scalarRef: arcVEndScalar }
	);
	figure.hideElement(arcV);

	// Small arc at V' centered on (V'→A''), span 60° total. The visible arc
	// is short — the gesture says "I just want to mark where the radius
	// crosses the rayon de direction" — much cleaner than a full sweep.
	const dirAppAngleScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(AppyS) ?? 0) - (vals.get(VpyS) ?? 0),
				(vals.get(AppxS) ?? 0) - (vals.get(VpxS) ?? 0)
			),
		[VpxS, VpyS, AppxS, AppyS]
	);
	const arcVpStartScalar = figure.createScalarExpression(
		(vals) => (vals.get(dirAppAngleScalar) ?? 0) - SMALL_ARC_HALF_SWEEP,
		[dirAppAngleScalar]
	);
	const arcVpEndScalar = figure.createScalarExpression(
		(vals) => (vals.get(dirAppAngleScalar) ?? 0) + SMALL_ARC_HALF_SWEEP,
		[dirAppAngleScalar]
	);
	const arcVp = figure.createArcByAngles(
		ctx.args.ids[1],
		numeric(R_TRANSPORT),
		{ scalarRef: arcVpStartScalar },
		{ scalarRef: arcVpEndScalar }
	);
	figure.hideElement(arcVp);

	// Reactive chord |A'B'| (also the radius of the 3rd arc).
	const chordScalar = figure.createScalarExpression(
		(vals) =>
			Math.hypot(
				(vals.get(BpxS) ?? 0) - (vals.get(ApxS) ?? 0),
				(vals.get(BpyS) ?? 0) - (vals.get(ApyS) ?? 0)
			),
		[ApxS, ApyS, BpxS, BpyS]
	);

	// Small arc at A'' centered on (A''→B'').
	const dirBppFromAppAngleScalar = figure.createScalarExpression(
		(vals) =>
			Math.atan2(
				(vals.get(BppyS) ?? 0) - (vals.get(AppyS) ?? 0),
				(vals.get(BppxS) ?? 0) - (vals.get(AppxS) ?? 0)
			),
		[AppxS, AppyS, BppxS, BppyS]
	);
	const arcAppStartScalar = figure.createScalarExpression(
		(vals) => (vals.get(dirBppFromAppAngleScalar) ?? 0) - SMALL_ARC_HALF_SWEEP,
		[dirBppFromAppAngleScalar]
	);
	const arcAppEndScalar = figure.createScalarExpression(
		(vals) => (vals.get(dirBppFromAppAngleScalar) ?? 0) + SMALL_ARC_HALF_SWEEP,
		[dirBppFromAppAngleScalar]
	);
	const arcApp = figure.createArcByAngles(
		Adoubleprime,
		{ scalarRef: chordScalar },
		{ scalarRef: arcAppStartScalar },
		{ scalarRef: arcAppEndScalar }
	);
	figure.hideElement(arcApp);

	// ─── Segment trace (V', B'') for the final ruler step ───────────────────
	const segmentTrace = figure.createSegment(ctx.args.ids[1], Bdoubleprime);
	figure.hideElement(segmentTrace);

	hiddenSupport.push(
		VxS,
		VyS,
		ApxS,
		ApyS,
		BpxS,
		BpyS,
		VpxS,
		VpyS,
		AppxS,
		AppyS,
		BppxS,
		BppyS,
		arcVStartScalar,
		arcVEndScalar,
		dirAppAngleScalar,
		arcVpStartScalar,
		arcVpEndScalar,
		chordScalar,
		dirBppFromAppAngleScalar,
		arcAppStartScalar,
		arcAppEndScalar
	);

	// ─── Initial scalar values for first-frame instrument positioning ───────
	const angleVA0 = Math.atan2(ApyRef - V.y, ApxRef - V.x);
	const angleVB0 = Math.atan2(BpyRef - V.y, BpxRef - V.x);
	// Use the shorter of the two oriented sweeps (avoid 270° gestures when
	// the angle is well under 180°). Clamp to [MIN_ARC_LENGTH/r, 2π].
	let sweepRaw = angleVB0 - angleVA0;
	while (sweepRaw <= -Math.PI) sweepRaw += 2 * Math.PI;
	while (sweepRaw > Math.PI) sweepRaw -= 2 * Math.PI;
	const sweepAtV0 = Math.abs(sweepRaw);
	const arcVStart0 = sweepRaw >= 0 ? angleVA0 : angleVB0;

	const dirAppX0 = Appx - Vprime.x;
	const dirAppY0 = Appy - Vprime.y;
	const angleVpToApp0 = Math.atan2(dirAppY0, dirAppX0);
	const arcVpStart0 = angleVpToApp0 - SMALL_ARC_HALF_SWEEP;

	const chord0 = Math.hypot(Bppx - Appx, Bppy - Appy);
	const angleAppToBpp0 = Math.atan2(Bppy - Appy, Bppx - Appx);
	const arcAppStart0 = angleAppToBpp0 - SMALL_ARC_HALF_SWEEP;

	// Segment trace : start at V', oriented toward B''.
	const segLen0 = Math.max(
		SEGMENT_TRACE_LENGTH_DEFAULT / 4,
		Math.hypot(Bppx - Vprime.x, Bppy - Vprime.y)
	);
	const segRotDeg0 = (Math.atan2(Bppy - Vprime.y, Bppx - Vprime.x) * 180) / Math.PI;

	return {
		V,
		Vprime,
		Adoubleprime,
		Bdoubleprime,
		Aprime,
		Bprime,
		arcV,
		arcVp,
		arcApp,
		segmentTrace,
		initial: {
			Apx: ApxRef,
			Apy: ApyRef,
			Bpx: BpxRef,
			Bpy: BpyRef,
			Appx,
			Appy,
			Bppx,
			Bppy,
			sweepAtV: sweepAtV0,
			arcVStart: arcVStart0,
			arcVpStart: arcVpStart0,
			arcAppStart: arcAppStart0,
			chord0,
			traceStartX: Vprime.x,
			traceStartY: Vprime.y,
			segLength: segLen0,
			segRotationDeg: segRotDeg0
		},
		hiddenSupport
	};
}

function buildTransporteEuclide(ctx: ChoreographyCtx): ChoreographyResult {
	const setup = setupTransporteGeometry(ctx);
	if (!setup) {
		// Defensive : the builtin should have thrown long before. Return an
		// empty animation so the executor degrades gracefully (just shows β
		// instantly without animation, same as the legacy behavior).
		return {
			subSteps: [],
			produced: { principal: ctx.principalId, charnieres: [], traces: [] }
		};
	}

	const {
		V,
		Vprime,
		Adoubleprime,
		Bdoubleprime,
		Aprime,
		Bprime,
		arcV,
		arcVp,
		arcApp,
		segmentTrace,
		initial,
		hiddenSupport
	} = setup;

	const arcVLength = Math.max(MIN_ARC_LENGTH, R_TRANSPORT * initial.sweepAtV);
	const arcVpLength = Math.max(MIN_ARC_LENGTH, R_TRANSPORT * 2 * SMALL_ARC_HALF_SWEEP);
	const arcAppLength = Math.max(MIN_ARC_LENGTH, initial.chord0 * 2 * SMALL_ARC_HALF_SWEEP);
	// Direction A' → B' (radians, initial value) for the compass-measure
	// sub-step where the compass opens from A' to B' to capture |A'B'|.
	const angleApBp_0 = Math.atan2(initial.Bpy - initial.Apy, initial.Bpx - initial.Apx);

	const subSteps: SubStep[] = [
		// SS1 : compass at V, arc that crosses (VA) at A' and (VB) at B'.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: V.x, y: V.y, rotation: (initial.arcVStart * 180) / Math.PI },
			compassRadius: R_TRANSPORT,
			geometricDistance: arcVLength,
			animateDrawableIds: [arcV],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "Compas en V, on trace l'arc qui coupe les côtés"
		},
		// SS2 : compass slides to V' (same opening r), short arc on the
		// direction toward A''.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: {
				x: Vprime.x,
				y: Vprime.y,
				rotation: (initial.arcVpStart * 180) / Math.PI
			},
			compassRadius: R_TRANSPORT,
			geometricDistance: arcVpLength,
			animateDrawableIds: [arcVp],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "Compas en V' (même ouverture), petit arc sur la direction"
		},
		// SS3 : A', B' and A'' fade in (the witnesses produced by the 2 arcs).
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [Aprime, Bprime, Adoubleprime],
			animateLineIds: [],
			instruction: "On marque A', B' (sur les côtés de α) et A'' (sur la direction)"
		},
		// SS4 : compass at A', opens to B' (measures |A'B'|).
		{
			kind: 'compass-measure',
			instrument: 'compass',
			instrumentTarget: {
				x: initial.Apx,
				y: initial.Apy,
				rotation: (angleApBp_0 * 180) / Math.PI
			},
			compassRadius: initial.chord0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "Compas en A', on prend la mesure |A'B'|"
		},
		// SS5 : compass moves to A'' keeping opening |A'B'|, traces arc
		// oriented toward B''.
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: {
				x: initial.Appx,
				y: initial.Appy,
				rotation: (initial.arcAppStart * 180) / Math.PI
			},
			compassRadius: initial.chord0,
			geometricDistance: arcAppLength,
			animateDrawableIds: [arcApp],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "On reporte cette ouverture en A'' et on trace un arc"
		},
		// SS5 : B'' fade in (intersection of arc(V', r) with arc(A'', |A'B'|)).
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [Bdoubleprime],
			animateLineIds: [],
			instruction: "Les deux arcs se coupent en B''"
		},
		// SS6 : ruler + pencil trace the segment V' → B''.
		{
			kind: 'ruler-trace',
			instrument: 'ruler',
			secondaryInstrument: 'pencil',
			instrumentTarget: {
				x: initial.traceStartX,
				y: initial.traceStartY,
				rotation: initial.segRotationDeg
			},
			geometricDistance: initial.segLength,
			animateDrawableIds: [segmentTrace],
			animatePointIds: [],
			animateLineIds: [],
			instruction: "Règle de V' à B'' : on trace le second côté de β"
		}
	];

	return {
		subSteps,
		produced: {
			principal: ctx.principalId,
			// Charnières = points sémantiques utiles dans @squelette (les
			// témoins de la construction).
			charnieres: [Aprime, Bprime, Adoubleprime, Bdoubleprime],
			// Traces = gestes au compas, valables en @complet.
			traces: [arcV, arcVp, arcApp],
			traceTags: new Map<string, TraceTag>([
				[arcV, 'arc'],
				[arcVp, 'arc'],
				[arcApp, 'arc']
			]),
			// Hidden support : the segment-trace duplicates the 2nd side of β
			// (already in the figure as a side of the angle) — keep hidden
			// after the animation to avoid visual doubling.
			hiddenSupport: [segmentTrace, ...hiddenSupport]
		}
	};
}

export const VOIES_TRANSPORTE_EUCLIDE: readonly Voie[] = [
	{
		id: 'compas_report',
		nom_humain: 'Report au compas (Euclide I.23)',
		source: 'Euclide, Éléments I.23',
		description:
			"Compas en `V`, écartement `r = 1`, arc qui coupe les côtés en `A'` et `B'`. Compas en `V'` même ouverture, arc qui coupe la direction en `A''`. Compas écarté à `|A'B'|`, placé en `A''`, arc qui croise le précédent en `B''`. Règle de `V'` à `B''` trace le second côté de β.",
		defaut: true,
		choreography: buildTransporteEuclide
	}
];
