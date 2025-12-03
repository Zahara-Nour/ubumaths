/**
 * Let Command
 *
 * Defines a variable binding by parsing an assignment expression
 * and storing the value in the evaluation state.
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../index';
import { parse } from '../core/pipeline';
import { setBinding } from '../core/eval-state';

// =============================================================================
// Let Command
// =============================================================================

/**
 * Let command - defines variable bindings.
 *
 * Parses an assignment like "x=5" or "x = 2+3" and stores the
 * MathNode value in evalState.bindings.
 *
 * @example
 * ```
 * > .let x=5
 * Defined: x = 5
 *
 * > .let y = 2+3
 * Defined: y = 2+3
 * ```
 */
export class LetCommand extends BaseCommand {
	readonly name = 'let';
	readonly aliases = [] as const;
	readonly description = 'Define a variable binding';
	readonly usage = 'let <name>=<expression>';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.evalState) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Variable binding requires REPL mode with evalState'
				}
			};
		}

		// Parse the input: should be "name=expression" or "name = expression"
		const input = ctx.input.trim();

		// Match pattern: name = expression (with optional spaces around =)
		const match = input.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);

		if (!match) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'Invalid syntax. Use: let <name>=<expression>'
				}
			};
		}

		const [, varName, expression] = match;

		// Parse the expression
		const parseResult = parse(expression);

		if (parseResult.errors.length > 0 || !parseResult.ast) {
			const errorMsg = parseResult.errors[0]?.message ?? 'Failed to parse expression';
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message: errorMsg }
			};
		}

		// Store the binding
		setBinding(ctx.evalState, varName, parseResult.ast);

		// Format output
		const valueStr = toCustom(parseResult.ast);
		const output =
			chalk.green('Defined:') + ' ' + chalk.bold(varName) + ' = ' + chalk.cyan(valueStr);

		return {
			success: true,
			output,
			ast: parseResult.ast
		};
	}
}
