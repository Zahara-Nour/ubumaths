/**
 * Pattern Matching for Integration Techniques
 *
 * Utilities for detecting integration patterns like u-substitution,
 * integration by parts, etc.
 *
 * @module mathAST/integration/patterns
 */

import type { MathNode } from '../types';
import { differentiate } from '../differentiation';
import { containsVariable } from './rules';
import { isNumber, isVariable, isDivision, isMultiplication } from '../guards';
import { hashMathNode } from '../normal/hash';
import { normalize } from '../normal/normalize';
import type { NormalForm, NormalTerm, SymbolicFactor, AlgebraicCoefficient } from '../normal/types';

// =============================================================================
// Types
// =============================================================================

/**
 * Result of u-substitution pattern matching
 */
export interface USubstitutionMatch {
	/** The u expression (inner function) */
	u: MathNode;

	/** The du/dx expression (derivative of u) */
	du: MathNode;

	/** Constant factor if du appears with a constant multiple */
	constantFactor?: number;
}

// =============================================================================
// Normalization Cache
// =============================================================================

const normalFormCache = new Map<string, NormalForm>();
const MAX_CACHE_SIZE = 100;

/**
 * Get normalized form with caching.
 * Avoids re-normalizing the same expression multiple times.
 */
function getCachedNormalForm(expr: MathNode): NormalForm {
	const hash = hashMathNode(expr);

	const cached = normalFormCache.get(hash);
	if (cached) return cached;

	const form = normalize(expr);

	// Simple LRU: remove oldest when full
	if (normalFormCache.size >= MAX_CACHE_SIZE) {
		const firstKey = normalFormCache.keys().next().value;
		if (firstKey) normalFormCache.delete(firstKey);
	}

	normalFormCache.set(hash, form);
	return form;
}

// =============================================================================
// NormalForm Analysis Helpers
// =============================================================================

/**
 * Check if NormalForm represents a single term (not a sum).
 * Example: 2x is single term, x+1 is not.
 */
function isSingleTerm(form: NormalForm): boolean {
	return form.numerator.length === 1;
}

/**
 * Check if denominator is a pure constant (no variables).
 * Allows: 1, 2, 1/2
 * Rejects: x, x+1
 */
function hasConstantDenominator(form: NormalForm): boolean {
	return form.denominator.every((term) => term.monomial.length === 0);
}

/**
 * Compare two monomials for equality.
 * Monomials are sorted canonically, so element-by-element comparison works.
 */
function monomialsEqual(m1: readonly SymbolicFactor[], m2: readonly SymbolicFactor[]): boolean {
	if (m1.length !== m2.length) return false;

	for (let i = 0; i < m1.length; i++) {
		const f1 = m1[i];
		const f2 = m2[i];

		// Compare bases using hash (canonical comparison)
		if (hashMathNode(f1.base) !== hashMathNode(f2.base)) {
			return false;
		}

		// Compare exponents (exact rational comparison)
		if (f1.exponent.n !== f2.exponent.n || f1.exponent.d !== f2.exponent.d) {
			return false;
		}
	}

	return true;
}

/**
 * Extract pure rational value from AlgebraicCoefficient.
 * Returns null if coefficient contains radicals (e.g., sqrt(2)).
 */
function getPureRational(coeff: AlgebraicCoefficient): { n: bigint; d: bigint } | null {
	// Must be single term with no radicals
	if (coeff.terms.length !== 1) return null;

	const term = coeff.terms[0];
	if (term.radicals.length > 0) return null;
	if (term.hasImaginaryUnit) return null;

	return term.rational;
}

/**
 * Get constant value from denominator polynomial.
 * Returns the product of all constant terms.
 */
function getDenominatorConstant(denom: readonly NormalTerm[]): { n: bigint; d: bigint } | null {
	let n = 1n;
	let d = 1n;

	for (const term of denom) {
		if (term.monomial.length > 0) return null; // Has variables

		const rat = getPureRational(term.coefficient);
		if (!rat) return null; // Has radicals

		n *= rat.n;
		d *= rat.d;
	}

	return { n, d };
}

/**
 * Compute ratio of two coefficients as a number.
 * Returns (coeff1/denom1) / (coeff2/denom2).
 */
