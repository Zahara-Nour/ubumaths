/**
 * Def Command
 *
 * Defines a function binding by parsing a function definition
 * and storing it in the evaluation state. Automatically computes
 * the derivative when defining the function.
 *
 * Syntax: .def f(x) = x^2 or .def g(x,y) = x + y
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../index';
import { parse } from '../core/pipeline';
import {
	createFunctionBinding,
	hasFunction,
	setFunctionDerivative,
	setFunctionDomain
} from '../core/eval-state';
import { differentiate, DifferentiationError } from '../../differentiation';
import { computeDomain } from '../../domain/compute';
import { formatDomainCondition } from '../../domain/format';

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

		// Format parameters for display
		const paramsDisplay = params.join(', ');

		// Store the function binding
		createFunctionBinding(ctx.evalState, funcName, params, parseResult.ast);

		// Auto-compute derivative (with respect to first parameter)
		let derivativeInfo = '';
		try {
			const derivative = differentiate(parseResult.ast, {
				variable: params[0],
				simplify: true
			});
			setFunctionDerivative(ctx.evalState, funcName, derivative);
			const derivStr = toCustom(derivative);
			derivativeInfo =
				'\n  ' + chalk.dim(`${funcName}'(${paramsDisplay})`) + ' = ' + chalk.dim(derivStr);
		} catch (err) {
			// Differentiation failed - show warning but continue
			if (err instanceof DifferentiationError) {
				derivativeInfo =
					'\n  ' + chalk.yellow(`Warning: Could not auto-compute derivative: ${err.message}`);
			}
			// For other errors, silently ignore (function is still defined)
		}

		// Auto-compute domain (with respect to first parameter)
		let domainInfo = '';
		try {
			const domainResult = computeDomain(parseResult.ast, params[0]);
			setFunctionDomain(ctx.evalState, funcName, domainResult.domain);
			const domainStr = formatDomainCondition(domainResult.domain, params[0]);
			// Only show domain if it's not universal (x ∈ ℝ)
			if (domainResult.domain.kind !== 'universal') {
				domainInfo = '\n  ' + chalk.dim('Domaine : ') + chalk.dim(domainStr);
			}
		} catch {
			// Domain computation failed - silently ignore
		}

		// Format output
		const valueStr = toCustom(parseResult.ast);
		const actionWord = isOverwrite ? 'Redefined' : 'Defined';
		const output =
			chalk.green(`${actionWord}:`) +
			' ' +
			chalk.bold(`${funcName}(${paramsDisplay})`) +
			' = ' +
			chalk.cyan(valueStr) +
			derivativeInfo +
			domainInfo;

		return {
			success: true,
			output,
			ast: parseResult.ast
		};
	}
}
