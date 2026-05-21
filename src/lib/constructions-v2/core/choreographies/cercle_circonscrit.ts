/**
 * Choreographies for the `cercle_circonscrit(A, B, C)` builtin.
 *
 * V1 voie under `@euclide` (single canonical path, no method override) :
 *
 * - Sub-choreography `mediatrice(A, B) @euclide` → line m1 visible.
 * - Sub-choreography `mediatrice(B, C) @euclide` → line m2 visible.
 * - Intersection O (charnière) fade-in.
 * - Compass measures |OA|, then draws the circle at O.
 *
 * This is the **composition-in-chain** test case. The choreography uses
 * `ctx.sub` to delegate the 2 mediatrices' animations without duplicating
 * the construction code. The parent creates the mediatrice lines (m1, m2)
 * via `figure` factory calls, then invokes `ctx.sub('mediatrice', ...)`
 * which generates the sub-steps for each mediatrice's compass + ruler
 * animation.
 *
 * Sub-step layout for the canonical voie `mediatrices` :
 *   SS1..SS4  — sub-mediatrice(A, B) : 4 sub-steps (2 compass-draw + fade-in + ruler).
 *   SS5       — line-fade-in m1 (the mediatrice line, after its ruler trace).
 *   SS6..SS9  — sub-mediatrice(B, C) : 4 sub-steps.
 *   SS10      — line-fade-in m2.
 *   SS11      — point-fade-in O (intersection of m1 and m2).
 *   SS12      — compass-measure |OA| (compass at O, opens to A).
 *   SS13      — compass-draw the circumscribed circle (full 360° sweep at O).
 *
 * Total : 13 sub-steps for a single `cercle_circonscrit @euclide` statement.
 */

import { exact } from '$lib/geometry-core/types/geo-value';
import { numericNode } from '$lib/mathAST/common/numeric';
import type { Voie, ChoreographyFn, ChoreographyResult, SubStep } from './types';

const PI_OVER_2 = Math.PI / 2;

