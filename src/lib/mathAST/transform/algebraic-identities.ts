/**
 * Algebraic Identities Module
 *
 * Provides transformation functions for algebraic identities:
 * - Factoring: a²-b² → (a+b)(a-b), a²±2ab+b² → (a±b)², a³±b³ → ...
 * - Expanding: (a+b)(a-b) → a²-b², (a±b)² → a²±2ab+b²
 *
 * Uses the pattern matching system for structural detection,
 * with fallback to analysis/structures.ts for numeric cases.
 *
 * @module mathAST/transform/algebraic-identities
 */

import type { MathNode } from '../types';
import { number, multiply, add, subtract, superscript, parentheses } from '../factory';
import { P } from '../pattern/builder';
import { match } from '../pattern/match';
import {
	isDifferenceOfSquares,
	isPerfectSquareTrinomial,
	isSumOfCubes,
	isDifferenceOfCubes
} from '../analysis/structures';
import {
	type TransformRule,
	type TransformResult,
	getBinding,
	applyIdentityTransforms
} from './identity-engine';

// =============================================================================
// Types
// =============================================================================

/** Result of applying algebraic identity transformations */
export type AlgebraicTransformResult = TransformResult;

// =============================================================================
// Pattern Definitions
// =============================================================================

// --- Factoring patterns ---
const PAT_DIFF_SQUARES = P.sub(P.pow(P._('a'), P.num(2)), P.pow(P._('b'), P.num(2)));
const PAT_SUM_CUBES = P.add(P.pow(P._('a'), P.num(3)), P.pow(P._('b'), P.num(3)));
const PAT_DIFF_CUBES = P.sub(P.pow(P._('a'), P.num(3)), P.pow(P._('b'), P.num(3)));

// --- Expanding patterns ---
const PAT_SUM_DIFF_PRODUCT = P.mul(
	P.paren(P.add(P._('a'), P._('b'))),
	P.paren(P.sub(P._('a'), P._('b')))
);
const PAT_SUM_SQUARED = P.pow(P.paren(P.add(P._('a'), P._('b'))), P.num(2));
const PAT_DIFF_SQUARED = P.pow(P.paren(P.sub(P._('a'), P._('b'))), P.num(2));

// =============================================================================
// Factoring Transform Functions
// =============================================================================

/**
 * a² - b² → (a+b)(a-b)
 * Also handles numeric cases like x² - 4 → (x+2)(x-2)
 */
function transformDiffSquaresToProduct(node: MathNode): MathNode | null {
	// 1. Pattern match: a² - b²
	const result = match(PAT_DIFF_SQUARES, node);
	if (result.success) {
		const a = getBinding(result.bindings, 'a');
		const b = getBinding(result.bindings, 'b');
		if (a && b) {
			return multiply(parentheses(add(a, b)), parentheses(subtract(a, b)), 'implicit');
		}
	}

	// 2. Fallback: numeric detection (e.g., x² - 4)
	const detected = isDifferenceOfSquares(node);
	if (detected) {
		return multiply(
			parentheses(add(detected.a, detected.b)),
			parentheses(subtract(detected.a, detected.b)),
			'implicit'
		);
	}

	return null;
}

/**
 * a² + 2ab + b² → (a+b)²
 * a² - 2ab + b² → (a-b)²
 * Also handles numeric cases like x² + 6x + 9 → (x+3)²
 */
function transformPerfectSquareTrinomial(node: MathNode): MathNode | null {
	const detected = isPerfectSquareTrinomial(node);
	if (!detected) return null;

	const inner =
		detected.sign === '+' ? add(detected.a, detected.b) : subtract(detected.a, detected.b);

	return superscript(parentheses(inner), number('2'));
}

/**
 * a³ + b³ → (a+b)(a² - ab + b²)
 * Also handles numeric cases like x³ + 8 → (x+2)(x² - 2x + 4)
 */
function transformSumCubesToProduct(node: MathNode): MathNode | null {
	// 1. Pattern match: a³ + b³
	const result = match(PAT_SUM_CUBES, node);
	if (result.success) {
		const a = getBinding(result.bindings, 'a');
		const b = getBinding(result.bindings, 'b');
		if (a && b) {
			return buildSumCubesFactored(a, b);
		}
	}

	// 2. Fallback: numeric detection
	const detected = isSumOfCubes(node);
	if (detected) {
		return buildSumCubesFactored(detected.a, detected.b);
	}

	return null;
}

/**
 * a³ - b³ → (a-b)(a² + ab + b²)
 * Also handles numeric cases like x³ - 27 → (x-3)(x² + 3x + 9)
 */
function transformDiffCubesToProduct(node: MathNode): MathNode | null {
	// 1. Pattern match: a³ - b³
	const result = match(PAT_DIFF_CUBES, node);
	if (result.success) {
		const a = getBinding(result.bindings, 'a');
		const b = getBinding(result.bindings, 'b');
		if (a && b) {
			return buildDiffCubesFactored(a, b);
		}
	}

	// 2. Fallback: numeric detection
	const detected = isDifferenceOfCubes(node);
	if (detected) {
		return buildDiffCubesFactored(detected.a, detected.b);
	}

	return null;
}

// =============================================================================
// Expanding Transform Functions
// =============================================================================

/**
 * (a+b)(a-b) → a² - b²
 */
