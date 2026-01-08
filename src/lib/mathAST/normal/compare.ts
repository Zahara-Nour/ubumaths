/**
 * MathAST Normal Form - Canonical Ordering
 *
 * Functions for comparing and ordering elements in canonical form.
 * Implements all levels of the ordering hierarchy:
 * - Level 1: SimplifiedRadical ordering
 * - Level 2: AlgebraicTerm ordering
 * - Level 3: SymbolicFactor ordering
 * - Level 4: NormalTerm ordering
 */

import type {
	SimplifiedRadical,
	AlgebraicTerm,
	SymbolicFactor,
	NormalTerm,
	Rational,
	ComparisonResult
} from './types';
import type { MathNode } from '../types';
import { compareRational, addRational, ZERO } from './rational';

// =============================================================================
// Level 1: SimplifiedRadical Ordering
// =============================================================================

/**
 * Compares two simplified radicals for canonical ordering.
 *
 * Order (ascending):
 * 1. By index: sqrt (2) < cbrt (3) < fourth root (4) < ...
 * 2. By radicand: sqrt(2) < sqrt(3) < sqrt(5) < ...
 *
 * This produces: sqrt(2) < sqrt(3) < sqrt(5) < cbrt(2) < cbrt(3) < ...
 *
 * @param a - First radical
 * @param b - Second radical
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 *
 * @example
 * compareRadicals({ radicand: 2n, index: 2n }, { radicand: 3n, index: 2n }) // -1
 * compareRadicals({ radicand: 2n, index: 2n }, { radicand: 2n, index: 3n }) // -1
 * compareRadicals({ radicand: 5n, index: 2n }, { radicand: 2n, index: 3n }) // -1
 */
export function compareRadicals(a: SimplifiedRadical, b: SimplifiedRadical): ComparisonResult {
	// Compare by index first (ascending)
	if (a.index < b.index) return -1;
	if (a.index > b.index) return 1;

	// Same index, compare by radicand (ascending)
	if (a.radicand < b.radicand) return -1;
	if (a.radicand > b.radicand) return 1;

	return 0;
}

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

/**
 * Creates a hash string for a radical array.
 *
 * @param radicals - Array of simplified radicals
 * @returns A deterministic hash string
 */
