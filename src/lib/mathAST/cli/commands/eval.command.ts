/**
 * Eval Command
 *
 * Evaluates a mathematical expression with variable substitution
 * and displays the numeric result.
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../index';
import { evaluate, substitute } from '../../eval';
import { bindingsToRecord } from '../core/eval-state';

// =============================================================================
// Eval Command
// =============================================================================

/**
 * Eval command - evaluates expressions numerically.
 *
 * Substitutes variables from evalState.bindings and evaluates
 * using evalState.mode (exact or decimal).
 *
 * @example
 * ```
 * > .let x=5
 * > .eval x^2
 * Result: 25
 * Mode: exact
 * ```
 */
export class EvalCommand extends BaseCommand {
	readonly name = 'eval';
	readonly aliases = ['e'] as const;
	readonly description = 'Evaluate expression with variable substitution';
	readonly usage = 'eval <expression>';

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.ast) {
			return {
				success: false,
				output: '',
				error: { code: 'NO_AST', message: 'No expression to evaluate' }
			};
		}

		if (!ctx.evalState) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Evaluation requires REPL mode with evalState'
				}
			};
		}

		try {
			// Convert bindings Map to Record for substitute()
			const bindings = bindingsToRecord(ctx.evalState.bindings);

			// Substitute variables
			const substituted = substitute(ctx.ast, bindings);

			// Evaluate using current mode
			const result = evaluate(substituted, { mode: ctx.evalState.mode });

			// Format the result
			const resultStr = toCustom(result.node);
			const modeStr = ctx.evalState.mode;
			const exactStr = result.exact ? chalk.green('(exact)') : chalk.yellow('(approximate)');

			const lines = [
				chalk.bold('Result:') + ' ' + chalk.cyan(resultStr) + ' ' + exactStr,
				chalk.dim('Mode:') + '   ' + modeStr
			];

			return {
				success: true,
				output: lines.join('\n'),
				ast: result.node
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error during evaluation';
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message }
			};
		}
	}
}
