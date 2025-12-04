/**
 * Taylor Command
 *
 * Computes Taylor series expansion of mathematical expressions.
 * Supports specifying the number of terms and center point.
 *
 * Syntax: .taylor expr terms [center]
 * - .taylor sin(x) 5 0     -> Taylor series of sin(x), 5 terms, at x=0
 * - .taylor exp(x) 4 0     -> 1 + x + x^2/2 + x^3/6 (4 terms at 0)
 * - .taylor ln(x) 4 1      -> Taylor of ln(x) at x=1
 * - .taylor f 3 0          -> Taylor of f(x) at x=0, if f is defined
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';
import { parse } from '../core/pipeline';
import { taylorExpand, TaylorError, MAX_TAYLOR_TERMS } from '../../taylor';

// =============================================================================
// Taylor Command
// =============================================================================

/**
 * Taylor command - computes Taylor series expansions.
 *
 * The command parses the input to extract the expression, number of terms,
 * and optional center point. It then computes the Taylor polynomial.
 *
 * If the expression is a single function name (like 'f' or 'sin') that matches
 * a defined function in the state, it treats it as f(x) with default variable.
 *
 * @example
 * ```
 * > .taylor sin(x) 5 0
 * Taylor series of sin(x) at x=0, 5 terms:
 * x - x^3/6 + x^5/120
 * LaTeX: x - \frac{x^{3}}{6} + \frac{x^{5}}{120}
 *
 * > .taylor exp(x) 4
 * Taylor series of exp(x) at x=0, 4 terms:
 * 1 + x + x^2/2 + x^3/6
 *
 * > .def f(x) = x^2
 * > .taylor f 3
 * Taylor series of f(x) at x=0, 3 terms:
 * x^2
 * ```
 */
export class TaylorCommand extends BaseCommand {
	readonly name = 'taylor';
	readonly aliases = ['tay', 'series'] as const;
	readonly description = 'Compute Taylor series: .taylor expr terms [center]';
	readonly usage = 'taylor <expression> <terms> [center]';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		const input = ctx.input.trim();

