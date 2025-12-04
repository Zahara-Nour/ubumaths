/**
 * DefDeriv Command
 *
 * Manually sets or overrides the derivative of an existing function.
 * Use this when the auto-computed derivative is incorrect or when
 * you want to provide a custom derivative expression.
 *
 * Syntax: .def' f = expr  (sets f'(x) = expr)
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../index';
import { parse } from '../core/pipeline';
import { getFunction, hasFunction, setFunctionDerivative } from '../core/eval-state';

// =============================================================================
// DefDeriv Command
// =============================================================================

/**
 * DefDeriv command - manually sets a function's derivative.
 *
 * Parses a derivative definition like "f = 2x" and stores the expression
 * as the derivative for function f. The function must already exist.
 *
 * @example
 * ```
 * > .def f(x) = x^2
 * Defined: f(x) = x^2
 *   f'(x) = 2*x (auto-computed)
 *
 * > .def' f = 3x
 * Set f'(x) = 3*x (manual override)
 *
 * > .fn' g = cos(x)
 * Set g'(x) = cos(x) (manual override)
 * ```
 */
export class DefDerivCommand extends BaseCommand {
	readonly name = "def'";
	readonly aliases = ["fn'"] as const;
	readonly description = "Set function derivative: .def' f = 2x";
	readonly usage = "def' name = expression";
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.evalState) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Derivative override requires REPL mode with evalState'
				}
			};
		}

		// Parse the input: should be "name = expression"
		const input = ctx.input.trim();

		// Match pattern: name = expression
		// - name: alphanumeric function name (starting with letter or underscore)
		// - expression: anything after the equals sign
		const match = input.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);

		if (!match) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: "Invalid syntax. Use: def' name = expression"
				}
			};
		}

		const [, funcName, expressionStr] = match;

		// Check if the function exists
		if (!hasFunction(ctx.evalState, funcName)) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: `Function '${funcName}' is not defined. Use .def to define it first.`
				}
			};
		}

		// Get the function to access its parameters
		const funcDef = getFunction(ctx.evalState, funcName);
		if (!funcDef) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: `Could not retrieve function '${funcName}'`
				}
			};
		}

		// Parse the derivative expression
		const parseResult = parse(expressionStr);

		if (parseResult.errors.length > 0 || !parseResult.ast) {
			const errorMsg = parseResult.errors[0]?.message ?? 'Failed to parse expression';
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message: errorMsg }
			};
		}

		// Set the derivative
		const success = setFunctionDerivative(ctx.evalState, funcName, parseResult.ast);

		if (!success) {
			return {
				success: false,
				output: '',
				error: {
					code: 'UNKNOWN_ERROR',
					message: `Failed to set derivative for '${funcName}'`
				}
			};
		}

		// Format output
		const paramsDisplay = funcDef.parameters.join(', ');
		const derivStr = toCustom(parseResult.ast);
		const output =
			chalk.green('Set') +
			' ' +
			chalk.bold(`${funcName}'(${paramsDisplay})`) +
			' = ' +
			chalk.cyan(derivStr) +
			chalk.dim(' (manual override)');

		return {
			success: true,
			output,
			ast: parseResult.ast
		};
	}
}
