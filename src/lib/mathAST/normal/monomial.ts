/**
 * MathAST Normal Form - Monomial Operations
 *
 * Operations on symbolic monomials (products of symbolic factors).
 * A monomial is a product of bases raised to rational exponents: x^2 * y^(1/2) * sin(theta)
 */

import type { MathNode } from '../types';
import type { SymbolicFactor, Rational, ComparisonResult } from './types';
import {
	addRational,
	isZero as isZeroRational,
	equalRational,
	compareRational,
	ZERO,
	ONE
} from './rational';

// =============================================================================
// Constants
// =============================================================================

/** Empty monomial (represents 1) */
export const EMPTY_MONOMIAL: readonly SymbolicFactor[] = [];

// =============================================================================
// Node Hashing
// =============================================================================

/**
 * Creates a hash string for a MathNode.
 * Used for canonical ordering and equality comparison.
 *
 * @param node - A MathNode
 * @returns A deterministic hash string
 */
export function hashNode(node: MathNode): string {
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
			return `ADD(${hashNode(node.left)},${hashNode(node.right)})`;
		case 'subtraction':
			return `SUB(${hashNode(node.left)},${hashNode(node.right)})`;
		case 'multiplication':
			return `MUL(${hashNode(node.left)},${hashNode(node.right)})`;
		case 'division':
			return `DIV(${hashNode(node.numerator)},${hashNode(node.denominator)})`;
		case 'opposite':
			return `NEG(${hashNode(node.operand)})`;
		case 'positive':
			return `POS(${hashNode(node.operand)})`;
		case 'function':
			return `FN:${node.name}(${node.args.map(hashNode).join(',')})${node.power ? '^' + hashNode(node.power) : ''}${node.base ? '_' + hashNode(node.base) : ''}`;
		case 'delimiter':
			return `DEL(${hashNode(node.content)})`;
		case 'subscript':
			return `SUB(${hashNode(node.base)}_${hashNode(node.subscript)})`;
		case 'superscript':
			return `SUP(${hashNode(node.base)}^${hashNode(node.superscript)})`;
		case 'relation':
			return `REL(${hashNode(node.left)}${node.relation}${hashNode(node.right)})`;
		case 'unit':
			return `UNIT(${hashNode(node.expression)})`;
		case 'composition':
			return `COMP(${hashNode(node.outer)},${hashNode(node.inner)})`;
		default:
			// Exhaustive check
			return `UNKNOWN`;
	}
}

// =============================================================================
// Node Type Classification
// =============================================================================

/**
 * Priority for node type ordering.
 * Lower priority = comes first in canonical order.
 */
const BASE_TYPE_PRIORITY: Record<string, number> = {
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
 * Gets the priority of a node type for ordering.
 *
 * @param node - A MathNode
 * @returns Priority number (lower = first)
 */
function getNodeTypePriority(node: MathNode): number {
	return BASE_TYPE_PRIORITY[node.type] ?? 100;
}

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
			return hashNode(node);
	}
}

// =============================================================================
// Constructors
// =============================================================================

/**
 * Creates a symbolic factor from a base node and exponent.
 *
 * @param base - The base MathNode
 * @param exponent - The rational exponent
 * @returns A SymbolicFactor
 *
 * @example
 * symbolicFactor(x, { n: 2n, d: 1n })     // x^2
 * symbolicFactor(sin(x), { n: 1n, d: 1n }) // sin(x)^1
 */
export function symbolicFactor(base: MathNode, exponent: Rational): SymbolicFactor {
	return { base, exponent };
}

/**
 * Creates a monomial from a single variable with exponent 1.
 *
 * @param name - Variable name
 * @returns A monomial containing just the variable
 */
export function variableMonomial(name: string): SymbolicFactor[] {
	return [{ base: { type: 'variable', name }, exponent: ONE }];
}

// =============================================================================
// Node Comparison
// =============================================================================

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
	const priorityA = getNodeTypePriority(a);
	const priorityB = getNodeTypePriority(b);

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
	const hashA = hashNode(a);
	const hashB = hashNode(b);

	if (hashA !== hashB) {
		return hashA < hashB ? -1 : 1;
	}

	return 0;
}

/**
 * Checks if two MathNodes are structurally equal.
 *
 * @param a - First node
 * @param b - Second node
 * @returns true if nodes are structurally identical
 */
export function nodesEqual(a: MathNode, b: MathNode): boolean {
	return hashNode(a) === hashNode(b);
}

// =============================================================================
// Symbolic Factor Comparison
// =============================================================================

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
 */