		if (!input) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'No expression provided. Usage: .taylor <expression> <terms> [center]'
				}
			};
		}

		// Parse input to extract expression, terms, and optional center
		const parsed = this.parseInput(input);

		if (!parsed) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message:
						'Invalid syntax. Usage: .taylor <expression> <terms> [center]\n' +
						'Example: .taylor sin(x) 5 0'
				}
			};
		}

		const { expression, terms, center, varName } = parsed;

		// Validate terms
		if (terms < 1) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: 'Number of terms must be at least 1'
				}
			};
		}

		if (terms > MAX_TAYLOR_TERMS) {
			return {
				success: false,
				output: '',
				error: {
					code: 'INVALID_OPTIONS',
					message: `Number of terms exceeds maximum of ${MAX_TAYLOR_TERMS}`
				}
			};
		}

		// Check if expression is just a function name (like 'f' or 'sin')
		// and if so, convert it to f(x)
		let exprToParse = expression;
		const singleIdentifier = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expression.trim());

		if (singleIdentifier) {
			const funcName = expression.trim();
			// Check if it's a defined function in state
			if (ctx.evalState?.functions?.[funcName]) {
				// Use the function's parameter or default to 'x'
				const funcDef = ctx.evalState.functions[funcName];
				const param = funcDef.parameters[0] || 'x';
				exprToParse = `${funcName}(${param})`;
			} else if (['sin', 'cos', 'tan', 'exp', 'ln', 'sqrt', 'log'].includes(funcName)) {
				// Built-in function without argument
				exprToParse = `${funcName}(${varName})`;
			}
		}

		// Parse the expression with state-aware parser options
		const parserOptions = ctx.evalState ? { evalState: ctx.evalState } : undefined;
		const parseResult = parse(exprToParse, parserOptions);

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

			// Compute Taylor series
			const taylor = taylorExpand(
				parseResult.ast,
				{
					variable: varName,
					center,
					terms
				},
				functions
			);

			// Format output
			const exprCustom = toCustom(parseResult.ast);
			const taylorCustom = toCustom(taylor);
			const taylorLatex = toLatex(taylor);

			const centerDesc = center === 0 ? 'x=0 (Maclaurin)' : `x=${center}`;

			const output = [
				chalk.bold(`Taylor series of ${exprCustom} at ${centerDesc}, ${terms} terms:`),
				chalk.cyan(taylorCustom),
				chalk.dim('LaTeX:') + ' ' + taylorLatex
			].join('\n');

			return {
				success: true,
				output,
				ast: taylor
			};
		} catch (err) {
			if (err instanceof TaylorError) {
				const message = err.details ? `${err.message}: ${err.details}` : err.message;
				return {
					success: false,
					output: '',
					error: { code: 'PARSE_ERROR', message }
				};
			}

			const message = err instanceof Error ? err.message : 'Unknown error during Taylor expansion';
			return {
				success: false,
				output: '',
				error: { code: 'UNKNOWN_ERROR', message }
			};
		}
	}

	/**
	 * Parse the input to extract expression, terms, and optional center.
	 *
	 * Supports formats:
	 * - "sin(x) 5" -> { expression: "sin(x)", terms: 5, center: 0, varName: "x" }
	 * - "sin(x) 5 0" -> { expression: "sin(x)", terms: 5, center: 0, varName: "x" }
	 * - "ln(x) 4 1" -> { expression: "ln(x)", terms: 4, center: 1, varName: "x" }
	 * - "f 3" -> { expression: "f", terms: 3, center: 0, varName: "x" }
	 *
	 * @returns Parsed input or null if invalid
	 */
	private parseInput(
		input: string
	): { expression: string; terms: number; center: number; varName: string } | null {
		const trimmed = input.trim();

		// Split by whitespace from the end to find numeric arguments
		const tokens = trimmed.split(/\s+/);

		if (tokens.length < 2) {
			return null;
		}

		// Try to find terms and optional center from the end
		// Last token should be a number (either center or terms)
		// Second to last could also be a number (terms if center is present)

		const lastToken = tokens[tokens.length - 1];
		const lastNum = parseFloat(lastToken);

		if (isNaN(lastNum)) {
			return null;
		}

		let terms: number;
		let center = 0;
		let exprEndIndex: number;

		// Check if second-to-last is also a number
		if (tokens.length >= 3) {
			const secondLastToken = tokens[tokens.length - 2];
			const secondLastNum = parseFloat(secondLastToken);

			if (!isNaN(secondLastNum) && Number.isInteger(secondLastNum)) {
				// Format: expr terms center
				terms = secondLastNum;
				center = lastNum;
				exprEndIndex = tokens.length - 2;
			} else {
				// Format: expr terms (no center, default to 0)
				if (!Number.isInteger(lastNum)) {
					return null;
				}
				terms = lastNum;
				exprEndIndex = tokens.length - 1;
			}
		} else {
			// Only 2 tokens: expr terms
			if (!Number.isInteger(lastNum)) {
				return null;
			}
			terms = lastNum;
			exprEndIndex = tokens.length - 1;
		}

		// Everything before the numeric args is the expression
		const expression = tokens.slice(0, exprEndIndex).join(' ');

		if (!expression) {
			return null;
		}

		// Try to detect the variable from the expression
		const varName = this.detectVariable(expression);

		return { expression, terms, center, varName };
	}

	/**
	 * Detect the variable name from an expression.
	 * Looks for common patterns like f(x), sin(t), etc.
	 *
	 * @returns The detected variable name or 'x' as default
	 */
	private detectVariable(expression: string): string {
		// Look for function call pattern: name(var)
		const funcMatch = expression.match(/\w+\s*\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\)/);
		if (funcMatch) {
			return funcMatch[1];
		}

		// Look for power/subscript pattern: var^n or var_n
		const varMatch = expression.match(/^([a-zA-Z_][a-zA-Z0-9_]*)/);
		if (varMatch && varMatch[1] !== expression) {
			// Has something after the variable
			return varMatch[1];
		}

		// Default to 'x'
		return 'x';
	}
}
