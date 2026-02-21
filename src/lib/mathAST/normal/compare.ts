/**
 * MathAST Normal Form - Canonical Ordering
 *
 * Centralized module for comparing and ordering elements in canonical form.
 * Re-exports comparison functions from domain modules and adds higher-level
 * ordering utilities (radical arrays, algebraic terms, validation).
 *
 * Note: compareNormalTerms and sortNormalTerms are defined here AND in term.ts
 * independently (identical logic) to avoid a circular dependency:
 * algebraic.ts → compare.ts → term.ts → algebraic.ts
 *
 * Ordering hierarchy:
 * - Level 1: SimplifiedRadical ordering (from radical.ts)
 * - Level 2: AlgebraicTerm ordering (this module)
 * - Level 3: SymbolicFactor ordering (from monomial.ts)
 * - Level 4: NormalTerm ordering (this module + term.ts)
 */

import type { SimplifiedRadical, AlgebraicTerm, NormalTerm, ComparisonResult } from './types';
import { compareRational } from './rational';
import { hashRadicalArray, hashAlgebraicCoefficient } from './hash';

// Re-export domain comparison functions for centralized access
export { compareRadicals } from './radical';
export { compareSymbolicFactors, compareMonomials, sortSymbolicFactors } from './monomial';

// Import for internal use
import { compareRadicals } from './radical';
import { compareSymbolicFactors, compareMonomials } from './monomial';

// =============================================================================
// Level 1: Radical Array Ordering
// =============================================================================

/**
 * Compares two radical arrays lexicographically.
 *
 * Used for comparing the radical part of AlgebraicTerms.
 *
 * @param a - First radical array (must be sorted)
 * @param b - Second radical array (must be sorted)
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 *
 * @example
 * // [sqrt(2)] < [sqrt(3)]
 * compareRadicalArrays([sqrt2], [sqrt3]) // -1
 *
 * // [sqrt(2)] < [sqrt(2), sqrt(3)]
 * compareRadicalArrays([sqrt2], [sqrt2, sqrt3]) // -1
 *
 * // [] < [sqrt(2)] (pure rational before radicals)
 * compareRadicalArrays([], [sqrt2]) // -1
 */
export function compareRadicalArrays(
	a: readonly SimplifiedRadical[],
	b: readonly SimplifiedRadical[]
): ComparisonResult {
	const minLen = Math.min(a.length, b.length);

	// Compare element by element
	for (let i = 0; i < minLen; i++) {
		const cmp = compareRadicals(a[i], b[i]);
		if (cmp !== 0) return cmp;
	}

	// If all common elements are equal, shorter array comes first
	if (a.length < b.length) return -1;
	if (a.length > b.length) return 1;

	return 0;
}

/**
 * Checks if two radical arrays are equal.
 *
 * @param a - First radical array
 * @param b - Second radical array
 * @returns true if arrays contain identical radicals
 */
export function equalRadicalArrays(
	a: readonly SimplifiedRadical[],
	b: readonly SimplifiedRadical[]
): boolean {
	if (a.length !== b.length) return false;

	for (let i = 0; i < a.length; i++) {
		if (a[i].index !== b[i].index || a[i].radicand !== b[i].radicand) {
			return false;
		}
	}

	return true;
}

// =============================================================================
// Level 2: AlgebraicTerm Ordering
// =============================================================================

/**
 * Compares two algebraic terms for canonical ordering.
 *
 * Order:
 * 1. Real terms before imaginary terms
 * 2. Pure rationals first (fewer radicals = simpler)
 * 3. By lexicographic comparison of radical arrays
 * 4. By rational coefficient value
 *
 * This produces the canonical order for coefficients:
 * 3 < 5 < sqrt(2) < 2*sqrt(2) < sqrt(3) < 3i < 5i < sqrt(2)i
 *
 * @param a - First algebraic term
 * @param b - Second algebraic term
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 */
export function compareAlgebraicTerms(a: AlgebraicTerm, b: AlgebraicTerm): ComparisonResult {
	// 1. Real terms before imaginary terms
	const aHasI = a.hasImaginaryUnit === true;
	const bHasI = b.hasImaginaryUnit === true;
	if (aHasI !== bHasI) {
		return aHasI ? 1 : -1; // Real (no i) comes first
	}

	// 2. Compare by number of radicals (fewer = simpler = first)
	if (a.radicals.length !== b.radicals.length) {
		return a.radicals.length < b.radicals.length ? -1 : 1;
	}

	// 3. Same number of radicals, compare lexicographically
	const radicalCmp = compareRadicalArrays(a.radicals, b.radicals);
	if (radicalCmp !== 0) return radicalCmp;

	// 4. Same radicals, compare by rational coefficient
	return compareRational(a.rational, b.rational);
}