function computeCoefficientRatio(
	coeff1: AlgebraicCoefficient,
	denom1: readonly NormalTerm[],
	coeff2: AlgebraicCoefficient,
	denom2: readonly NormalTerm[]
): number | null {
	const r1 = getPureRational(coeff1);
	const r2 = getPureRational(coeff2);
	const d1 = getDenominatorConstant(denom1);
	const d2 = getDenominatorConstant(denom2);

	if (!r1 || !r2 || !d1 || !d2) return null;
	if (r2.n === 0n) return null; // Division by zero

	// (r1.n/r1.d / d1.n/d1.d) / (r2.n/r2.d / d2.n/d2.d)
	// Simplified: (r1.n * d1.d * r2.d * d2.n) / (r1.d * d1.n * r2.n * d2.d)
	const numerator = r1.n * d1.d * r2.d * d2.n;
	const denominator = r1.d * d1.n * r2.n * d2.d;

	if (denominator === 0n) return null;

	return Number(numerator) / Number(denominator);
}

// =============================================================================
// Normalization-Based Proportionality Detection
// =============================================================================

/**
 * Find proportionality constant using normalization.
 *
 * If expr1 = c * expr2 for some constant c, returns c.
 * Uses canonical normalization to handle all structural variations.
 *
 * Examples:
 * - findProportionalityConstantNormalized(2x, x) -> 2
 * - findProportionalityConstantNormalized(x, 2x) -> 0.5
 * - findProportionalityConstantNormalized(-x, x) -> -1
 * - findProportionalityConstantNormalized(x/2, x) -> 0.5
 * - findProportionalityConstantNormalized(x, y) -> null (different monomials)
 * - findProportionalityConstantNormalized(x+1, x) -> null (multi-term)
 */
function findProportionalityConstantNormalized(expr1: MathNode, expr2: MathNode): number | null {
	try {
		const form1 = getCachedNormalForm(expr1);
		const form2 = getCachedNormalForm(expr2);

		// Both must be single terms (not sums like x+1)
		if (!isSingleTerm(form1) || !isSingleTerm(form2)) {
			return null;
		}

		// Both must have constant denominators
		if (!hasConstantDenominator(form1) || !hasConstantDenominator(form2)) {
			return null;
		}

		const term1 = form1.numerator[0];
		const term2 = form2.numerator[0];

		// Monomials must match exactly (same variables, same exponents)
		if (!monomialsEqual(term1.monomial, term2.monomial)) {
			return null;
		}

		// Compute coefficient ratio
		return computeCoefficientRatio(
			term1.coefficient,
			form1.denominator,
			term2.coefficient,
			form2.denominator
		);
	} catch {
		return null; // Normalization failed
	}
}

// =============================================================================
// U-Candidate Extraction
// =============================================================================

/**
 * Find potential u-substitution candidates in an expression.
 *
 * Extracts:
 * - Function arguments: f(g(x)) → g(x)
 * - Exponents: e^(g(x)) → g(x)
 * - Bases with powers: [g(x)]^n → g(x)
 * - Denominators: 1/g(x) → g(x)
 *
 * Does not include:
 * - Simple variables (just x)
 * - Constants
 * - The entire expression itself
 *
 * @param expr - The expression to analyze
 * @param variable - The variable of integration
 * @returns Array of candidate u expressions
 *
 * @example
 * ```typescript
 * const expr = parseLatex('\\cos(x^2)');
 * const candidates = findUCandidates(expr, 'x');
 * // candidates includes x^2 (the function argument)
 * ```
 */
