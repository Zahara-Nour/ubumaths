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
 * Phase 4 will fill in the `choreography` functions ; Phase 2 declares the
 * registry shape and the metadata only.
 */

import type { Voie, ChoreographyFn } from './types';

const NOT_YET_IMPLEMENTED: ChoreographyFn = (ctx) => ({
	steps: [],
	produced: { principal: ctx.principalId, charnieres: [], traces: [] }
});

export const VOIES_MEDIATRICE_EUCLIDE: readonly Voie[] = [
	{
		id: 'arcs_egaux',
		nom_humain: 'Arcs égaux d’Euclide (I.10)',
		source: 'Euclide, Éléments I.10',
		description:
			'Deux cercles de même rayon `r > AB/2` centrés en `A` et `B` se coupent en deux points équidistants des deux extrémités. Une règle posée sur ces deux points trace la médiatrice.',
		defaut: true,
		choreography: NOT_YET_IMPLEMENTED
	},
	{
		id: 'cercles_rayon_ab',
		nom_humain: 'Cercles de rayon AB',
		source: 'Variante visuelle',
		description:
			'Cas particulier où `r = AB` : chaque cercle passe par l’autre extrémité. Le quadrilatère formé est un losange, et la médiatrice en est l’une des diagonales.',
		defaut: false,
		choreography: NOT_YET_IMPLEMENTED
	}
];
