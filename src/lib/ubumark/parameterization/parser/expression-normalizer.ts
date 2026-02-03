/**
 * Expression Normalizer - Convert simplified syntax to legacy {{...}} syntax
 * =========================================================================
 *
 * Normalizes simplified variable expressions to the legacy {{...}} syntax
 * that the existing parsers (random-parser, eval-parser, tokenizer) expect.
 *
 * This allows users to write cleaner variable definitions:
 *   { name: 'a', expression: '1..10' }      // instead of '{{1..10}}'
 *   { name: 'sum', expression: 'eval:a+b' } // instead of '{{eval:a+b}}'
 *
 * The {{}} syntax remains required in text templates ("Calcule ${{a}}$").
 *
 * @module ubumark/parameterization/parser/expression-normalizer
 */

/**
 * Types of expressions that can be detected
 */
export type ExpressionType =
	| 'random' // 1..10, min..max, 2..9;+-, 1.5..9.5, random:2.3
	| 'discrete-list' // rouge|vert|bleu
	| 'eval' // eval:a+b
	| 'digits' // digits:1, digits:1..3 (n-digit number generation)
	| 'text-literal' // text:hello (use text: prefix for literal strings)
	| 'numeric-literal' // 42, 3.14, -5
	| 'variable-ref' // a, myVar (single identifier = variable reference)
	| 'already-wrapped'; // {{...}} - already in legacy syntax

/**
 * Detect the type of a variable expression
 *
 * @param expression - The expression string to analyze
 * @returns The detected expression type
 *
 * @example
 * detectExpressionType('1..10')        // 'random'
 * detectExpressionType('eval:a+b')     // 'eval'
 * detectExpressionType('rouge|vert')   // 'discrete-list'
 * detectExpressionType('42')           // 'numeric-literal'
 * detectExpressionType('a')            // 'variable-ref'
 * detectExpressionType('{{1..10}}')    // 'already-wrapped'
 */
export function detectExpressionType(expression: string): ExpressionType {
	const trimmed = expression.trim();

	// Empty or whitespace-only
	if (trimmed === '') {
		return 'text-literal';
	}

	// Contains any {{...}} tokens - already has legacy syntax, pass through
	// This handles both fully wrapped ({{1..10}}) and mixed (Value is {{a}})
	if (trimmed.includes('{{') && trimmed.includes('}}')) {
		return 'already-wrapped';
	}

	// Explicit prefixes
	if (trimmed.startsWith('eval:')) return 'eval';
	if (trimmed.startsWith('text:')) return 'text-literal';
	if (trimmed.startsWith('random:')) return 'random';
	if (trimmed.startsWith('digits:')) return 'digits';

	// Discrete list (contains | at top level, not inside braces/parens)
	if (hasTopLevelPipe(trimmed)) return 'discrete-list';

	// Random range (contains ..)
	if (trimmed.includes('..')) return 'random';

	// Numeric literal (integer or decimal, optionally negative)
	if (/^-?\d+(\.\d+)?$/.test(trimmed)) return 'numeric-literal';

	// Variable reference (valid identifier)
	if (/^[a-zA-Z_]\w*$/.test(trimmed)) return 'variable-ref';

	// Default: treat as text literal (preserve as-is)
	return 'text-literal';
}

/**
 * Normalize a simplified expression to legacy {{...}} syntax
 *
 * Converts the simplified syntax used in variable definitions to the
 * {{...}} syntax expected by the existing parsers.
 *
 * @param expression - The expression string to normalize
 * @returns The normalized expression with {{...}} wrapping where needed
 *
 * @example
 * normalizeExpression('1..10')          // '{{1..10}}'
 * normalizeExpression('eval:a+b')       // '{{eval:a+b}}'
 * normalizeExpression('a')              // '{{a}}'
 * normalizeExpression('text:hello')     // 'hello'
 * normalizeExpression('42')             // '42'
 * normalizeExpression('{{1..10}}')      // '{{1..10}}' (unchanged)
 */
export function normalizeExpression(expression: string): string {
	const type = detectExpressionType(expression);
	const trimmed = expression.trim();

	switch (type) {
		case 'already-wrapped':
			// Already in legacy syntax, pass through unchanged
			return expression;

		case 'text-literal':
			// Strip "text:" prefix if present, otherwise return as-is
			if (trimmed.startsWith('text:')) {
				return trimmed.slice(5);
			}
			return expression;

		case 'numeric-literal':
			// Numeric literals don't need wrapping
			return expression;

		case 'eval':
		case 'random':
		case 'digits':
		case 'discrete-list':
		case 'variable-ref':
			// These need {{...}} wrapping for the parsers
			return `{{${trimmed}}}`;
	}
}

/**
 * Check if a string contains a pipe character at the top level
 * (not nested inside parentheses, brackets, or braces)
 *
 * @param str - The string to check
 * @returns true if there's a top-level pipe
 */
function hasTopLevelPipe(str: string): boolean {
	let depth = 0;
	for (const char of str) {
		if (char === '(' || char === '[' || char === '{') {
			depth++;
		} else if (char === ')' || char === ']' || char === '}') {
			depth--;
		} else if (char === '|' && depth === 0) {
			return true;
		}
	}
	return false;
}
