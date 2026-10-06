/**
 * Diff Command
 *
 * Differentiates mathematical expressions symbolically.
 * Supports specifying the differentiation variable (defaults to 'x').
 *
 * Syntax: .diff expr[, variable]
 * - .diff x^3          -> 3x^2 (default var: x)
 * - .diff x*y^2, y     -> 2xy  (explicit var: y)
 * - .diff t^3          -> 3t^2 (pas de x : la seule variable libre)
 * - .diff f(x)         -> f'(x) or expanded if f is defined
 *
 * ⚠️ La variable explicite se donne après une VIRGULE, jamais après un
 * espace : `x^2 y` est le produit x²y (voir `core/variable-argument.ts`).
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';
import { parse } from '../core/pipeline';
import { differentiate, DifferentiationError } from '../../differentiation';
import { tidyTerms } from '../../tidy/terms';
import { variable as variableNode } from '../../factory';
import {
	defaultVariable,
	indexVariables,
	splitVariableArgument,
	variableNameOf
} from '../core/variable-argument';

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
 * > .diff x*y^2, y
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
	readonly description = 'Differentiate expression: .diff expr[, variable]';
	readonly usage = 'diff <expression>[, <variable>]';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		const input = ctx.input.trim();

		if (!input) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'No expression to differentiate. Usage: .diff <expression>[, <variable>]'
				}
			};
		}

		// Variable explicite après une virgule, sinon déduite de l'expression
		const { expression, variable: explicitVariable } = splitVariableArgument(input);

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

		// Variables indicées (`x_1`) réécrites en variables simples le temps du
		// calcul : la dérivation traite un indice en constante
		const indexed = indexVariables(parseResult.ast);

		let variable: string;
		if (explicitVariable !== null) {
			// La variable est lue par le MÊME parseur que l'expression : `x_1`
			// tapé doit donner le même nom que le `x_1` de l'expression
			const parsedVariable = parse(explicitVariable, parserOptions).ast;
			const name = parsedVariable === undefined ? null : variableNameOf(parsedVariable);
			if (name === null) {
				return {
					success: false,
					output: '',
					error: {
						code: 'AMBIGUOUS_VARIABLE',
						message: `« ${explicitVariable} » n'est pas une variable.`
					}
				};
			}
			variable = name;
		} else {
			const found = defaultVariable(indexed.node, ctx.evalState?.bindings.keys());
			if (!found.ok) {
				const example = `${expression}, ${found.candidates[found.candidates.length - 1]}`;
				return {
					success: false,
					output: '',
					error: {
						// Message pour l'élève, en français : l'atelier le montre tel quel
						code: 'AMBIGUOUS_VARIABLE',
						message: `Plusieurs variables possibles (${found.candidates.join(', ')}) : précise laquelle après une virgule, par exemple « ${example} ».`
					}
				};
			}
			variable = found.variable;
		}
		const variableLabel = toCustom(indexed.restore(variableNode(variable)));

		try {
			// Get function bindings from state if available
			const functions = ctx.evalState?.functions;

			// Dérivée mise au propre comme dans l'atelier : la dérivée brute
			// s'écrivait `e^{3x} 3`, `2(−e^{−x})`, `cos x + (−sin x)`. `tidyTerms`
			// garde l'ordre de la règle (u′v + uv′).
			const derivative = tidyTerms(
				indexed.restore(
					differentiate(indexed.node, {
						variable,
						simplify: true,
						functions
					})
				)
			);

			// Format output
			const exprCustom = toCustom(parseResult.ast);
			const derivCustom = toCustom(derivative);
			const derivLatex = toLatex(derivative);

			const output = [
				chalk.bold(`d/d${variableLabel}(${exprCustom})`) + ' = ' + chalk.cyan(derivCustom),
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
}