/**
 * Checks if two algebraic terms have the same "signature".
 *
 * Two terms can be combined (added) if they have the same signature,
 * meaning identical radical parts AND same imaginary flag.
 *
 * @param a - First algebraic term
 * @param b - Second algebraic term
 * @returns true if terms have identical radical parts and imaginary flag
 */
export function sameRadicalSignature(a: AlgebraicTerm, b: AlgebraicTerm): boolean {
	if ((a.hasImaginaryUnit === true) !== (b.hasImaginaryUnit === true)) {
		return false;
	}
	return equalRadicalArrays(a.radicals, b.radicals);
}

/**
 * Gets the "signature" of an algebraic term.
 * This is used as a key for grouping terms that can be combined.
 * Includes both the radical part and the imaginary flag.
 *
 * @param term - An algebraic term
 * @returns The signature string
 */
export function getRadicalSignature(term: AlgebraicTerm): string {
	const radicalHash = hashRadicalArray(term.radicals);
	if (term.hasImaginaryUnit === true) {
		return radicalHash === '' ? 'i' : `${radicalHash}*i`;
	}
	return radicalHash;
}

// =============================================================================
// Sorting Utilities
// =============================================================================

/**
 * Sorts an array of simplified radicals in canonical order.
 *
 * @param radicals - Array of radicals to sort
 * @returns A new sorted array
 */
export function sortRadicals(radicals: readonly SimplifiedRadical[]): SimplifiedRadical[] {
	return [...radicals].sort(compareRadicals);
}

/**
 * Sorts an array of algebraic terms in canonical order.
 *
 * @param terms - Array of terms to sort
 * @returns A new sorted array
 */
export function sortAlgebraicTerms(terms: readonly AlgebraicTerm[]): AlgebraicTerm[] {
	return [...terms].sort(compareAlgebraicTerms);
}

// =============================================================================
// Level 3: SymbolicFactor Validation
// =============================================================================

/**
 * Checks if a symbolic factor array is in canonical order.
 *
 * @param factors - Array of factors to check
 * @returns true if sorted in ascending order
 */
export function isSymbolicFactorArraySorted(
	factors: readonly import('./types').SymbolicFactor[]
): boolean {
	for (let i = 1; i < factors.length; i++) {
		if (compareSymbolicFactors(factors[i - 1], factors[i]) > 0) {
			return false;
		}
	}
	return true;
}

// =============================================================================
// Level 4: NormalTerm Ordering
// =============================================================================

/**
 * Compares two normal terms for canonical ordering.
 *
 * Note: This is intentionally duplicated in term.ts to avoid a circular
 * dependency (algebraic.ts → compare.ts → term.ts → algebraic.ts).
 * Both implementations use hashAlgebraicCoefficient from hash.ts.
 *
 * Order (graded lexicographic):
 * 1. By monomial (higher degree first, then lex)
 * 2. By coefficient
 *
 * @param a - First term
 * @param b - Second term
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 */
export function compareNormalTerms(a: NormalTerm, b: NormalTerm): ComparisonResult {
	// 1. Compare by monomial
	const monomialCmp = compareMonomials(a.monomial, b.monomial);
	if (monomialCmp !== 0) return monomialCmp;

	// 2. Same monomial, compare by coefficient
	const hashA = hashAlgebraicCoefficient(a.coefficient);
	const hashB = hashAlgebraicCoefficient(b.coefficient);

	if (hashA < hashB) return -1;
	if (hashA > hashB) return 1;

	return 0;
}

/**
 * Sorts an array of normal terms in canonical order.
 *
 * @param terms - Array of terms to sort
 * @returns A new sorted array
 */
export function sortNormalTerms(terms: readonly NormalTerm[]): NormalTerm[] {
	return [...terms].sort(compareNormalTerms);
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Checks if a radical array is in canonical order.
 *
 * @param radicals - Array of radicals to check
 * @returns true if sorted in ascending order
 */
export function isRadicalArraySorted(radicals: readonly SimplifiedRadical[]): boolean {
	for (let i = 1; i < radicals.length; i++) {
		if (compareRadicals(radicals[i - 1], radicals[i]) > 0) {
			return false;
		}
	}
	return true;
}

/**
 * Checks if an algebraic term array is in canonical order.
 *
 * @param terms - Array of terms to check
 * @returns true if sorted in ascending order
 */
export function isAlgebraicTermArraySorted(terms: readonly AlgebraicTerm[]): boolean {
	for (let i = 1; i < terms.length; i++) {
		if (compareAlgebraicTerms(terms[i - 1], terms[i]) > 0) {
			return false;
		}
	}
	return true;
}

/**
 * Checks if a normal term array is in canonical order.
 *
 * @param terms - Array of terms to check
 * @returns true if sorted in ascending order
 */
export function isNormalTermArraySorted(terms: readonly NormalTerm[]): boolean {
	for (let i = 1; i < terms.length; i++) {
		if (compareNormalTerms(terms[i - 1], terms[i]) > 0) {
			return false;
		}
	}
	return true;
}
