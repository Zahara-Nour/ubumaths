/**
 * Algebraic Structure Detection
 *
 * Detects notable algebraic structures and identities:
 * - Difference of squares: a² - b²
 * - Perfect square trinomial: a² ± 2ab + b²
 * - Sum/difference of cubes: a³ ± b³
 *
 * Uses the pattern matching system for structure detection. Seuls lecteurs :
 * les règles d'identités de `pattern/rule-sets/algebraic-identities.ts`.
 * Les détecteurs sans appelant (forme quadratique, forme factorisée, facteur
 * commun, `detectStructure`) ont été retirés au lot 3b de l'ADR 0024 : la
 * factorisation passe par `factor/`.
 *
 * @module mathAST/analysis/structures
 */

import type { MathNode } from '../types';
import { P, match, type MatchBindings } from '../pattern';
import { isMathNodeBinding } from '../pattern/types';
import { flattenSumShallow, flattenProductShallow } from '../flatten';
import { isNumber, isAddition, isSubtraction } from '../guards';

// =============================================================================
// Types
// =============================================================================

/**
 * Types of algebraic structures
 */
export type StructureType =
	'difference_of_squares' | 'perfect_square_trinomial' | 'sum_of_cubes' | 'difference_of_cubes';

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

	for (const { factor } of factors) {
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