function buildMediatricesChoreography(ctx: Parameters<ChoreographyFn>[0]): ChoreographyResult {
	const { figure, args, principalId, visibilite, sub } = ctx;
	const [Aid, Bid, Cid] = args.ids;
	const [A, B, C] = args.coords;

	// Hide the principal circle — revealed at end by `applyFinalVisibility`.
	figure.hideElement(principalId);

	// ─── Build m1 = mediatrice(AB) and m2 = mediatrice(BC) ───
	// Construction recipe (mirrors `buildPerpendicularBisector` in the
	// builtin, but produces VISIBLE lines that the sub-chorégraphie will
	// hide-then-reveal). The midpoint and rotated point are kept hidden.
	const M_AB = figure.createMidpoint(Aid, Bid);
	figure.hideElement(M_AB);
	const H_AB = figure.createRotatedPoint(Aid, M_AB, exact(numericNode(PI_OVER_2)));
	figure.hideElement(H_AB);
	const m1 = figure.createLine(M_AB, H_AB);
	figure.hideElement(m1);

	const M_BC = figure.createMidpoint(Bid, Cid);
	figure.hideElement(M_BC);
	const H_BC = figure.createRotatedPoint(Bid, M_BC, exact(numericNode(PI_OVER_2)));
	figure.hideElement(H_BC);
	const m2 = figure.createLine(M_BC, H_BC);
	figure.hideElement(m2);

	// O = intersection(m1, m2) (= circumcenter). Created hidden.
	const O = figure.createIntersectionLL(m1, m2);
	figure.hideElement(O);

	// ─── Sub-chorégraphies for m1 and m2 ───
	// Triple : @euclide @arcs_egaux (default voie of mediatrice).
	const subTriple = { contrainte: 'euclide' as const, methode: null, visibilite } as const;
	const sub1 = sub('mediatrice', { ids: [Aid, Bid], coords: [A, B] }, m1, subTriple);
	const sub2 = sub('mediatrice', { ids: [Bid, Cid], coords: [B, C] }, m2, subTriple);

	// ─── Geometry for the final cercle draw ───
	// O coordinates (initial, for compass positioning). Re-derive from
	// the analytic formula : circumcenter of (A, B, C).
	const ax = A.x,
		ay = A.y;
	const bx = B.x,
		by = B.y;
	const cx = C.x,
		cy = C.y;
	const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
	const Ox0 =
		((ax * ax + ay * ay) * (by - cy) +
			(bx * bx + by * by) * (cy - ay) +
			(cx * cx + cy * cy) * (ay - by)) /
		d;
	const Oy0 =
		((ax * ax + ay * ay) * (cx - bx) +
			(bx * bx + by * by) * (ax - cx) +
			(cx * cx + cy * cy) * (bx - ax)) /
		d;
	const OA0 = Math.hypot(ax - Ox0, ay - Oy0);
	const angleOA_0 = Math.atan2(ay - Oy0, ax - Ox0);
	const cercleCircumference = 2 * Math.PI * OA0;

	// ─── Own sub-steps ───
	const ownSubSteps: SubStep[] = [
		// Line-fade-in m1 (the first mediatrice line appears after its
		// compass+ruler construction).
		{
			kind: 'line-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [m1],
			instruction: 'La médiatrice de [AB] apparaît'
		}
	];
	const ownSubSteps2: SubStep[] = [
		// Line-fade-in m2 (after the second mediatrice's construction).
		{
			kind: 'line-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [m2],
			instruction: 'La médiatrice de [BC] apparaît'
		},
		// Intersection O of the 2 mediatrices.
		{
			kind: 'point-fade-in',
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [O],
			animateLineIds: [],
			instruction: 'Les médiatrices se croisent en O, centre du cercle'
		},
		// Compass measures |OA| (compass at O, opens to A).
		{
			kind: 'compass-measure',
			instrument: 'compass',
			instrumentTarget: { x: Ox0, y: Oy0, rotation: (angleOA_0 * 180) / Math.PI },
			compassRadius: OA0,
			geometricDistance: 0,
			animateDrawableIds: [],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'Compas en O, on prend la mesure |OA|'
		},
		// Compass draws the circle (full 360° around O).
		{
			kind: 'compass-draw',
			instrument: 'compass',
			instrumentTarget: { x: Ox0, y: Oy0, rotation: (angleOA_0 * 180) / Math.PI },
			compassRadius: OA0,
			geometricDistance: cercleCircumference,
			animateDrawableIds: [principalId],
			animatePointIds: [],
			animateLineIds: [],
			instruction: 'On trace le cercle circonscrit passant par A, B, C'
		}
	];

	// ─── Concatenate : sub1 + line-fade m1 + sub2 + line-fade m2 + O + measure + draw ───
	const allSubSteps = [...sub1.subSteps, ...ownSubSteps, ...sub2.subSteps, ...ownSubSteps2];

	// ─── Re-classify produced from subs ───
	// m1, m2, O are charnières of cercle_circonscrit.
	// Sub-mediatrices' arcs are pedagogical traces (visible in @complet).
	// Sub-mediatrices' I1/I2 (sub.charnieres) are NOT meaningful at the
	// cercle_circonscrit level — they're construction artifacts, hide always.
	// Sub-mediatrices' hiddenSupport stays hidden.
	const subTraces = [...sub1.produced.traces, ...sub2.produced.traces];
	const subHidden = [
		...(sub1.produced.hiddenSupport ?? []),
		...(sub2.produced.hiddenSupport ?? []),
		...sub1.produced.charnieres,
		...sub2.produced.charnieres,
		// Hidden helper points/lines built here.
		M_AB,
		H_AB,
		M_BC,
		H_BC
	];

	return {
		subSteps: allSubSteps,
		produced: {
			principal: principalId,
			charnieres: [m1, m2, O],
			traces: subTraces,
			hiddenSupport: subHidden
		}
	};
}

const mediatricesChoreography: ChoreographyFn = (ctx) => buildMediatricesChoreography(ctx);

export const VOIES_CERCLE_CIRCONSCRIT_EUCLIDE: readonly Voie[] = [
	{
		id: 'mediatrices',
		nom_humain: 'Intersection des médiatrices',
		source: 'Construction canonique',
		description:
			'Le centre `O` du cercle circonscrit est l’intersection des médiatrices des trois côtés (deux suffisent). Le rayon est `|OA|`. La chorégraphie compose deux médiatrices au compas puis trace le cercle.',
		defaut: true,
		choreography: mediatricesChoreography
	}
];