export function compareSymbolicFactors(a: SymbolicFactor, b: SymbolicFactor): ComparisonResult {
	// 1. Compare by base
	const baseCmp = compareNodes(a.base, b.base);
	if (baseCmp !== 0) return baseCmp;

	// 2. Same base, compare by exponent
	return compareRational(a.exponent, b.exponent);
}

/**
 * Checks if two symbolic factors have the same base.
 *
 * @param a - First factor
 * @param b - Second factor
 * @returns true if bases are equal
 */
export function sameBase(a: SymbolicFactor, b: SymbolicFactor): boolean {
	return nodesEqual(a.base, b.base);
}

// =============================================================================
// Monomial Operations
// =============================================================================

/**
 * Multiplies two monomials.
 *
 * Algorithm:
 * 1. Merge factors from both monomials
 * 2. For factors with same base, add exponents
 * 3. Eliminate factors with zero exponent
 * 4. Sort canonically
 *
 * @param a - First monomial (array of factors)
 * @param b - Second monomial (array of factors)
 * @returns Product monomial
 *
 * @example
 * // x^2 * x^3 = x^5
 * mulMonomials([x^2], [x^3]) // [x^5]
 *
 * // x^2 * y = x^2 * y
 * mulMonomials([x^2], [y]) // [x^2, y]
 */
export function mulMonomials(
	a: readonly SymbolicFactor[],
	b: readonly SymbolicFactor[]
): SymbolicFactor[] {
	// Short-circuit for empty monomials
	if (a.length === 0) return [...b];
	if (b.length === 0) return [...a];

	// Merge by base hash
	const factors = new Map<string, { base: MathNode; exponent: Rational }>();

	// Add factors from a
	for (const factor of a) {
		const hash = hashNode(factor.base);
		factors.set(hash, { base: factor.base, exponent: factor.exponent });
	}

	// Merge factors from b
	for (const factor of b) {
		const hash = hashNode(factor.base);
		const existing = factors.get(hash);

		if (existing) {
			// Same base: add exponents
			const newExp = addRational(existing.exponent, factor.exponent);
			if (isZeroRational(newExp)) {
				// Zero exponent: remove factor
				factors.delete(hash);
			} else {
				factors.set(hash, { base: existing.base, exponent: newExp });
			}
		} else {
			factors.set(hash, { base: factor.base, exponent: factor.exponent });
		}
	}

	// Convert to array and sort
	const result: SymbolicFactor[] = Array.from(factors.values());
	return sortSymbolicFactors(result);
}

/**
 * Compares two monomials for canonical ordering.
 *
 * Order:
 * 1. By total degree (higher degree first - standard polynomial convention)
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
	const degA = monomialDegree(a);
	const degB = monomialDegree(b);
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
 * Creates a hash string for a monomial.
 *
 * @param monomial - Array of symbolic factors
 * @returns A deterministic hash string
 */
export function hashMonomial(monomial: readonly SymbolicFactor[]): string {
	if (monomial.length === 0) return '';

	return monomial
		.map((f) => {
			const baseHash = hashNode(f.base);
			const expStr =
				f.exponent.d === 1n ? f.exponent.n.toString() : `${f.exponent.n}/${f.exponent.d}`;
			return `${baseHash}^${expStr}`;
		})
		.join('*');
}

/**
 * Computes the total degree of a monomial.
 *
 * The degree is the sum of all exponents.
 *
 * @param monomial - Array of symbolic factors
 * @returns Total degree as a Rational
 *
 * @example
 * // x^2 * y^3 has degree 5
 * monomialDegree([x^2, y^3]) // { n: 5n, d: 1n }
 *
 * // x^(1/2) * y^(1/2) has degree 1
 * monomialDegree([x^(1/2), y^(1/2)]) // { n: 1n, d: 1n }
 */
export function monomialDegree(monomial: readonly SymbolicFactor[]): Rational {
	if (monomial.length === 0) return ZERO;

	let result = ZERO;
	for (const factor of monomial) {
		result = addRational(result, factor.exponent);
	}
	return result;
}

/**
 * Checks if two monomials are equal.
 *
 * @param a - First monomial
 * @param b - Second monomial
 * @returns true if monomials are identical
 */
export function monomialsEqual(
	a: readonly SymbolicFactor[],
	b: readonly SymbolicFactor[]
): boolean {
	if (a.length !== b.length) return false;

	for (let i = 0; i < a.length; i++) {
		if (!nodesEqual(a[i].base, b[i].base)) return false;
		if (!equalRational(a[i].exponent, b[i].exponent)) return false;
	}

	return true;
}

// =============================================================================
// Sorting
// =============================================================================

/**
 * Sorts symbolic factors in canonical order.
 *
 * @param factors - Array of factors to sort
 * @returns A new sorted array
 */
