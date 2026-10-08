/**
 * Integrate Command
 *
 * Integrates mathematical expressions symbolically.
 * Supports specifying the integration variable (defaults to 'x').
 * Can compute definite integrals with bounds.
 *
 * Syntax: .integrate expr[ ; variable] [lower upper]
 * - .integrate x^2          -> x^3/3 (indefinite, var: x)
 * - .integrate x*y^2 ; y    -> x*y^3/3 (explicit var: y)
 * - .integrate x^2 0 1      -> 1/3 (definite integral)
 * - .integrate t^2 ; t 0 1  -> 1/3 (definite integral, explicit var)
 *
 * ⚠️ La variable est x, sauf si une autre est donnée après un POINT-VIRGULE
 * (voir `core/variable-argument.ts`). Plus de « dernier mot = variable » :
 * `.integrate x^2 y` intégrait en y. Les bornes sont les deux derniers
 * mots, avant ou après `; t` (`t^2 0 1 ; t` = `t^2 ; t 0 1`) : deux nombres,
 * ou un nombre et une lettre (`x^2 0 a` → a³/3, voir `splitIntegralArgument`).
 */

import chalk from 'chalk';
import { BaseCommand, type OptionDefinition } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';
import { parse, type PipelineOptions } from '../core/pipeline';
import { integrate, integrateDefinite, IntegrationError } from '../../integration';
import type {
	IntegrationVerbosity,
	IntegrateResult,
	DefiniteIntegrateResult
} from '../../integration';
import type { MathNode } from '../../types';
import { numericNode } from '../../common/numeric';
import {
	bareFunctionMessage,
	bareFunctionName,
	chosenVariable,
	indexVariables,
	NUMERIC_BOUND,
	otherVariableHint,
	splitIntegralArgument
} from '../core/variable-argument';

/** Ajouter l'indication de variable (`otherVariableHint`) à la fin de la sortie. */
function withHint(result: CommandResult, hint: string | null): CommandResult {
	if (hint === null) return result;
	return { ...result, output: result.output === '' ? hint : `${result.output}\n${hint}` };
}

// =============================================================================
// Integrate Command
// =============================================================================

/**
 * Integrate command - integrates expressions symbolically.
 *
 * Parses the input expression and computes its symbolic integral
 * with respect to the specified variable (or 'x' by default).
 *
 * @example
 * ```
 * > .integrate x^2
 * ∫ x^2 dx = x^3/3 + C
 * LaTeX: \frac{x^{3}}{3}
 *
 * > .integrate sin(x)
 * ∫ sin(x) dx = -cos(x) + C
 *
 * > .integrate x^2 0 1
 * ∫₀¹ x^2 dx = 1/3
 *
 * > .integrate -v x^2
 * [Shows step-by-step solution]
 * ```
 */
export class IntegrateCommand extends BaseCommand {
	readonly name = 'integrate';
	readonly aliases = ['int', 'integral'] as const;
	readonly description = 'Integrate expression: .integrate expr[ ; variable] [a b]';
	readonly usage = 'integrate <expression>[ ; <variable>] [lower upper]';
	readonly requiresAst = false;

	readonly options: readonly OptionDefinition[] = [
		{
			flag: '--verbose',
			description: 'Show detailed integration steps'
		},
		{
			flag: '--numeric',
			description: 'Allow numeric fallback for definite integrals'
		}
	];

