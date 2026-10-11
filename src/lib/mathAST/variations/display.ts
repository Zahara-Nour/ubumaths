/**
 * La dérivée telle qu'on l'écrit au-dessus d'un tableau de variations.
 *
 * ⚠️ L'élève lit le SIGNE de f′ dans ce qui est affiché. La règle du quotient
 * rendait `\dfrac{x-2-(x+1)}{(x-2)^2}` pour (x+1)/(x−2) : juste, mais le
 * signe ne s'y lit pas. Le numérateur est donc réduit (`-3`, `x^2-1`,
 * `x^2-2x`) ; le dénominateur, un carré la plupart du temps, reste tel quel.
 * `.dériver` n'est pas concerné : il montre la règle, pas l'étude du signe.
 *
 * @module mathAST/variations/display
 */

import type { MathNode } from '../types';
import { isDivision, isMultiplication, isOpposite } from '../guards';
import { delimiter } from '../factory';
import { mapNode } from '../transforms';
import { simplify } from '../simplify';
import { tidy } from '../tidy';
import { nodeCount, tidyTerms } from '../tidy/terms';
import { toCustom } from '../custom-generator';

/** f′ mise au propre, numérateur d'un quotient développé et réduit. */
export function reducedDerivative(derivative: MathNode): MathNode {
	const tidied = tidyTerms(derivative);
	if (!isDivision(tidied)) return tidied;
	return { ...tidied, numerator: reducedNumerator(tidied.numerator) };
}

/**
 * Le numérateur réduit, s'il n'est pas plus long ; sinon tel quel.
 *
 * ⚠️ Seule une SOMME se réduit (u′v − uv′) : un produit `4x^{1/3}` ressortait
 * `4∛x`, autre écriture que celle de `.dériver`, sans rien gagner au signe.
 */
function reducedNumerator(numerator: MathNode): MathNode {
	if (numerator.type !== 'addition' && numerator.type !== 'subtraction') return numerator;
	try {
		const reduced = tidy(simplify(numerator).result);
		return nodeCount(reduced) <= nodeCount(numerator) ? reduced : numerator;
	} catch {
		return numerator;
	}
}

/**
 * Une expression en notation de texte lisible : `-2/(2x-1)^2`, `(x^2-2x)/(x-1)^2`,
 * jamais les accolades de la notation maison (`{-2}/{(2x-1)^2}`).
 *
 * Les fractions deviennent des divisions EN LIGNE, qui groupent leurs sommes
 * d'elles-mêmes ; un produit ou un quotient au dénominateur est mis entre
 * parenthèses (`1/(2x)`, jamais `1/2x`, qui se lirait (1/2)x).
 */
export function readableText(node: MathNode): string {
	const inline = mapNode(node, (current) => {
		if (!isDivision(current)) return current;
		const { denominator } = current;
		const grouped =
			isMultiplication(denominator) || isDivision(denominator) || isOpposite(denominator)
				? delimiter('parentheses', denominator)
				: denominator;
		return { ...current, denominator: grouped, displayStyle: 'inline' as const };
	});
	return toCustom(inline).replace(/:\//g, '/');
}
