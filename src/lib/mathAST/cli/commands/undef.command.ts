/**
 * Undef Command
 *
 * Removes a single function binding from the evaluation state.
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { removeFunctionBinding, hasFunction } from '../core/eval-state';

// =============================================================================
// Undef Command
// =============================================================================

/**
 * Undef command - removes one function binding.
 *
 * Deletes a specific function from evalState.functions.
 * Returns an error if the function doesn't exist.
 *
 * @example
 * ```
 * > .def f(x) = x^2
 * > .undef f
 * Removed function: f
 *
 * > .undef g
 * Error: Function 'g' is not defined
 * ```
 */
export class UndefCommand extends BaseCommand {
	readonly name = 'undef';
	readonly aliases = ['delfn', 'rmfn'] as const;
	readonly description = 'Remove a function definition';
	readonly usage = 'undef <name>';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.evalState) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Removing functions requires REPL mode with evalState'
				}
			};
		}

		// Get the function name from input
		const funcName = ctx.input.trim();

		if (!funcName) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'Function name required. Use: undef <name>'
				}
			};
		}

		// Validate function name format
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(funcName)) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: `Invalid function name: '${funcName}'`
				}
			};
		}

		// Check if function exists
		if (!hasFunction(ctx.evalState, funcName)) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: `Function '${funcName}' is not defined`
				}
			};
		}

		// Remove the function binding
		removeFunctionBinding(ctx.evalState, funcName);

		const output = chalk.green('Removed function:') + ' ' + chalk.bold(funcName);

		return {
			success: true,
			output
		};
	}
}
