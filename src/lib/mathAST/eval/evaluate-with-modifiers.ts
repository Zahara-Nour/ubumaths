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
import { mapNode } from '../transforms';
import { toLatex } from '../latex-generator';
import { toCustom } from '../custom-generator';
import { parseCustom } from '../parser/custom';
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

/** Un nombre non entier écrit dans le calcul (`0.5`) : TinyMath rendait alors un décimal */
function hasDecimalLiteral(node: MathNode): boolean {
	let found = false;
	mapNode(node, (n) => {
		if (n.type === 'number' && !/^-?\d+$/.test(n.value)) found = true;
		return n;
	});
	return found;
}

/**
 * Résultat exact (`\dfrac{9}{7}`, `2 \sqrt{2}`, `\ln(2)`) → syntaxe maison (`9/7`, `2sqrt(2)`), pour
 * le réutiliser dans un autre calcul. Toute autre valeur est rendue telle quelle.
 */
export function evalResultToCustom(value: string): string {
	if (!value.includes('\\')) return value;
	try {
		const custom = toCustom(parseLatex(value));
		// Aller-retour vérifié : sinon la valeur reste en LaTeX, comme avant
		parseCustom(custom);
		return custom;
	} catch {
		return value;
	}
}

/**
 * Valeur numérique d'un résultat d'évaluation : `3.5`, mais aussi `\dfrac{9}{2}` ou
 * `2 \sqrt{2}` (que `parseFloat` lirait NaN ou 2). NaN si ce n'est pas un nombre.
 */
export function evalResultToNumber(value: string): number {
	if (!value.includes('\\')) return parseFloat(value);
	try {
		return evaluateNodeToApproximatedNumber(parseLatex(value));
	} catch {
		return NaN;
	}
}

/**
 * Résultat exact : `\dfrac{9}{7}`, `-\dfrac{3}{4}`, `2 \sqrt{2}`, entier s'il tombe juste.
 *
 * Décimal si le calcul contient un décimal, ou si la forme exacte ne se calcule
 * pas ou ne vaut pas la valeur décimale (garde-fou : jamais de valeur fausse).
 */
function formatExact(ast: MathNode, numValue: number): string {
	if (Number.isInteger(numValue) || hasDecimalLiteral(ast)) return formatNumber(numValue);
	try {
		const exact = evaluate(ast, { mode: 'exact' });
		if (exact.status !== 'value' || !isMathNode(exact.value)) return formatNumber(numValue);
		const exactValue = evaluateNodeToApproximatedNumber(exact.value);
		const tolerance = 1e-9 * Math.max(1, Math.abs(numValue));
		if (!(Math.abs(exactValue - numValue) <= tolerance)) return formatNumber(numValue);
		return toLatex(exact.value);
	} catch {
		return formatNumber(numValue);
	}
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
 * Résultat exact par défaut, comme TinyMath : `\dfrac{9}{7}`, `2 \sqrt{2}`
 * (décimal si le calcul contient un décimal). Modifiers:
 * - `decimal` (`;d`): écriture décimale (1/2 → 0.5)
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
/**
 * Evaluate a MathNode AST with optional formatting modifiers.
 *
 * Same as evaluateWithModifiers but accepts a pre-parsed AST instead of a LaTeX string.
 * This is useful when the AST has already been constructed (e.g., via parseCustom + substitute).
 *
 * @param ast - MathNode AST to evaluate
 * @param modifiers - Optional formatting modifiers
 * @returns Formatted result as string
 * @throws Error if evaluation fails
 */
export function evaluateAstWithModifiers(ast: MathNode, modifiers: EvalModifiers = {}): string {
	// Valeur numérique d'abord (signe des modificateurs, garde-fou de formatExact)
	const result = evaluate(ast, { mode: 'decimal' });

	// Handle non-value results
	if (result.status === 'unevaluable') {
		throw new Error(result.reason);
	}
	if (result.status === 'indeterminate') {
		throw new Error(`Indeterminate form: ${result.form}`);
	}

	// Get the numeric value
	let numValue: number;
	if (isComplex(result.value)) {
		throw new Error('Complex numbers are not supported in evaluateAstWithModifiers');
	} else if (isMathNode(result.value)) {
		numValue = evaluateNodeToApproximatedNumber(result.value);
	} else if (typeof result.value === 'boolean') {
		throw new Error('Boolean results are not supported in evaluateAstWithModifiers');
	} else {
		numValue = result.value;
	}

	// Format the output : exact par défaut (comme TinyMath), décimal avec `;d`
	let formattedOutput = modifiers.decimal ? formatNumber(numValue) : formatExact(ast, numValue);

	// Apply formatting modifiers
	if (modifiers.addPositive && numValue > 0) {
		if (!formattedOutput.startsWith('+')) {
			formattedOutput = '+' + formattedOutput;
		}
	}

	if (modifiers.bracketNegative && numValue < 0) {
		if (!formattedOutput.startsWith('(')) {
			formattedOutput = '(' + formattedOutput + ')';
		}
	}

	return formattedOutput;
}

/**
 * Evaluate a LaTeX expression with optional formatting modifiers.
 *
 * Parses a LaTeX string and delegates to evaluateAstWithModifiers.
 *
 * @param latex - LaTeX expression to evaluate
 * @param modifiers - Optional formatting modifiers
 * @returns Formatted result as string
 * @throws Error if parsing or evaluation fails
 */
export function evaluateWithModifiers(latex: string, modifiers: EvalModifiers = {}): string {
	const ast = parseLatex(latex);
	return evaluateAstWithModifiers(ast, modifiers);
}
