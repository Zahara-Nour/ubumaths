/**
 * MathAST Expression Equivalence
 *
 * Checks if two MathNode expressions are mathematically equivalent.
 * Works on symbolic expressions (with variables) and numeric expressions alike.
 * Le moteur vit dans `equivalence-core.ts` ; ce module y ajoute la traduction
 * des hypothèses de l'énoncé (ADR 0012) par `numtype`.
 */

import type { MathNode } from './types';
import type { NormalizeAbortOptions } from './normal/normalize';
import { assumptionOracle, type AnswerAssumptions } from './assumptions';
import { areEquivalentCore } from './equivalence-core';

/**
 * Options du décideur : interruption (`signal`, `timeoutMs`) et hypothèses de
 * l'énoncé (ADR 0012).
 */
export interface EquivalenceOptions extends NormalizeAbortOptions {
	/**
	 * Hypothèses déclarées par la question (`{ x: 'positive' }`) : la
	 * comparaison se fait sur le domaine déclaré. Absent ou vide : comportement
	 * sans hypothèse, strictement identique.
	 */
	readonly assumptions?: AnswerAssumptions;
}

/**
 * Checks if two MathNodes are mathematically equivalent.
 *
 * Uses normalization for structural equivalence (handles polynomials,
 * fractions, trig special values, etc.). Falls back to numeric comparison
 * if normalization fails.
 *
 * @param a - First MathNode
 * @param b - Second MathNode
 * @returns true if expressions are mathematically equivalent
 *
 * @example
 * areEquivalent(parse('x^2 - 1'), parse('(x-1)(x+1)'))  // true
 * areEquivalent(parse('2x + 3'), parse('3 + 2x'))        // true
 * areEquivalent(parse('sqrt(2)'), parse('sqrt(2)'))       // true
 * areEquivalent(parse('x^a x^b'), parse('x^{a+b}'), { assumptions: { x: 'positive' } }) // true
 */
export function areEquivalent(a: MathNode, b: MathNode, options?: EquivalenceOptions): boolean {
	const assumptions = assumptionOracle(options?.assumptions);
	return areEquivalentCore(a, b, {
		...(options?.signal && { signal: options.signal }),
		...(options?.timeoutMs !== undefined && { timeoutMs: options.timeoutMs }),
		...(assumptions && { assumptions })
	});
}
