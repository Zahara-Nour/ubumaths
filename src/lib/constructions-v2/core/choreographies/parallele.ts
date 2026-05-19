/**
 * Choreographies for the `parallele(P, A, B)` builtin.
 *
 * V1 voies under `@euclide` :
 *
 * - `parallelogramme` (default, Euclid I.31) : compass at P with radius
 *   |AB| ; compass at A with radius |BP| ; the intersection Q yields a
 *   parallelogram PAQB ; ruler P→Q.
 *
 * - `double_perpendiculaire` : perpendicular through P to (AB) → line e ;
 *   then perpendicular through P to e → parallel to (AB).
 *   Implemented as composed sub-choreography via `ctx.sub`.
 *
 * Phase 4 will fill in the `choreography` functions.
 */

import type { Voie, ChoreographyFn } from './types';

const NOT_YET_IMPLEMENTED: ChoreographyFn = (ctx) => ({
	subSteps: [],
	produced: { principal: ctx.principalId, charnieres: [], traces: [] }
});

export const VOIES_PARALLELE_EUCLIDE: readonly Voie[] = [
	{
		id: 'parallelogramme',
		nom_humain: 'Parallélogramme d’Euclide (I.31)',
		source: 'Euclide, Éléments I.31',
		description:
			'Compas de centre `P` et rayon `|AB|` ; compas de centre `A` et rayon `|BP|`. Leur intersection `Q` forme un parallélogramme `PAQB`. La règle `P→Q` trace la parallèle.',
		defaut: true,
		choreography: NOT_YET_IMPLEMENTED
	},
	{
		id: 'double_perpendiculaire',
		nom_humain: 'Double perpendiculaire',
		source: 'Variante moderne',
		description:
			'Tracer la perpendiculaire à `(AB)` par `P` (droite auxiliaire `e`), puis la perpendiculaire à `e` par `P` : c’est la parallèle à `(AB)`.',
		defaut: false,
		choreography: NOT_YET_IMPLEMENTED
	}
];
