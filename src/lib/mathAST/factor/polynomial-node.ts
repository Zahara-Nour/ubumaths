/**
 * Écrire un polynôme à coefficients entiers en `MathNode`.
 *
 * Déplacé de `normal/rules/trig-multiple-arcs.ts` (ADR 0024, lot 1), qui
 * l'importe désormais d'ici : il écrit les polynômes de Tchebychev, le noyau
 * de factorisation ses facteurs. Les coefficients négatifs deviennent des
 * soustractions (`x^2 - 2x - 1`, jamais `x^2 + (-2x)`), et la fabrique refuse
 * les littéraux négatifs : `-3` s'écrit `opposite(number('3'))`.
 */

import type { MathNode } from '../types';
import { add, multiply, number, opposite, parentheses, power, subtract } from '../factory';
import { absBigInt, lcm, rational } from '../normal/rational';
import { rationalToNode } from '../common/numeric';
import { type Poly, integerCoefficients } from './polynomial';

/** Le nœud d'un entier signé. */
export function integerNode(value: bigint): MathNode {
	return value < 0n ? opposite(number((-value).toString())) : number(value.toString());
}

/** `coefficient · variable^degree`, écrit au plus court. */
export function monomialNode(coefficient: bigint, variable: MathNode, degree: number): MathNode {
	const powerPart =
		degree === 0 ? null : degree === 1 ? variable : power(variable, number(degree.toString()));

	if (powerPart === null) {
		return integerNode(coefficient);
	}
	if (coefficient === 1n) {
		return powerPart;
	}
	if (coefficient === -1n) {
		return opposite(powerPart);
	}
	const magnitude = multiply(number(absBigInt(coefficient).toString()), powerPart, 'implicit');
	return coefficient < 0n ? opposite(magnitude) : magnitude;
}

/**
 * Assemble `Σ coefficients[i]·variable^i` (degré croissant), les coefficients
 * nuls omis, du plus haut degré au plus bas. Les coefficients négatifs
 * deviennent des soustractions : l'arbre reste lisible et `normalize` n'a pas
 * d'opposés imbriqués à défaire.
 */
export function polynomialNode(coefficients: readonly bigint[], variable: MathNode): MathNode {
	let result: MathNode | null = null;

	for (let degree = coefficients.length - 1; degree >= 0; degree--) {
		const coefficient = coefficients[degree];
		if (coefficient === 0n) continue;

		if (result === null) {
			result = monomialNode(coefficient, variable, degree);
		} else if (coefficient < 0n) {
			result = subtract(result, monomialNode(-coefficient, variable, degree));
		} else {
			result = add(result, monomialNode(coefficient, variable, degree));
		}
	}

	// Le polynôme nul s'écrit 0 : la fonction reste totale.
	return result ?? number('0');
}

/**
 * Un polynôme à coefficients RATIONNELS : `polynomialNode` s'ils sont entiers,
 * sinon `(1/L)·(L·P)` avec L le PPCM des dénominateurs (`\frac{1}{4}(4x^2 - 1)`).
 */
export function rationalPolynomialNode(p: Poly, variable: MathNode): MathNode {
	const integers = integerCoefficients(p);
	const scale = p.reduce((acc, c) => lcm(acc, c.d), 1n);
	if (scale === 1n) return polynomialNode(integers, variable);
	return multiply(
		rationalToNode(rational(1n, scale)),
		parentheses(polynomialNode(integers, variable)),
		'implicit'
	);
}
