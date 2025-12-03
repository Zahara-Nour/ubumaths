/**
 * Vars Command
 *
 * Lists all defined variables and their values from the evaluation state.
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../index';

// =============================================================================
// Vars Command
// =============================================================================

/**
 * Vars command - lists all defined variables.
 *
 * Shows all variable bindings in evalState with their values
 * formatted as custom syntax.
 *
 * @example
 * ```
 * > .vars
 * Variables:
 *   x = 5
 *   y = 2+3
 *   z = sin(pi/4)
 * ```
 */
export class VarsCommand extends BaseCommand {
	readonly name = 'vars';
	readonly aliases = ['v', 'variables'] as const;
	readonly description = 'List all defined variables';
	readonly usage = 'vars';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.evalState) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Variable listing requires REPL mode with evalState'
				}
			};
		}

		const { bindings } = ctx.evalState;

		if (bindings.size === 0) {
			return {
				success: true,
				output: chalk.dim('No variables defined')
			};
		}

		const lines: string[] = [chalk.bold('Variables:')];

		// Sort variable names alphabetically
		const sortedNames = Array.from(bindings.keys()).sort();

		for (const name of sortedNames) {
			const node = bindings.get(name)!;
			const valueStr = toCustom(node);
			lines.push('  ' + chalk.yellow(name) + ' = ' + chalk.cyan(valueStr));
		}

		return {
			success: true,
			output: lines.join('\n')
		};
	}
}
