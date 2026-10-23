/**
 * Points de la droite d restés cachés — forme `parallele(P, d)` /
 * `perpendiculaire(P, d)`.
 *
 * L'exécuteur ramène `(P, d)` à `(P, A, B)` avec les deux points qui portent
 * d. Ces points peuvent être cachés (ex. `d = mediatrice(A, B)`, ou le
 * second point de `d = perpendiculaire(C, A, B)`). Une voie qui pose un
 * instrument SUR l'un d'eux (compas en A, mesure |PA|, coin de l'équerre
 * sur A) le fait d'abord apparaître en fondu : on ne pose pas la pointe du
 * compas sur un point invisible. Le point révélé est ensuite classé comme
 * les autres points auxiliaires de la voie (visible en `@complet` seulement).
 *
 * Les voies qui n'utilisent que la direction de d n'en ont pas besoin.
 */

import type {
	ChoreographyCtx,
	ChoreographyFn,
	ChoreographyResult,
	SubStep,
	TraceTag
} from './types';

/**
 * Joue `build`, précédé d'une sous-étape `point-fade-in` pour ceux des
 * points `usedIds` (des points de d sur lesquels la voie pose un
 * instrument) qui sont cachés. Sans point caché, `build` est rendu tel quel.
 */
export function revealHiddenUsedPoints(
	ctx: ChoreographyCtx,
	usedIds: readonly string[],
	build: ChoreographyFn
): ChoreographyResult {
	const hidden = usedIds.filter((id) => ctx.figure.getElementById(id)?.visible === false);
	const result = build(ctx);
	if (hidden.length === 0) return result;
	const fadeIn: SubStep = {
		kind: 'point-fade-in',
		geometricDistance: 0,
		animateDrawableIds: [],
		animatePointIds: hidden,
		animateLineIds: [],
		instruction:
			hidden.length === 1
				? 'On choisit un point de la droite'
				: 'On choisit deux points de la droite'
	};
	const traceTags = new Map<string, TraceTag>(result.produced.traceTags ?? []);
	for (const id of hidden) traceTags.set(id, 'auxiliary-point');
	return {
		subSteps: [fadeIn, ...result.subSteps],
		produced: {
			...result.produced,
			traces: [...result.produced.traces, ...hidden],
			traceTags
		}
	};
}
