/**
 * Taylor Command
 *
 * Computes Taylor series expansion of mathematical expressions.
 * Supports specifying the order and center point.
 *
 * Syntax: .taylor expr order [center][ ; variable]
 *
 * ⚠️ `order` est l'ORDRE du développement — le degré maximal —, convention des
 * développements limités (décision de David du 2026-10-06). Ce n'était pas le
 * cas avant : c'était un nombre de termes (degrés 0 à n−1).
 *
 * - .taylor sin(x) 5 0     -> x - x^3/6 + x^5/120 (ordre 5 en 0)
 * - .taylor exp(x) 4 0     -> 1 + x + x^2/2 + x^3/6 + x^4/24 (ordre 4 en 0)
 * - .taylor ln(x) 3 1      -> Taylor of ln(x) at x=1, order 3
 * - .taylor f 2 0          -> Taylor of f(x) at x=0, if f is defined
 * - .taylor exp(t) 4 ; t   -> en t (= .taylor exp(t) ; t 4)
 *
 * ⚠️ La variable est x, sauf si une autre est donnée après un POINT-VIRGULE
 * (voir `core/variable-argument.ts`, décision de David du 2026-10-06). Plus de
 * variable devinée dans l'expression (`sin(t)` donnait t). L'ordre et le point
 * se placent avant ou après `; t`, comme les bornes de `.integrate`.
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';
import { parse } from '../core/pipeline';
import {
	bareFunctionMessage,
	bareFunctionName,
	chosenVariable,
	indexVariables,
	otherVariableHint,
	splitTaylorArgument,
	TAYLOR_SHORTCUT_FUNCTIONS
} from '../core/variable-argument';
import { taylorExpand, TaylorError, MAX_TAYLOR_ORDER } from '../../taylor';
import { getVariables } from '../../eval/substitute';

// =============================================================================
// Taylor Command
// =============================================================================

/**
 * Taylor command - computes Taylor series expansions.
 *
 * The command parses the input to extract the expression, the order (highest
 * degree), and optional center point. It then computes the Taylor polynomial.
 *
 * If the expression is a single function name (like 'f' or 'sin') that matches
 * a defined function in the state, it treats it as f(x) with default variable.
 *
 * @example
 * ```
 * > .taylor sin(x) 5 0
 * Taylor series of sin(x) at x=0, order 5:
 * x - x^3/6 + x^5/120
 * LaTeX: x - \frac{x^{3}}{6} + \frac{x^{5}}{120}
 *
 * > .taylor exp(x) 3
 * Taylor series of exp(x) at x=0, order 3:
 * 1 + x + x^2/2 + x^3/6
 *
 * > .def f(x) = x^2
 * > .taylor f 2
 * Taylor series of f(x) at x=0, order 2:
 * x^2
 * ```
 */
export class TaylorCommand extends BaseCommand {
	readonly name = 'taylor';
	readonly aliases = ['tay', 'series'] as const;
	readonly description = 'Compute Taylor series: .taylor expr order [center][ ; variable]';
	readonly usage = 'taylor <expression> <order> [center][ ; <variable>]';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		const input = ctx.input.trim();

		if (!input) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message:
						'No expression provided. Usage: .taylor <expression> <order> [center][ ; <variable>]'
				}
			};
		}

		// Expression, variable après `;`, ordre et point (avant ou après `; t`)
		const { expression, variable: explicitVariable, order, center } = splitTaylorArgument(input);

		if (order === null || expression === '') {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message:
						'Invalid syntax. Usage: .taylor <expression> <order> [center][ ; <variable>]\n' +
						'Example: .taylor sin(x) 5 0'
				}
			};
		}

		const parserOptions = ctx.evalState ? { evalState: ctx.evalState } : undefined;
		const chosen = chosenVariable(explicitVariable, parserOptions);
		if (!chosen.ok) {
			return {
				success: false,
				output: '',
				error: { code: 'AMBIGUOUS_VARIABLE', message: chosen.message }
			};
		}
		const varName = chosen.variable;

		// L'ordre est un entier ≥ 0 (la lecture n'accepte que des chiffres) :
		// seule la borne haute est à vérifier. Message pour l'élève, en français.
		if (order > MAX_TAYLOR_ORDER) {
			return {
				success: false,
				output: '',
				error: {
					code: 'TAYLOR_ORDER',
					message: `L’ordre du développement ne peut pas dépasser ${MAX_TAYLOR_ORDER}.`
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
			} else if (TAYLOR_SHORTCUT_FUNCTIONS.has(funcName)) {
				// Built-in function without argument
				exprToParse = `${funcName}(${varName})`;
			}
		}

		// `sin x` sans parenthèses : refusé, jamais lu s·i·n·x (décision de
		// David). Testé APRÈS le raccourci : le nom seul (`sin 5`) reste accepté.
		const bare = bareFunctionName(exprToParse);
		if (bare !== null) {
			return {
				success: false,
				output: '',
				error: { code: 'BARE_FUNCTION', message: bareFunctionMessage(bare) }
			};
		}

		// Parse the expression with state-aware parser options
		const parseResult = parse(exprToParse, parserOptions);

		if (parseResult.errors.length > 0 || !parseResult.ast) {
			const errorMsg = parseResult.errors[0]?.message ?? 'Failed to parse expression';
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message: errorMsg }
			};
		}

		// x n'apparaît pas et aucune variable n'est donnée : développement en x,
		// et on le dit (une indication, pas un refus)
		const hint =
			explicitVariable === null
				? otherVariableHint(indexVariables(parseResult.ast).node, ctx.evalState?.bindings.keys(), {
						taylor: true
					})
				: null;

		try {
			// Get function bindings from state if available
			const functions = ctx.evalState?.functions;

			// Compute Taylor series. Rien ne dépend de la variable (`exp(t) 4`,
			// calculé en x) : le développement est l'expression elle-même — comme
			// `.diff t^2` répond 0 —, là où `taylorExpand` échouait sur la
			// lettre libre
			const taylor = getVariables(parseResult.ast).has(varName)
				? taylorExpand(
						parseResult.ast,
						{
							variable: varName,
							center,
							order
						},
						functions
					)
				: parseResult.ast;

			// Format output
			const exprCustom = toCustom(parseResult.ast);
			const taylorCustom = toCustom(taylor);
			const taylorLatex = toLatex(taylor);

			const centerDesc = center === 0 ? `${varName}=0 (Maclaurin)` : `${varName}=${center}`;

			const output = [
				chalk.bold(`Taylor series of ${exprCustom} at ${centerDesc}, order ${order}:`),
				chalk.cyan(taylorCustom),
				chalk.dim('LaTeX:') + ' ' + taylorLatex,
				...(hint === null ? [] : [hint])
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
}
