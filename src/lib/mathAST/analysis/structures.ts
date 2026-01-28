/**
 * Algebraic Structure Detection
 *
 * Detects notable algebraic structures and identities:
 * - Difference of squares: a² - b²
 * - Perfect square trinomial: a² ± 2ab + b²
 * - Sum/difference of cubes: a³ ± b³
 * - Quadratic form: ax² + bx + c
 * - Factored form: (x - r₁)(x - r₂)
 * - Common factors: k(...)
 *
 * Uses the pattern matching system for structure detection.
 *
 * @module mathAST/analysis/structures
 */

import type { MathNode } from '../types';
import { P, match, type MatchBindings } from '../pattern';
import { isMathNodeBinding } from '../pattern/types';
import { flattenSumShallow, flattenProductShallow } from '../flatten';
import {
	isNumber,
	isVariable,
	isGreek,
	isMultiplication,
	isOpposite,
	isDelimiter,
	isAddition,
	isSubtraction
} from '../guards';
import { getVariables } from '../eval/substitute';
import { analyzePolynomial } from './polynomial-analysis';
import { getPolynomialDegree } from './expression-classify';

// =============================================================================
// Types
// =============================================================================

/**
 * Types of algebraic structures
 */
export type StructureType =
	| 'difference_of_squares'
	| 'perfect_square_trinomial'
	| 'sum_of_cubes'
	| 'difference_of_cubes'
	| 'quadratic_form'
	| 'factored_form'
	| 'common_factor';

/**
 * Base detected structure
 */
export interface DetectedStructure {
	readonly type: StructureType;
	readonly confidence: 'certain' | 'likely' | 'possible';
}

/**
 * Difference of squares: a² - b²
 */
export interface DifferenceOfSquaresInfo extends DetectedStructure {
	readonly type: 'difference_of_squares';
	readonly a: MathNode; // The 'a' term
	readonly b: MathNode; // The 'b' term
}

/**
 * Perfect square trinomial: a² ± 2ab + b² = (a ± b)²
 */
export interface PerfectSquareTrinomialInfo extends DetectedStructure {
	readonly type: 'perfect_square_trinomial';
	readonly a: MathNode; // The 'a' term
	readonly b: MathNode; // The 'b' term
	readonly sign: '+' | '-'; // The sign in (a ± b)²
}

/**
 * Sum of cubes: a³ + b³
 */
export interface SumOfCubesInfo extends DetectedStructure {
	readonly type: 'sum_of_cubes';
	readonly a: MathNode;
	readonly b: MathNode;
}

/**
 * Difference of cubes: a³ - b³
 */
export interface DifferenceOfCubesInfo extends DetectedStructure {
	readonly type: 'difference_of_cubes';
	readonly a: MathNode;
	readonly b: MathNode;
}

/**
 * Quadratic form: ax² + bx + c
 */
export interface QuadraticFormInfo extends DetectedStructure {
	readonly type: 'quadratic_form';
	readonly variable: string;
	readonly a: MathNode; // Coefficient of x²
	readonly b: MathNode; // Coefficient of x
	readonly c: MathNode; // Constant term
}

/**
 * Factored form: (x - r₁)(x - r₂)...
 */
export interface FactoredFormInfo extends DetectedStructure {
	readonly type: 'factored_form';
	readonly variable: string;
	readonly factors: readonly MathNode[];
	readonly roots: readonly MathNode[]; // The rᵢ values
}

/**
 * Common factor: k(...)
 */
export interface CommonFactorInfo extends DetectedStructure {
	readonly type: 'common_factor';
	readonly factor: MathNode; // The common factor
	readonly remainder: MathNode; // What's left after factoring
}

// =============================================================================
// Patterns
// =============================================================================

// a² - b² (difference of squares)
const PATTERN_DIFF_SQUARES = P.sub(P.pow(P._('a'), P.num(2)), P.pow(P._('b'), P.num(2)));

