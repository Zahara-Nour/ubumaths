/**
 * Domain Command
 *
 * Computes and displays the domain of definition for mathematical expressions.
 * Uses French interval notation and provides detailed constraint explanations.
 *
 * Syntax: .domain expr[ ; variable]
 * - .domain sqrt(x)        -> [0, +∞[
 * - .domain ln(x) + sqrt(1-x)  -> ]0, 1]
 * - .domain 1/(y-1) ; y    -> explicit var: y
 * - .domain ln(t)          -> en x, avec l'indication « … écris « ; t » »
 *
 * ⚠️ La variable est x, sauf si une autre est donnée après un POINT-VIRGULE —
 * jamais après un espace : `1/(x-1) y` est un produit (voir
 * `core/variable-argument.ts`, décision de David du 2026-10-06).
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { parse } from '../core/pipeline';
import {
	bareFunctionMessage,
	bareFunctionName,
	chosenVariable,
	indexVariables,
	otherVariableHint,
	splitVariableArgument
} from '../core/variable-argument';
import { computeDomain } from '../../domain/compute';
import { formatDomainInterval, formatDomainCondition } from '../../domain/format';
import { toCustom } from '../../custom-generator';

// =============================================================================
// Domain Command
// =============================================================================

/**
 * Domain command - computes the domain of definition for expressions.
 *
 * Parses the input expression and computes its domain with respect to
 * the specified variable (or 'x' by default). Provides detailed output
 * showing:
 * - The expression
 * - Domain constraints with explanations
 * - Final domain in interval notation
 * - Condition notation
 *
 * @example
 * ```
 * > .domain sqrt(x)
 * Expression : sqrt(x)
 * Domaine : [0, +∞[
 * Condition : x >= 0
 *
 * > .domain ln(x) + sqrt(1-x)
 * Expression : ln(x) + sqrt(1-x)
 *
 * Contraintes :
 *   • ln(x) requiert x > 0
 *   • sqrt(1-x) requiert x <= 1
 *
 * Domaine : ]0, 1]
 * Condition : 0 < x <= 1
 * ```
 */
export class DomainCommand extends BaseCommand {
	readonly name = 'domain';
	readonly aliases = ['dom', 'df'] as const;
	readonly description = 'Compute domain of definition: .domain expr[ ; variable]';
	readonly usage = 'domain <expression>[ ; <variable>]';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		const input = ctx.input.trim();

		if (!input) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'Aucune expression fournie. Usage : .domain <expression>[ ; <variable>]'
				}
			};
		}

		// `ln x` sans parenthèses : refusé, jamais lu l·n·x (décision de David)
		const bare = bareFunctionName(input);
		if (bare !== null) {
			return {
				success: false,
				output: '',
				error: { code: 'BARE_FUNCTION', message: bareFunctionMessage(bare) }
			};
		}

		// Variable explicite après un point-virgule, sinon x
		const { expression, variable: explicitVariable } = splitVariableArgument(input);

		// Parse the expression with state-aware parser options
		const parserOptions = ctx.evalState ? { evalState: ctx.evalState } : undefined;
		const parseResult = parse(expression, parserOptions);

		if (parseResult.errors.length > 0 || !parseResult.ast) {
			const errorMsg = parseResult.errors[0]?.message ?? "Erreur d'analyse de l'expression";
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
		// x n'apparaît pas et aucune variable n'est donnée : domaine en x, et on
		// le dit (une indication, pas un refus)
		const hint =
			explicitVariable === null
				? otherVariableHint(indexVariables(parseResult.ast).node, ctx.evalState?.bindings.keys())
				: null;

		try {
			// Compute domain with steps
			const result = computeDomain(parseResult.ast, variable, { showSteps: true });

			// Contrainte non résolue : on refuse plutôt que d'annoncer un domaine faux
			if (result.unresolved && result.unresolved.length > 0) {
				return {
					success: false,
					output: '',
					error: {
						code: 'DOMAIN_UNRESOLVED',
						message: `Je ne sais pas encore déterminer ce domaine (contrainte non résolue : ${result.unresolved[0]}).`
					}
				};
			}

			// Format output
			const exprCustom = toCustom(parseResult.ast);
			const intervalStr = formatDomainInterval(result.domain);
			const conditionStr = formatDomainCondition(result.domain, variable);

			const lines: string[] = [];

			// Expression header
			lines.push(chalk.bold('Expression :') + ' ' + chalk.cyan(exprCustom));
			lines.push('');

			// Show steps if available
			if (result.steps && result.steps.length > 0) {
				lines.push(chalk.bold('Contraintes :'));
				for (const step of result.steps) {
					lines.push(chalk.dim('  • ') + step);
				}
				lines.push('');
			}

			// Final domain
			lines.push(chalk.bold('Domaine :') + ' ' + chalk.green(intervalStr));
			lines.push(chalk.bold('Condition :') + ' ' + chalk.green(conditionStr));
			if (hint !== null) lines.push(hint);

			return {
				success: true,
				output: lines.join('\n'),
				ast: parseResult.ast
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Erreur lors du calcul du domaine';
			return {
				success: false,
				output: '',
				error: { code: 'UNKNOWN_ERROR', message }
			};
		}
	}
}
