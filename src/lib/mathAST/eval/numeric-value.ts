/**
 * Valeur approchée d'un nœud constant
 *
 * Une seule enveloppe de `evaluateNodeToApproximatedNumber` pour les appelants
 * qui veulent « un nombre ou rien » : l'exception et les non-finis deviennent
 * `null`. Évalue toutes les constantes (π, e, √2, fractions…), pas seulement
 * les rationnels.
 *
 * @module mathAST/eval/numeric-value
 */

import type { MathNode } from '../types';
import { evaluateNodeToApproximatedNumber } from './evaluate';

/**
 * Valeur numérique finie d'un nœud constant.
 *
 * `null` si le nœud contient une variable, si l'évaluation lève, ou si la
 * valeur n'est pas finie (±∞, NaN).
 */
export function computeNumericValue(node: MathNode): number | null {
	try {
		const value = evaluateNodeToApproximatedNumber(node);
		return Number.isFinite(value) ? value : null;
	} catch {
		return null;
	}
}

/**
 * Comme `computeNumericValue`, mais ±∞ passent : un nœud `infinity` ou une
 * évaluation infinie rend ±Infinity. `null` seulement si l'évaluation lève ou
 * rend NaN (bornes d'intervalles, images d'intervalles).
 */
export function computeNumericValueOrInfinity(node: MathNode): number | null {
	if (node.type === 'infinity') return node.sign === 'positive' ? Infinity : -Infinity;
	try {
		const value = evaluateNodeToApproximatedNumber(node);
		return Number.isNaN(value) ? null : value;
	} catch {
		return null;
	}
}
