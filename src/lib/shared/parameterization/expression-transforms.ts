/**
 * Expression Transformations for Display Options
 * ==============================================
 *
 * Applies display transformations to LaTeX mathematical expressions.
 * Uses Compute Engine for parsing and manipulation.
 *
 * Key transformations:
 * - shuffleTerms: Randomly reorder terms in sums (a + b + c -> b + c + a)
 * - shuffleFactors: Randomly reorder factors in products (a * b * c -> c * a * b)
 * - removeNullTerms: Remove zero terms via canonization (x + 0 -> x)
 * - removeUnnecessaryBrackets: Simplify brackets via canonization
 *
 * @module shared/parameterization/expression-transforms
 *
 * @example Basic usage
 * ```typescript
 * import { applyDisplayTransforms, GLOBAL_DISPLAY_DEFAULTS } from '$lib/shared/parameterization';
 *
 * const latex = 'a + b + c';
 * const options = { ...GLOBAL_DISPLAY_DEFAULTS, shuffleTerms: true };
 * const transformed = applyDisplayTransforms(latex, options);
 * // Result might be: 'c + a + b' (randomly shuffled)
 * ```
 */

import { ComputeEngine } from '@cortex-js/compute-engine';
import type { Expression } from '@cortex-js/compute-engine';
import type { DisplayOptions } from './display-options';

// ============================================================================
// COMPUTE ENGINE SINGLETON
// ============================================================================

/**
 * Shared Compute Engine instance for expression transformations
 */
let engineInstance: ComputeEngine | null = null;

/**
 * Get or create Compute Engine instance
 */
function getEngine(): ComputeEngine {
	if (!engineInstance) {
		engineInstance = new ComputeEngine();
	}
	return engineInstance;
}

// ============================================================================
// FISHER-YATES SHUFFLE
// ============================================================================

/**
 * Fisher-Yates shuffle algorithm for fair random permutation
 *
 * Creates a new array with elements in random order.
 * Does not modify the original array.
 *
 * @param array - Array to shuffle
 * @returns New array with elements in random order
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
 * Internal mutable type for MathJSON transformations
 *
 * We use a more permissive internal type for transformations,
 * then cast back to Expression when passing to Compute Engine.
 * This is necessary because Expression uses readonly arrays.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MutableMathJSON = any;

/**
 * Check if a MathJSON expression is an array (function expression)
 */
function isFunctionExpr(json: MutableMathJSON): json is [string, ...MutableMathJSON[]] {
	return Array.isArray(json) && typeof json[0] === 'string';
}

/**
 * Shuffle terms in an Add expression (MathJSON level)
 *
 * @param json - MathJSON expression
 * @param deep - If true, recursively shuffle nested sums
 * @returns MathJSON with shuffled terms
 */
function shuffleTermsJson(json: MutableMathJSON, deep: boolean): MutableMathJSON {
	// Not a function expression - return as-is (number, symbol, etc.)
	if (!isFunctionExpr(json)) {
		return json;
	}

	const [operator, ...operands] = json;

	// Process children first if deep shuffle
	const processedOperands = deep
		? operands.map((op: MutableMathJSON) => shuffleTermsJson(op, deep))
		: operands;

	// Shuffle if this is an Add operation
	if (operator === 'Add') {
		const shuffled = fisherYatesShuffle(processedOperands);
		return ['Add', ...shuffled];
	}

	// For other operators, recurse into children if deep
	if (deep) {
		return [operator, ...processedOperands];
	}

	return json;
}

/**
 * Shuffle factors in a Multiply expression (MathJSON level)
 *
 * @param json - MathJSON expression
 * @param deep - If true, recursively shuffle nested products
 * @returns MathJSON with shuffled factors
 */
