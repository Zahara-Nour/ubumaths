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
			return result.numericValue ?? NaN;
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

		// Check if they're equal
		return simplified1.isEqual(simplified2);
	} catch (error) {
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
