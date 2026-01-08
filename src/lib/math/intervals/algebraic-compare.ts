/**
 * Algebraic Comparison - Exact Numerical Comparison on the Real Line
 *
 * Compares AlgebraicCoefficients NUMERICALLY (order on R).
 * NOT to be confused with compareAlgebraicTerms() which is for CANONICAL ordering.
 *
 * Pattern (consistent with mathAST evaluate.ts):
 * 1. Try exact comparison (rationals, squaring for radicals)
 * 2. Fall back to floating-point (algebraicToNumber())
 * 3. Return result with `exact` flag indicating reliability
 */

import type { AlgebraicCoefficient, AlgebraicTerm, Rational } from '$lib/mathAST/normal/types';
import { compareRational, mulRational, isNegative, isZero } from '$lib/mathAST/normal/rational';
import {
	algebraicEquals,
	getRationalValue,
	algebraicToNumber
} from '$lib/mathAST/normal/algebraic';
import type { AlgebraicCompareResult, CompareResult } from './types';

// =============================================================================
// Main Comparison Function
// =============================================================================

/**
 * Compares two algebraic coefficients NUMERICALLY (order on R).
 *
 * IMPORTANT: This is different from compareAlgebraicTerms() which is for
 * canonical polynomial ordering, not numerical comparison!
 *
 * @param a - First algebraic coefficient
 * @param b - Second algebraic coefficient
 * @returns Comparison result with exactness flag
 *
 * @example
 * // Exact rational comparison
 * compareAlgebraicNumerically(1/3, 1/2) // { result: -1, exact: true }
 *
 * // Exact radical comparison via squaring
 * compareAlgebraicNumerically(sqrt(2), sqrt(3)) // { result: -1, exact: true }
 *
 * // Fallback for complex expressions
 * compareAlgebraicNumerically(sqrt(2)+sqrt(3), 3) // { result: ..., exact: false }
 */
