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
 * Phase 4 will fill in the `choreography` functions.
 */

import type { Voie, ChoreographyFn } from './types';

const NOT_YET_IMPLEMENTED: ChoreographyFn = (ctx) => ({
	subSteps: [],
	produced: { principal: ctx.principalId, charnieres: [], traces: [] }
});

export const VOIES_BISSECTRICE_EUCLIDE: readonly Voie[] = [
	{
		id: 'arcs_egaux',
		nom_humain: 'Arcs égaux d’Euclide (I.9)',
		source: 'Euclide, Éléments I.9',
		description:
			"Cercle de centre `V` coupe `(VA)` en `A'` et `(VB)` en `B'`. Deux arcs égaux centrés en `A'` et `B'` se coupent en `P`. La bissectrice est la droite `(VP)`.",
		defaut: true,
		choreography: NOT_YET_IMPLEMENTED
	},
	{
		id: 'arc_milieu',
		nom_humain: 'Arc et milieu',
		source: 'Variante par milieu',
		description:
			"Cercle de centre `V` coupe `(VA)` en `A'` et `(VB)` en `B'`. Le milieu `M` de `[A'B']` est sur la bissectrice ; on trace `(VM)`.",
		defaut: false,
		choreography: NOT_YET_IMPLEMENTED
	}
];