// a³ + b³ (sum of cubes)
const PATTERN_SUM_CUBES = P.add(P.pow(P._('a'), P.num(3)), P.pow(P._('b'), P.num(3)));

// a³ - b³ (difference of cubes)
const PATTERN_DIFF_CUBES = P.sub(P.pow(P._('a'), P.num(3)), P.pow(P._('b'), P.num(3)));

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Extract MathNode from bindings safely.
 */
function getBinding(bindings: MatchBindings, name: string): MathNode | null {
	const value = bindings.get(name);
	if (value && isMathNodeBinding(value)) {
		return value;
	}
	return null;
}

/**
 * Check if a number node represents a perfect square and return its root.
 */
function numericPerfectSquareRoot(node: MathNode): MathNode | null {
	if (!isNumber(node)) return null;
	const val = parseFloat(node.value);
	if (val < 0) return null;
	const sqrt = Math.sqrt(val);
	if (Number.isInteger(sqrt)) {
		return { type: 'number', value: String(sqrt) };
	}
	return null;
}

/**
 * Check if a number node represents a perfect cube and return its root.
 */
function numericPerfectCubeRoot(node: MathNode): MathNode | null {
	if (!isNumber(node)) return null;
	const val = parseFloat(node.value);
	const cbrt = Math.cbrt(val);
	if (Number.isInteger(cbrt)) {
		return { type: 'number', value: String(cbrt) };
	}
	return null;
}

/**
 * Get numeric value from a MathNode if it's a simple number.
 */
function getNumericValue(node: MathNode): number | null {
	if (isNumber(node)) {
		return parseFloat(node.value);
	}
	if (isOpposite(node) && isNumber(node.operand)) {
		return -parseFloat(node.operand.value);
	}
	return null;
}

/**
 * Greatest common divisor of two numbers.
 */
function gcd(a: number, b: number): number {
	a = Math.abs(a);
	b = Math.abs(b);
	while (b > 0) {
		const t = b;
		b = a % b;
		a = t;
	}
	return a;
}

// =============================================================================
// Structure Detection Functions
// =============================================================================

/**
 * Detect if expression is a difference of squares: a² - b²
 *
 * @param node - The expression to check
 * @returns DifferenceOfSquaresInfo if detected, null otherwise
 */
export function isDifferenceOfSquares(node: MathNode): DifferenceOfSquaresInfo | null {
	// Try pattern match first: a² - b²
	const result = match(PATTERN_DIFF_SQUARES, node);
	if (result.success) {
		const a = getBinding(result.bindings, 'a');
		const b = getBinding(result.bindings, 'b');
		if (a && b) {
			return {
				type: 'difference_of_squares',
				a,
				b,
				confidence: 'certain'
			};
		}
	}

	// Check for numeric perfect squares: e.g., x² - 9 where 9 = 3²
	if (!isSubtraction(node)) return null;

	// Left side: check if it's a² or a numeric perfect square
	let aBase: MathNode | null = null;
	const leftResult = match(P.pow(P._('a'), P.num(2)), node.left);
	if (leftResult.success) {
		aBase = getBinding(leftResult.bindings, 'a');
	} else {
		aBase = numericPerfectSquareRoot(node.left);
	}

	// Right side: check if it's b² or a numeric perfect square
	let bBase: MathNode | null = null;
	const rightResult = match(P.pow(P._('b'), P.num(2)), node.right);
	if (rightResult.success) {
		bBase = getBinding(rightResult.bindings, 'b');
	} else {
		bBase = numericPerfectSquareRoot(node.right);
	}

	if (aBase && bBase) {
		return {
			type: 'difference_of_squares',
			a: aBase,
			b: bBase,
			confidence: 'certain'
		};
	}

	return null;
}

/**
 * Detect if expression is a perfect square trinomial: a² ± 2ab + b²
 *
 * @param node - The expression to check
 * @returns PerfectSquareTrinomialInfo if detected, null otherwise
 */
