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
import { parse } from '../core/pipeline';
import { readCommandArguments } from '../core/variable-argument';
import type { MathNode } from '../../types';

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
	readonly usage = 'eval <expression> [en <variable>=<valeur>]';
	// `.eval x^2 en x=3` : l'argument n'est pas une expression d'un bloc
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		// L'argument tapé, relu ici : `EXPR en x=3` (ou `pour x=3`, décision de
		// David, 2026-10-08). Sans argument : la dernière expression (`ctx.ast`).
		let ast: MathNode | undefined = ctx.ast;
		let assigned: Record<string, MathNode> = {};
		const input = ctx.input.trim();
		if (input !== '') {
			const reading = readCommandArguments('eval', input);
			if (!reading.ok) {
				return {
					success: false,
					output: '',
					error: { code: 'COMMAND_SYNTAX', message: reading.message }
				};
			}
			const parserOptions = ctx.evalState ? { evalState: ctx.evalState } : undefined;
			const parsed = parse(reading.args.expression, parserOptions);
			const { assignment } = reading.args;
			const value = assignment === null ? null : parse(assignment.value, parserOptions);
			const failed = [parsed, value].find(
				(result) => result !== null && (result.errors.length > 0 || !result.ast)
			);
			if (failed !== undefined && failed !== null) {
				const message = failed.errors[0]?.message ?? 'Failed to parse expression';
				return { success: false, output: '', error: { code: 'PARSE_ERROR', message } };
			}
			ast = parsed.ast;
			if (assignment !== null && value?.ast !== undefined) {
				assigned = { [assignment.name]: value.ast };
			}
		}

		if (!ast) {
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
			// La valeur donnée après `en` l'emporte sur une valeur posée (`.let`)
			const bindings = { ...bindingsToRecord(ctx.evalState.bindings), ...assigned };

			// Substitute variables
			const substituted = substitute(ast, bindings);

			// Evaluate using current mode
			const result = evaluate(substituted, { mode: ctx.evalState.mode });

			// Boolean result: colored output, no mode/exact info
			if (result.status === 'value' && result.node.type === 'boolean') {
				const boolValue = result.value as boolean;
				const colorFn = boolValue ? chalk.green : chalk.red;
				return {
					success: true,
					output: chalk.bold('Result:') + ' ' + colorFn.bold(String(boolValue)),
					ast: result.node
				};
			}

			// Non-value result (indeterminate / unevaluable): surface via the catch
			if (result.status !== 'value') {
				throw new Error(
					result.status === 'indeterminate' ? `Indeterminate form: ${result.form}` : result.reason
				);
			}

			// Numeric result: standard formatting
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
