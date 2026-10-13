/**
 * Eval Command
 *
 * Evaluates a mathematical expression with variable substitution
 * and displays the numeric result.
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult, ErrorCode } from '../types';
import { toCustom } from '../../index';
import { toLatex } from '../../latex-generator';
import { evaluate, substitute } from '../../eval';
import { forbiddenValue, FORBIDDEN_REASON_TEXT } from '../../eval/forbidden-value';
import { hasDecimalLiteral } from '../../tidy/decimal';
import { tidy } from '../../tidy';
import {
	approximateDigitsOf,
	approximateLatexOf,
	approximationLatex,
	approximationNode,
	isWrittenNumber
} from '../approximation';
import { bindingsToRecord } from '../core/eval-state';
import { parse } from '../core/pipeline';
import { readCommandArguments } from '../core/variable-argument';
import type { MathNode } from '../../types';
import { getVariables } from '../../eval/substitute';

// =============================================================================
// Constantes
// =============================================================================

/** Une valeur interdite (dénominateur nul, racine d'un négatif…) : refus en français. */
export const VALUE_FORBIDDEN = 'VALUE_FORBIDDEN' satisfies ErrorCode;

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
		// La lettre et la valeur tapées après `en`, pour nommer une valeur interdite
		let typedAssignment: { readonly name: string; readonly value: MathNode } | null = null;
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
			// Ce qui ne se calculerait pas : refus clairs, en français (revue #962)
			const bound = ctx.evalState?.bindings;
			const free = (node: MathNode): string[] =>
				[...getVariables(node)].filter((name) => !(bound?.has(name) ?? false)).sort();
			const fail = (message: string): CommandResult => ({
				success: false,
				output: '',
				error: { code: 'COMMAND_SYNTAX', message }
			});
			// Sans état (hors REPL) : l'erreur INVALID_OPTIONS plus bas
			const letters = ast === undefined || !ctx.evalState ? [] : free(ast);
			const written = reading.args.expression;
			if (assignment === null) {
				if (letters.length > 0) {
					return fail(`Il manque la valeur : .évaluer ${written} en ${letters[0]}=3, par exemple.`);
				}
			} else if (ctx.evalState && ast !== undefined && value?.ast !== undefined) {
				if (!letters.includes(assignment.name)) {
					return fail(`« ${assignment.name} » n'apparaît pas dans ${written}.`);
				}
				if (free(value.ast).length > 0) {
					return fail(
						`La valeur de ${assignment.name} doit être un nombre, pas « ${assignment.value} ».`
					);
				}
				const rest = letters.filter((name) => name !== assignment.name);
				if (rest.length > 0) {
					return fail(
						`Il reste ${rest.length === 1 ? 'une lettre' : 'des lettres'} sans valeur : ${rest.join(', ')}. On ne remplace qu’une lettre à la fois.`
					);
				}
				assigned = { [assignment.name]: value.ast };
				typedAssignment = { name: assignment.name, value: value.ast };
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

			// Une valeur interdite : refus en français, AVANT le calcul — sinon
			// `\sqrt{-1}` et `\ln 0` passaient pour des résultats, et un
			// dénominateur nul pour une erreur de lecture (2026-10-14)
			const forbidden = forbiddenValue(substituted);
			if (forbidden !== null) {
				const reason = FORBIDDEN_REASON_TEXT[forbidden];
				const message =
					typedAssignment === null
						? `Ce calcul n'a pas de valeur : ${reason}.`
						: `$${typedAssignment.name} = ${toLatex(typedAssignment.value)}$ est une valeur interdite : ${reason}.`;
				return {
					success: false,
					output: '',
					error: { code: VALUE_FORBIDDEN, message }
				};
			}

			// Evaluate using current mode
			const result = evaluate(substituted, { mode: ctx.evalState.mode });

			// Boolean result: colored output, no mode/exact info
			if (result.status === 'value' && result.node.type === 'boolean') {
				const boolValue = result.value as boolean;
				const colorFn = boolValue ? chalk.green : chalk.red;
				return {
					success: true,
					output: chalk.bold('Result:') + ' ' + colorFn.bold(String(boolValue)),
					ast: result.node,
					latex: boolValue ? '\\text{vrai}' : '\\text{faux}'
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
				...displayedValue(substituted, result.node, ctx.evalState.mode === 'decimal')
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

// =============================================================================
// La valeur écrite
// =============================================================================

/**
 * La valeur que montre une interface (l'atelier, `/calc`) : son LaTeX, son
 * arbre, et la valeur approchée du bouton ≈.
 *
 * E5 (décision de David, 2026-10-14) : une saisie décimale — la valeur tapée,
 * l'expression ou une variable posée — donne une réponse décimale (`en x=1.5`
 * → 2.25), comme le mode décimal ; une saisie exacte, une réponse exacte. La
 * règle d'écriture est celle du bouton ≈ (`approximation.ts`) : 4 décimales,
 * `\approx` seulement si c'est arrondi.
 */
function displayedValue(
	substituted: MathNode,
	computed: MathNode,
	decimalMode: boolean
): { ast: MathNode; latex?: string; approximateLatex?: string } {
	const exact = decimalMode ? evaluate(substituted, { mode: 'exact' }) : null;
	const exactNode = exact === null ? computed : exact.status === 'value' ? exact.node : null;
	if (exactNode === null) return { ast: computed };
	const digits = approximateDigitsOf(exactNode);
	if ((decimalMode || hasDecimalLiteral(substituted)) && digits !== null) {
		const written = approximationLatex(digits);
		return {
			ast: approximationNode(digits),
			latex: digits.exact ? written : `\\approx ${written}`
		};
	}
	const readable = readableExact(exactNode);
	return {
		ast: readable,
		latex: toLatex(readable),
		...(digits !== null &&
			!isWrittenNumber(exactNode) && {
				approximateLatex: approximateLatexOf(digits)
			})
	};
}

/**
 * Un résultat exact mis au propre (π/3, √2/2), comme la ligne d'un calcul
 * (`readableExact` de `web-repl-engine.ts`) : sans variable ni décimal, que
 * `tidy` simplifierait ou réécrirait en fraction.
 */
function readableExact(node: MathNode): MathNode {
	if (hasDecimalLiteral(node)) return node;
	try {
		return tidy(node);
	} catch {
		return node;
	}
}