export function isPerfectSquareTrinomial(node: MathNode): PerfectSquareTrinomialInfo | null {
	// Flatten to get terms
	const terms = flattenSumShallow(node);

	if (terms.length !== 3) {
		return null;
	}

	// Find terms that are perfect squares (x² or numeric squares)
	const squareTerms: { base: MathNode; sign: '+' | '-'; index: number }[] = [];
	let middleTermIndex = -1;

	for (let i = 0; i < terms.length; i++) {
		const { sign, term } = terms[i];

		// Check if term is a² pattern
		const powResult = match(P.pow(P._('base'), P.num(2)), term);
		if (powResult.success) {
			const base = getBinding(powResult.bindings, 'base');
			if (base) {
				squareTerms.push({ base, sign, index: i });
				continue;
			}
		}

		// Check if term is a numeric perfect square
		const numRoot = numericPerfectSquareRoot(term);
		if (numRoot) {
			squareTerms.push({ base: numRoot, sign, index: i });
			continue;
		}

		// This is the middle term
		middleTermIndex = i;
	}

	// Need exactly 2 square terms and 1 middle term
	if (squareTerms.length !== 2 || middleTermIndex === -1) {
		return null;
	}

	// Both square terms should have the same sign (both positive for perfect square)
	if (squareTerms[0].sign !== squareTerms[1].sign) {
		return null;
	}

	const a = squareTerms[0].base;
	const b = squareTerms[1].base;
	const middleTerm = terms[middleTermIndex];

	// Middle term should be ±2ab
	const middleCoeff = extractMiddleTermCoeff(middleTerm.term, a, b);

	if (middleCoeff === null) {
		return null;
	}

	// The sign of (a ± b)² depends on the middle term sign
	const resultSign: '+' | '-' = middleTerm.sign === '+' && middleCoeff > 0 ? '+' : '-';

	return {
		type: 'perfect_square_trinomial',
		a,
		b,
		sign: resultSign,
		confidence: 'certain'
	};
}

/**
 * Extract the coefficient from a middle term in 2ab form.
 * Returns the numeric coefficient if it matches the pattern, null otherwise.
 */
function extractMiddleTermCoeff(term: MathNode, a: MathNode, b: MathNode): number | null {
	// Flatten product to find factors
	const factors = flattenProductShallow(term);

	let numericCoeff = 1;
	let foundA = false;
	let foundB = false;

	// Get numeric value of b if it's a number
	const bNumeric = isNumber(b) ? parseFloat(b.value) : null;
	const bIsOne = bNumeric === 1;

	// Use pattern matching to find a and b in factors
	const patternA = P.lit(a);
	const patternB = P.lit(b);

	for (const factor of factors) {
		const matchA = match(patternA, factor);
		const matchB = match(patternB, factor);

		if (matchA.success) {
			foundA = true;
		} else if (!bIsOne && bNumeric === null && matchB.success) {
			foundB = true;
		} else if (isNumber(factor)) {
			numericCoeff *= parseFloat(factor.value);
		} else {
			return null;
		}
	}

	// If b is 1, we only need to find a
	if (bIsOne) {
		if (!foundA) return null;
		if (numericCoeff !== 2 && numericCoeff !== -2) return null;
		return numericCoeff;
	}

	// If b is a number (not 1), check if numeric coefficient includes b
	if (bNumeric !== null) {
		if (!foundA) return null;
		const effectiveCoeff = numericCoeff / bNumeric;
		if (effectiveCoeff !== 2 && effectiveCoeff !== -2) return null;
		return effectiveCoeff;
	}

	// b is a symbolic expression
	if (!foundA || !foundB) {
		return null;
	}

	if (numericCoeff !== 2 && numericCoeff !== -2) {
		return null;
	}

	return numericCoeff;
}

/**
 * Detect if expression is a sum of cubes: a³ + b³
 *
 * @param node - The expression to check
 * @returns SumOfCubesInfo if detected, null otherwise
 */