function shuffleFactorsJson(json: MutableMathJSON, deep: boolean): MutableMathJSON {
	// Not a function expression - return as-is (number, symbol, etc.)
	if (!isFunctionExpr(json)) {
		return json;
	}

	const [operator, ...operands] = json;

	// Process children first if deep shuffle
	const processedOperands = deep
		? operands.map((op: MutableMathJSON) => shuffleFactorsJson(op, deep))
		: operands;

	// Shuffle if this is a Multiply or InvisibleOperator (implicit multiplication)
	if (operator === 'Multiply' || operator === 'InvisibleOperator') {
		const shuffled = fisherYatesShuffle(processedOperands);
		return [operator, ...shuffled];
	}

	// For other operators, recurse into children if deep
	if (deep) {
		return [operator, ...processedOperands];
	}

	return json;
}

/**
 * Shuffle both terms and factors (MathJSON level)
 *
 * @param json - MathJSON expression
 * @param deep - If true, recursively shuffle nested expressions
 * @returns MathJSON with shuffled terms and factors
 */
function shuffleTermsAndFactorsJson(json: MutableMathJSON, deep: boolean): MutableMathJSON {
	// Not a function expression - return as-is (number, symbol, etc.)
	if (!isFunctionExpr(json)) {
		return json;
	}

	const [operator, ...operands] = json;

	// Process children first if deep shuffle
	const processedOperands = deep
		? operands.map((op: MutableMathJSON) => shuffleTermsAndFactorsJson(op, deep))
		: operands;

	// Shuffle if this is Add, Multiply, or InvisibleOperator
	if (operator === 'Add' || operator === 'Multiply' || operator === 'InvisibleOperator') {
		const shuffled = fisherYatesShuffle(processedOperands);
		return [operator, ...shuffled];
	}

	// For other operators, recurse into children if deep
	if (deep) {
		return [operator, ...processedOperands];
	}

	return json;
}

// ============================================================================
// LATEX POST-PROCESSING
// ============================================================================

/**
 * Post-process LaTeX output based on display options
 *
 * @param latex - LaTeX from Compute Engine serialization
 * @param options - Display options
 * @returns Post-processed LaTeX
 */
function postProcessLatex(latex: string, options: Required<DisplayOptions>): string {
	let result = latex;

	// Handle addSpaces option
	if (options.addSpaces) {
		// Add thin spaces around binary operators only (not unary like -3)
		// Pattern: non-space char followed by +/- followed by non-space char
		result = result.replace(/(\S)([+-])(\S)/g, '$1 $2 $3');
	} else {
		// Remove any extra spaces
		result = result.replace(/\s+/g, '');
	}

	// Note: keepUnnecessaryZeros would require tracking original precision
	// which is lost during parsing. This option may need alternative implementation.

	return result;
}

// ============================================================================
// MAIN TRANSFORMATION FUNCTION
// ============================================================================

/**
 * Apply display transformations to a LaTeX expression
 *
 * Pipeline:
 * 1. Parse LaTeX to MathJSON (without canonization to preserve structure)
 * 2. Apply structural transforms (shuffle terms/factors)
 * 3. Optionally apply canonization (removeNullTerms, removeUnnecessaryBrackets)
 * 4. Serialize back to LaTeX
 * 5. Post-process for formatting (addSpaces, etc.)
 *
 * @param latex - LaTeX expression to transform
 * @param options - Fully resolved display options (use resolveDisplayOptions to get this)
 * @returns Transformed LaTeX string
 *
 * @example Shuffle terms
 * ```typescript
 * const result = applyDisplayTransforms('a + b + c', {
 *   ...GLOBAL_DISPLAY_DEFAULTS,
 *   shuffleTerms: true
 * });
 * // Might return: 'c + a + b'
 * ```
 *
 * @example Remove null terms
 * ```typescript
 * const result = applyDisplayTransforms('x + 0', {
 *   ...GLOBAL_DISPLAY_DEFAULTS,
 *   removeNullTerms: true
 * });
 * // Returns: 'x'
 * ```
 *
 * @example Combined transforms
 * ```typescript
 * const result = applyDisplayTransforms('0 + a + b', {
 *   ...GLOBAL_DISPLAY_DEFAULTS,
 *   shuffleTerms: true,
 *   removeNullTerms: true
 * });
 * // Might return: 'b + a' (0 removed, terms shuffled)
 * ```
 */
