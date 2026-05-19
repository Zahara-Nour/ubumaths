/**
 * Choreographies for the `mediatrice(A, B)` builtin.
 *
 * V1 voies under `@euclide` :
 *
 * - `arcs_egaux` (default, Euclid I.10) : two circles of equal radius r > AB/2
 *   centered at A and B, two intersection points (above and below AB),
 *   ruler through them.
 *
 * - `cercles_rayon_ab` : variation where r = |AB| exactly. Visually neater
 *   (each circle passes through the other endpoint) ; pedagogically nice for
 *   showing rhombus symmetry.
 *
 * Phase 4 V1 minimal : each choreography creates auxiliary elements
 * (compass arcs, intersection points) in the figure so the existing
 * animation pipeline picks them up via `_lastStepNewElementIds`.
 * Sequential animation (sub-steps) is deferred to V1.1.
 */

import type { Voie, ChoreographyFn } from './types';

/**
 * Build the `arcs_egaux` auxiliary geometry : 2 circles of radius `r` centered
 * at A and B, and their 2 intersection points. Returns the result categorising
 * the produced elements.
 *
 * The principal element (the median line itself) was already created by the
 * `mediatrice` builtin before this choreography ran ; we just add the
 * pedagogical auxiliaries on top.
 *
 * Implementation note : all auxiliary scalars (radius, angles) are built as
 * reactive `createScalarExpression` derivations of the source points' x/y
 * coordinates. This makes the arcs, hidden circles, and intersection points
 * follow A and B in real time when the user drags either endpoint.
 */
/**
 * Arc half-span around the AB direction. 60° on each side = 120° total ;
 * with a radius ≥ AB/2, this comfortably contains the two perpendicular
 * bisector intersection points regardless of the chosen `radiusFactor`.
 */
const ARC_HALF_SPAN = Math.PI / 3;

function buildArcsEgaux(
	ctx: Parameters<ChoreographyFn>[0],
	radiusFactor: number
): ReturnType<ChoreographyFn> {
	const { figure, args, principalId } = ctx;
	const [Aid, Bid] = args.ids;
	const [A, B] = args.coords;
	const ab = Math.hypot(B.x - A.x, B.y - A.y);
	if (!Number.isFinite(ab) || ab <= 0) {
		// Degenerate case (A == B) : skip the choreography ; the builtin's
		// own degeneracy check will have surfaced an error already.
		return {
			steps: [],
			produced: { principal: principalId, charnieres: [], traces: [] }
		};
	}
	// All choreography elements built reactively below, so dragging A or B
	// updates the arcs, hidden circles, and intersection points in real time.
	const dAB = figure.createScalarDistance(Aid, Bid);
	const rScalar = figure.createScalarExpression((sv) => radiusFactor * (sv.get(dAB) ?? 0), [dAB]);
	const Ax = figure.createScalarCoordinate(Aid, 'x');
	const Ay = figure.createScalarCoordinate(Aid, 'y');
	const Bx = figure.createScalarCoordinate(Bid, 'x');
	const By = figure.createScalarCoordinate(Bid, 'y');
	const angleAB = figure.createScalarExpression(
		(sv) =>
			Math.atan2((sv.get(By) ?? 0) - (sv.get(Ay) ?? 0), (sv.get(Bx) ?? 0) - (sv.get(Ax) ?? 0)),
		[Ax, Ay, Bx, By]
	);
	const angleBA = figure.createScalarExpression(
		(sv) => (sv.get(angleAB) ?? 0) + Math.PI,
		[angleAB]
	);
	const angleA_start = figure.createScalarExpression(
		(sv) => (sv.get(angleAB) ?? 0) - ARC_HALF_SPAN,
		[angleAB]
	);
	const angleA_end = figure.createScalarExpression(
		(sv) => (sv.get(angleAB) ?? 0) + ARC_HALF_SPAN,
		[angleAB]
	);
	const angleB_start = figure.createScalarExpression(
		(sv) => (sv.get(angleBA) ?? 0) - ARC_HALF_SPAN,
		[angleBA]
	);
	const angleB_end = figure.createScalarExpression(
		(sv) => (sv.get(angleBA) ?? 0) + ARC_HALF_SPAN,
		[angleBA]
	);
	// Full circles are needed by `createIntersectionCC` to compute the two
	// intersection points — kept invisible. (`createCircleByRadius` hardcodes
	// `visible: true`, so we hide explicitly via `hideElement`.)
	const cercleAhidden = figure.createCircleByRadius(Aid, { scalarRef: rScalar });
	figure.hideElement(cercleAhidden);
	const cercleBhidden = figure.createCircleByRadius(Bid, { scalarRef: rScalar });
	figure.hideElement(cercleBhidden);
	const inter1 = figure.createIntersectionCC(cercleAhidden, cercleBhidden, 0);
	const inter2 = figure.createIntersectionCC(cercleAhidden, cercleBhidden, 1);
	// Visible arcs : reactive radius + reactive angles. Drag A or B and the
	// arcs adjust their center, radius, and orientation.
	const arcA = figure.createArcByAngles(
		Aid,
		{ scalarRef: rScalar },
		{ scalarRef: angleA_start },
		{ scalarRef: angleA_end }
	);
	const arcB = figure.createArcByAngles(
		Bid,
		{ scalarRef: rScalar },
		{ scalarRef: angleB_start },
		{ scalarRef: angleB_end }
	);
	return {
		steps: [],
		produced: {
			principal: principalId,
			charnieres: [inter1, inter2],
			traces: [arcA, arcB, cercleAhidden, cercleBhidden]
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
			'Deux cercles de même rayon `r > AB/2` centrés en `A` et `B` se coupent en deux points équidistants des deux extrémités. Une règle posée sur ces deux points trace la médiatrice.',
		defaut: true,
		choreography: arcsEgauxChoreography
	},
	{
		id: 'cercles_rayon_ab',
		nom_humain: 'Cercles de rayon AB',
		source: 'Variante visuelle',
		description:
			'Cas particulier où `r = AB` : chaque cercle passe par l’autre extrémité. Le quadrilatère formé est un losange, et la médiatrice en est l’une des diagonales.',
		defaut: false,
		choreography: cerclesRayonAbChoreography
	}
];
