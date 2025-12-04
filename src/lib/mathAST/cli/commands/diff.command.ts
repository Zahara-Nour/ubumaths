/**
 * Diff Command
 *
 * Differentiates mathematical expressions symbolically.
 * Supports specifying the differentiation variable (defaults to 'x').
 *
 * Syntax: .diff expr [variable]
 * - .diff x^3          -> 3x^2 (default var: x)
 * - .diff x*y^2 y      -> 2xy  (explicit var: y)
 * - .diff f(x)         -> f'(x) or expanded if f is defined
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';
import { parse } from '../core/pipeline';
import { differentiate, DifferentiationError } from '../../differentiation';

// =============================================================================
// Diff Command
// =============================================================================

/**
 * Diff command - differentiates expressions symbolically.
 *
 * Parses the input expression and computes its symbolic derivative
 * with respect to the specified variable (or 'x' by default).
 *
 * If function bindings are defined in the evalState, they are used
 * to expand generic functions during differentiation.
 *
 * @example
 * ```
 * > .diff x^3
 * d/dx(x^3) = 3*x^2
 * LaTeX: 3 x^{2}
 *
 * > .diff x*y^2 y
 * d/dy(x*y^2) = 2*x*y
 * LaTeX: 2 x y
 *
 * > .def f(x) = x^2
 * > .diff f(x)
 * d/dx(f(x)) = 2*x
 * LaTeX: 2 x
 * ```
 */
export class DiffCommand extends BaseCommand {
	readonly name = 'diff';
	readonly aliases = ['d', 'derivative'] as const;
	readonly description = 'Differentiate expression: .diff expr [variable]';
	readonly usage = 'diff <expression> [variable]';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		const input = ctx.input.trim();

		if (!input) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'No expression to differentiate. Usage: .diff <expression> [variable]'
				}
			};
		}

		// Parse input to extract expression and optional variable
		// The variable is the last word if it's a single letter or valid identifier
		// This is a heuristic: we try to detect "expr var" vs "expr"
		const { expression, variable } = this.parseInput(input);

		// Parse the expression with state-aware parser options
		const parserOptions = ctx.evalState ? { evalState: ctx.evalState } : undefined;
		const parseResult = parse(expression, parserOptions);

		if (parseResult.errors.length > 0 || !parseResult.ast) {
			const errorMsg = parseResult.errors[0]?.message ?? 'Failed to parse expression';
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message: errorMsg }
			};
		}

		try {
			// Get function bindings from state if available
			const functions = ctx.evalState?.functions;

			// Differentiate the expression
			const derivative = differentiate(parseResult.ast, {
				variable,
				simplify: true,
				functions
			});

			// Format output
			const exprCustom = toCustom(parseResult.ast);
			const derivCustom = toCustom(derivative);
			const derivLatex = toLatex(derivative);

			const output = [
				chalk.bold(`d/d${variable}(${exprCustom})`) + ' = ' + chalk.cyan(derivCustom),
				chalk.dim('LaTeX:') + ' ' + derivLatex
			].join('\n');

			return {
				success: true,
				output,
				ast: derivative
			};
		} catch (err) {
			if (err instanceof DifferentiationError) {
				const message = err.details ? `${err.message}: ${err.details}` : err.message;
				return {
					success: false,
					output: '',
					error: { code: 'PARSE_ERROR', message }
				};
			}

			const message = err instanceof Error ? err.message : 'Unknown error during differentiation';
			return {
				success: false,
				output: '',
				error: { code: 'UNKNOWN_ERROR', message }
			};
		}
	}

	/**
	 * Parse the input to extract expression and optional variable.
	 *
	 * Strategy: If the last token is a single word that looks like a variable
	 * (single letter or valid identifier) and there's more before it,
	 * treat it as the differentiation variable.
	 *
	 * Examples:
	 * - "x^3" -> { expression: "x^3", variable: "x" }
	 * - "x^3 y" -> { expression: "x^3", variable: "y" }
	 * - "sin(x)" -> { expression: "sin(x)", variable: "x" }
	 * - "x*y^2 y" -> { expression: "x*y^2", variable: "y" }
	 */
	private parseInput(input: string): { expression: string; variable: string } {
		const trimmed = input.trim();

		// Try to find a trailing variable (single word at the end after whitespace)
		// Match pattern: everything before whitespace + single identifier at end
		const match = trimmed.match(/^(.+?)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);

		if (match) {
			const [, expr, varCandidate] = match;
			// Only treat as variable if it's a simple identifier (1-2 chars typically for variables)
			// and the expression part is not empty
			if (expr.trim() && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varCandidate)) {
				return {
					expression: expr.trim(),
					variable: varCandidate
				};
			}
		}

		// Default: entire input is the expression, variable defaults to 'x'
		return {
			expression: trimmed,
			variable: 'x'
		};
	}
}