export function isSumOfCubes(node: MathNode): SumOfCubesInfo | null {
	// Try pattern match first: a³ + b³
	const result = match(PATTERN_SUM_CUBES, node);
	if (result.success) {
		const a = getBinding(result.bindings, 'a');
		const b = getBinding(result.bindings, 'b');
		if (a && b) {
			return {
				type: 'sum_of_cubes',
				a,
				b,
				confidence: 'certain'
			};
		}
	}

	// Check for numeric perfect cubes: e.g., x³ + 8 where 8 = 2³
	if (!isAddition(node)) return null;

	let aBase: MathNode | null = null;
	const leftResult = match(P.pow(P._('a'), P.num(3)), node.left);
	if (leftResult.success) {
		aBase = getBinding(leftResult.bindings, 'a');
	} else {
		aBase = numericPerfectCubeRoot(node.left);
	}

	let bBase: MathNode | null = null;
	const rightResult = match(P.pow(P._('b'), P.num(3)), node.right);
	if (rightResult.success) {
		bBase = getBinding(rightResult.bindings, 'b');
	} else {
		bBase = numericPerfectCubeRoot(node.right);
	}

	if (aBase && bBase) {
		return {
			type: 'sum_of_cubes',
			a: aBase,
			b: bBase,
			confidence: 'certain'
		};
	}

	return null;
}

/**
 * Detect if expression is a difference of cubes: a³ - b³
 *
 * @param node - The expression to check
 * @returns DifferenceOfCubesInfo if detected, null otherwise
 */
export function isDifferenceOfCubes(node: MathNode): DifferenceOfCubesInfo | null {
	// Try pattern match first: a³ - b³
	const result = match(PATTERN_DIFF_CUBES, node);
	if (result.success) {
		const a = getBinding(result.bindings, 'a');
		const b = getBinding(result.bindings, 'b');
		if (a && b) {
			return {
				type: 'difference_of_cubes',
				a,
				b,
				confidence: 'certain'
			};
		}
	}

	// Check for numeric perfect cubes: e.g., x³ - 27 where 27 = 3³
	if (!isSubtraction(node)) return null;

	let aBase: MathNode | null = null;
	const leftResult = match(P.pow(P._('a'), P.num(3)), node.left);
	if (leftResult.success) {
		aBase = getBinding(leftResult.bindings, 'a');
	} else {
		aBase = numericPerfectCubeRoot(node.left);
	}

	let bBase: MathNode | null = null;
	const rightResult = match(P.pow(P._('b'), P.num(3)), node.right);
	if (rightResult.success) {
		bBase = getBinding(rightResult.bindings, 'b');
	} else {
		bBase = numericPerfectCubeRoot(node.right);
	}

	if (aBase && bBase) {
		return {
			type: 'difference_of_cubes',
			a: aBase,
			b: bBase,
			confidence: 'certain'
		};
	}

	return null;
}

/**
 * Detect if expression is a quadratic form: ax² + bx + c
 *
 * @param node - The expression to check
 * @param variable - Optional: specific variable to check for
 * @returns QuadraticFormInfo if detected, null otherwise
 */
export function isQuadraticForm(node: MathNode, variable?: string): QuadraticFormInfo | null {
	// Detect variable if not provided
	const vars = Array.from(getVariables(node));
	const targetVar = variable ?? (vars.length === 1 ? vars[0] : null);

	if (!targetVar) {
		return null;
	}

	// Check if it's a degree 2 polynomial
	const degree = getPolynomialDegree(node, targetVar);
	if (degree !== 2) {
		return null;
	}

	// Analyze to get coefficients
	const analysis = analyzePolynomial(node, targetVar);
	if (!analysis.isPolynomial) {
		return null;
	}

	const a = analysis.coefficients.get(2) ?? ({ type: 'number', value: '0' } as MathNode);
	const b = analysis.coefficients.get(1) ?? ({ type: 'number', value: '0' } as MathNode);
	const c = analysis.coefficients.get(0) ?? ({ type: 'number', value: '0' } as MathNode);

	// a must be non-zero for quadratic
	const aVal = getNumericValue(a);
	if (aVal === 0) {
		return null;
	}

	return {
		type: 'quadratic_form',
		variable: targetVar,
		a,
		b,
		c,
		confidence: 'certain'
	};
}

