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

import { exact } from '$lib/geometry-core/types/geo-value';
import { numericNode } from '$lib/mathAST/common/numeric';
import type { Voie, ChoreographyFn } from './types';

/**
 * Build the `arcs_egaux` auxiliary geometry : 2 circles of radius `r` centered
 * at A and B, and their 2 intersection points. Returns the result categorising
 * the produced elements.
 *
 * The principal element (the median line itself) was already created by the
 * `mediatrice` builtin before this choreography ran ; we just add the
 * pedagogical auxiliaries on top.
 */
function buildArcsEgaux(
	ctx: Parameters<ChoreographyFn>[0],
	radiusFactor: number
): ReturnType<ChoreographyFn> {
	const { figure, args, principalId } = ctx;
	const [Aid, Bid] = args.ids;
	const [A, B] = args.coords;
	const ab = Math.hypot(B.x - A.x, B.y - A.y);
	const r = radiusFactor * ab;
	const rValue = exact(numericNode(r));
	// Two compass arcs centered at A and B with equal radius r.
	const cercleA = figure.createCircleByRadius(Aid, rValue);
	const cercleB = figure.createCircleByRadius(Bid, rValue);
	// Two intersection points (the perpendicular bisector passes through both).
	const inter1 = figure.createIntersectionCC(cercleA, cercleB, 0);
	const inter2 = figure.createIntersectionCC(cercleA, cercleB, 1);
	return {
		steps: [],
		produced: {
			principal: principalId,
			charnieres: [inter1, inter2],
			traces: [cercleA, cercleB]
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
