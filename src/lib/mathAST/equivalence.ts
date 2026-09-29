/**
 * MathAST Expression Equivalence
 *
 * Checks if two MathNode expressions are mathematically equivalent.
 * Works on symbolic expressions (with variables) and numeric expressions alike.
 */

import type { MathNode } from './types';
import { equivalenceForms, type NormalizeAbortOptions } from './normal/normalize';
import { normalFormsEquivalent } from './normal/hash';
import { evaluate, evaluateNodeToApproximatedNumber } from './eval/evaluate';
import { numbersAreClose } from './common/constants';
import { AbortError, makeAbortChecker } from './common/abort';

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
 */
export function areEquivalent(a: MathNode, b: MathNode, options?: NormalizeAbortOptions): boolean {
	const abortChecker = makeAbortChecker(options?.signal, options?.timeoutMs);
	const ctx = abortChecker ? { abortChecker } : undefined;

	// Try structural equivalence via normalization
	try {
		const [formA, formB] = equivalenceForms(a, b, ctx);
		return normalFormsEquivalent(formA, formB);
	} catch (e) {
		// On abort, return false (conservative — we couldn't prove equivalence).
		// Any other normalization failure falls through to the numeric fallback.
		if (e instanceof AbortError) return false;
	}

	try {
		const evalA = evaluate(a, { mode: 'decimal' });
		const evalB = evaluate(b, { mode: 'decimal' });

		if (evalA.status === 'value' && evalB.status === 'value') {
			const numA =
				typeof evalA.value === 'number'
					? evalA.value
					: typeof evalA.value === 'object' && 'type' in evalA.value
						? evaluateNodeToApproximatedNumber(evalA.value)
						: NaN;
			const numB =
				typeof evalB.value === 'number'
					? evalB.value
					: typeof evalB.value === 'object' && 'type' in evalB.value
						? evaluateNodeToApproximatedNumber(evalB.value)
						: NaN;

			if (!isNaN(numA) && !isNaN(numB)) {
				// Tolérance relative : une absolue (1e-10) jugeait 10⁻¹² égal à 0
				return numbersAreClose(numA, numB);
			}
		}
	} catch {
		// Numeric comparison also failed
	}

	return false;
}
