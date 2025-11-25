/**
 * Eval Parser - Parse expression evaluation tokens
 * =================================================
 *
 * Parses eval expressions from Markdown syntax: {{eval:a+b*2}}
 * Supports modifiers: {{eval:expression|modifiers}}
 *
 * Modifiers:
 * - d/decimal: Force decimal output
 * - +/positive: Add + sign for positive results
 * - ()/bracket: Wrap negative results in parentheses
 * - '/derivative: Take derivative before evaluating
 *
 * @module shared/parameterization/parser/eval-parser
 */

import type { EvalModifiers, ParsedEvalExpression } from '../types';

/**
 * Modifier aliases mapping short/long forms to property names
 */
const MODIFIER_ALIASES: Record<string, keyof EvalModifiers> = {
	d: 'decimal',
	decimal: 'decimal',
	'+': 'addPositive',
	positive: 'addPositive',
	'()': 'bracketNegative',
	bracket: 'bracketNegative',
	"'": 'derivative',
	derivative: 'derivative'
};

/**
 * Parse an eval expression token (backward compatible)
 *
 * Extracts the mathematical expression from an eval token.
 * The expression can reference variables and use standard operators.
 *
 * @param token - Full token string including delimiters
 * @returns Expression string, or null if token is not a valid eval expression
 *
 * @example Markdown syntax
 * ```typescript
 * parseEvalExpression('{{eval:a+b}}')
 * // → 'a+b'
 * ```
 *
 * @example With modifiers (modifiers are stripped)
 * ```typescript
 * parseEvalExpression('{{eval:a+b|d,+}}')
 * // → 'a+b'
 * ```
 *
 * @example Invalid tokens
 * ```typescript
 * parseEvalExpression('{{var}}')  // → null (variable, not eval)
 * parseEvalExpression('{{random:1-10}}')  // → null (random, not eval)
 * ```
 */
export function parseEvalExpression(token: string): string | null {
	const parsed = parseEvalExpressionWithModifiers(token);
	return parsed ? parsed.expression : null;
}

/**
 * Parse an eval expression token with modifiers
 *
 * Extracts both the expression and any modifiers from the token.
 * Handles edge cases like LaTeX absolute value |x| which should not be
 * interpreted as a modifier separator.
 *
 * @param token - Full token string including delimiters
 * @returns Parsed expression with modifiers, or null if not a valid eval token
 *
 * @example Basic expression
 * ```typescript
 * parseEvalExpressionWithModifiers('{{eval:a+b}}')
 * // → { expression: 'a+b', modifiers: {} }
 * ```
 *
 * @example With decimal modifier
 * ```typescript
 * parseEvalExpressionWithModifiers('{{eval:1/3|d}}')
 * // → { expression: '1/3', modifiers: { decimal: true } }
 * ```
 *
 * @example Combined modifiers
 * ```typescript
 * parseEvalExpressionWithModifiers('{{eval:x|d,+}}')
 * // → { expression: 'x', modifiers: { decimal: true, addPositive: true } }
 * ```
 *
 * @example LaTeX absolute value (| not treated as modifier separator)
 * ```typescript
 * parseEvalExpressionWithModifiers('{{eval:|x|}}')
 * // → { expression: '|x|', modifiers: {} }
 * ```
 */
export function parseEvalExpressionWithModifiers(token: string): ParsedEvalExpression | null {
	if (!token.startsWith('{{eval:') || !token.endsWith('}}')) {
		return null;
	}

	const inner = token.slice(7, -2); // Remove {{eval: and }}

	// Handle empty expression
	if (inner === '') {
		return { expression: '', modifiers: {} };
	}

	// Split by | to separate expression from modifiers
	// But be careful: | might appear in LaTeX (e.g., |x| for absolute value)
	// Strategy: find the last |, check if suffix looks like valid modifiers
	const lastPipeIndex = inner.lastIndexOf('|');

	if (lastPipeIndex === -1) {
		// No pipe - no modifiers
		return { expression: inner, modifiers: {} };
	}

	const potentialModifiers = inner.slice(lastPipeIndex + 1);

	// Check if it looks like valid modifiers
	if (potentialModifiers.length > 0 && isValidModifierString(potentialModifiers)) {
		const expression = inner.slice(0, lastPipeIndex);
		const modifiers = parseModifiers(potentialModifiers);

		// Only treat as modifiers if we actually parsed something
		if (Object.keys(modifiers).length > 0) {
			return { expression, modifiers };
		}
	}

	// Not valid modifiers (probably LaTeX with |)
	return { expression: inner, modifiers: {} };
}

/**
 * Check if a string looks like valid modifiers
 *
 * Valid modifier strings contain only:
 * - Modifier characters: d, +, (, ), '
 * - Modifier words: decimal, positive, bracket, derivative
 * - Commas as separators
 *
 * @param str - String to check
 * @returns true if string looks like modifiers
 */
function isValidModifierString(str: string): boolean {
	// Empty string is not valid modifiers
	if (!str || str.trim() === '') {
		return false;
	}

	// Valid: d,+,(),',decimal,positive,bracket,derivative and commas/spaces
	// Must not contain characters that would appear in math expressions
	// like digits, operators (except +), letters beyond modifier names
	return /^[d+(),'a-z\s]+$/i.test(str) && !/\d/.test(str);
}

/**
 * Parse a modifier string into EvalModifiers object
 *
 * @param modifierString - Comma-separated modifier string
 * @returns EvalModifiers object with flags set
 */
function parseModifiers(modifierString: string): EvalModifiers {
	const modifiers: EvalModifiers = {};

	for (const mod of modifierString.split(',')) {
		const trimmed = mod.trim().toLowerCase();
		if (trimmed) {
			const key = MODIFIER_ALIASES[trimmed];
			if (key) {
				modifiers[key] = true;
			}
		}
	}

	return modifiers;
}