/**
 * Detect if expression is in factored form: (x - r₁)(x - r₂)...
 *
 * @param node - The expression to check
 * @param variable - Optional: specific variable to check for
 * @returns FactoredFormInfo if detected, null otherwise
 */
export function isFactoredForm(node: MathNode, variable?: string): FactoredFormInfo | null {
	// Check if it's a product
	const factors = flattenProductShallow(node);

	if (factors.length < 2) {
		return null;
	}

	// Detect variable if not provided
	const vars = Array.from(getVariables(node));
	const targetVar = variable ?? (vars.length === 1 ? vars[0] : null);

	if (!targetVar) {
		return null;
	}

	const linearFactors: MathNode[] = [];
	const roots: MathNode[] = [];

	// Patterns for linear factors: (x - r) and (x + r)
	const patternXMinusR = P.sub(P.var(targetVar), P._('r'));
	const patternXPlusR = P.add(P.var(targetVar), P._('r'));
	const patternRMinusX = P.sub(P._('r'), P.var(targetVar));
	const patternRPlusX = P.add(P._('r'), P.var(targetVar));

	for (const factor of factors) {
		// Unwrap delimiter if present
		const inner = isDelimiter(factor) ? factor.content : factor;

		// Try (x - r): root is r
		let matchResult = match(patternXMinusR, inner);
		if (matchResult.success) {
			const r = getBinding(matchResult.bindings, 'r');
			if (r) {
				linearFactors.push(factor);
				roots.push(r);
				continue;
			}
		}

		// Try (x + r): root is -r
		matchResult = match(patternXPlusR, inner);
		if (matchResult.success) {
			const r = getBinding(matchResult.bindings, 'r');
			if (r) {
				linearFactors.push(factor);
				roots.push({ type: 'opposite', operand: r });
				continue;
			}
		}

		// Try (r - x): root is r
		matchResult = match(patternRMinusX, inner);
		if (matchResult.success) {
			const r = getBinding(matchResult.bindings, 'r');
			if (r) {
				linearFactors.push(factor);
				roots.push(r);
				continue;
			}
		}

		// Try (r + x): root is -r
		matchResult = match(patternRPlusX, inner);
		if (matchResult.success) {
			const r = getBinding(matchResult.bindings, 'r');
			if (r) {
				linearFactors.push(factor);
				roots.push({ type: 'opposite', operand: r });
				continue;
			}
		}

		// Allow numeric coefficients
		if (isNumber(factor)) {
			continue;
		}

		// Not a recognized factor
		return null;
	}

	if (linearFactors.length < 2) {
		return null;
	}

	return {
		type: 'factored_form',
		variable: targetVar,
		factors: linearFactors,
		roots,
		confidence: 'certain'
	};
}

/**
 * Detect if expression has a common factor that can be extracted.
 *
 * @param node - The expression to check
 * @returns CommonFactorInfo if detected, null otherwise
 */
