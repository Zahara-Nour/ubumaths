/**
 * Math Utilities Module
 * =====================
 *
 * Shared mathematical utilities powered by mathAST.
 * Provides expression evaluation, equivalence checking, and simplification.
 *
 * @module math
 */

import { parseLatex, parseLatexSafe } from '$lib/mathAST/parser';
import { evaluate, evaluateNodeToApproximatedNumber } from '$lib/mathAST/eval';
import { normalize, denormalize, normalFormsEquivalent } from '$lib/mathAST/normal';
import { toLatex } from '$lib/mathAST';
import type { EvalValue } from '$lib/mathAST/eval/types';
import type { MathNode } from '$lib/mathAST/types';

// Re-export evaluateWithModifiers from mathAST (already implemented there)
export { evaluateWithModifiers } from '$lib/mathAST/eval';

// Intervals (re-export for convenience)
export * as intervals from './intervals';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Strip LaTeX spacing commands and French number grouping spaces.
 * MathLive may produce \, for French number grouping (12\,345),
 * and plain text may use spaces (12 345).
 */
function stripLatexSpacing(latex: string): string {
	return (
		latex
			// LaTeX spacing commands: \, \; \: \! and \ (backslash-space)
			.replace(/\\[,;:!]\s?/g, '')
			.replace(/\\(?:quad|qquad|enspace|thinspace|medspace|thickspace)\s?/g, '')
			.replace(/\\ /g, '')
			// French number grouping: spaces between digit groups (12 345 → 12345)
			.replace(/(\d)\s+(?=\d)/g, '$1')
	);
}

function isMathNode(value: EvalValue): value is MathNode {
	return typeof value === 'object' && value !== null && 'type' in value && !('real' in value);
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Evaluate a LaTeX mathematical expression to a number or string.
 *
 * @param latex - LaTeX expression to evaluate
 * @returns Evaluated result as number or string
 * @throws Error if evaluation fails
 *
 * @example
 * evaluateExpression('3+4')           // 7
 * evaluateExpression('\\frac{1}{2}')  // 0.5
 * evaluateExpression('\\sqrt{16}')    // 4
 */
export function evaluateExpression(latex: string): number | string {
	try {
		const ast = parseLatex(stripLatexSpacing(latex));
		const result = evaluate(ast, { mode: 'decimal' });

		if (result.status === 'value') {
			if (typeof result.value === 'number') {
				return result.value;
			}
			if (isMathNode(result.value)) {
				// Try to extract a numeric value from the MathNode
				try {
					return evaluateNodeToApproximatedNumber(result.value);
				} catch {
					// Not numeric, return as LaTeX
					return toLatex(result.value);
				}
			}
			// ComplexValueResult - not supported, return as string
			return `${result.value.real} + ${result.value.imag}i`;
		}

		throw new Error(
			result.status === 'unevaluable' ? result.reason : `Indeterminate form: ${result.form}`
		);
	} catch (error) {
		if (error instanceof Error && error.message.startsWith('Failed to evaluate')) {
			throw error;
		}
		throw new Error(
			`Failed to evaluate expression "${latex}": ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Check if two LaTeX expressions are mathematically equivalent.
 *
 * Uses normalization for structural equivalence (handles polynomials,
 * fractions, trig special values, etc.). Falls back to numeric comparison
 * if normalization fails.
 *
 * @param latex1 - First LaTeX expression
 * @param latex2 - Second LaTeX expression
 * @returns True if expressions are equivalent
 *
 * @example
 * areEquivalent('x^2 - 1', '(x-1)(x+1)')         // true
 * areEquivalent('\\sin(\\frac{\\pi}{6})', '0.5')   // true
 * areEquivalent('2x + 3', '3 + 2x')                // true
 */
export function areEquivalent(latex1: string, latex2: string): boolean {
	try {
		const cleaned1 = stripLatexSpacing(latex1);
		const cleaned2 = stripLatexSpacing(latex2);
		const result1 = parseLatexSafe(cleaned1);
		const result2 = parseLatexSafe(cleaned2);

		if (!result1.ast || !result2.ast) {
			return cleaned1 === cleaned2;
		}

		// Try structural equivalence via normalization
		try {
			const form1 = normalize(result1.ast);
			const form2 = normalize(result2.ast);
			return normalFormsEquivalent(form1, form2);
		} catch {
			// Normalization failed — try numeric comparison as fallback
			try {
				const eval1 = evaluate(result1.ast, { mode: 'decimal' });
				const eval2 = evaluate(result2.ast, { mode: 'decimal' });

				if (eval1.status === 'value' && eval2.status === 'value') {
					const num1 =
						typeof eval1.value === 'number'
							? eval1.value
							: isMathNode(eval1.value)
								? evaluateNodeToApproximatedNumber(eval1.value)
								: NaN;
					const num2 =
						typeof eval2.value === 'number'
							? eval2.value
							: isMathNode(eval2.value)
								? evaluateNodeToApproximatedNumber(eval2.value)
								: NaN;

					if (!isNaN(num1) && !isNaN(num2)) {
						return Math.abs(num1 - num2) < 1e-10;
					}
				}
			} catch {
				// Numeric comparison also failed
			}

			// Final fallback: string comparison
			return cleaned1 === cleaned2;
		}
	} catch {
		return stripLatexSpacing(latex1) === stripLatexSpacing(latex2);
	}
}

/**
 * Simplify a LaTeX expression without evaluating to a number.
 *
 * @param latex - LaTeX expression
 * @returns Simplified LaTeX expression
 *
 * @example
 * simplifyExpression('2x + 3x')  // '5x'
 */
export function simplifyExpression(latex: string): string {
	try {
		const ast = parseLatex(stripLatexSpacing(latex));
		const normalForm = normalize(ast);
		const simplified = denormalize(normalForm);
		return toLatex(simplified);
	} catch (error) {
		throw new Error(
			`Failed to simplify expression "${latex}": ${error instanceof Error ? error.message : String(error)}`
		);
	}
}

/**
 * Validate LaTeX expression syntax.
 *
 * @param latex - LaTeX expression
 * @returns True if syntax is valid
 */
export function isValidLatex(latex: string): boolean {
	const result = parseLatexSafe(stripLatexSpacing(latex));
	return result.ast !== null && result.errors.length === 0;
}
