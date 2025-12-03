/**
 * Mode Command
 *
 * Shows or sets the evaluation mode (exact or decimal).
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { setMode, type EvalMode } from '../core/eval-state';

// =============================================================================
// Mode Command
// =============================================================================

/**
 * Mode command - shows or sets evaluation mode.
 *
 * Without arguments, shows the current mode.
 * With "exact" or "decimal", switches to that mode.
 *
 * @example
 * ```
 * > .mode
 * Current mode: exact
 *
 * > .mode decimal
 * Mode set to: decimal
 *
 * > .mode exact
 * Mode set to: exact
 * ```
 */
export class ModeCommand extends BaseCommand {
	readonly name = 'mode';
	readonly aliases = ['m'] as const;
	readonly description = 'Show or set evaluation mode (exact/decimal)';
	readonly usage = 'mode [exact|decimal]';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.evalState) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Mode command requires REPL mode with evalState'
				}
			};
		}

		const input = ctx.input.trim().toLowerCase();

		// No argument: show current mode
		if (!input) {
			const modeStr =
				ctx.evalState.mode === 'exact' ? chalk.green('exact') : chalk.yellow('decimal');
			const output = chalk.bold('Current mode:') + ' ' + modeStr;
			return {
				success: true,
				output
			};
		}

		// Validate mode argument
		if (input !== 'exact' && input !== 'decimal') {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: `Invalid mode '${input}'. Use: mode exact | mode decimal`
				}
			};
		}

		// Set the new mode
		const newMode: EvalMode = input;
		setMode(ctx.evalState, newMode);

		const modeStr = newMode === 'exact' ? chalk.green('exact') : chalk.yellow('decimal');
		const output = chalk.bold('Mode set to:') + ' ' + modeStr;

		return {
			success: true,
			output
		};
	}
}
