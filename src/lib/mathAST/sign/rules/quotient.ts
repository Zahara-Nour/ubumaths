/**
 * Quotient Sign Rules
 *
 * Determines the sign of a quotient based on the signs of numerator and denominator.
 *
 * Mathematical rules (assuming denominator != 0 on the interval):
 * - positive / positive = positive
 * - negative / negative = positive
 * - positive / negative = negative
 * - negative / positive = negative
 * - zero / anything (non-zero) = zero
 * - unknown / anything = unknown
 * - anything / unknown = unknown
 *
 * @module mathAST/sign/rules/quotient
 */

import type { Sign } from '../types';

/**
 * Determines the sign of a quotient: a / b
 *
 * Assumes b != 0 on the interval being analyzed.
 * The division b = 0 case should be handled separately in domain analysis.
 *
 * The sign rules are identical to multiplication:
 * - Same signs produce positive result
 * - Different signs produce negative result
 * - Zero numerator produces zero result
 * - Unknown propagates
 *
 * @param signNumerator - The sign of the numerator
 * @param signDenominator - The sign of the denominator
 * @returns The sign of the quotient a / b
 *
 * @example
 * signOfQuotient('positive', 'positive') // => 'positive'
 * signOfQuotient('negative', 'negative') // => 'positive'
 * signOfQuotient('positive', 'negative') // => 'negative'
 * signOfQuotient('zero', 'positive') // => 'zero'
 */
export function signOfQuotient(signNumerator: Sign, signDenominator: Sign): Sign {
	// If numerator is zero and denominator is non-zero, result is zero
	if (signNumerator === 'zero') {
		// If denominator is also zero, this is undefined (0/0)
		// We treat this as unknown since domain analysis should catch it
		if (signDenominator === 'zero') {
			return 'unknown';
		}
		return 'zero';
	}

	// If denominator is zero, result is undefined (but we assume this doesn't happen on the interval)
	// We treat this as unknown to be safe
	if (signDenominator === 'zero') {
		return 'unknown';
	}

	// Unknown propagates
	if (signNumerator === 'unknown' || signDenominator === 'unknown') {
		return 'unknown';
	}

	// Both signs are now either 'positive' or 'negative'
	// Same signs produce positive, different signs produce negative
	if (signNumerator === signDenominator) {
		return 'positive';
	}

	return 'negative';
}
