/**
 * MathLive Compute Engine Wrapper
 * ===============================
 *
 * Provides interface to MathLive's Compute Engine for evaluating
 * mathematical expressions in LaTeX format.
 *
 * @module questions/compute-engine/wrapper
 */

import { ComputeEngine } from '@cortex-js/compute-engine';
import type { EvalModifiers } from '$lib/custom-markdown';

/**
 * Shared Compute Engine instance
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

/**
 * Evaluate a LaTeX mathematical expression
 *
 * @param latex - LaTeX expression to evaluate
 * @returns Evaluated result as number or string
 * @throws Error if evaluation fails
 *
 * @example
 * ```typescript
 * evaluateExpression('3+4')           // Returns: 7
 * evaluateExpression('2^3')           // Returns: 8
 * evaluateExpression('\\frac{1}{2}')  // Returns: 0.5
 * evaluateExpression('\\sqrt{16}')    // Returns: 4
 * ```
 */
export function evaluateExpression(latex: string): number | string {
	try {
		const engine = getEngine();

		// Parse LaTeX to MathJSON
		const expr = engine.parse(latex);

		// Evaluate expression
		const result = expr.evaluate();

		// Convert to number or string
		if (result.isNumber) {
			const numValue = result.numericValue;
			// numericValue can be number or NumericValue object - convert to number
			return typeof numValue === 'number' ? numValue : (numValue?.valueOf() ?? NaN);
		}

		// Return as LaTeX for symbolic results
		return result.latex;
	} catch (error) {
		throw new Error(
			`Failed to evaluate expression "${latex}": ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Simplify a LaTeX expression without evaluating to a number
 *
 * @param latex - LaTeX expression
 * @returns Simplified LaTeX expression
 *
 * @example
 * ```typescript
 * simplifyExpression('2x + 3x')  // Returns: '5x'
 * simplifyExpression('x^2 * x')  // Returns: 'x^3'
 * ```
 */
export function simplifyExpression(latex: string): string {
	try {
		const engine = getEngine();
		const expr = engine.parse(latex);
		const simplified = expr.simplify();
		return simplified.latex;
	} catch (error) {
		throw new Error(
			`Failed to simplify expression "${latex}": ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Check if two expressions are mathematically equivalent
 *
 * @param latex1 - First LaTeX expression
 * @param latex2 - Second LaTeX expression
 * @returns True if expressions are equivalent
 *
 * @example
 * ```typescript
 * areEquivalent('1/2', '0.5')           // Returns: true
 * areEquivalent('x^2 - 1', '(x-1)(x+1)') // Returns: true
 * areEquivalent('2x', '3x')             // Returns: false
 * ```
 */
export function areEquivalent(latex1: string, latex2: string): boolean {
	try {
		const engine = getEngine();
		const expr1 = engine.parse(latex1);
		const expr2 = engine.parse(latex2);

		// Simplify both expressions
		const simplified1 = expr1.simplify();
		const simplified2 = expr2.simplify();

		// Check if they're equal (isEqual can return undefined)
		return simplified1.isEqual(simplified2) ?? false;
	} catch (_error) {
		// If parsing fails, compare as strings
		return latex1 === latex2;
	}
}

/**
 * Validate LaTeX expression syntax
 *
 * @param latex - LaTeX expression
 * @returns True if syntax is valid
 */
export function isValidLatex(latex: string): boolean {
	try {
		const engine = getEngine();
		engine.parse(latex);
		return true;
	} catch {
		return false;
	}
}

/**
 * Evaluate a LaTeX expression with optional modifiers
 *
 * Supports formatting modifiers:
 * - decimal: Force decimal output (convert fractions)
 * - addPositive: Add + sign for positive results
 * - bracketNegative: Wrap negative results in parentheses
 * - derivative: Take derivative before evaluating (not yet implemented)
 *
 * @param latex - LaTeX expression to evaluate
 * @param modifiers - Optional formatting modifiers
 * @returns Formatted result as string
 * @throws Error if evaluation fails
 *
 * @example Basic evaluation
 * ```typescript
 * evaluateWithModifiers('3+4', {})           // Returns: '7'
 * ```
 *
 * @example Decimal modifier
 * ```typescript
 * evaluateWithModifiers('1/3', { decimal: true })  // Returns: '0.3333...'
 * ```
 *
 * @example Positive sign modifier
 * ```typescript
 * evaluateWithModifiers('5', { addPositive: true })  // Returns: '+5'
 * ```
 *
 * @example Bracket negative modifier
 * ```typescript
 * evaluateWithModifiers('-3', { bracketNegative: true })  // Returns: '(-3)'
 * ```
 *
 * @example Combined modifiers
 * ```typescript
 * evaluateWithModifiers('2/3', { decimal: true, addPositive: true })  // Returns: '+0.666...'
 * ```
 */
export function evaluateWithModifiers(latex: string, modifiers: EvalModifiers = {}): string {
	try {
		const engine = getEngine();
		const expr = engine.parse(latex);

		// Apply derivative if requested
		// Note: ComputeEngine derivative support is limited
		// For now, we'll skip this if requested and evaluate normally
		// TODO: Implement derivative support when CE API is clearer

		// Evaluate expression
		const result = expr.evaluate();

		// Get numeric value if available
		let numValue: number | null = null;
		if (result.isNumber) {
			const nv = result.numericValue;
			if (typeof nv === 'number') {
				numValue = nv;
			} else if (nv !== null && nv !== undefined) {
				const val = nv.valueOf();
				numValue = typeof val === 'number' ? val : null;
			}
		}

		// Determine output string
		let output: string;

		if (numValue !== null && !isNaN(numValue)) {
			// Default: return numeric value as string
			// The 'decimal' modifier is mainly for documentation/intent clarity
			// or future use when we add a 'fraction' modifier
			output = String(numValue);

			// Apply formatting modifiers
			if (modifiers.addPositive && numValue > 0) {
				// Add + sign for positive numbers
				if (!output.startsWith('+')) {
					output = '+' + output;
				}
			}

			if (modifiers.bracketNegative && numValue < 0) {
				// Wrap negative numbers in parentheses
				if (!output.startsWith('(')) {
					output = '(' + output + ')';
				}
			}
		} else {
			// Symbolic result - return as LaTeX
			output = result.latex;
		}

		return output;
	} catch (error) {
		throw new Error(
			`Failed to evaluate expression "${latex}": ${error instanceof Error ? error.message : String(error)}`
		);
	}
}
