/**
 * MathAST Normal Form - Algebraic Coefficient Operations
 *
 * Arithmetic operations on AlgebraicCoefficient (sums of algebraic terms).
 * Handles expressions like sqrt(2) + sqrt(3) or 3*sqrt(2) + 2*sqrt(3).
 */

import type { AlgebraicTerm, AlgebraicCoefficient, Rational, SimplifiedRadical } from './types';
import {
	addRational,
	mulRational,
	negRational,
	isZero as isZeroRational,
	isOne as isOneRational,
	ONE,
	ZERO
} from './rational';
import { simplifyRadical } from './radical';
import { sortAlgebraicTerms, hashRadicalArray, equalRadicalArrays, sortRadicals } from './compare';

// =============================================================================
// Constants
// =============================================================================

/** Algebraic coefficient zero (empty sum) */
export const ALGEBRAIC_ZERO: AlgebraicCoefficient = { terms: [] };

/** Algebraic coefficient one (rational 1) */
export const ALGEBRAIC_ONE: AlgebraicCoefficient = {
	terms: [{ rational: ONE, radicals: [] }]
};

/** Algebraic coefficient for imaginary unit i */
export const ALGEBRAIC_IMAGINARY: AlgebraicCoefficient = {
	terms: [{ rational: ONE, radicals: [], hasImaginaryUnit: true }]
};

// =============================================================================
// Constructors
// =============================================================================

/**
 * Creates an algebraic term from a rational and optional radicals.
 *
 * @param rational - The rational coefficient
 * @param radicals - Array of simplified radicals (optional, defaults to empty)
 * @returns A canonical AlgebraicTerm with sorted radicals
 *
 * @example
 * algebraicTerm({ n: 3n, d: 1n }, [sqrt2])  // 3*sqrt(2)
 * algebraicTerm({ n: 2n, d: 1n })           // 2 (pure rational)
 */
export function algebraicTerm(
	rational: Rational,
	radicals: SimplifiedRadical[] = []
): AlgebraicTerm {
	// Sort radicals for canonical form
	const sortedRadicals = sortRadicals(radicals);
	return { rational, radicals: sortedRadicals };
}

/**
 * Creates an algebraic coefficient from an array of terms.
 * Combines like terms and eliminates zeros.
 *
 * @param terms - Array of algebraic terms
 * @returns A canonical AlgebraicCoefficient
 *
 * @example
 * algebraicCoefficient([term1, term2, term3])
 */
export function algebraicCoefficient(terms: AlgebraicTerm[]): AlgebraicCoefficient {
	if (terms.length === 0) return ALGEBRAIC_ZERO;

	// Combine like terms
	const combined = combineLikeTerms(terms);

	if (combined.length === 0) return ALGEBRAIC_ZERO;

	// Sort for canonical form
	const sorted = sortAlgebraicTerms(combined);

	return { terms: sorted };
}

/**
 * Creates an algebraic coefficient from a single rational number.
 *
 * @param r - A rational number
 * @returns An AlgebraicCoefficient representing the rational
 *
 * @example
 * algebraicFromRational({ n: 3n, d: 2n })  // 3/2
 */
export function algebraicFromRational(r: Rational): AlgebraicCoefficient {
	if (isZeroRational(r)) return ALGEBRAIC_ZERO;
	return { terms: [{ rational: r, radicals: [] }] };
}

/**
 * Creates an algebraic coefficient from a single simplified radical.
 * The coefficient will be 1 (i.e., 1*radical).
 *
 * @param r - A simplified radical
 * @returns An AlgebraicCoefficient representing the radical
 *
 * @example
 * algebraicFromRadical({ radicand: 2n, index: 2n })  // sqrt(2)
 */
