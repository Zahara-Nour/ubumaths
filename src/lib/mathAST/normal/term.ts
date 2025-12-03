/**
 * MathAST Normal Form - Normal Term Operations
 *
 * Operations on NormalTerm (algebraic coefficient times monomial).
 * A NormalTerm represents a single summand in a polynomial.
 */

import type { NormalTerm, AlgebraicCoefficient, SymbolicFactor, ComparisonResult } from './types';
import {
	ALGEBRAIC_ONE,
	ALGEBRAIC_ZERO,
	addAlgebraic,
	mulAlgebraic,
	negAlgebraic,
	isZeroAlgebraic,
	isOneAlgebraic,
	algebraicEquals
} from './algebraic';
import {
	EMPTY_MONOMIAL,
	mulMonomials,
	hashMonomial,
	monomialsEqual,
	compareMonomials
} from './monomial';

// =============================================================================
// Constants
// =============================================================================

/** The zero term (coefficient 0) */
export const ZERO_TERM: NormalTerm = {
	coefficient: ALGEBRAIC_ZERO,
	monomial: EMPTY_MONOMIAL
};

/** The one term (coefficient 1, no monomial) */
export const ONE_TERM: NormalTerm = {
	coefficient: ALGEBRAIC_ONE,
	monomial: EMPTY_MONOMIAL
};

// =============================================================================
// Constructors
// =============================================================================

/**
 * Creates a normal term from a coefficient and monomial.
 *
 * @param coefficient - The algebraic coefficient
 * @param monomial - The symbolic monomial (array of factors)
 * @returns A NormalTerm
 *
 * @example
 * // 3*sqrt(2)*x^2
 * normalTerm(
 *   { terms: [{ rational: { n: 3n, d: 1n }, radicals: [sqrt2] }] },
 *   [{ base: x, exponent: { n: 2n, d: 1n } }]
 * )
 */
export function normalTerm(
	coefficient: AlgebraicCoefficient,
	monomial: SymbolicFactor[]
): NormalTerm {
	// Zero coefficient gives zero term regardless of monomial
	if (isZeroAlgebraic(coefficient)) {
		return ZERO_TERM;
	}

	return { coefficient, monomial };
}

/**
 * Creates a normal term from just a coefficient (constant term).
 *
 * @param coefficient - The algebraic coefficient
 * @returns A NormalTerm with empty monomial
 */
export function constantTerm(coefficient: AlgebraicCoefficient): NormalTerm {
	if (isZeroAlgebraic(coefficient)) return ZERO_TERM;
	if (isOneAlgebraic(coefficient)) return ONE_TERM;
	return { coefficient, monomial: EMPTY_MONOMIAL };
}

/**
 * Creates a normal term from just a monomial (coefficient 1).
 *
 * @param monomial - The symbolic monomial
 * @returns A NormalTerm with coefficient 1
 */
export function monomialTerm(monomial: SymbolicFactor[]): NormalTerm {
	if (monomial.length === 0) return ONE_TERM;
	return { coefficient: ALGEBRAIC_ONE, monomial };
}

// =============================================================================
// Predicates
// =============================================================================

/**
 * Checks if a term is zero (zero coefficient).
 *
 * @param term - A normal term
 * @returns true if coefficient is zero
 */
export function isZeroTerm(term: NormalTerm): boolean {
	return isZeroAlgebraic(term.coefficient);
}

/**
 * Checks if a term is one (coefficient 1, empty monomial).
 *
 * @param term - A normal term
 * @returns true if term equals 1
 */
export function isOneTerm(term: NormalTerm): boolean {
	return isOneAlgebraic(term.coefficient) && term.monomial.length === 0;
}

/**
 * Checks if a term is a constant (no symbolic factors).
 *
 * @param term - A normal term
 * @returns true if monomial is empty
 */
export function isConstantTerm(term: NormalTerm): boolean {
	return term.monomial.length === 0;
}

// =============================================================================
// Like Terms
// =============================================================================

/**
 * Checks if two terms are "like terms" (same monomial).
 *
 * Like terms can be combined by adding their coefficients.
 *
 * @param a - First term
 * @param b - Second term
 * @returns true if monomials are identical
 *
 * @example
 * areLikeTerms(3*x^2, 5*x^2)  // true
 * areLikeTerms(3*x^2, 3*x)    // false
 */
export function areLikeTerms(a: NormalTerm, b: NormalTerm): boolean {
	return monomialsEqual(a.monomial, b.monomial);
}

/**
 * Gets the monomial signature of a term.
 * Used to group like terms.
 *
 * @param term - A normal term
 * @returns Hash string identifying the monomial
 */
export function getMonomialSignature(term: NormalTerm): string {
	return hashMonomial(term.monomial);
}

/**
 * Adds two like terms.
 *
 * Returns null if the terms are not like terms.
 * Returns zero term if coefficients cancel.
 *
 * @param a - First term
 * @param b - Second term
 * @returns Combined term, or null if not like terms
 *
 * @example
 * addLikeTerms(3*x^2, 2*x^2)  // 5*x^2
 * addLikeTerms(3*x^2, -3*x^2) // 0
 * addLikeTerms(3*x^2, 2*x)    // null (not like terms)
 */
export function addLikeTerms(a: NormalTerm, b: NormalTerm): NormalTerm | null {
	if (!areLikeTerms(a, b)) return null;

	const newCoefficient = addAlgebraic(a.coefficient, b.coefficient);

	if (isZeroAlgebraic(newCoefficient)) {
		return ZERO_TERM;
	}

	return { coefficient: newCoefficient, monomial: a.monomial };
}

// =============================================================================
// Arithmetic Operations
// =============================================================================

