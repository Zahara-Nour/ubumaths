/**
 * MathAST Evaluation with Modifiers
 *
 * Provides a convenience function for evaluating LaTeX expressions
 * with formatting modifiers (decimal output, positive sign, bracket negative).
 *
 * This module bridges MathAST evaluation with the ubumark
 * parameterization system's EvalModifiers interface.
 *
 * @module mathAST/eval/evaluate-with-modifiers
 */

import type { EvalModifiers } from '$lib/ubumark';
import { parseLatex } from '$lib/mathAST/parser';
import { evaluate, evaluateNodeToApproximatedNumber } from './evaluate';
import type { MathNode } from '../types';
import type { EvalValue, ComplexValueResult } from './types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Checks if a value is a MathNode.
 */
function isMathNode(value: EvalValue): value is MathNode {
	return typeof value === 'object' && 'type' in value;
}

/**
 * Checks if a value is a ComplexValueResult.
 */
function isComplex(value: EvalValue): value is ComplexValueResult {
	return typeof value === 'object' && 'real' in value && 'imag' in value;
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
 * that matches the interface expected by the ubumark parameterization system.
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

	// Always use decimal mode internally to get a numeric value
	// This simplifies the logic and avoids having to interpret MathNode structures
	const result = evaluate(ast, { mode: 'decimal' });

	// Get the numeric value
	let numValue: number;
	if (isComplex(result.value)) {
		throw new Error('Complex numbers are not supported in evaluateWithModifiers');
	} else if (isMathNode(result.value)) {
		// In case we somehow got a MathNode (shouldn't happen in decimal mode)
		numValue = evaluateNodeToApproximatedNumber(result.value);
	} else {
		numValue = result.value;
	}

	// Format the output
	const output = formatNumber(numValue);
	let formattedOutput = output;

	// Apply formatting modifiers
	if (modifiers.addPositive && numValue > 0) {
		// Add + sign for positive numbers
		if (!formattedOutput.startsWith('+')) {
			formattedOutput = '+' + formattedOutput;
		}
	}

	if (modifiers.bracketNegative && numValue < 0) {
		// Wrap negative numbers in parentheses
		if (!formattedOutput.startsWith('(')) {
			formattedOutput = '(' + formattedOutput + ')';
		}
	}

	return formattedOutput;
}