export function findUCandidates(expr: MathNode, variable: string): MathNode[] {
	const candidates: MathNode[] = [];
	const seen = new Set<string>();

	/**
	 * Add a candidate if it's non-trivial and not already seen
	 */
	function addCandidate(node: MathNode): void {
		// Skip if doesn't contain the variable
		if (!containsVariable(node, variable)) {
			return;
		}

		// Skip if it's just the variable itself
		if (isVariable(node) && node.name === variable) {
			return;
		}

		// Skip if it's a constant
		if (isNumber(node)) {
			return;
		}

		// Use hash to avoid duplicates
		const hash = hashMathNode(node);
		if (!seen.has(hash)) {
			seen.add(hash);
			candidates.push(node);
		}
	}

	/**
	 * Recursively traverse the expression tree
	 */
	function traverse(node: MathNode): void {
		switch (node.type) {
			case 'function':
				// The function itself is a candidate (e.g., sin(x) for ∫sin(x)cos(x)dx)
				addCandidate(node);

				// Function arguments are also prime candidates
				for (const arg of node.args) {
					// Only add non-trivial arguments
					if (!(isVariable(arg) && arg.name === variable)) {
						addCandidate(arg);
					}
					traverse(arg);
				}

				// Also check power and base if present
				if (node.power) traverse(node.power);
				if (node.base) traverse(node.base);
				break;

			case 'superscript':
				// Exponents are candidates (for e^u patterns)
				if (!(isVariable(node.superscript) && node.superscript.name === variable)) {
					addCandidate(node.superscript);
				}

				// Base is also a candidate (for [g(x)]^n patterns)
				if (!(isVariable(node.base) && node.base.name === variable)) {
					addCandidate(node.base);
				}

				traverse(node.base);
				traverse(node.superscript);
				break;

			case 'division':
				// Denominators are candidates (for 1/u patterns)
				if (!(isVariable(node.denominator) && node.denominator.name === variable)) {
					addCandidate(node.denominator);
				}

				// Also numerators can be composite
				traverse(node.numerator);
				traverse(node.denominator);
				break;

			case 'addition':
			case 'subtraction':
			case 'multiplication':
				traverse(node.left);
				traverse(node.right);
				break;

			case 'opposite':
			case 'positive':
				traverse(node.operand);
				break;

			case 'delimiter':
				traverse(node.content);
				break;

			case 'subscript':
				traverse(node.base);
				traverse(node.subscript);
				break;

			case 'relation':
				traverse(node.left);
				traverse(node.right);
				break;

			case 'unit':
				traverse(node.expression);
				break;

			case 'composition':
				traverse(node.outer);
				traverse(node.inner);
				break;

			case 'matrix':
				for (const row of node.rows) {
					for (const elem of row) {
						traverse(elem);
					}
				}
				break;

			// Leaf nodes - nothing to traverse
			case 'number':
			case 'variable':
			case 'symbol':
			case 'greek':
			case 'hole':
			case 'constant':
				break;

			// Complex nodes have real and imaginary parts
			case 'complex':
				traverse(node.real);
				traverse(node.imaginary);
				break;

			// Infinity is a leaf node
			case 'infinity':
				break;

			// Limit has expression and approach
			case 'limit':
				traverse(node.expression);
				traverse(node.approach);
				break;

			default: {
				const _exhaustive: never = node;
				return _exhaustive;
			}
		}
	}

	traverse(expr);
	return candidates;
}

// =============================================================================
// U-Substitution Pattern Matching
// =============================================================================

/**
 * Check if an expression matches the u-substitution pattern.
 *
 * The u-substitution pattern is: f(g(x)) * g'(x) or f(g(x)) * c*g'(x)
 * where g(x) is a composite function and g'(x) (or a constant multiple)
 * appears in the integrand.
 *
 * @param integrand - The expression to check
 * @param variable - The variable of integration
 * @returns Match object if pattern detected, null otherwise
 *
 * @example
 * ```typescript
 * // 2x*cos(x^2) matches with u = x^2, du = 2x
 * const expr = parseLatex('2x\\cos(x^2)');
 * const match = matchUSubstitution(expr, 'x');
 * // match.u = x^2, match.du = 2x
 * ```
 */
export function matchUSubstitution(
	integrand: MathNode,
	variable: string
): USubstitutionMatch | null {
	// Get all potential u candidates
	const candidates = findUCandidates(integrand, variable);

	// Try each candidate
	for (const u of candidates) {
		const match = tryUSubstitution(integrand, u, variable);
		if (match) {
			return match;
		}
	}

	return null;
}

/**
 * Check if integrand is exactly u^n for some n.
 *
 * This is useful for detecting cases like ∫(x-1)^3 dx where u = x-1 and du = 1.
 * In such cases, u-substitution trivially works: ∫u^n du = u^(n+1)/(n+1).
 *
 * @param integrand - The expression to check
 * @param u - The u expression
 * @returns True if integrand = u^n
 *
 * @internal
 */
