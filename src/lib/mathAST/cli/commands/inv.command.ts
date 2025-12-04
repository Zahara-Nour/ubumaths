/**
 * Inv Command
 *
 * Displays or defines the inverse of an existing function.
 * Unlike derivatives, inverses are NOT auto-computed due to complexity.
 * Users must manually define them using the define syntax.
 *
 * Syntax:
 * - .inv f          -> Display f^(-1) if defined
 * - .inv f = sqrt(x) -> Define f^(-1)(x) = sqrt(x)
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';
import { parse } from '../core/pipeline';
import { getFunction, hasFunction, setFunctionInverse } from '../core/eval-state';

// =============================================================================
// Inv Command
// =============================================================================

/**
 * Inv command - displays or defines function inverses.
 *
 * In display mode, shows the inverse if one has been defined.
 * In define mode, parses and stores the inverse expression.
 *
 * Note: Inverses are NOT auto-computed (too complex for general functions).
 * Users must manually define them.
 *
 * @example
 * ```
 * > .def f(x) = x^2
 * Defined: f(x) = x^2
 *   f'(x) = 2*x (auto-computed)
 *
 * > .inv f
 * f^(-1) is not defined
 *
 * > .inv f = sqrt(x)
 * Set f^(-1)(x) = sqrt(x)
 *
 * > .inv f
 * f^(-1)(x) = sqrt(x)
 * LaTeX: \sqrt{x}
 * ```
 */
export class InvCommand extends BaseCommand {
	readonly name = 'inv';
	readonly aliases = ['inverse'] as const;
	readonly description = 'Display or define inverse: .inv f or .inv f = sqrt(x)';
	readonly usage = 'inv name [= expression]';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.evalState) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Inverse operations require REPL mode with evalState'
				}
			};
		}

		const input = ctx.input.trim();

		if (!input) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'No function specified. Usage: .inv name or .inv name = expression'
				}
			};
		}

		// Check if this is a define operation (contains '=')
		// Match pattern: name = expression
		const defineMatch = input.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/);

		if (defineMatch) {
			return this.executeDefine(ctx, defineMatch[1], defineMatch[2]);
		}

		// Display mode: just the function name
		const displayMatch = input.match(/^([a-zA-Z_][a-zA-Z0-9_]*)$/);

		if (!displayMatch) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'Invalid syntax. Use: .inv name or .inv name = expression'
				}
			};
		}

		return this.executeDisplay(ctx, displayMatch[1]);
	}

	/**
	 * Display mode: show the inverse of a function if defined.
	 */
	private executeDisplay(ctx: CommandContext, funcName: string): CommandResult {
		// Check if the function exists
		if (!hasFunction(ctx.evalState!, funcName)) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: `Function '${funcName}' is not defined. Use .def to define it first.`
				}
			};
		}

		const funcDef = getFunction(ctx.evalState!, funcName);
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

		// Check if inverse is defined
		if (!funcDef.inverse) {
			const output =
				chalk.yellow(`${funcName}`) +
				chalk.dim('^(-1)') +
				' is not defined\n' +
				chalk.dim(`Use: .inv ${funcName} = expression`);

			return {
				success: true,
				output
			};
		}

		// Display the inverse
		const paramsDisplay = funcDef.parameters.join(', ');
		const invCustom = toCustom(funcDef.inverse);
		const invLatex = toLatex(funcDef.inverse);

		const output = [
			chalk.bold(`${funcName}^(-1)(${paramsDisplay})`) + ' = ' + chalk.cyan(invCustom),
			chalk.dim('LaTeX:') + ' ' + invLatex
		].join('\n');

		return {
			success: true,
			output,
			ast: funcDef.inverse
		};
	}

	/**
	 * Define mode: set the inverse of a function.
	 */
	private executeDefine(
		ctx: CommandContext,
		funcName: string,
		expressionStr: string
	): CommandResult {
		// Check if the function exists
		if (!hasFunction(ctx.evalState!, funcName)) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: `Function '${funcName}' is not defined. Use .def to define it first.`
				}
			};
		}

		const funcDef = getFunction(ctx.evalState!, funcName);
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

		// Parse the inverse expression
		const parseResult = parse(expressionStr);

		if (parseResult.errors.length > 0 || !parseResult.ast) {
			const errorMsg = parseResult.errors[0]?.message ?? 'Failed to parse expression';
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message: errorMsg }
			};
		}

		// Check if this is overriding an existing inverse
		const isOverride = funcDef.inverse !== undefined;

		// Set the inverse
		const success = setFunctionInverse(ctx.evalState!, funcName, parseResult.ast);

		if (!success) {
			return {
				success: false,
				output: '',
				error: {
					code: 'UNKNOWN_ERROR',
					message: `Failed to set inverse for '${funcName}'`
				}
			};
		}

		// Format output
		const paramsDisplay = funcDef.parameters.join(', ');
		const invStr = toCustom(parseResult.ast);
		const actionWord = isOverride ? 'Updated' : 'Set';
		const output =
			chalk.green(actionWord) +
			' ' +
			chalk.bold(`${funcName}^(-1)(${paramsDisplay})`) +
			' = ' +
			chalk.cyan(invStr);

		return {
			success: true,
			output,
			ast: parseResult.ast
		};
	}
}
