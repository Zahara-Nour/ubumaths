/**
 * Web Output Formatter
 *
 * Formats CLI output for browser display using CSS classes instead of
 * terminal colors (chalk). Provides HTML-formatted output with semantic
 * classes for styling.
 */

import type { PipelineError, CommandError } from '../types';

// =============================================================================
// CSS Class Mapping
// =============================================================================

/**
 * CSS classes for output formatting.
 * These should be defined in the component's CSS.
 */
const CSS_CLASSES = {
	error: 'repl-error', // Red text for errors
	success: 'repl-success', // Green text for success messages
	hash: 'repl-hash', // Cyan text for hash values
	dim: 'repl-dim', // Gray text for secondary info
	warning: 'repl-warning', // Yellow text for warnings
	info: 'repl-info', // Blue text for informational messages

	// Function-related classes
	fnName: 'repl-fn-name', // Purple/accent for function names
	fnParam: 'repl-fn-param', // Cyan for parameters
	fnExpr: 'repl-fn-expr', // Default/white for expressions
	fnLabel: 'repl-fn-label', // Dim gray for labels
	fnDerivative: 'repl-fn-derivative', // Yellow for derivative indicator
	fnInverse: 'repl-fn-inverse' // Orange for inverse indicator
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Escape HTML special characters to prevent XSS.
 * Uses simple string replacement for browser and Node compatibility.
 */
function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;')
		.replace(/`/g, '&#96;');
}

/**
 * Wrap text in a span with a CSS class.
 * Sanitizes className to prevent XSS via class injection.
 *
 * @param text - The text content to wrap
 * @param className - The CSS class name to apply (sanitized to alphanumeric + hyphens)
 * @returns HTML span element string
 */
function span(text: string, className: string): string {
	// Sanitize className to prevent injection (only allow alphanumeric, hyphens, underscores)
	const safeClassName = className.replace(/[^a-zA-Z0-9\-_]/g, '');
	return `<span class="${safeClassName}">${escapeHtml(text)}</span>`;
}

// =============================================================================
// Error Formatting
// =============================================================================

/**
 * Format a pipeline or command error as HTML.
 *
 * Produces HTML output with error code, message, position (if available),
 * and helpful suggestions.
 *
 * @param error - The error to format
 * @returns HTML-formatted error string
 *
 * @example
 * ```typescript
 * const error: PipelineError = {
 *   code: 'PARSE_ERROR',
 *   message: 'Unexpected token',
 *   position: 5,
 *   suggestion: 'Check for missing operators'
 * };
 * const html = formatErrorHtml(error);
 * // => "<span class="repl-error">Error [PARSE_ERROR]:</span> Unexpected token..."
 * ```
 */
export function formatErrorHtml(error: PipelineError | CommandError): string {
	const header = span(`Error [${error.code}]:`, CSS_CLASSES.error);
	const message = escapeHtml(error.message);

	let output = `${header} ${message}`;

	// Add position information for pipeline errors
	if ('position' in error && error.position !== undefined) {
		output += span(` (position ${error.position})`, CSS_CLASSES.dim);
	}

	// Add suggestion if available
	if ('suggestion' in error && error.suggestion) {
		output += `\n${span('Hint:', CSS_CLASSES.warning)} ${escapeHtml(error.suggestion)}`;
	}

	return output;
}

/**
 * Format an input error with position indicator as HTML.
 *
 * Shows the input string with a caret pointing to the error position.
 *
 * @param input - The original input string
 * @param position - The position of the error (0-indexed)
 * @param message - The error message
 * @returns HTML-formatted error with visual position indicator
 *
 * @example
 * ```typescript
 * const html = formatInputErrorHtml('x + * y', 4, 'Unexpected operator');
 * // => "<span class="repl-error">Parse error: Unexpected operator</span>
 * //     <br><br>  x + * y<br>  <span class="repl-error">    ^</span>"
 * ```
 */
export function formatInputErrorHtml(input: string, position: number, message: string): string {
	const pointer = '&nbsp;'.repeat(position) + span('^', CSS_CLASSES.error);
	const errorLine = span(`Parse error: ${message}`, CSS_CLASSES.error);

	return [errorLine, '<br><br>', `  ${escapeHtml(input)}`, '<br>', `  ${pointer}`].join('');
}

// =============================================================================
// Success Formatting
// =============================================================================

/**
 * Format a success message with optional label as HTML.
 *
 * @param output - The output content
 * @param label - Optional label to prefix the output
 * @returns HTML-formatted success output
 *
 * @example
 * ```typescript
 * const html = formatSuccessHtml('x^2 + 3x', 'LaTeX:');
 * // => "<span class="repl-success">LaTeX:</span><br>x^2 + 3x"
 * ```
 */
export function formatSuccessHtml(output: string, label?: string): string {
	if (label) {
		return `${span(label, CSS_CLASSES.success)}<br>${escapeHtml(output)}`;
	}
	return escapeHtml(output);
}

// =============================================================================
// Tree Formatting
// =============================================================================

/**
 * Box-drawing characters used in tree output.
 * Maps terminal box characters to Unicode equivalents.
 */
const BOX_CHARS: Record<string, string> = {
	'├': '├',
	'─': '─',
	'└': '└',
	'│': '│'
};

/**
 * Format a tree string as HTML.
 *
 * Converts box-drawing characters to HTML with proper Unicode characters.
 * Wraps tree structure elements in spans for styling.
 *
 * @param tree - The tree string from TreeCommand
 * @returns HTML-formatted tree
 *
 * @example
 * ```typescript
 * const tree = "Add\n├─ x\n└─ 1";
 * const html = formatTreeHtml(tree);
 * // => Formatted HTML with box-drawing characters in spans
 * ```
 */
export function formatTreeHtml(tree: string): string {
	const lines = tree.split('\n');
	const formattedLines = lines.map((line) => {
		// Escape HTML first
		let formatted = escapeHtml(line);

		// Replace box-drawing characters with styled spans
		for (const [char, unicode] of Object.entries(BOX_CHARS)) {
			formatted = formatted.replace(
				new RegExp(escapeHtml(char), 'g'),
				span(unicode, CSS_CLASSES.dim)
			);
		}

		return formatted;
	});

	return formattedLines.join('<br>');
}

/**
 * Format a hash value with highlighting.
 *
 * @param hash - The hash string to format
 * @returns HTML-formatted hash with cyan color
 *
 * @example
 * ```typescript
 * const html = formatHashHtml('a1b2c3d4');
 * // => "<span class="repl-hash">a1b2c3d4</span>"
 * ```
 */
export function formatHashHtml(hash: string): string {
	return span(hash, CSS_CLASSES.hash);
}

// =============================================================================
// Function Formatting
// =============================================================================

/**
 * Format a function definition as HTML.
 *
 * Displays function signature with syntax highlighting:
 * - Function name in accent color
 * - Parameters in cyan
 * - Expression in default color
 *
 * @param name - Function name (e.g., 'f', 'g')
 * @param params - Parameter names (e.g., ['x'] or ['x', 'y'])
 * @param expression - Function body as string
 * @returns HTML-formatted function definition
 *
 * @example
 * ```typescript
 * const html = formatFunctionDefinitionHtml('f', ['x'], 'x^2 + 1');
 * // => "<span class="repl-fn-name">f</span>(<span class="repl-fn-param">x</span>) = x^2 + 1"
 * ```
 */
export function formatFunctionDefinitionHtml(
	name: string,
	params: readonly string[],
	expression: string
): string {
	const fnName = span(name, CSS_CLASSES.fnName);
	const fnParams = params.map((p) => span(p, CSS_CLASSES.fnParam)).join(', ');
	const fnExpr = escapeHtml(expression);

	return `${fnName}(${fnParams}) = ${fnExpr}`;
}

/**
 * Format a function definition with optional derivative and inverse as HTML.
 *
 * Shows all available information about a function:
 * - Function definition: f(x) = expression
 * - Derivative (if defined): f'(x) = derivative
 * - Inverse (if defined): f^(-1)(x) = inverse
 *
 * @param name - Function name
 * @param params - Parameter names
 * @param expression - Function body
 * @param derivative - Optional derivative expression
 * @param inverse - Optional inverse expression
 * @returns Multi-line HTML-formatted function info
 *
 * @example
 * ```typescript
 * const html = formatFunctionInfoHtml('f', ['x'], 'x^2', '2*x', 'sqrt(x)');
 * // => "<span class="repl-fn-name">f</span>(x) = x^2<br>
 * //     <span class="repl-fn-derivative">f'</span>(x) = 2*x<br>
 * //     <span class="repl-fn-inverse">f^(-1)</span>(x) = sqrt(x)"
 * ```
 */
export function formatFunctionInfoHtml(
	name: string,
	params: readonly string[],
	expression: string,
	derivative?: string,
	inverse?: string
): string {
	const lines: string[] = [];

	// Main definition
	lines.push(formatFunctionDefinitionHtml(name, params, expression));

	// Derivative if defined
	if (derivative) {
		const derivName = span(`${name}'`, CSS_CLASSES.fnDerivative);
		const fnParams = params.map((p) => span(p, CSS_CLASSES.fnParam)).join(', ');
		lines.push(`${derivName}(${fnParams}) = ${escapeHtml(derivative)}`);
	}

	// Inverse if defined
	if (inverse) {
		const invName = span(`${name}^(-1)`, CSS_CLASSES.fnInverse);
		const fnParams = params.map((p) => span(p, CSS_CLASSES.fnParam)).join(', ');
		lines.push(`${invName}(${fnParams}) = ${escapeHtml(inverse)}`);
	}

	return lines.join('<br>');
}

/**
 * Format a list of functions as HTML.
 *
 * Shows all defined functions with their definitions.
 *
 * @param functions - Array of function info objects
 * @returns HTML-formatted function list
 */
export function formatFunctionListHtml(
	functions: ReadonlyArray<{
		name: string;
		params: readonly string[];
		expression: string;
		derivative?: string;
		inverse?: string;
	}>
): string {
	if (functions.length === 0) {
		return span('No functions defined', CSS_CLASSES.dim);
	}

	return functions
		.map((fn) =>
			formatFunctionInfoHtml(fn.name, fn.params, fn.expression, fn.derivative, fn.inverse)
		)
		.join('<br><br>');
}
