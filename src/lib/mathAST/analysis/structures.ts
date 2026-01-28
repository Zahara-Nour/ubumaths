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
 * @module mathAST/analysis/structures
 */

import type { MathNode } from '../types';
import { flattenSumShallow, flattenProductShallow } from '../flatten';
import {
	isNumber,
	isVariable,
	isGreek,
	isMultiplication,
	isOpposite,
	isDelimiter,
	isSuperscript,
	isAddition,
	isSubtraction
} from '../guards';
import { nodesEqual } from '../pattern';
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
// Helper Functions
// =============================================================================

/**
 * Check if node is a perfect square (x² or number that's a perfect square).
 */
function isPerfectSquare(node: MathNode): { base: MathNode } | null {
	// x^2
	if (isSuperscript(node)) {
		if (isNumber(node.superscript) && node.superscript.value === '2') {
			return { base: node.base };
		}
	}

	// Numeric perfect square
	if (isNumber(node)) {
		const val = parseFloat(node.value);
		const sqrt = Math.sqrt(val);
		if (Number.isInteger(sqrt)) {
			return { base: { type: 'number', value: String(sqrt) } };
		}
	}

	// (expression)^2
	if (isDelimiter(node)) {
		const result = isPerfectSquare(node.content);
		if (result) {
			return result;
		}
	}

	return null;
}

/**
 * Check if node is a perfect cube (x³ or number that's a perfect cube).
 */
function isPerfectCube(node: MathNode): { base: MathNode } | null {
	// x^3
	if (isSuperscript(node)) {
		if (isNumber(node.superscript) && node.superscript.value === '3') {
			return { base: node.base };
		}
	}

	// Numeric perfect cube
	if (isNumber(node)) {
		const val = parseFloat(node.value);
		const cbrt = Math.cbrt(val);
		if (Number.isInteger(cbrt)) {
			return { base: { type: 'number', value: String(cbrt) } };
		}
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
 * Check if two nodes are equal (structurally).
 */
function areEqual(a: MathNode, b: MathNode): boolean {
	return nodesEqual(a, b);
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
	// Must be a subtraction
	if (!isSubtraction(node)) {
		return null;
	}

	// Both sides must be perfect squares
	const leftSquare = isPerfectSquare(node.left);
	const rightSquare = isPerfectSquare(node.right);

	if (!leftSquare || !rightSquare) {
		return null;
	}

	return {
		type: 'difference_of_squares',
		a: leftSquare.base,
		b: rightSquare.base,
		confidence: 'certain'
	};
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

	// Find the two perfect square terms
	const squareTerms: { base: MathNode; sign: '+' | '-'; index: number }[] = [];
	let middleTermIndex = -1;

	for (let i = 0; i < terms.length; i++) {
		const { sign, term } = terms[i];
		const square = isPerfectSquare(term);
		if (square) {
			squareTerms.push({ base: square.base, sign, index: i });
		} else {
			middleTermIndex = i;
		}
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
	// Check if middle term equals 2ab or -2ab
	// This is a simplified check - we verify the coefficient is ±2 and contains both bases
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

	for (const factor of factors) {
		if (areEqual(factor, a)) {
			foundA = true;
		} else if (!bIsOne && bNumeric === null && areEqual(factor, b)) {
			// b is not a number, check for structural equality
			foundB = true;
		} else if (isNumber(factor)) {
			numericCoeff *= parseFloat(factor.value);
		} else {
			// Unknown factor - might be acceptable in some cases
			// For now, we'll be strict
			return null;
		}
	}

	// If b is 1, we only need to find a
	if (bIsOne) {
		if (!foundA) return null;
		// Coefficient should be 2 (for perfect square trinomial with b=1)
		if (numericCoeff !== 2 && numericCoeff !== -2) return null;
		return numericCoeff;
	}

	// If b is a number (not 1), check if numeric coefficient includes b
	if (bNumeric !== null) {
		// For x² + 4x + 4 = (x + 2)²:
		// a = x, b = 2, middle term = 4x
		// We need: numericCoeff = 2 * b = 2 * 2 = 4
		// So we check if numericCoeff / bNumeric = 2 or -2
		if (!foundA) return null;
		const effectiveCoeff = numericCoeff / bNumeric;
		if (effectiveCoeff !== 2 && effectiveCoeff !== -2) return null;
		return effectiveCoeff;
	}

	// b is a symbolic expression
	// Must have found both a and b
	if (!foundA || !foundB) {
		return null;
	}

	// Coefficient should be 2 (for perfect square trinomial)
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
	if (!isAddition(node)) {
		return null;
	}

	const leftCube = isPerfectCube(node.left);
	const rightCube = isPerfectCube(node.right);

	if (!leftCube || !rightCube) {
		return null;
	}

	return {
		type: 'sum_of_cubes',
		a: leftCube.base,
		b: rightCube.base,
		confidence: 'certain'
	};
}

/**
 * Detect if expression is a difference of cubes: a³ - b³
 *
 * @param node - The expression to check
 * @returns DifferenceOfCubesInfo if detected, null otherwise
 */
export function isDifferenceOfCubes(node: MathNode): DifferenceOfCubesInfo | null {
	if (!isSubtraction(node)) {
		return null;
	}

	const leftCube = isPerfectCube(node.left);
	const rightCube = isPerfectCube(node.right);

	if (!leftCube || !rightCube) {
		return null;
	}

	return {
		type: 'difference_of_cubes',
		a: leftCube.base,
		b: rightCube.base,
		confidence: 'certain'
	};
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

	for (const factor of factors) {
		// Each factor should be a linear binomial (x - r) or (x + r)
		const linearInfo = extractLinearFactor(factor, targetVar);

		if (linearInfo === null) {
			// Not all factors are linear - could be coefficient or other
			// Allow numeric coefficients
			if (isNumber(factor)) {
				continue;
			}
			// Check for delimiter containing linear factor
			if (isDelimiter(factor)) {
				const innerInfo = extractLinearFactor(factor.content, targetVar);
				if (innerInfo) {
					linearFactors.push(factor);
					roots.push(innerInfo.root);
					continue;
				}
			}
			return null;
		}

		linearFactors.push(factor);
		roots.push(linearInfo.root);
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
 * Extract root from a linear factor (x - r) or (x + r).
 */
function extractLinearFactor(node: MathNode, variable: string): { root: MathNode } | null {
	// Handle delimiter
	if (isDelimiter(node)) {
		return extractLinearFactor(node.content, variable);
	}

	// Must be addition or subtraction
	if (!isAddition(node) && !isSubtraction(node)) {
		return null;
	}

	// Check if one side is just the variable
	const leftIsVar = isVariable(node.left) && node.left.name === variable;
	const rightIsVar = isVariable(node.right) && node.right.name === variable;

	if (leftIsVar && isSubtraction(node)) {
		// x - r: root is r
		return { root: node.right };
	}

	if (leftIsVar && isAddition(node)) {
		// x + r: root is -r
		return { root: { type: 'opposite', operand: node.right } };
	}

	if (rightIsVar && isSubtraction(node)) {
		// a - x: root is a
		return { root: node.left };
	}

	if (rightIsVar && isAddition(node)) {
		// a + x: This could be seen as x + a, root is -a
		return { root: { type: 'opposite', operand: node.left } };
	}

	return null;
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
		// Check left side first
		if (isNumber(node.left)) {
			return parseFloat(node.left.value);
		}
		// Could be nested
		return 1; // Implicit coefficient of 1
	}

	if (isVariable(node) || isGreek(node)) {
		return 1;
	}

	if (isSuperscript(node)) {
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
