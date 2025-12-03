/**
 * Clear Command
 *
 * Clears all variable bindings from the evaluation state.
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { clearBindings, getBindingCount } from '../core/eval-state';

// =============================================================================
// Clear Command
// =============================================================================

/**
 * Clear command - clears all variable bindings.
 *
 * Removes all bindings from evalState.bindings.
 *
 * @example
 * ```
 * > .let x=5
 * > .let y=10
 * > .clear
 * Cleared 2 variables
 * ```
 */
export class ClearCommand extends BaseCommand {
	readonly name = 'clear';
	readonly aliases = ['clr'] as const;
	readonly description = 'Clear all variable bindings';
	readonly usage = 'clear';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.evalState) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Clearing variables requires REPL mode with evalState'
				}
			};
		}

		const count = getBindingCount(ctx.evalState);

		if (count === 0) {
			return {
				success: true,
				output: chalk.dim('No variables to clear')
			};
		}

		clearBindings(ctx.evalState);

		const output =
			chalk.green('Cleared ') + chalk.bold(count.toString()) + chalk.green(' variable(s)');

		return {
			success: true,
			output
		};
	}
}