export function algebraicFromRadical(r: SimplifiedRadical): AlgebraicCoefficient {
	return { terms: [{ rational: ONE, radicals: [r] }] };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Creates a hash string for the radicals of a term.
 * Used to identify terms that can be combined.
 *
 * @param radicals - Array of simplified radicals
 * @returns A deterministic hash string
 */
export function hashRadicals(radicals: readonly SimplifiedRadical[]): string {
	return hashRadicalArray(radicals);
}

/**
 * Combines like terms (terms with same radical signature and imaginary flag).
 * Eliminates terms with zero coefficient.
 *
 * @param terms - Array of algebraic terms
 * @returns Array with like terms combined
 */
function combineLikeTerms(terms: AlgebraicTerm[]): AlgebraicTerm[] {
	if (terms.length === 0) return [];

	// Group by signature (radical + imaginary flag)
	const groups = new Map<
		string,
		{ rational: Rational; radicals: readonly SimplifiedRadical[]; hasImaginaryUnit?: boolean }
	>();

	for (const term of terms) {
		// Signature includes both radicals and imaginary flag
		const radicalHash = hashRadicals(term.radicals);
		const sig = term.hasImaginaryUnit === true ? `${radicalHash}*i` : radicalHash;
		const existing = groups.get(sig);

		if (existing) {
			// Add rational coefficients
			const newRational = addRational(existing.rational, term.rational);
			groups.set(sig, {
				rational: newRational,
				radicals: existing.radicals,
				...(term.hasImaginaryUnit === true && { hasImaginaryUnit: true })
			});
		} else {
			groups.set(sig, {
				rational: term.rational,
				radicals: term.radicals,
				...(term.hasImaginaryUnit === true && { hasImaginaryUnit: true })
			});
		}
	}

	// Convert back to array, filtering out zeros
	const result: AlgebraicTerm[] = [];
	for (const [, value] of groups) {
		if (!isZeroRational(value.rational)) {
			result.push({
				rational: value.rational,
				radicals: value.radicals,
				...(value.hasImaginaryUnit === true && { hasImaginaryUnit: true })
			});
		}
	}

	return result;
}

// =============================================================================
// Arithmetic Operations
// =============================================================================

/**
 * Adds two algebraic coefficients.
 *
 * Algorithm:
 * 1. Concatenate all terms from a and b
 * 2. Group by radical signature
 * 3. Add rational coefficients for each group
 * 4. Eliminate zero terms
 * 5. Sort canonically
 *
 * @param a - First algebraic coefficient
 * @param b - Second algebraic coefficient
 * @returns a + b
 *
 * @example
 * // 3*sqrt(2) + 2*sqrt(2) = 5*sqrt(2)
 * addAlgebraic({ terms: [3*sqrt(2)] }, { terms: [2*sqrt(2)] })
 *
 * // sqrt(2) + sqrt(3) stays as sqrt(2) + sqrt(3)
 * addAlgebraic({ terms: [sqrt(2)] }, { terms: [sqrt(3)] })
 */
export function addAlgebraic(
	a: AlgebraicCoefficient,
	b: AlgebraicCoefficient
): AlgebraicCoefficient {
	// Short-circuit for zero
	if (a.terms.length === 0) return b;
	if (b.terms.length === 0) return a;

	// Concatenate all terms
	const allTerms = [...a.terms, ...b.terms];

	// Combine like terms and sort
	return algebraicCoefficient(allTerms);
}

/**
 * Subtracts two algebraic coefficients.
 *
 * @param a - First algebraic coefficient
 * @param b - Second algebraic coefficient
 * @returns a - b
 *
 * @example
 * subAlgebraic({ terms: [5*sqrt(2)] }, { terms: [3*sqrt(2)] })  // 2*sqrt(2)
 */
export function subAlgebraic(
	a: AlgebraicCoefficient,
	b: AlgebraicCoefficient
): AlgebraicCoefficient {
	return addAlgebraic(a, negAlgebraic(b));
}

/**
 * Negates an algebraic coefficient.
 *
 * @param a - An algebraic coefficient
 * @returns -a
 *
 * @example
 * negAlgebraic({ terms: [3*sqrt(2), sqrt(3)] })  // -3*sqrt(2) - sqrt(3)
 */
export function negAlgebraic(a: AlgebraicCoefficient): AlgebraicCoefficient {
	if (a.terms.length === 0) return ALGEBRAIC_ZERO;

	const negatedTerms = a.terms.map((term) => ({
		rational: negRational(term.rational),
		radicals: term.radicals,
		...(term.hasImaginaryUnit === true && { hasImaginaryUnit: true as const })
	}));

	return { terms: negatedTerms };
}

/**
 * Multiplies two algebraic terms.
 *
 * For terms a = r_a * prod(radicals_a) and b = r_b * prod(radicals_b):
 * a * b = (r_a * r_b) * prod(radicals_a) * prod(radicals_b)
 *
 * Radicals must be multiplied carefully, as sqrt(2) * sqrt(2) = 2.
 *
 * @param a - First term
 * @param b - Second term
 * @returns Product as an AlgebraicTerm
 */
function mulTerms(a: AlgebraicTerm, b: AlgebraicTerm): AlgebraicTerm {
	// Multiply rational coefficients
	let rationalProduct = mulRational(a.rational, b.rational);

	if (isZeroRational(rationalProduct)) {
		return { rational: ZERO, radicals: [] };
	}

	// Handle imaginary unit multiplication: i × i = -1
	const aHasI = a.hasImaginaryUnit === true;
	const bHasI = b.hasImaginaryUnit === true;
	let resultHasI: boolean;

	if (aHasI && bHasI) {
		// i × i = -1: multiply coefficient by -1, remove imaginary flag
		rationalProduct = negRational(rationalProduct);
		resultHasI = false;
	} else {
		// XOR: result has i only if exactly one term has i
		resultHasI = aHasI || bHasI;
	}

	// Multiply radical products
	// Group radicals by index and multiply within same index
	const allRadicals = [...a.radicals, ...b.radicals];

	if (allRadicals.length === 0) {
		// Include hasImaginaryUnit only if true (keep objects clean)
		if (resultHasI) {
			return { rational: rationalProduct, radicals: [], hasImaginaryUnit: true };
		}
		return { rational: rationalProduct, radicals: [] };
	}

	// Group by index
	const byIndex = new Map<bigint, SimplifiedRadical[]>();
	for (const rad of allRadicals) {
		const existing = byIndex.get(rad.index) ?? [];
		existing.push(rad);
		byIndex.set(rad.index, existing);
	}

	// Multiply radicals within each index group
	const resultRadicals: SimplifiedRadical[] = [];

	for (const [index, radicals] of byIndex) {
		if (radicals.length === 1) {
			resultRadicals.push(radicals[0]);
		} else {
			// Multiply all radicals with same index
			let product = radicals[0].radicand;
			for (let i = 1; i < radicals.length; i++) {
				product *= radicals[i].radicand;
			}

			// Simplify the product
			const simplified = simplifyRadical(product, index);

			// Extract coefficient into rational
			if (simplified.coefficient !== 1n) {
				rationalProduct = mulRational(rationalProduct, { n: simplified.coefficient, d: 1n });
			}

			// Add remaining radical if not 1
			if (simplified.radicand !== 1n) {
				resultRadicals.push({ radicand: simplified.radicand, index });
			}
		}
	}

	// Sort radicals for canonical form
	const sortedRadicals = sortRadicals(resultRadicals);

	// Include hasImaginaryUnit only if true (keep objects clean)
	if (resultHasI) {
		return { rational: rationalProduct, radicals: sortedRadicals, hasImaginaryUnit: true };
	}
	return { rational: rationalProduct, radicals: sortedRadicals };
}

/**
 * Multiplies two algebraic coefficients.
 *
 * Uses distribution: (sum of a_i) * (sum of b_j) = sum of (a_i * b_j)
 *
 * @param a - First algebraic coefficient
 * @param b - Second algebraic coefficient
 * @returns a * b
 *
 * @example
 * // sqrt(2) * sqrt(3) = sqrt(6)
 * mulAlgebraic({ terms: [sqrt(2)] }, { terms: [sqrt(3)] })
 *
 * // sqrt(2) * sqrt(2) = 2
 * mulAlgebraic({ terms: [sqrt(2)] }, { terms: [sqrt(2)] })
 *
 * // (sqrt(2) + sqrt(3)) * sqrt(2) = 2 + sqrt(6)
 * mulAlgebraic({ terms: [sqrt(2), sqrt(3)] }, { terms: [sqrt(2)] })
 */
export function mulAlgebraic(
	a: AlgebraicCoefficient,
	b: AlgebraicCoefficient
): AlgebraicCoefficient {
	// Short-circuit for zero
	if (a.terms.length === 0 || b.terms.length === 0) return ALGEBRAIC_ZERO;

	// Short-circuit for one
	if (isOneAlgebraic(a)) return b;
	if (isOneAlgebraic(b)) return a;

	// Distribution: multiply each pair
	const products: AlgebraicTerm[] = [];

	for (const termA of a.terms) {
		for (const termB of b.terms) {
			const product = mulTerms(termA, termB);
			if (!isZeroRational(product.rational)) {
				products.push(product);
			}
		}
	}

	// Combine like terms and sort
	return algebraicCoefficient(products);
}

// =============================================================================
// Predicates
// =============================================================================

/**
 * Checks if an algebraic coefficient is zero.
 *
 * @param a - An algebraic coefficient
 * @returns true if a = 0
 */
export function isZeroAlgebraic(a: AlgebraicCoefficient): boolean {
	return a.terms.length === 0;
}

/**
 * Checks if an algebraic coefficient is one.
 *
 * @param a - An algebraic coefficient
 * @returns true if a = 1
 */
export function isOneAlgebraic(a: AlgebraicCoefficient): boolean {
	if (a.terms.length !== 1) return false;
	const term = a.terms[0];
	// Must have no radicals, no imaginary unit, and rational = 1
	return (
		term.radicals.length === 0 && term.hasImaginaryUnit !== true && isOneRational(term.rational)
	);
}

/**
 * Checks if an algebraic coefficient is a pure rational (no radicals).
 *
 * @param a - An algebraic coefficient
 * @returns true if a has no radical terms
 */
export function isPureRational(a: AlgebraicCoefficient): boolean {
	if (a.terms.length === 0) return true; // Zero is rational
	if (a.terms.length > 1) return false;
	return a.terms[0].radicals.length === 0;
}

/**
 * Gets the rational value if the coefficient is a pure rational.
 *
 * @param a - An algebraic coefficient
 * @returns The rational value, or null if not a pure rational
 */
export function getRationalValue(a: AlgebraicCoefficient): Rational | null {
	if (a.terms.length === 0) return ZERO;
	if (a.terms.length > 1) return null;
	if (a.terms[0].radicals.length > 0) return null;
	return a.terms[0].rational;
}

/**
 * Checks if two algebraic coefficients are equal.
 *
 * Since both coefficients are in canonical form (sorted, combined),
 * we can compare them structurally.
 *
 * @param a - First algebraic coefficient
 * @param b - Second algebraic coefficient
 * @returns true if a = b
 */
export function algebraicEquals(a: AlgebraicCoefficient, b: AlgebraicCoefficient): boolean {
	if (a.terms.length !== b.terms.length) return false;

	for (let i = 0; i < a.terms.length; i++) {
		const termA = a.terms[i];
		const termB = b.terms[i];

		// Compare rational coefficients
		if (termA.rational.n !== termB.rational.n || termA.rational.d !== termB.rational.d) {
			return false;
		}

		// Compare radicals
		if (!equalRadicalArrays(termA.radicals, termB.radicals)) {
			return false;
		}
	}

	return true;
}

// =============================================================================
// Conversion
// =============================================================================

/**
 * Converts an algebraic coefficient to a string representation.
 *
 * @param a - An algebraic coefficient
 * @returns Human-readable string
 */
export function algebraicToString(a: AlgebraicCoefficient): string {
	if (a.terms.length === 0) return '0';

	return a.terms
		.map((term, index) => {
			const rStr =
				term.rational.d === 1n
					? term.rational.n.toString()
					: `(${term.rational.n}/${term.rational.d})`;

			if (term.radicals.length === 0) {
				return index === 0 ? rStr : term.rational.n >= 0n ? ` + ${rStr}` : ` - ${rStr.slice(1)}`;
			}

			const radStr = term.radicals
				.map((r) =>
					r.index === 2n
						? `sqrt(${r.radicand})`
						: r.index === 3n
							? `cbrt(${r.radicand})`
							: `root[${r.index}](${r.radicand})`
				)
				.join('*');

			const coefficient =
				term.rational.n === 1n && term.rational.d === 1n
					? ''
					: term.rational.n === -1n && term.rational.d === 1n
						? '-'
						: `${rStr}*`;

			const termStr = `${coefficient}${radStr}`;

			if (index === 0) return termStr;
			return term.rational.n >= 0n ? ` + ${termStr}` : ` - ${termStr.slice(1)}`;
		})
		.join('');
}

/**
 * Computes the approximate numeric value of an algebraic coefficient.
 *
 * @param a - An algebraic coefficient
 * @returns Approximate floating-point value
 */
export function algebraicToNumber(a: AlgebraicCoefficient): number {
	if (a.terms.length === 0) return 0;

	return a.terms.reduce((sum, term) => {
		let value = Number(term.rational.n) / Number(term.rational.d);
		for (const rad of term.radicals) {
			value *= Math.pow(Number(rad.radicand), 1 / Number(rad.index));
		}
		return sum + value;
	}, 0);
}