export function compareAlgebraicNumerically(
	a: AlgebraicCoefficient,
	b: AlgebraicCoefficient
): AlgebraicCompareResult {
	// Case 0: Structural equality (same canonical form)
	if (algebraicEquals(a, b)) {
		return { result: 0, exact: true };
	}

	// Case 1: Both pure rationals -> exact comparison via compareRational()
	const rationalA = getRationalValue(a);
	const rationalB = getRationalValue(b);
	if (rationalA !== null && rationalB !== null) {
		return { result: compareRational(rationalA, rationalB), exact: true };
	}

	// Case 2: Both single radical terms -> exact comparison via squaring
	if (isSingleRadicalTerm(a) && isSingleRadicalTerm(b)) {
		const exactResult = compareSingleRadicalTermsExact(a.terms[0], b.terms[0]);
		if (exactResult !== null) {
			return { result: exactResult, exact: true };
		}
	}

	// Case 3: Rational vs single radical term -> exact comparison via squaring
	if (rationalA !== null && isSingleRadicalTerm(b)) {
		const exactResult = compareRationalVsRadicalExact(rationalA, b.terms[0]);
		if (exactResult !== null) {
			return { result: exactResult, exact: true };
		}
	}
	if (rationalB !== null && isSingleRadicalTerm(a)) {
		const exactResult = compareRationalVsRadicalExact(rationalB, a.terms[0]);
		if (exactResult !== null) {
			// Flip the result since we compared b vs a
			return { result: -exactResult as CompareResult, exact: true };
		}
	}

	// Case 4: NUMERIC FALLBACK (consistent with mathAST pattern)
	const numA = algebraicToNumber(a);
	const numB = algebraicToNumber(b);

	// Use relative epsilon for floating-point comparison
	const EPSILON = 1e-10;
	const diff = numA - numB;
	const maxAbs = Math.max(Math.abs(numA), Math.abs(numB), 1);
	if (Math.abs(diff) < EPSILON * maxAbs) {
		return { result: 0, exact: false };
	}
	if (diff < 0) return { result: -1, exact: false };
	return { result: 1, exact: false };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if an algebraic coefficient is a single term with exactly one square root.
 * These can be compared exactly via squaring.
 *
 * Valid: 3*sqrt(2), -sqrt(5), (1/2)*sqrt(3)
 * Invalid: sqrt(2)+sqrt(3), sqrt(2)*sqrt(3), cbrt(2)
 */
function isSingleRadicalTerm(a: AlgebraicCoefficient): boolean {
	if (a.terms.length !== 1) return false;
	const term = a.terms[0];
	// Must have exactly one radical with index 2 (square root)
	if (term.radicals.length !== 1) return false;
	return term.radicals[0].index === 2n;
}

/**
 * Compares two single radical terms exactly via squaring.
 *
 * For terms (r1 * sqrt(a)) vs (r2 * sqrt(b)):
 * - If same sign: compare |r1|^2 * a vs |r2|^2 * b (exact rationals)
 * - If different signs: negative < positive
 *
 * @returns Comparison result, or null if cannot compare exactly
 */
function compareSingleRadicalTermsExact(a: AlgebraicTerm, b: AlgebraicTerm): CompareResult | null {
	// Handle signs
	const signA = isNegative(a.rational) ? -1 : isZero(a.rational) ? 0 : 1;
	const signB = isNegative(b.rational) ? -1 : isZero(b.rational) ? 0 : 1;

	// Handle zero cases
	if (signA === 0 && signB === 0) return 0;
	if (signA === 0) return signB > 0 ? -1 : 1;
	if (signB === 0) return signA > 0 ? 1 : -1;

	// Different signs: negative < positive
	if (signA !== signB) {
		return signA < signB ? -1 : 1;
	}

	// Same sign: compare absolute values via squaring
	// |r1 * sqrt(a)|^2 = r1^2 * a
	const sqA = computeSquaredValue(a);
	const sqB = computeSquaredValue(b);

	if (sqA === null || sqB === null) {
		return null; // Cannot compute exactly
	}

	const cmp = compareRational(sqA, sqB);

	// If both negative, flip the result
	// (e.g., -3 < -2 means |−3| > |−2|, so cmp would be 1, we return -1)
	return signA < 0 ? (-cmp as CompareResult) : cmp;
}

/**
 * Compares a pure rational vs a single radical term exactly.
 *
 * For r vs (c * sqrt(a)):
 * - If different signs: compare directly
 * - If same sign: compare r^2 vs c^2 * a (exact rationals)
 *
 * @returns Comparison result (rational vs radical), or null if cannot compare
 */
function compareRationalVsRadicalExact(
	rational: Rational,
	radical: AlgebraicTerm
): CompareResult | null {
	const signR = isNegative(rational) ? -1 : isZero(rational) ? 0 : 1;
	const signRad = isNegative(radical.rational) ? -1 : isZero(radical.rational) ? 0 : 1;

	// Handle zero cases
	if (signR === 0 && signRad === 0) return 0;
	if (signR === 0) return signRad > 0 ? -1 : 1;
	if (signRad === 0) return signR > 0 ? 1 : -1;

	// Different signs
	if (signR !== signRad) {
		return signR < signRad ? -1 : 1;
	}

	// Same sign: compare via squaring
	// r^2 vs c^2 * a
	const rSquared = mulRational(rational, rational);
	const radSquared = computeSquaredValue(radical);

	if (radSquared === null) {
		return null;
	}

	const cmp = compareRational(rSquared, radSquared);

	// If both negative, flip the result
	return signR < 0 ? (-cmp as CompareResult) : cmp;
}

/**
 * Computes (rational^2 * product of radicands) as an exact Rational.
 *
 * For term (r * sqrt(a)): returns r^2 * a
 * For term (r * sqrt(a) * sqrt(b)): returns r^2 * a * b
 *
 * Only supports square roots (index === 2).
 *
 * Note: Currently only called after isSingleRadicalTerm check, which guarantees
 * exactly one radical. The loop handles the general case for future extensibility.
 *
 * @returns Squared value as Rational, or null if cannot compute (non-square-root radicals)
 */
function computeSquaredValue(term: AlgebraicTerm): Rational | null {
	// r^2 = n^2/d^2
	let result = mulRational(term.rational, term.rational);

	// Multiply by each radicand: (sqrt(a))^2 = a
	for (const rad of term.radicals) {
		if (rad.index !== 2n) {
			// Only square roots can be squared exactly
			return null;
		}
		// (sqrt(radicand))^2 = radicand
		result = mulRational(result, { n: rad.radicand, d: 1n });
	}

	return result;
}