export function applyDisplayTransforms(latex: string, options: Required<DisplayOptions>): string {
	// Guard: empty or whitespace-only input
	if (!latex || !latex.trim()) {
		return latex;
	}

	const ce = getEngine();

	try {
		// Step 1: Parse without canonization to preserve original structure
		const expr = ce.parse(latex, { canonical: false });

		// Get MathJSON representation for transformation
		// Cast to mutable type for internal manipulation
		let json: MutableMathJSON = expr.json;

		// Step 2: Apply structural transforms (shuffles)

		// Determine shuffle settings
		const doShuffleTerms =
			options.shuffleTerms || options.shuffleTermsAndFactors || options.shallowShuffleTerms;
		const doShuffleFactors =
			options.shuffleFactors || options.shuffleTermsAndFactors || options.shallowShuffleFactors;
		const deepTerms =
			(options.shuffleTerms || options.shuffleTermsAndFactors) && !options.shallowShuffleTerms;
		const deepFactors =
			(options.shuffleFactors || options.shuffleTermsAndFactors) && !options.shallowShuffleFactors;

		// Apply shuffles
		if (doShuffleTerms && doShuffleFactors) {
			// Combined shuffle - need to decide on depth per operation type
			// For now, use a combined approach
			const deep = deepTerms && deepFactors;
			json = shuffleTermsAndFactorsJson(json, deep);

			// If depths differ, apply individual shuffles for remaining
			if (deepTerms !== deepFactors) {
				if (deepTerms && !deepFactors) {
					// Need deep terms shuffle only - already handled in combined
					json = shuffleTermsJson(json, true);
				} else if (deepFactors && !deepTerms) {
					// Need deep factors shuffle only
					json = shuffleFactorsJson(json, true);
				}
			}
		} else if (doShuffleTerms) {
			json = shuffleTermsJson(json, deepTerms);
		} else if (doShuffleFactors) {
			json = shuffleFactorsJson(json, deepFactors);
		}

		// Step 3: Reconstruct BoxedExpression from transformed JSON
		// Cast back to Expression type for CE
		let transformedExpr = ce.box(json as Expression);

		// Step 4: Apply canonization if needed (removeNullTerms, removeUnnecessaryBrackets)
		if (options.removeNullTerms || options.removeUnnecessaryBrackets) {
			// Canonization handles both null term removal and bracket simplification
			transformedExpr = transformedExpr.canonical;
		}

		// Step 5: Serialize back to LaTeX
		let resultLatex = transformedExpr.latex;

		// Step 6: Post-process for formatting options
		resultLatex = postProcessLatex(resultLatex, options);

		return resultLatex;
	} catch {
		// If parsing or transformation fails, return original latex unchanged
		// This is a graceful degradation - better to show original than crash
		return latex;
	}
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

/**
 * Check if an expression can be transformed
 *
 * @param latex - LaTeX expression to check
 * @returns True if expression can be parsed for transformation
 */
export function canTransform(latex: string): boolean {
	if (!latex || !latex.trim()) {
		return false;
	}

	try {
		const ce = getEngine();
		ce.parse(latex, { canonical: false });
		return true;
	} catch {
		return false;
	}
}

/**
 * Get the structure type of an expression
 *
 * Useful for debugging and understanding what transforms apply.
 *
 * @param latex - LaTeX expression
 * @returns Structure information or null if invalid
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
		const ce = getEngine();
		const expr = ce.parse(latex, { canonical: false });
		const json = expr.json;

		if (!Array.isArray(json)) {
			return {
				operator: null,
				operandCount: 0,
				isSum: false,
				isProduct: false
			};
		}

		const [operator, ...operands] = json;
		return {
			operator: typeof operator === 'string' ? operator : null,
			operandCount: operands.length,
			isSum: operator === 'Add',
			isProduct: operator === 'Multiply' || operator === 'InvisibleOperator'
		};
	} catch {
		return null;
	}
}
