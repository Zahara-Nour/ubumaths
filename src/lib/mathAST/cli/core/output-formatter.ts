/**
 * Output Formatter
 *
 * Formats CLI output with colors and structured error messages.
 * Uses chalk for terminal colors.
 */

import chalk from 'chalk';
import type { PipelineError, CommandResult, CommandError } from '../types';

// =============================================================================
// Error Formatting
// =============================================================================

/**
 * Format a pipeline or command error for display.
 *
 * Produces colored output with error code, message, position (if available),
 * and helpful suggestions.
 *
 * @param error - The error to format
 * @returns Formatted error string with colors
 *
 * @example
 * ```typescript
 * const error: PipelineError = {
 *   code: 'PARSE_ERROR',
 *   message: 'Unexpected token',
 *   position: 5,
 *   suggestion: 'Check for missing operators'
 * };
 * console.log(formatError(error));
 * // => "Error [PARSE_ERROR]: Unexpected token (position 5)"
 * // => "Hint: Check for missing operators"
 * ```
 */
export function formatError(error: PipelineError | CommandError): string {
	const header = chalk.red(`Error [${error.code}]:`);
	const message = chalk.white(error.message);

	let output = `${header} ${message}`;

	// Add position information for pipeline errors
	if ('position' in error && error.position !== undefined) {
		output += chalk.gray(` (position ${error.position})`);
	}

	// Add suggestion if available
	if ('suggestion' in error && error.suggestion) {
		output += `\n${chalk.yellow('Hint:')} ${error.suggestion}`;
	}

	return output;
}

/**
 * Format an input error with position indicator.
 *
 * Shows the input string with a caret pointing to the error position.
 *
 * @param input - The original input string
 * @param position - The position of the error (0-indexed)
 * @param message - The error message
 * @returns Formatted error with visual position indicator
 *
 * @example
 * ```typescript
 * console.log(formatInputError('x + * y', 4, 'Unexpected operator'));
 * // => "Parse error: Unexpected operator"
 * // =>
 * // => "  x + * y"
 * // => "      ^"
 * ```
 */
export function formatInputError(input: string, position: number, message: string): string {
	const pointer = ' '.repeat(position) + chalk.red('^');
	return [chalk.red(`Parse error: ${message}`), '', `  ${input}`, `  ${pointer}`].join('\n');
}

// =============================================================================
// Success Formatting
// =============================================================================

/**
 * Format a success message with optional label.
 *
 * @param output - The output content
 * @param label - Optional label to prefix the output
 * @returns Formatted success output
 *
 * @example
 * ```typescript
 * console.log(formatSuccess('x^2 + 3x', 'LaTeX:'));
 * // => "LaTeX:"
 * // => "x^2 + 3x"
 * ```
 */
export function formatSuccess(output: string, label?: string): string {
	if (label) {
		return `${chalk.green(label)}\n${output}`;
	}
	return output;
}

// =============================================================================
// Command Result Formatting
// =============================================================================

/**
 * Format a complete command result.
 *
 * Handles both success and error cases appropriately.
 *
 * @param result - The command result to format
 * @returns Formatted output string
 *
 * @example
 * ```typescript
 * const successResult: CommandResult = {
 *   output: 'x^2 + 1',
 *   success: true
 * };
 * console.log(formatCommandResult(successResult));
 * // => "x^2 + 1"
 *
 * const errorResult: CommandResult = {
 *   output: '',
 *   success: false,
 *   error: { code: 'NO_AST', message: 'No AST available' }
 * };
 * console.log(formatCommandResult(errorResult));
 * // => "Error [NO_AST]: No AST available"
 * ```
 */
export function formatCommandResult(result: CommandResult): string {
	if (!result.success && result.error) {
		return formatError(result.error);
	}
	return result.output;
}
