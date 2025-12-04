/**
 * Fns Command
 *
 * Lists all defined functions and their definitions from the evaluation state.
 * Shows function expressions, and optionally derivatives and inverses if defined.
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../index';
import { getFunctionNames, getFunction } from '../core/eval-state';

// =============================================================================
// Fns Command
// =============================================================================

/**
 * Fns command - lists all defined functions.
 *
 * Shows all function definitions in evalState with their expressions
 * formatted as custom syntax. Also shows derivatives and inverses
 * if they are defined.
 *
 * @example
 * ```
 * > .fns
 * Functions:
 *   f(x) = x^2
 *     f'(x) = 2*x
 *   g(x, y) = x+y
 * ```
 */
export class FnsCommand extends BaseCommand {
	readonly name = 'fns';
	readonly aliases = ['functions', 'funcs'] as const;
	readonly description = 'List all defined functions';
	readonly usage = 'fns';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.evalState) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Function listing requires REPL mode with evalState'
				}
			};
		}

		const funcNames = getFunctionNames(ctx.evalState);

		if (funcNames.length === 0) {
			return {
				success: true,
				output: chalk.dim('No functions defined')
			};
		}

		const lines: string[] = [chalk.bold('Functions:')];

		// Sort function names alphabetically
		const sortedNames = [...funcNames].sort();

		for (const name of sortedNames) {
			const definition = getFunction(ctx.evalState, name);
			if (!definition) continue;

			const paramsDisplay = definition.parameters.join(', ');
			const exprStr = toCustom(definition.expression);

			// Main function definition
			lines.push('  ' + chalk.yellow(`${name}(${paramsDisplay})`) + ' = ' + chalk.cyan(exprStr));

			// Show derivative if defined
			if (definition.derivative) {
				const derivStr = toCustom(definition.derivative);
				lines.push('    ' + chalk.dim(`${name}'(${paramsDisplay})`) + ' = ' + chalk.dim(derivStr));
			}

			// Show inverse if defined
			if (definition.inverse) {
				const invStr = toCustom(definition.inverse);
				// Use superscript -1 for inverse notation
				lines.push(
					'    ' +
						chalk.dim(`${name}${'\u207B\u00B9'}(${paramsDisplay})`) +
						' = ' +
						chalk.dim(invStr)
				);
			}
		}

		return {
			success: true,
			output: lines.join('\n')
		};
	}
}
