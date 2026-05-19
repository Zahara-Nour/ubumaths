/**
 * Choreographies for the `cercle_circonscrit(A, B, C)` builtin.
 *
 * V1 voie under `@euclide` (single canonical path, no method override) :
 *
 * - Sub-choreography `mediatrice(A, B) @euclide @squelette` → line m1 visible.
 * - Sub-choreography `mediatrice(B, C) @euclide @squelette` → line m2 visible.
 * - Intersection O (charnière, fade-in).
 * - Compass at O with radius |OA| → trace circle.
 *
 * This is the **composition-in-chain** test case. The choreography relies on
 * `ctx.sub` to delegate to `mediatrice` choreographies without duplicating
 * their logic.
 *
 * Phase 4 will fill in the `choreography` function.
 */

import type { Voie, ChoreographyFn } from './types';

const NOT_YET_IMPLEMENTED: ChoreographyFn = (ctx) => ({
	subSteps: [],
	produced: { principal: ctx.principalId, charnieres: [], traces: [] }
});

export const VOIES_CERCLE_CIRCONSCRIT_EUCLIDE: readonly Voie[] = [
	{
		id: 'mediatrices',
		nom_humain: 'Intersection des médiatrices',
		source: 'Construction canonique',
		description:
			'Le centre `O` du cercle circonscrit est l’intersection des médiatrices des trois côtés (deux suffisent). Le rayon est `|OA|`. La chorégraphie compose deux médiatrices au compas puis trace le cercle.',
		defaut: true,
		choreography: NOT_YET_IMPLEMENTED
	}
];