function isExactlyPowerOfU(integrand: MathNode, u: MathNode): boolean {
	const uHash = hashMathNode(u);

	// Case 1: integrand is exactly u (i.e., u^1)
	if (hashMathNode(integrand) === uHash) {
		return true;
	}

	// Case 2: integrand is u^n
	if (integrand.type === 'superscript') {
		if (hashMathNode(integrand.base) === uHash) {
			// Check if exponent is a number (positive integer)
			if (isNumber(integrand.superscript)) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Try u-substitution with a specific u candidate.
 *
 * Checks if du/dx (or a constant multiple) appears in the integrand.
 *
 * @param integrand - The expression to integrate
 * @param u - The candidate u expression
 * @param variable - The variable of integration
 * @returns Match object if successful, null otherwise
 *
 * @internal
 */
function tryUSubstitution(
	integrand: MathNode,
	u: MathNode,
	variable: string
): USubstitutionMatch | null {
	// Compute du/dx
	let du: MathNode;
	try {
		du = differentiate(u, { variable });
	} catch {
		// If differentiation fails, this candidate doesn't work
		return null;
	}

	// If du is a constant (doesn't contain the variable), u-substitution is not useful
	// because we can't factor out du from the integrand to simplify
	// Exception: if the integrand is exactly a function of u (handled below)
	const duContainsVar = containsVariable(du, variable);
	if (!duContainsVar && !isNumber(du)) {
		// du = constant, but not a simple number
		// This case is tricky - reject for now
		return null;
	}

	// If du = 1 (trivial derivative), u-substitution doesn't help for rational functions
	// because we can't simplify the integrand by factoring out du
	if (isNumber(du) && du.value === '1') {
		// Only accept if the integrand is exactly u^n for some n
		// This handles cases like ∫(x-1)^3 dx where u = x-1
		if (!isExactlyPowerOfU(integrand, u)) {
			return null;
		}
	}

	// Special case: division where denominator is u or contains u
	// and numerator is proportional to du
	// Example: x/(1+x²) with u = 1+x², du = 2x, numerator = x = 0.5 * du
	if (isDivision(integrand)) {
		const num = integrand.numerator;
		const denom = integrand.denominator;
		const uHash = hashMathNode(u);

		// Check if denominator is or contains u
		const denomHash = hashMathNode(denom);
		if (denomHash === uHash || containsSubexpression(denom, u)) {
			// Check if numerator is proportional to du
			const propConst = findProportionalityConstant(num, du);
			if (propConst !== null) {
				return { u, du, constantFactor: propConst };
			}
		}
	}

	// Special case: multiplication where one factor is 1/u
	// and other factor is proportional to du
	// Example: x * (1/(1+x²)) with u = 1+x², du = 2x
	// This is equivalent to x/(1+x²)
	if (isMultiplication(integrand)) {
		const uHash = hashMathNode(u);

		// Check if right is 1/u and left is proportional to du
		if (
			isDivision(integrand.right) &&
			isNumber(integrand.right.numerator) &&
			integrand.right.numerator.value === '1'
		) {
			const denomHash = hashMathNode(integrand.right.denominator);
			if (denomHash === uHash) {
				const propConst = findProportionalityConstant(integrand.left, du);
				if (propConst !== null) {
					return { u, du, constantFactor: propConst };
				}
			}
		}

		// Check if left is 1/u and right is proportional to du
		if (
			isDivision(integrand.left) &&
			isNumber(integrand.left.numerator) &&
			integrand.left.numerator.value === '1'
		) {
			const denomHash = hashMathNode(integrand.left.denominator);
			if (denomHash === uHash) {
				const propConst = findProportionalityConstant(integrand.right, du);
				if (propConst !== null) {
					return { u, du, constantFactor: propConst };
				}
			}
		}

		// Check if one factor is f(u) and other is proportional to du
		// Example: x * e^(x²) with u = x², du = 2x
		// Left = x (proportional to du = 2x with factor 1/2)
		// Right = e^(x²) = e^u (function of u only)
		const leftProp = findProportionalityConstant(integrand.left, du);
		if (leftProp !== null && containsSubexpression(integrand.right, u)) {
			// Check that right only contains u (not x directly outside u)
			// by verifying that replacing u with a constant leaves no x
			const rightContainsUOnly = containsSubexpression(integrand.right, u);
			if (rightContainsUOnly) {
				return { u, du, constantFactor: leftProp };
			}
		}

		const rightProp = findProportionalityConstant(integrand.right, du);
		if (rightProp !== null && containsSubexpression(integrand.left, u)) {
			return { u, du, constantFactor: rightProp };
		}
	}

	// Check if du appears in the integrand (exactly)
	// But only if the remaining part can be expressed in terms of u
	if (containsSubexpression(integrand, du)) {
		// For multiplication: f(u) * du pattern
		// We need to verify that the other factor only contains u (not the variable directly)
		if (isMultiplication(integrand)) {
			const duHash = hashMathNode(du);
			const leftHash = hashMathNode(integrand.left);
			const rightHash = hashMathNode(integrand.right);

			if (leftHash === duHash) {
				// left = du, right should be expressible in terms of u
				// Check that right doesn't contain the variable except through u
				if (
					containsSubexpression(integrand.right, u) ||
					!containsVariable(integrand.right, variable)
				) {
					return { u, du };
				}
			} else if (rightHash === duHash) {
				// right = du, left should be expressible in terms of u
				if (
					containsSubexpression(integrand.left, u) ||
					!containsVariable(integrand.left, variable)
				) {
					return { u, du };
				}
			}
		}
		// For function nodes like f(u): e.g., e^(3x) with u = 3x
		// The entire function IS f(u) if its argument equals u
		else if (integrand.type === 'function' && integrand.args.length === 1) {
			const argHash = hashMathNode(integrand.args[0]);
			const uHash = hashMathNode(u);
			if (argHash === uHash) {
				return { u, du };
			}
		}
		// For superscript nodes there are two patterns:
		// 1. e^u (base is constant, exponent is u): e.g., e^(3x) with u = 3x
		// 2. u^n (base is u, exponent is constant): e.g., (2x+1)^3 with u = 2x+1
		else if (integrand.type === 'superscript') {
			const uHash = hashMathNode(u);
			// Pattern 1: e^u (exponent equals u)
			const expHash = hashMathNode(integrand.superscript);
			if (expHash === uHash) {
				return { u, du };
			}
			// Pattern 2: u^n (base equals u)
			const baseHash = hashMathNode(integrand.base);
			if (baseHash === uHash && !containsVariable(integrand.superscript, variable)) {
				return { u, du };
			}
		}
		// For division nodes like 1/u or f(u)/g(u): e.g., 1/(2x+1) with u = 2x+1
		else if (isDivision(integrand)) {
			const uHash = hashMathNode(u);
			const denomHash = hashMathNode(integrand.denominator);
			// If denominator is u and numerator is constant → 1/u pattern
			if (denomHash === uHash && !containsVariable(integrand.numerator, variable)) {
				return { u, du };
			}
		}
		// For non-multiplication cases, still allow if du matches exactly
		else if (hashMathNode(integrand) === hashMathNode(du)) {
			return { u, du };
		}
	}

	// Check if du appears with a constant factor
	// For example: integrand has x, but du = 2x
	// We need to check if du/c or c*du appears
	const duHash = hashMathNode(du);

	// Try to find du as a factor in multiplication
	const factor = findConstantFactor(integrand, du);
	if (factor !== null) {
		return {
			u,
			du,
			constantFactor: factor
		};
	}

	// Check if the integrand itself equals du (up to constant factor)
	const integrandHash = hashMathNode(integrand);
	if (duHash === integrandHash) {
		return { u, du };
	}

	return null;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if an expression contains another expression as a subexpression.
 *
 * @param expr - The expression to search in
 * @param target - The subexpression to find
 * @returns True if target appears in expr
 *
 * @internal
 */
function containsSubexpression(expr: MathNode, target: MathNode): boolean {
	const targetHash = hashMathNode(target);

	function search(node: MathNode): boolean {
		// Check if this node matches
		if (hashMathNode(node) === targetHash) {
			return true;
		}

		// Recursively search children
		switch (node.type) {
			case 'addition':
			case 'subtraction':
			case 'multiplication':
				return search(node.left) || search(node.right);

			case 'division':
				return search(node.numerator) || search(node.denominator);

			case 'superscript':
				return search(node.base) || search(node.superscript);

			case 'function':
				return (
					node.args.some(search) ||
					(node.power !== undefined && search(node.power)) ||
					(node.base !== undefined && search(node.base))
				);

			case 'opposite':
			case 'positive':
				return search(node.operand);

			case 'delimiter':
				return search(node.content);

			case 'subscript':
				return search(node.base) || search(node.subscript);

			case 'relation':
				return search(node.left) || search(node.right);

			case 'unit':
				return search(node.expression);

			case 'composition':
				return search(node.outer) || search(node.inner);

			case 'matrix':
				return node.rows.some((row) => row.some(search));

			// Complex nodes
			case 'complex':
				return search(node.real) || search(node.imaginary);

			// Leaf nodes
			case 'number':
			case 'variable':
			case 'symbol':
			case 'greek':
			case 'hole':
			case 'infinity':
			case 'constant':
				return false;

			// Limit nodes
			case 'limit':
				return search(node.expression) || search(node.approach);

			default: {
				const _exhaustive: never = node;
				return _exhaustive;
			}
		}
	}

	return search(expr);
}

/**
 * Try to find the constant factor relating two expressions.
 *
 * If expr = c * target or expr = target / c for some constant c,
 * returns c. Otherwise returns null.
 *
 * @param expr - The expression
 * @param target - The target subexpression
 * @returns Constant factor if found, null otherwise
 *
 * @internal
 */
function findConstantFactor(expr: MathNode, target: MathNode): number | null {
	const targetHash = hashMathNode(target);

	// Case 0: Handle opposite (negation) nodes
	// If target = -expr, then expr = -1 * target (factor = -1)
	// If target = opposite(inner), check if expr relates to inner
	if (target.type === 'opposite') {
		const innerFactor = findConstantFactor(expr, target.operand);
		if (innerFactor !== null) {
			return -innerFactor;
		}
	}

	// If expr = opposite(inner), check if inner relates to target
	if (expr.type === 'opposite') {
		const innerFactor = findConstantFactor(expr.operand, target);
		if (innerFactor !== null) {
			return -innerFactor;
		}
	}

	// Case 1: expr is a multiplication
	if (expr.type === 'multiplication') {
		const leftHash = hashMathNode(expr.left);
		const rightHash = hashMathNode(expr.right);

		// Check if left is constant and right is target
		if (rightHash === targetHash && isNumber(expr.left)) {
			return parseFloat(expr.left.value);
		}

		// Check if right is constant and left is target
		if (leftHash === targetHash && isNumber(expr.right)) {
			return parseFloat(expr.right.value);
		}
	}

	// Case 2: expr is a division
	if (isDivision(expr)) {
		const numHash = hashMathNode(expr.numerator);

		// Check if numerator is target and denominator is constant
		if (numHash === targetHash && isNumber(expr.denominator)) {
			return 1 / parseFloat(expr.denominator.value);
		}
	}

	// Case 3: Check if expr and target differ by a constant factor
	// This is more complex - we'd need to divide expr by target and simplify
	// For now, we'll skip this case

	return null;
}

/**
 * Check if two expressions are equal up to a constant factor.
 *
 * Returns the constant c such that expr1 = c * expr2, or null if no such constant exists.
 *
 * Uses normalization to handle all structural variations:
 * - 2*x vs x*2 vs 2x -> all equivalent
 * - x vs 2x -> factor 0.5
 * - -x vs x -> factor -1
 * - x/2 vs x -> factor 0.5
 *
 * @param expr1 - First expression
 * @param expr2 - Second expression
 * @returns Constant factor if expressions are proportional, null otherwise
 */
export function findProportionalityConstant(expr1: MathNode, expr2: MathNode): number | null {
	// Fast path: identical expressions
	if (hashMathNode(expr1) === hashMathNode(expr2)) {
		return 1;
	}

	// Use normalization for all other cases
	return findProportionalityConstantNormalized(expr1, expr2);
}
