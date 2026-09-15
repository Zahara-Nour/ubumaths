/**
 * Asymptotes d'une fraction rationnelle, par division euclidienne.
 *
 * Le numérique sonde la courbe très loin et extrapole : il paie la précision
 * en bruit, plafonne au degré 2 et laisse passer quelques faux positifs sur
 * les oscillations. Quand l'expression est une fraction rationnelle, rien de
 * tout cela n'est nécessaire — le quotient de P par Q **est** l'asymptote, et
 * il s'écrit exactement.
 *
 * Symbolique d'abord, numérique en repli : hors des fractions rationnelles,
 * ce module rend `null` sans bruit et l'analyse reprend son chemin de sondage.
 *
 * @module grapheur/asymptotes-exactes
 */

import type { MathNode } from '$lib/mathAST/types';
import { toLatex } from '$lib/mathAST/latex-generator';
import { rationalQuotient } from '$lib/mathAST/normal/rational-quotient';
import type { HorizontalAsymptote, ObliqueAsymptote, PolynomialAsymptote } from './types';

/** Les trois familles d'asymptotes que la division euclidienne tranche d'un coup. */
export interface ExactAsymptotes {
	readonly horizontal: readonly HorizontalAsymptote[];
	readonly oblique: readonly ObliqueAsymptote[];
	readonly polynomial: readonly PolynomialAsymptote[];
}

/**
 * Les asymptotes exactes de `expression`, ou `null` pour laisser la main au
 * numérique.
 *
 * Le degré du quotient décide de la famille : 0 → horizontale, 1 → oblique,
 * ≥ 2 → courbe. Une fraction rationnelle a la même asymptote des deux côtés —
 * un quotient ne change pas de signe selon qu'on parte vers +∞ ou vers −∞ —
 * d'où `direction: 'both'` partout.
 *
 * @param expression - L'AST de la courbe, paramètres déjà substitués
 * @param functionId - Identifiant de la courbe, reporté sur chaque asymptote
 */
export function exactAsymptotes(expression: MathNode, functionId: string): ExactAsymptotes | null {
	const found = rationalQuotient(expression, 'x');
	if (found === null) return null;

	const { quotient, coefficients } = found;
	const exactLatex = `y = ${toLatex(quotient)}`;
	const degree = coefficients.length - 1;

	if (degree <= 0) {
		return {
			horizontal: [{ y: coefficients[0], functionId, direction: 'both', exactLatex }],
			oblique: [],
			polynomial: []
		};
	}

	if (degree === 1) {
		return {
			horizontal: [],
			oblique: [
				{ m: coefficients[1], b: coefficients[0], functionId, direction: 'both', exactLatex }
			],
			polynomial: []
		};
	}

	return {
		horizontal: [],
		oblique: [],
		polynomial: [{ coefficients, functionId, direction: 'both', exactLatex }]
	};
}
