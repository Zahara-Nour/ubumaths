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

	// Explicit prefixes take priority - these may contain {{}} for variable refs
	// e.g., digits:{{n}}..{{m}} should be wrapped as {{digits:{{n}}..{{m}}}}
	if (trimmed.startsWith('eval:')) return 'eval';
	if (trimmed.startsWith('text:')) return 'text-literal';
	if (trimmed.startsWith('random:')) return 'random';
	if (trimmed.startsWith('digits:')) return 'digits';

	// Contains {{...}} tokens — check if they wrap the entire expression
	if (trimmed.includes('{{') && trimmed.includes('}}')) {
		if (trimmed.startsWith('{{') && isFullyWrapped(trimmed)) {
			// Outermost {{ ... }} wraps everything: {{1..10}}, {{eval:a+b}}, {{random:{{min}}..{{max}}}}
			return 'already-wrapped';
		}
		// Embedded {{}} tokens (e.g., "1..{{eval:a-1}}", "{{a}}|{{b}}").
		// Check if the skeleton (text outside {{...}}) forms a random range.
		// If so, the expression needs {{random:...}} wrapping.
		// Otherwise, treat as already-wrapped (mixed text + tokens like "Value is {{a}}").
		const skeleton = stripBracedTokens(trimmed);
		if (skeleton.includes('..')) return 'random';
		if (hasTopLevelPipe(skeleton)) return 'discrete-list';
		return 'already-wrapped';
	}

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
 * Check if the outermost {{ ... }} wraps the entire expression.
 *
 * Uses brace counting: starts at the opening {{ and returns true
 * only if the matching }} is the last character of the string.
 *
 * @example
 * isFullyWrapped('{{1..10}}')                  // true
 * isFullyWrapped('{{eval:{{a}}+{{b}}}}')       // true
 * isFullyWrapped('{{random:{{min}}..{{max}}}}') // true
 * isFullyWrapped('1..{{eval:a-1}}')            // false (doesn't start with {{)
 * isFullyWrapped('{{a}}+{{b}}')                // false (first {{ closes before end)
 */
export function isFullyWrapped(expression: string): boolean {
	if (!expression.startsWith('{{')) return false;

	let braceCount = 0;
	for (let i = 0; i < expression.length; i++) {
		if (expression[i] === '{') braceCount++;
		else if (expression[i] === '}') braceCount--;
		if (braceCount === 0) {
			// The opening {{ is closed here — fully wrapped only if at the end
			return i === expression.length - 1;
		}
	}
	return false;
}

/**
 * Strip all {{...}} tokens from a string, leaving only the surrounding text.
 *
 * Uses brace counting to handle nested braces correctly.
 * e.g., "1..{{eval:a-1}}" → "1.."
 *        "{{a}}+{{b}}"    → "+"
 *        "Value is {{x}}" → "Value is "
 */
function stripBracedTokens(str: string): string {
	let result = '';
	let i = 0;
	while (i < str.length) {
		if (str[i] === '{' && i + 1 < str.length && str[i + 1] === '{') {
			// Skip the entire {{...}} token
			let braceCount = 0;
			while (i < str.length) {
				if (str[i] === '{') braceCount++;
				else if (str[i] === '}') braceCount--;
				i++;
				if (braceCount === 0) break;
			}
		} else {
			result += str[i];
			i++;
		}
	}
	return result;
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
