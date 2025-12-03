/**
 * Unset Command
 *
 * Removes a single variable binding from the evaluation state.
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { unsetBinding, hasBinding } from '../core/eval-state';

// =============================================================================
// Unset Command
// =============================================================================

/**
 * Unset command - removes one variable binding.
 *
 * Deletes a specific binding from evalState.bindings.
 * Returns an error if the variable doesn't exist.
 *
 * @example
 * ```
 * > .let x=5
 * > .unset x
 * Removed variable: x
 *
 * > .unset y
 * Error: Variable 'y' is not defined
 * ```
 */
export class UnsetCommand extends BaseCommand {
	readonly name = 'unset';
	readonly aliases = ['del', 'delete'] as const;
	readonly description = 'Remove a variable binding';
	readonly usage = 'unset <name>';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.evalState) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Unsetting variables requires REPL mode with evalState'
				}
			};
		}

		// Get the variable name from input
		const varName = ctx.input.trim();

		if (!varName) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'Variable name required. Use: unset <name>'
				}
			};
		}

		// Validate variable name format
		if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varName)) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: `Invalid variable name: '${varName}'`
				}
			};
		}

		// Check if variable exists
		if (!hasBinding(ctx.evalState, varName)) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: `Variable '${varName}' is not defined`
				}
			};
		}

		// Remove the binding
		unsetBinding(ctx.evalState, varName);

		const output = chalk.green('Removed variable:') + ' ' + chalk.bold(varName);

		return {
			success: true,
			output
		};
	}
}