export function hashRadicalArray(radicals: readonly SimplifiedRadical[]): string {
	if (radicals.length === 0) return '';
	return radicals.map((r) => `R${r.index}:${r.radicand}`).join('*');
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
 *
 * @example
 * // Pure rational before radical: 3 < sqrt(2)
 * compareAlgebraicTerms({ rational: r3, radicals: [] }, { rational: r1, radicals: [sqrt2] }) // -1
 *
 * // Same radicals, compare rationals: 2*sqrt(2) < 3*sqrt(2)
 * compareAlgebraicTerms({ rational: r2, radicals: [sqrt2] }, { rational: r3, radicals: [sqrt2] }) // -1
 *
 * // Different radicals: sqrt(2) < sqrt(3)
 * compareAlgebraicTerms({ rational: r1, radicals: [sqrt2] }, { rational: r1, radicals: [sqrt3] }) // -1
 *
 * // Real before imaginary: 3 < 3i
 * compareAlgebraicTerms({ rational: r3, radicals: [] }, { rational: r3, radicals: [], hasImaginaryUnit: true }) // -1
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
 * For example, 3*sqrt(2) + 2*sqrt(2) = 5*sqrt(2) because both have [sqrt(2)] and no i.
 * But 3*sqrt(2) + 2*sqrt(2)*i cannot be combined because they differ in imaginary flag.
 *
 * @param a - First algebraic term
 * @param b - Second algebraic term
 * @returns true if terms have identical radical parts and imaginary flag
 */
export function sameRadicalSignature(a: AlgebraicTerm, b: AlgebraicTerm): boolean {
	// Must have same imaginary flag
	if ((a.hasImaginaryUnit === true) !== (b.hasImaginaryUnit === true)) {
		return false;
	}
	return equalRadicalArrays(a.radicals, b.radicals);
}

/**
 * Creates a hash string for an algebraic term.
 *
 * @param term - An algebraic term
 * @returns A deterministic hash string
 */
export function hashAlgebraicTerm(term: AlgebraicTerm): string {
	const radicalHash = hashRadicalArray(term.radicals);
	const rationalStr =
		term.rational.d === 1n ? term.rational.n.toString() : `${term.rational.n}/${term.rational.d}`;
	const hasI = term.hasImaginaryUnit === true;

	let result = rationalStr;

	if (radicalHash !== '') {
		result = `${result}*${radicalHash}`;
	}

	if (hasI) {
		result = result === '1' ? 'i' : `${result}*i`;
	}

	return result;
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

// =============================================================================
// Level 3: SymbolicFactor Ordering
// =============================================================================

/**
 * Priority for node type ordering.
 * Lower priority = comes first in canonical order.
 */
const NODE_TYPE_PRIORITY: Record<string, number> = {
	greek: 0, // Constants like pi, e
	variable: 1, // Variables like x, y, z
	function: 2, // Functions like sin, cos, ln
	composition: 2, // Function composition (same level as function)
	number: 3, // Numeric constants
	symbol: 4, // Special symbols
	addition: 5,
	subtraction: 5,
	multiplication: 5,
	division: 5,
	opposite: 5,
	positive: 5,
	delimiter: 5,
	subscript: 5,
	superscript: 5,
	relation: 6,
	hole: 7,
	unit: 8
};

/**
 * Gets the name/identifier of a node for comparison.
 *
 * @param node - A MathNode
 * @returns String identifier
 */
function getNodeName(node: MathNode): string {
	switch (node.type) {
		case 'variable':
			return node.name;
		case 'greek':
			return node.letter;
		case 'function':
			return node.name;
		case 'number':
			return node.value;
		case 'symbol':
			return node.symbol;
		default:
			return hashNodeForCompare(node);
	}
}

/**
 * Creates a hash string for a MathNode (for comparison fallback).
 *
 * @param node - A MathNode
 * @returns A deterministic hash string
 */
function hashNodeForCompare(node: MathNode): string {
	switch (node.type) {
		case 'number':
			return `N:${node.value}`;
		case 'variable':
			return `V:${node.name}`;
		case 'greek':
			return `G:${node.letter}`;
		case 'symbol':
			return `S:${node.symbol}`;
		case 'hole':
			return `H:${node.index}`;
		case 'addition':
			return `ADD(${hashNodeForCompare(node.left)},${hashNodeForCompare(node.right)})`;
		case 'subtraction':
			return `SUB(${hashNodeForCompare(node.left)},${hashNodeForCompare(node.right)})`;
		case 'multiplication':
			return `MUL(${hashNodeForCompare(node.left)},${hashNodeForCompare(node.right)})`;
		case 'division':
			return `DIV(${hashNodeForCompare(node.numerator)},${hashNodeForCompare(node.denominator)})`;
		case 'opposite':
			return `NEG(${hashNodeForCompare(node.operand)})`;
		case 'positive':
			return `POS(${hashNodeForCompare(node.operand)})`;
		case 'function':
			return `FN:${node.name}(${node.args.map(hashNodeForCompare).join(',')})`;
		case 'delimiter':
			return `DEL(${hashNodeForCompare(node.content)})`;
		case 'subscript':
			return `SUB(${hashNodeForCompare(node.base)}_${hashNodeForCompare(node.subscript)})`;
		case 'superscript':
			return `SUP(${hashNodeForCompare(node.base)}^${hashNodeForCompare(node.superscript)})`;
		case 'relation':
			return `REL(${hashNodeForCompare(node.left)}${node.relation}${hashNodeForCompare(node.right)})`;
		case 'unit':
			return `UNIT(${hashNodeForCompare(node.expression)})`;
		case 'composition':
			return `COMP(${hashNodeForCompare(node.outer)},${hashNodeForCompare(node.inner)})`;
		case 'complex':
			return `CMPLX(${hashNodeForCompare(node.real)},${hashNodeForCompare(node.imaginary)})`;
		default:
			return `UNKNOWN`;
	}
}

/**
 * Compares two MathNodes for canonical ordering.
 *
 * Order:
 * 1. By type priority (greek < variable < function < composite)
 * 2. Within same type, by name/identifier
 * 3. For complex nodes, by hash as fallback
 *
 * @param a - First node
 * @param b - Second node
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 */
export function compareNodes(a: MathNode, b: MathNode): ComparisonResult {
	// 1. Compare by type priority
	const priorityA = NODE_TYPE_PRIORITY[a.type] ?? 100;
	const priorityB = NODE_TYPE_PRIORITY[b.type] ?? 100;

	if (priorityA !== priorityB) {
		return priorityA < priorityB ? -1 : 1;
	}

	// 2. Same type, compare by name/identifier
	const nameA = getNodeName(a);
	const nameB = getNodeName(b);

	if (nameA !== nameB) {
		return nameA < nameB ? -1 : 1;
	}

	// 3. For functions with same name, compare arguments
	if (a.type === 'function' && b.type === 'function') {
		const minArgs = Math.min(a.args.length, b.args.length);
		for (let i = 0; i < minArgs; i++) {
			const cmp = compareNodes(a.args[i], b.args[i]);
			if (cmp !== 0) return cmp;
		}
		if (a.args.length !== b.args.length) {
			return a.args.length < b.args.length ? -1 : 1;
		}
	}

	// 4. Fallback: compare by hash
	const hashA = hashNodeForCompare(a);
	const hashB = hashNodeForCompare(b);

	if (hashA !== hashB) {
		return hashA < hashB ? -1 : 1;
	}

	return 0;
}

/**
 * Compares two symbolic factors for canonical ordering.
 *
 * Order:
 * 1. By base (using node comparison)
 * 2. By exponent (lower first)
 *
 * @param a - First factor
 * @param b - Second factor
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 *
 * @example
 * // pi < x (greek before variable)
 * compareSymbolicFactors({ base: pi, exp: 1 }, { base: x, exp: 1 }) // -1
 *
 * // x < y (alphabetical)
 * compareSymbolicFactors({ base: x, exp: 1 }, { base: y, exp: 1 }) // -1
 *
 * // x^1 < x^2 (by exponent)
 * compareSymbolicFactors({ base: x, exp: 1 }, { base: x, exp: 2 }) // -1
 */
export function compareSymbolicFactors(a: SymbolicFactor, b: SymbolicFactor): ComparisonResult {
	// 1. Compare by base
	const baseCmp = compareNodes(a.base, b.base);
	if (baseCmp !== 0) return baseCmp;

	// 2. Same base, compare by exponent
	return compareRational(a.exponent, b.exponent);
}

/**
 * Sorts an array of symbolic factors in canonical order.
 *
 * @param factors - Array of factors to sort
 * @returns A new sorted array
 */
export function sortSymbolicFactors(factors: readonly SymbolicFactor[]): SymbolicFactor[] {
	return [...factors].sort(compareSymbolicFactors);
}

/**
 * Checks if a symbolic factor array is in canonical order.
 *
 * @param factors - Array of factors to check
 * @returns true if sorted in ascending order
 */
export function isSymbolicFactorArraySorted(factors: readonly SymbolicFactor[]): boolean {
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
 * Computes the total degree of a monomial.
 *
 * @param monomial - Array of symbolic factors
 * @returns Total degree as a Rational
 */
function computeMonomialDegree(monomial: readonly SymbolicFactor[]): Rational {
	if (monomial.length === 0) return ZERO;

	let result = ZERO;
	for (const factor of monomial) {
		result = addRational(result, factor.exponent);
	}
	return result;
}

/**
 * Compares two monomials for canonical ordering.
 *
 * Order (graded lexicographic):
 * 1. By total degree (higher degree first)
 * 2. By lexicographic comparison of factors
 *
 * @param a - First monomial
 * @param b - Second monomial
 * @returns -1 if a < b, 0 if a = b, 1 if a > b
 */
export function compareMonomials(
	a: readonly SymbolicFactor[],
	b: readonly SymbolicFactor[]
): ComparisonResult {
	// 1. Compare by total degree (higher first for graded ordering)
	const degA = computeMonomialDegree(a);
	const degB = computeMonomialDegree(b);
	const degCmp = compareRational(degB, degA); // Reversed for descending
	if (degCmp !== 0) return degCmp;

	// 2. Same degree: lexicographic comparison
	const minLen = Math.min(a.length, b.length);
	for (let i = 0; i < minLen; i++) {
		const cmp = compareSymbolicFactors(a[i], b[i]);
		if (cmp !== 0) return cmp;
	}

	// 3. Longer monomial comes after (more factors)
	if (a.length !== b.length) {
		return a.length < b.length ? -1 : 1;
	}

	return 0;
}

/**
 * Creates a hash for an algebraic coefficient (for comparison).
 */
function hashAlgebraicCoefficient(coef: import('./types').AlgebraicCoefficient): string {
	if (coef.terms.length === 0) return '0';

	return coef.terms
		.map((term) => {
			const rStr =
				term.rational.d === 1n
					? term.rational.n.toString()
					: `${term.rational.n}/${term.rational.d}`;
			let result = rStr;
			if (term.radicals.length > 0) {
				const radStr = term.radicals.map((r) => `R${r.index}:${r.radicand}`).join('*');
				result = `${result}*${radStr}`;
			}
			if (term.hasImaginaryUnit === true) {
				result = result === '1' ? 'i' : `${result}*i`;
			}
			return result;
		})
		.join('+');
}

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
 *
 * @example
 * // x^2 < x (higher degree first)
 * compareNormalTerms({ coef: 1, monomial: [x^2] }, { coef: 1, monomial: [x] }) // -1
 *
 * // x < y (alphabetical for same degree)
 * compareNormalTerms({ coef: 1, monomial: [x] }, { coef: 1, monomial: [y] }) // -1
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