export function hasCommonFactor(node: MathNode): CommonFactorInfo | null {
	// Flatten the sum
	const terms = flattenSumShallow(node);

	if (terms.length < 2) {
		return null;
	}

	// Find GCD of numeric coefficients
	const coefficients: number[] = [];

	for (const { term } of terms) {
		const coeff = extractLeadingCoefficient(term);
		if (coeff !== null) {
			coefficients.push(Math.abs(coeff));
		}
	}

	if (coefficients.length !== terms.length) {
		return null;
	}

	const gcdValue = coefficients.reduce((a, b) => gcd(a, b));

	if (gcdValue <= 1) {
		return null;
	}

	// Create the factored result
	const factor: MathNode = { type: 'number', value: String(gcdValue) };

	// Divide each term by the GCD
	const newTerms = terms.map(({ sign, term }) => {
		const divided = divideByCoefficient(term, gcdValue);
		return { sign, term: divided };
	});

	// Rebuild the expression
	let remainder: MathNode;
	if (newTerms.length === 1) {
		remainder =
			newTerms[0].sign === '+' ? newTerms[0].term : { type: 'opposite', operand: newTerms[0].term };
	} else {
		remainder =
			newTerms[0].sign === '+' ? newTerms[0].term : { type: 'opposite', operand: newTerms[0].term };
		for (let i = 1; i < newTerms.length; i++) {
			const { sign, term } = newTerms[i];
			if (sign === '+') {
				remainder = { type: 'addition', left: remainder, right: term };
			} else {
				remainder = { type: 'subtraction', left: remainder, right: term };
			}
		}
	}

	return {
		type: 'common_factor',
		factor,
		remainder,
		confidence: 'certain'
	};
}

/**
 * Extract leading numeric coefficient from a term.
 */
function extractLeadingCoefficient(node: MathNode): number | null {
	if (isNumber(node)) {
		return parseFloat(node.value);
	}

	if (isOpposite(node)) {
		const inner = extractLeadingCoefficient(node.operand);
		return inner !== null ? -inner : null;
	}

	if (isMultiplication(node)) {
		if (isNumber(node.left)) {
			return parseFloat(node.left.value);
		}
		return 1;
	}

	if (isVariable(node) || isGreek(node)) {
		return 1;
	}

	// Check for power pattern
	const powResult = match(P.pow(P._('base'), P._('exp')), node);
	if (powResult.success) {
		return 1;
	}

	if (isDelimiter(node)) {
		return extractLeadingCoefficient(node.content);
	}

	return null;
}

/**
 * Divide a term by a coefficient.
 */
function divideByCoefficient(node: MathNode, coeff: number): MathNode {
	if (isNumber(node)) {
		const val = parseFloat(node.value) / coeff;
		return { type: 'number', value: String(val) };
	}

	if (isMultiplication(node) && isNumber(node.left)) {
		const newCoeff = parseFloat(node.left.value) / coeff;
		if (newCoeff === 1) {
			return node.right;
		}
		return {
			...node,
			left: { type: 'number', value: String(newCoeff) }
		};
	}

	// Variable or power with implicit coefficient 1
	if (coeff === 1) {
		return node;
	}

	// Return as fraction
	return {
		type: 'division',
		numerator: node,
		denominator: { type: 'number', value: String(coeff) },
		displayStyle: 'fraction'
	};
}

// =============================================================================
// Main Detection Function
// =============================================================================

/**
 * Detect all algebraic structures in an expression.
 *
 * @param node - The expression to analyze
 * @returns Array of detected structures, sorted by confidence
 */
export function detectStructure(node: MathNode): DetectedStructure[] {
	const structures: DetectedStructure[] = [];

	// Try each detector
	const diffSquares = isDifferenceOfSquares(node);
	if (diffSquares) structures.push(diffSquares);

	const perfectSquare = isPerfectSquareTrinomial(node);
	if (perfectSquare) structures.push(perfectSquare);

	const sumCubes = isSumOfCubes(node);
	if (sumCubes) structures.push(sumCubes);

	const diffCubes = isDifferenceOfCubes(node);
	if (diffCubes) structures.push(diffCubes);

	const quadratic = isQuadraticForm(node);
	if (quadratic) structures.push(quadratic);

	const factored = isFactoredForm(node);
	if (factored) structures.push(factored);

	const commonFactor = hasCommonFactor(node);
	if (commonFactor) structures.push(commonFactor);

	// Sort by confidence
	const confidenceOrder = { certain: 0, likely: 1, possible: 2 };
	structures.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence]);

	return structures;
}
