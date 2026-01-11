/**
 * Product Sign Rules
 *
 * Determines the sign of a product based on the signs of its factors.
 *
 * Mathematical rules:
 * - positive * positive = positive
 * - negative * negative = positive
 * - positive * negative = negative
 * - zero * anything = zero
 * - unknown * anything = unknown (unless the other is zero)
 *
 * @module mathAST/sign/rules/product
 */

import type { Sign } from '../types';

/**
 * Determines the sign of a product: a * b
 *
 * The sign of a product follows the standard multiplication rules:
 * - Same signs produce positive result
 * - Different signs produce negative result
 * - Zero dominates (anything times zero is zero)
 * - Unknown propagates (unless multiplied by zero)
 *
 * @param signA - The sign of the first factor
 * @param signB - The sign of the second factor
 * @returns The sign of the product a * b
 *
 * @example
 * signOfProduct('positive', 'positive') // => 'positive'
 * signOfProduct('negative', 'negative') // => 'positive'
 * signOfProduct('positive', 'negative') // => 'negative'
 * signOfProduct('zero', 'unknown') // => 'zero'
 */
export function signOfProduct(signA: Sign, signB: Sign): Sign {
	// Zero dominates: 0 * anything = 0
	if (signA === 'zero' || signB === 'zero') {
		return 'zero';
	}

	// Unknown propagates (but we already handled zero above)
	if (signA === 'unknown' || signB === 'unknown') {
		return 'unknown';
	}

	// Both signs are now either 'positive' or 'negative'
	// Same signs produce positive, different signs produce negative
	if (signA === signB) {
		return 'positive';
	}

	return 'negative';
}

/**
 * Determines the sign of a product with multiple factors.
 *
 * Uses the rule that the product is:
 * - zero if any factor is zero
 * - unknown if any factor is unknown (and none is zero)
 * - negative if an odd number of factors are negative
 * - positive if an even number of factors are negative
 *
 * @param signs - The signs of all factors
 * @returns The sign of the product
 *
 * @example
 * signOfProductMultiple(['positive', 'negative', 'negative']) // => 'positive'
 * signOfProductMultiple(['negative', 'negative', 'negative']) // => 'negative'
 * signOfProductMultiple(['positive', 'zero', 'negative']) // => 'zero'
 */
export function signOfProductMultiple(signs: readonly Sign[]): Sign {
	// Empty product is 1 (multiplicative identity is positive)
	if (signs.length === 0) {
		return 'positive';
	}

	let negativeCount = 0;

	for (const sign of signs) {
		// Zero dominates
		if (sign === 'zero') {
			return 'zero';
		}

		// Unknown propagates
		if (sign === 'unknown') {
			return 'unknown';
		}

		if (sign === 'negative') {
			negativeCount++;
		}
	}

	// Odd number of negatives -> negative, even -> positive
	return negativeCount % 2 === 0 ? 'positive' : 'negative';
}