function transformProductToDiffSquares(node: MathNode): MathNode | null {
	const result = match(PAT_SUM_DIFF_PRODUCT, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	return subtract(superscript(a, number('2')), superscript(b, number('2')));
}

/**
 * (a+b)² → a² + 2ab + b²
 */
function transformExpandSumSquared(node: MathNode): MathNode | null {
	const result = match(PAT_SUM_SQUARED, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	return add(
		add(superscript(a, number('2')), multiply(number('2'), multiply(a, b, 'implicit'), 'implicit')),
		superscript(b, number('2'))
	);
}

/**
 * (a-b)² → a² - 2ab + b²
 */
function transformExpandDiffSquared(node: MathNode): MathNode | null {
	const result = match(PAT_DIFF_SQUARED, node);
	if (!result.success) return null;
	const a = getBinding(result.bindings, 'a');
	const b = getBinding(result.bindings, 'b');
	if (!a || !b) return null;

	return add(
		subtract(
			superscript(a, number('2')),
			multiply(number('2'), multiply(a, b, 'implicit'), 'implicit')
		),
		superscript(b, number('2'))
	);
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create an implicit product with conventional ordering (numbers first).
 */
function implicitProduct(a: MathNode, b: MathNode): MathNode {
	// Put numbers first for conventional rendering: 2x not x2
	if (b.type === 'number') return multiply(b, a, 'implicit');
	return multiply(a, b, 'implicit');
}

/**
 * Square a node. For numbers, compute the value directly (2 → 4, not 2²).
 */
function squared(node: MathNode): MathNode {
	if (node.type === 'number') {
		const val = parseFloat((node as { value: string }).value);
		return number(String(val * val));
	}
	return superscript(node, number('2'));
}

/**
 * Build (a+b)(a² - ab + b²)
 */
function buildSumCubesFactored(a: MathNode, b: MathNode): MathNode {
	return multiply(
		parentheses(add(a, b)),
		parentheses(add(subtract(squared(a), implicitProduct(a, b)), squared(b))),
		'implicit'
	);
}

/**
 * Build (a-b)(a² + ab + b²)
 */
function buildDiffCubesFactored(a: MathNode, b: MathNode): MathNode {
	return multiply(
		parentheses(subtract(a, b)),
		parentheses(add(add(squared(a), implicitProduct(a, b)), squared(b))),
		'implicit'
	);
}

// =============================================================================
// Rule Collections
// =============================================================================

const FACTORING_TRANSFORMS: TransformRule[] = [
	{ name: 'diff-squares-to-product', transform: transformDiffSquaresToProduct },
	{ name: 'perfect-square-trinomial', transform: transformPerfectSquareTrinomial },
	{ name: 'sum-cubes-to-product', transform: transformSumCubesToProduct },
	{ name: 'diff-cubes-to-product', transform: transformDiffCubesToProduct }
];

const EXPANDING_TRANSFORMS: TransformRule[] = [
	{ name: 'product-to-diff-squares', transform: transformProductToDiffSquares },
	{ name: 'expand-sum-squared', transform: transformExpandSumSquared },
	{ name: 'expand-diff-squared', transform: transformExpandDiffSquared }
];

// Default: factoring only (expanding is inverse, would cause loops)
const ALL_ALGEBRAIC_TRANSFORMS: TransformRule[] = [...FACTORING_TRANSFORMS];

// =============================================================================
// Public API
// =============================================================================

/**
 * Factor algebraic expressions using remarkable identities.
 *
 * Examples:
 * - a² - b² → (a+b)(a-b)
 * - x² - 4 → (x+2)(x-2)
 * - a² + 2ab + b² → (a+b)²
 * - x² + 6x + 9 → (x+3)²
 * - a³ + b³ → (a+b)(a² - ab + b²)
 * - a³ - b³ → (a-b)(a² + ab + b²)
 *
 * @param node - The expression to factor
 * @returns Transformation result
 */
export function factorAlgebraic(node: MathNode): AlgebraicTransformResult {
	return applyIdentityTransforms(node, FACTORING_TRANSFORMS);
}

/**
 * Expand algebraic expressions using remarkable identities.
 *
 * Examples:
 * - (a+b)(a-b) → a² - b²
 * - (a+b)² → a² + 2ab + b²
 * - (a-b)² → a² - 2ab + b²
 *
 * @param node - The expression to expand
 * @returns Transformation result
 */
export function expandAlgebraic(node: MathNode): AlgebraicTransformResult {
	return applyIdentityTransforms(node, EXPANDING_TRANSFORMS);
}

/**
 * Apply algebraic identity transforms (factoring by default).
 *
 * @param node - The expression to transform
 * @param transforms - The transforms to apply (defaults to factoring)
 * @returns Transformation result
 */
export function applyAlgebraicIdentities(
	node: MathNode,
	transforms: TransformRule[] = ALL_ALGEBRAIC_TRANSFORMS
): AlgebraicTransformResult {
	return applyIdentityTransforms(node, transforms);
}

// =============================================================================
// Exports for individual transforms (for testing)
// =============================================================================

export const TRANSFORM_DIFF_SQUARES_TO_PRODUCT = transformDiffSquaresToProduct;
export const TRANSFORM_PERFECT_SQUARE_TRINOMIAL = transformPerfectSquareTrinomial;
export const TRANSFORM_SUM_CUBES_TO_PRODUCT = transformSumCubesToProduct;
export const TRANSFORM_DIFF_CUBES_TO_PRODUCT = transformDiffCubesToProduct;
export const TRANSFORM_PRODUCT_TO_DIFF_SQUARES = transformProductToDiffSquares;
export const TRANSFORM_EXPAND_SUM_SQUARED = transformExpandSumSquared;
export const TRANSFORM_EXPAND_DIFF_SQUARED = transformExpandDiffSquared;
