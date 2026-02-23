/**
 * Expression Transformations for Display Options
 * ==============================================
 *
 * Applies display transformations to LaTeX mathematical expressions.
 * Uses mathAST for parsing and manipulation.
 *
 * Key transformations:
 * - shuffleTerms: Randomly reorder terms in sums (a + b + c -> b + c + a)
 * - shuffleFactors: Randomly reorder factors in products (a * b * c -> c * a * b)
 * - removeNullTerms: Remove zero terms (x + 0 -> x)
 * - removeUnnecessaryBrackets: Simplify brackets
 *
 * @module ubumark/parameterization/expression-transforms
 *
 * @example Basic usage
 * ```typescript
 * import { applyDisplayTransforms, GLOBAL_DISPLAY_DEFAULTS } from '$lib/ubumark/parameterization';
 *
 * const latex = 'a + b + c';
 * const options = { ...GLOBAL_DISPLAY_DEFAULTS, shuffleTerms: true };
 * const transformed = applyDisplayTransforms(latex, options);
 * // Result might be: 'c + a + b' (randomly shuffled)
 * ```
 */

import {
	parseLatex,
	toLatex,
	flattenSumShallow,
	flattenProductShallow,
	unflattenSum,
	unflattenProduct,
	mapNode,
	stripUnnecessaryBrackets
} from '$lib/mathAST';
import { parseCustom } from '$lib/mathAST/parser/custom';
import { removeNullTermsAST } from '$lib/mathAST/transforms';
import type { MathNode } from '$lib/mathAST';
import type { DisplayOptions } from './display-options';

// ============================================================================
// FISHER-YATES SHUFFLE
// ============================================================================

/**
 * Fisher-Yates shuffle algorithm for fair random permutation
 *
 * Creates a new array with elements in random order.
 * Does not modify the original array.
 */
function fisherYatesShuffle<T>(array: readonly T[]): T[] {
	const result = [...array];
	for (let i = result.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[result[i], result[j]] = [result[j], result[i]];
	}
	return result;
}

// ============================================================================
// EXPRESSION SHUFFLERS
// ============================================================================

/**
 * Shuffle terms in a sum at the top level only
 */
function shuffleTermsShallow(ast: MathNode): MathNode {
	const terms = flattenSumShallow(ast);
	if (terms.length <= 1) return ast;
	return unflattenSum(fisherYatesShuffle([...terms])) ?? ast;
}

/**
 * Shuffle terms in sums recursively (bottom-up via mapNode)
 */
function shuffleTermsDeep(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (node.type !== 'addition' && node.type !== 'subtraction') return node;
		const terms = flattenSumShallow(node);
		if (terms.length <= 1) return node;
		return unflattenSum(fisherYatesShuffle([...terms])) ?? node;
	});
}

/**
 * Shuffle factors in a product at the top level only
 */
function shuffleFactorsShallow(ast: MathNode): MathNode {
	if (ast.type !== 'multiplication') return ast;
	const factors = flattenProductShallow(ast);
	if (factors.length <= 1) return ast;
	return unflattenProduct(fisherYatesShuffle([...factors])) ?? ast;
}

/**
 * Shuffle factors in products recursively (bottom-up via mapNode)
 */
function shuffleFactorsDeep(ast: MathNode): MathNode {
	return mapNode(ast, (node) => {
		if (node.type !== 'multiplication') return node;
		const factors = flattenProductShallow(node);
		if (factors.length <= 1) return node;
		return unflattenProduct(fisherYatesShuffle([...factors])) ?? node;
	});
}

// ============================================================================
// MAIN TRANSFORMATION FUNCTION
// ============================================================================

/**
 * Apply display transformations to a custom-syntax expression
 *
 * Pipeline:
 * 1. Parse custom syntax to AST via mathAST
 * 2. Apply structural transforms (shuffle terms/factors)
 * 3. Apply removeNullTerms / removeUnnecessaryBrackets
 * 4. Serialize back to LaTeX
 */
export function applyDisplayTransforms(expr: string, options: Required<DisplayOptions>): string {
	// Guard: empty or whitespace-only input
	if (!expr || !expr.trim()) {
		return expr;
	}

	try {
		// Step 1: Parse custom syntax to AST
		let ast = parseCustom(expr);

		// Step 2: Apply structural transforms (shuffles)
		const doShuffleTerms =
			options.shuffleTerms || options.shuffleTermsAndFactors || options.shallowShuffleTerms;
		const doShuffleFactors =
			options.shuffleFactors || options.shuffleTermsAndFactors || options.shallowShuffleFactors;
		const deepTerms =
			(options.shuffleTerms || options.shuffleTermsAndFactors) && !options.shallowShuffleTerms;
		const deepFactors =
			(options.shuffleFactors || options.shuffleTermsAndFactors) && !options.shallowShuffleFactors;

		// Apply term shuffles
		if (doShuffleTerms) {
			ast = deepTerms ? shuffleTermsDeep(ast) : shuffleTermsShallow(ast);
		}

		// Apply factor shuffles
		if (doShuffleFactors) {
			ast = deepFactors ? shuffleFactorsDeep(ast) : shuffleFactorsShallow(ast);
		}

		// Step 3: Apply cleanup transforms
		if (options.removeNullTerms) {
			ast = removeNullTermsAST(ast);
		}

		if (options.removeUnnecessaryBrackets) {
			ast = stripUnnecessaryBrackets(ast);
		}

		// Step 4: Serialize back to LaTeX
		return toLatex(ast);
	} catch {
		// If parsing or transformation fails, return original expression unchanged
		return expr;
	}
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Check if a custom-syntax expression can be transformed
 */
export function canTransform(expr: string): boolean {
	if (!expr || !expr.trim()) {
		return false;
	}

	try {
		parseCustom(expr);
		return true;
	} catch {
		return false;
	}
}

/**
 * Get the structure type of an expression
 *
 * Useful for debugging and understanding what transforms apply.
 */
export function getExpressionStructure(latex: string): {
	operator: string | null;
	operandCount: number;
	isSum: boolean;
	isProduct: boolean;
} | null {
	if (!latex || !latex.trim()) {
		return null;
	}

	try {
		const ast = parseLatex(latex);

		if (ast.type === 'addition' || ast.type === 'subtraction') {
			const terms = flattenSumShallow(ast);
			return {
				operator: ast.type,
				operandCount: terms.length,
				isSum: true,
				isProduct: false
			};
		}

		if (ast.type === 'multiplication') {
			const factors = flattenProductShallow(ast);
			return {
				operator: ast.type,
				operandCount: factors.length,
				isSum: false,
				isProduct: true
			};
		}

		return {
			operator: null,
			operandCount: 0,
			isSum: false,
			isProduct: false
		};
	} catch {
		return null;
	}
}
