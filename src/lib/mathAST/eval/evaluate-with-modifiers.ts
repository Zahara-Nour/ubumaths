/**
 * MathAST Evaluation with Modifiers
 *
 * Provides a convenience function for evaluating LaTeX expressions
 * with formatting modifiers (decimal output, positive sign, bracket negative).
 *
 * This module bridges MathAST evaluation with the custom-markdown
 * parameterization system's EvalModifiers interface.
 *
 * @module mathAST/eval/evaluate-with-modifiers
 */

import type { EvalModifiers } from '$lib/custom-markdown';
import { parseLatex } from '$lib/mathAST/parser';
import { evaluate } from './evaluate';
import type { Rational } from '../normal/types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a value is a Rational.
 */
function isRational(value: Rational | number): value is Rational {
	return typeof value === 'object' && 'n' in value && 'd' in value;
}

/**
 * Converts a Rational to a number.
 */
function rationalToNumber(r: Rational): number {
	return Number(r.n) / Number(r.d);
}

/**
 * Formats a numeric result as a string.
 *
 * Handles integer vs decimal formatting appropriately.
 */
function formatNumber(value: number): string {
	// Check if it's effectively an integer
	if (Number.isInteger(value)) {
		return value.toString();
	}

	// Use reasonable precision for decimals, removing trailing zeros
	const formatted = value.toPrecision(15);

	// Parse and re-stringify to remove trailing zeros
	return parseFloat(formatted).toString();
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Evaluate a LaTeX expression with optional formatting modifiers.
 *
 * This function provides a simple API for evaluating mathematical expressions
 * that matches the interface expected by the custom-markdown parameterization system.
 *
 * Supports formatting modifiers:
 * - `decimal`: Force decimal output (convert fractions to decimals)
 * - `addPositive`: Add + sign for positive results
 * - `bracketNegative`: Wrap negative results in parentheses
 * - `derivative`: Not implemented (reserved for future use)
 *
 * @param latex - LaTeX expression to evaluate
 * @param modifiers - Optional formatting modifiers
 * @returns Formatted result as string
 * @throws Error if parsing or evaluation fails
 *
 * @example Basic evaluation
 * ```typescript
 * evaluateWithModifiers('3+4', {})           // Returns: '7'
 * evaluateWithModifiers('2^3', {})           // Returns: '8'
 * ```
 *
 * @example Decimal modifier
 * ```typescript
 * evaluateWithModifiers('1/3', { decimal: true })  // Returns: '0.3333333333333333'
 * evaluateWithModifiers('\\frac{1}{2}', { decimal: true })  // Returns: '0.5'
 * ```
 *
 * @example Positive sign modifier
 * ```typescript
 * evaluateWithModifiers('5', { addPositive: true })      // Returns: '+5'
 * evaluateWithModifiers('-3', { addPositive: true })     // Returns: '-3' (no change for negative)
 * evaluateWithModifiers('0', { addPositive: true })      // Returns: '0' (no change for zero)
 * ```
 *
 * @example Bracket negative modifier
 * ```typescript
 * evaluateWithModifiers('-3', { bracketNegative: true })  // Returns: '(-3)'
 * evaluateWithModifiers('5', { bracketNegative: true })   // Returns: '5' (no change for positive)
 * ```
 *
 * @example Combined modifiers
 * ```typescript
 * evaluateWithModifiers('2/3', { decimal: true, addPositive: true })  // Returns: '+0.6666666666666666'
 * evaluateWithModifiers('-1/4', { decimal: true, bracketNegative: true })  // Returns: '(-0.25)'
 * ```
 */
export function evaluateWithModifiers(latex: string, modifiers: EvalModifiers = {}): string {
	// Parse the LaTeX expression
	const ast = parseLatex(latex);

	// Determine evaluation mode based on decimal modifier
	const mode = modifiers.decimal ? 'decimal' : 'exact';

	// Evaluate the expression
	const result = evaluate(ast, { mode });

	// Convert to numeric value
	let numValue: number;
	if (isRational(result.value)) {
		numValue = rationalToNumber(result.value);
	} else {
		numValue = result.value;
	}

	// Format the output
	let output: string;

	// For exact mode with rational result, format as fraction if not integer
	if (!modifiers.decimal && isRational(result.value)) {
		const r = result.value;
		if (r.d === 1n) {
			// Integer result
			output = r.n.toString();
		} else {
			// Fraction result - convert to decimal for string output
			// (The caller expects a numeric string, not LaTeX fraction notation)
			output = formatNumber(numValue);
		}
	} else {
		// Decimal mode or non-rational result
		output = formatNumber(numValue);
	}

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

	return output;
}