/**
 * Multiplies two normal terms.
 *
 * (c_a * m_a) * (c_b * m_b) = (c_a * c_b) * (m_a * m_b)
 *
 * @param a - First term
 * @param b - Second term
 * @returns Product term
 *
 * @example
 * // (3*x^2) * (2*x) = 6*x^3
 * mulTerms(3*x^2, 2*x)
 *
 * // (sqrt(2)*x) * (sqrt(2)*y) = 2*x*y
 * mulTerms(sqrt(2)*x, sqrt(2)*y)
 */
export function mulTerms(a: NormalTerm, b: NormalTerm): NormalTerm {
	// Short-circuit for zero
	if (isZeroAlgebraic(a.coefficient) || isZeroAlgebraic(b.coefficient)) {
		return ZERO_TERM;
	}

	// Short-circuit for one
	if (isOneTerm(a)) return b;
	if (isOneTerm(b)) return a;

	// Multiply coefficients
	const newCoefficient = mulAlgebraic(a.coefficient, b.coefficient);

	if (isZeroAlgebraic(newCoefficient)) {
		return ZERO_TERM;
	}

	// Multiply monomials
	const newMonomial = mulMonomials(a.monomial, b.monomial);

	return { coefficient: newCoefficient, monomial: newMonomial };
}

/**
 * Negates a normal term.
 *
 * @param term - A normal term
 * @returns -term
 */
export function negTerm(term: NormalTerm): NormalTerm {
	if (isZeroAlgebraic(term.coefficient)) return ZERO_TERM;

	return {
		coefficient: negAlgebraic(term.coefficient),
		monomial: term.monomial
	};
}

// =============================================================================
// Comparison
// =============================================================================

/**
 * Compares two normal terms for canonical ordering.
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
	// For like terms, this determines secondary ordering
	// We use a hash-based comparison for coefficients
	const hashA = hashCoefficient(a.coefficient);
	const hashB = hashCoefficient(b.coefficient);

	if (hashA < hashB) return -1;
	if (hashA > hashB) return 1;

	return 0;
}

/**
 * Creates a hash for an algebraic coefficient.
 * Used for comparison when monomials are equal.
 */
function hashCoefficient(coef: AlgebraicCoefficient): string {
	if (coef.terms.length === 0) return '0';

	return coef.terms
		.map((term) => {
			const rStr =
				term.rational.d === 1n
					? term.rational.n.toString()
					: `${term.rational.n}/${term.rational.d}`;
			if (term.radicals.length === 0) return rStr;
			const radStr = term.radicals.map((r) => `R${r.index}:${r.radicand}`).join('*');
			return `${rStr}*${radStr}`;
		})
		.join('+');
}

/**
 * Checks if two normal terms are equal.
 *
 * @param a - First term
 * @param b - Second term
 * @returns true if terms are identical
 */
export function termsEqual(a: NormalTerm, b: NormalTerm): boolean {
	return monomialsEqual(a.monomial, b.monomial) && algebraicEquals(a.coefficient, b.coefficient);
}

// =============================================================================
// Sorting
// =============================================================================

/**
 * Sorts normal terms in canonical order.
 *
 * @param terms - Array of terms to sort
 * @returns A new sorted array
 */
export function sortNormalTerms(terms: NormalTerm[]): NormalTerm[] {
	return [...terms].sort(compareNormalTerms);
}

// =============================================================================
// Conversion
// =============================================================================

/**
 * Converts a normal term to a string representation.
 *
 * @param term - A normal term
 * @returns Human-readable string
 */
export function termToString(term: NormalTerm): string {
	if (isZeroAlgebraic(term.coefficient)) return '0';

	// Import dynamically to avoid circular deps
	const coeffStr = coefficientToString(term.coefficient);

	if (term.monomial.length === 0) {
		return coeffStr;
	}

	const monomialStr = term.monomial
		.map((f) => {
			const baseStr = nodeToString(f.base);
			if (f.exponent.n === 1n && f.exponent.d === 1n) return baseStr;
			const expStr =
				f.exponent.d === 1n ? f.exponent.n.toString() : `(${f.exponent.n}/${f.exponent.d})`;
			return `${baseStr}^${expStr}`;
		})
		.join('*');

	if (isOneAlgebraic(term.coefficient)) {
		return monomialStr;
	}

	return `${coeffStr}*${monomialStr}`;
}

/**
 * Simple node to string conversion for display.
 */
function nodeToString(node: import('../types').MathNode): string {
	switch (node.type) {
		case 'variable':
			return node.name;
		case 'greek':
			return node.letter;
		case 'number':
			return node.value;
		case 'function':
			return `${node.name}(${node.args.map(nodeToString).join(', ')})`;
		default:
			return `<${node.type}>`;
	}
}

/**
 * Simple coefficient to string conversion.
 */
function coefficientToString(coef: AlgebraicCoefficient): string {
	if (coef.terms.length === 0) return '0';
	if (isOneAlgebraic(coef)) return '1';

	return coef.terms
		.map((term) => {
			const rStr =
				term.rational.d === 1n
					? term.rational.n.toString()
					: `(${term.rational.n}/${term.rational.d})`;
			if (term.radicals.length === 0) return rStr;
			const radStr = term.radicals
				.map((r) =>
					r.index === 2n
						? `sqrt(${r.radicand})`
						: r.index === 3n
							? `cbrt(${r.radicand})`
							: `root[${r.index}](${r.radicand})`
				)
				.join('*');
			return term.rational.n === 1n && term.rational.d === 1n ? radStr : `${rStr}*${radStr}`;
		})
		.join(' + ');
}
