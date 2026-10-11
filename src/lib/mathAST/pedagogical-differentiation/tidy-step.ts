/**
 * L'étape finale « On simplifie » d'une dérivation
 *
 * Les règles de dérivation laissent la dérivée brute : `3 \cdot 2x`,
 * `e^{3x} \cdot 3`, `\cos x + (-\sin x)`. La dernière ligne affichée doit être
 * la dérivée RANGÉE (`tidyTerms` : `tidy` terme à terme, l'ordre de la règle
 * gardé), dans l'atelier comme dans les corrections de questions — d'où cette
 * étape, ajoutée par les deux appelants après le rendu.
 *
 * Née dans l'atelier (`atelier/derive-steps.ts`, retours de David
 * 2026-10-04) ; partagée ici depuis le 2026-10-06.
 *
 * @module mathAST/pedagogical-differentiation/tidy-step
 */

import type { MathNode } from '../types';
import type { RenderedStep } from '../common/step-renderer-base';
import { toLatex } from '../latex-generator';
import { tidyTerms } from '../tidy/terms';
import { transformAST } from '../visitor';

/** Les étapes complétées, et la dérivée rangée qu'elles démontrent. */
export interface TidiedDerivation {
	readonly steps: readonly RenderedStep[];
	/** La dérivée rangée (`tidyTerms`) — la dernière ligne des étapes. */
	readonly derivative: MathNode;
	readonly derivativeLatex: string;
}

/**
 * Le même arbre, avec un `×` explicite entre deux nombres : `3 \cdot 3x^2`
 * s'écrivait `3 3 x^2`, lu « 33x² » dans l'étape « On simplifie » (revue).
 */
function withExplicitNumberProducts(node: MathNode): MathNode {
	const startsWithNumber = (n: MathNode): boolean =>
		n.type === 'number' ||
		(n.type === 'multiplication' && startsWithNumber(n.left)) ||
		(n.type === 'superscript' && startsWithNumber(n.base));
	return transformAST(node, {
		leaveMultiplication: (n) =>
			startsWithNumber(n.right) ? { ...n, displayStyle: 'cross' } : undefined
	});
}

/**
 * Ajoute l'étape « On simplifie » quand la mise au propre CHANGE l'écriture de
 * la dérivée ; sinon les étapes sont rendues telles quelles.
 *
 * @param steps - Les étapes déjà rendues (`PedagogicalDifferentiationRenderer`)
 * @param derivative - La dérivée brute (`result.derivative`)
 */
export function withTidyStep(
	steps: readonly RenderedStep[],
	derivative: MathNode
): TidiedDerivation {
	const tidied = tidyTerms(derivative);
	const derivativeLatex = toLatex(tidied);
	if (derivativeLatex === toLatex(derivative)) {
		return { steps, derivative: tidied, derivativeLatex };
	}
	const raw = toLatex(withExplicitNumberProducts(derivative));
	// Le niveau et la verbosité suivent les étapes rendues : l'explication
	// n'apparaît que si le renderer en a donné (verbosité « detailed »)
	const last = steps.at(-1);
	const step: RenderedStep = {
		id: steps.length + 1,
		rule: 'simplify',
		title: 'On simplifie',
		...(last?.explanation !== undefined && {
			explanation: 'On calcule les produits et on regroupe les termes.'
		}),
		expressionLatex: `${raw} = ${derivativeLatex}`,
		...(last?.schoolLevel !== undefined && { schoolLevel: last.schoolLevel })
	};
	return {
		steps: [...steps, step],
		derivative: tidied,
		derivativeLatex
	};
}