	execute(ctx: CommandContext): CommandResult {
		const input = ctx.input.trim();

		if (!input) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message:
						'No expression to integrate. Usage: .integrate <expression>[ ; <variable>] [lower upper]'
				}
			};
		}

		// `sin x` sans parenthèses : refusé, jamais lu s·i·n·x (décision de David)
		const bare = bareFunctionName(input);
		if (bare !== null) {
			return {
				success: false,
				output: '',
				error: { code: 'BARE_FUNCTION', message: bareFunctionMessage(bare) }
			};
		}

		// Parse input to extract expression, variable, and optional bounds
		const { expression, variable: explicitVariable, bounds } = splitIntegralArgument(input);

		// Parse the expression
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

		const chosen = chosenVariable(explicitVariable, parserOptions);
		if (!chosen.ok) {
			return {
				success: false,
				output: '',
				error: { code: 'AMBIGUOUS_VARIABLE', message: chosen.message }
			};
		}
		const variable = chosen.variable;
		// x n'apparaît pas et aucune variable n'est donnée : on intègre en x, et
		// on le dit (décision de David, 2026-10-06 : une indication, pas un refus)
		const hint =
			explicitVariable === null
				? otherVariableHint(indexVariables(parseResult.ast).node, ctx.evalState?.bindings.keys(), {
						bounds: true
					})
				: null;

		try {
			// Determine verbosity from options
			let verbosity: IntegrationVerbosity = 'result';
			if (ctx.options.verbose) {
				verbosity = 'detailed';
			}

			const allowNumeric = Boolean(ctx.options.numeric);

			if (bounds) {
				// Definite integral - create MathNode bounds
				const lowerNode = this.boundNode(bounds.lower, parserOptions);
				const upperNode = this.boundNode(bounds.upper, parserOptions);
				if (lowerNode === null || upperNode === null) {
					return {
						success: false,
						output: '',
						error: { code: 'PARSE_ERROR', message: 'Failed to parse integration bounds' }
					};
				}

				const result = integrateDefinite(parseResult.ast, lowerNode, upperNode, {
					variable,
					verbosity,
					allowNumeric
				});

				return withHint(
					this.formatDefiniteResult(parseResult.ast, variable, bounds, result, verbosity),
					hint
				);
			} else {
				// Indefinite integral
				const result = integrate(parseResult.ast, {
					variable,
					verbosity
				});

				return withHint(
					this.formatIndefiniteResult(parseResult.ast, variable, result, verbosity),
					hint
				);
			}
		} catch (err) {
			if (err instanceof IntegrationError) {
				const message = err.details ? `${err.message}: ${err.details}` : err.message;
				return {
					success: false,
					output: '',
					error: { code: 'PARSE_ERROR', message }
				};
			}

			const message = err instanceof Error ? err.message : 'Unknown error during integration';
			return {
				success: false,
				output: '',
				error: { code: 'UNKNOWN_ERROR', message }
			};
		}
	}

	/**
	 * Une borne : un nombre (`numericNode`, comme avant) ou une lettre, lue par
	 * le même parseur que l'expression (`a` lié par `.let` y est remplacé).
	 */
	private boundNode(text: string, parserOptions: PipelineOptions | undefined): MathNode | null {
		if (NUMERIC_BOUND.test(text)) return numericNode(parseFloat(text));
		const parsed = parse(text, parserOptions);
		return parsed.errors.length > 0 || !parsed.ast ? null : parsed.ast;
	}

	private formatIndefiniteResult(
		expr: MathNode,
		variable: string,
		result: IntegrateResult,
		verbosity: IntegrationVerbosity
	): CommandResult {
		const exprCustom = toCustom(expr);
		const lines: string[] = [];

		if (result.status === 'exact' && result.antiderivative) {
			const resultCustom = toCustom(result.antiderivative);
			const resultLatex = toLatex(result.antiderivative);

			lines.push(
				chalk.bold(`∫ ${exprCustom} d${variable}`) + ' = ' + chalk.cyan(resultCustom) + ' + C'
			);
			lines.push(chalk.dim('LaTeX:') + ' ' + resultLatex);

			if (verbosity !== 'result' && result.steps.length > 0) {
				lines.push('');
				lines.push(chalk.bold('Étapes:'));
				for (const step of result.steps) {
					const before = toCustom(step.before);
					const after = toCustom(step.after);
					lines.push(`  ${step.description}: ${before} → ${after}`);
				}
			}

			return { success: true, output: lines.join('\n'), ast: result.antiderivative };
		} else {
			lines.push(chalk.yellow(`∫ ${exprCustom} d${variable}`) + ' : ' + chalk.red('Non résolu'));
			lines.push(chalk.dim(`Technique tentée: ${result.technique}`));

			return {
				success: false,
				output: lines.join('\n'),
				error: { code: 'PARSE_ERROR', message: 'Integration not supported for this expression' }
			};
		}
	}

	private formatDefiniteResult(
		expr: MathNode,
		variable: string,
		bounds: { lower: string; upper: string },
		result: DefiniteIntegrateResult,
		verbosity: IntegrationVerbosity
	): CommandResult {
		const exprCustom = toCustom(expr);
		const lines: string[] = [];

		const boundStr = `${bounds.lower}→${bounds.upper}`;

		if (result.status === 'exact' || result.status === 'approximate') {
			const numericValue = result.approximate?.toFixed(6) ?? 'N/A';

			if (result.status === 'approximate') {
				lines.push(
					chalk.bold(`∫[${boundStr}] ${exprCustom} d${variable}`) +
						' ≈ ' +
						chalk.cyan(numericValue) +
						chalk.dim(' (numérique)')
				);
			} else {
				const valueCustom = result.value ? toCustom(result.value) : numericValue;
				lines.push(
					chalk.bold(`∫[${boundStr}] ${exprCustom} d${variable}`) + ' = ' + chalk.cyan(valueCustom)
				);
				if (result.approximate !== undefined) {
					lines.push(chalk.dim(`≈ ${result.approximate.toFixed(6)}`));
				}
			}

			if (result.antiderivative) {
				lines.push(chalk.dim('Primitive:') + ' ' + toCustom(result.antiderivative));
			}

			if (verbosity !== 'result' && result.steps.length > 0) {
				lines.push('');
				lines.push(chalk.bold('Étapes:'));
				for (const step of result.steps) {
					const before = toCustom(step.before);
					const after = toCustom(step.after);
					lines.push(`  ${step.description}: ${before} → ${after}`);
				}
			}

			// `ast` porte la VALEUR de l'intégrale (le résultat de la commande,
			// comme pour une primitive) : l'atelier la rend en LaTeX (2026-10-08)
			const valueAst =
				result.value ??
				(result.approximate !== undefined ? numericNode(result.approximate) : undefined);
			return { success: true, output: lines.join('\n'), ast: valueAst };
		} else {
			lines.push(
				chalk.yellow(`∫[${boundStr}] ${exprCustom} d${variable}`) + ' : ' + chalk.red('Non résolu')
			);

			// Le moteur dit POURQUOI (pôle dans [a ; b], #947) : message en
			// français, montré tel quel à l'élève par l'atelier
			if (result.error !== undefined) {
				return {
					success: false,
					output: lines.join('\n'),
					error: { code: 'INTEGRAL_UNDEFINED', message: result.error }
				};
			}

			return {
				success: false,
				output: lines.join('\n'),
				error: { code: 'PARSE_ERROR', message: 'Integration not supported for this expression' }
			};
		}
	}
}
