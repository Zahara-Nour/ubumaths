/**
 * Def Command
 *
 * Defines a function binding by parsing a function definition
 * and storing it in the evaluation state.
 *
 * Syntax: .def f(x) = x^2 or .def g(x,y) = x + y
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../index';
import { parse } from '../core/pipeline';
import { createFunctionBinding, hasFunction } from '../core/eval-state';

// =============================================================================
// Def Command
// =============================================================================

/**
 * Def command - defines function bindings.
 *
 * Parses a function definition like "f(x) = x^2" or "g(x,y) = x + y"
 * and stores the MathNode expression in evalState.functions.
 *
 * @example
 * ```
 * > .def f(x) = x^2
 * Defined: f(x) = x^2
 *
 * > .def g(x, y) = x + y
 * Defined: g(x, y) = x+y
 * ```
 */
export class DefCommand extends BaseCommand {
	readonly name = 'def';
	readonly aliases = ['fn'] as const;
	readonly description = 'Define a function: .def f(x) = x^2';
	readonly usage = 'def name(params) = expression';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.evalState) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Function definition requires REPL mode with evalState'
				}
			};
		}

		// Parse the input: should be "name(params) = expression"
		const input = ctx.input.trim();

		// Match pattern: name(params) = expression
		// - name: alphanumeric (starting with letter or underscore)
		// - params: comma-separated list inside parentheses
		// - expression: anything after the equals sign
		const match = input.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)\s*=\s*(.+)$/);

		if (!match) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'Invalid syntax. Use: def name(params) = expression'
				}
			};
		}

		const [, funcName, paramsStr, expressionStr] = match;

		// Parse and validate parameters
		const params = paramsStr
			.split(',')
			.map((p) => p.trim())
			.filter((p) => p.length > 0);

		// Validate parameter names
		for (const param of params) {
			if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(param)) {
				return {
					success: false,
					output: '',
					error: {
						code: 'PARSE_ERROR',
						message: `Invalid parameter name: '${param}'`
					}
				};
			}
		}

		// Check for duplicate parameters
		const uniqueParams = new Set(params);
		if (uniqueParams.size !== params.length) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'Duplicate parameter names are not allowed'
				}
			};
		}

		// A function must have at least one parameter
		if (params.length === 0) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'Function must have at least one parameter'
				}
			};
		}

		// Parse the expression
		const parseResult = parse(expressionStr);

		if (parseResult.errors.length > 0 || !parseResult.ast) {
			const errorMsg = parseResult.errors[0]?.message ?? 'Failed to parse expression';
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message: errorMsg }
			};
		}

		// Check if function already exists (for informational message)
		const isOverwrite = hasFunction(ctx.evalState, funcName);

		// Store the function binding
		createFunctionBinding(ctx.evalState, funcName, params, parseResult.ast);

		// Format output
		const paramsDisplay = params.join(', ');
		const valueStr = toCustom(parseResult.ast);
		const actionWord = isOverwrite ? 'Redefined' : 'Defined';
		const output =
			chalk.green(`${actionWord}:`) +
			' ' +
			chalk.bold(`${funcName}(${paramsDisplay})`) +
			' = ' +
			chalk.cyan(valueStr);

		return {
			success: true,
			output,
			ast: parseResult.ast
		};
	}
}