export function sortSymbolicFactors(factors: SymbolicFactor[]): SymbolicFactor[] {
	return [...factors].sort(compareSymbolicFactors);
}

// =============================================================================
// Monomial GCD and Division (for fraction reduction)
// =============================================================================

/**
 * Computes the GCD of two monomials.
 *
 * The GCD of two monomials is the monomial with:
 * - Only factors appearing in both monomials
 * - Exponent = min(exp_a, exp_b) for each common factor
 *
 * @param a - First monomial
 * @param b - Second monomial
 * @returns GCD monomial (empty if no common factors)
 *
 * @example
 * // gcd(x^2 * y, x * y^2) = x * y
 * gcdMonomials([x^2, y], [x, y^2]) // [x, y]
 *
 * // gcd(x^2, y^2) = 1 (empty monomial)
 * gcdMonomials([x^2], [y^2]) // []
 */
export function gcdMonomials(
	a: readonly SymbolicFactor[],
	b: readonly SymbolicFactor[]
): SymbolicFactor[] {
	if (a.length === 0 || b.length === 0) return [];

	// Build maps for O(n) lookup
	const mapA = new Map<string, SymbolicFactor>();
	for (const factor of a) {
		mapA.set(hashNode(factor.base), factor);
	}

	const result: SymbolicFactor[] = [];

	for (const factorB of b) {
		const hash = hashNode(factorB.base);
		const factorA = mapA.get(hash);

		if (factorA) {
			// Common factor: take minimum exponent
			const minExp = minRational(factorA.exponent, factorB.exponent);
			if (!isZeroRational(minExp)) {
				result.push({ base: factorA.base, exponent: minExp });
			}
		}
	}

	return sortSymbolicFactors(result);
}

/**
 * Divides monomial a by monomial b.
 *
 * Subtracts exponents for common factors.
 * Assumes b divides a (all exponents in result are non-negative).
 *
 * @param a - Dividend monomial
 * @param b - Divisor monomial
 * @returns Quotient monomial
 *
 * @example
 * // x^2 / x = x
 * divMonomials([x^2], [x]) // [x]
 *
 * // x^2 * y / x = x * y
 * divMonomials([x^2, y], [x]) // [x, y]
 */
export function divMonomials(
	a: readonly SymbolicFactor[],
	b: readonly SymbolicFactor[]
): SymbolicFactor[] {
	if (b.length === 0) return [...a];
	if (a.length === 0) {
		// 1 / b^n - result has negative exponents
		return b.map((f) => ({ base: f.base, exponent: negateRational(f.exponent) }));
	}

	// Build map from a
	const factors = new Map<string, { base: MathNode; exponent: Rational }>();
	for (const factor of a) {
		factors.set(hashNode(factor.base), { base: factor.base, exponent: factor.exponent });
	}

	// Subtract exponents from b
	for (const factor of b) {
		const hash = hashNode(factor.base);
		const existing = factors.get(hash);

		if (existing) {
			const newExp = subtractRational(existing.exponent, factor.exponent);
			if (isZeroRational(newExp)) {
				factors.delete(hash);
			} else {
				factors.set(hash, { base: existing.base, exponent: newExp });
			}
		} else {
			// Factor not in a: results in negative exponent
			factors.set(hash, { base: factor.base, exponent: negateRational(factor.exponent) });
		}
	}

	const result: SymbolicFactor[] = Array.from(factors.values());
	return sortSymbolicFactors(result);
}

/**
 * Returns the minimum of two rationals.
 */
function minRational(a: Rational, b: Rational): Rational {
	const cmp = compareRational(a, b);
	return cmp <= 0 ? a : b;
}

/**
 * Subtracts two rationals: a - b
 */
function subtractRational(a: Rational, b: Rational): Rational {
	return addRational(a, negateRational(b));
}

/**
 * Negates a rational: -a
 */
function negateRational(r: Rational): Rational {
	return { n: -r.n, d: r.d };
}

// =============================================================================
// Conversion
// =============================================================================

/**
 * Converts a monomial to a string representation.
 *
 * @param monomial - Array of symbolic factors
 * @returns Human-readable string
 */
export function monomialToString(monomial: readonly SymbolicFactor[]): string {
	if (monomial.length === 0) return '1';

	return monomial
		.map((f) => {
			const baseStr = getNodeName(f.base);
			if (f.exponent.n === 1n && f.exponent.d === 1n) {
				return baseStr;
			}
			const expStr =
				f.exponent.d === 1n ? f.exponent.n.toString() : `(${f.exponent.n}/${f.exponent.d})`;
			return `${baseStr}^${expStr}`;
		})
		.join('*');
}
