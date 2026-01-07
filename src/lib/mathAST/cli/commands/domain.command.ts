/**
 * Domain Command
 *
 * Computes and displays the domain of definition for mathematical expressions.
 * Uses French interval notation and provides detailed constraint explanations.
 *
 * Syntax: .domain expr [variable]
 * - .domain sqrt(x)        -> [0, +∞[
 * - .domain ln(x) + sqrt(1-x)  -> ]0, 1]
 * - .domain 1/(x-1) y      -> explicit var: y
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { parse } from '../core/pipeline';
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
	readonly description = 'Compute domain of definition: .domain expr [variable]';
	readonly usage = 'domain <expression> [variable]';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		const input = ctx.input.trim();

		if (!input) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'Aucune expression fournie. Usage : .domain <expression> [variable]'
				}
			};
		}

		// Parse input to extract expression and optional variable
		const { expression, variable } = this.parseInput(input);

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

		try {
			// Compute domain with steps
			const result = computeDomain(parseResult.ast, variable, { showSteps: true });

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

	/**
	 * Parse the input to extract expression and optional variable.
	 *
	 * Strategy: If the last token is a single word that looks like a variable
	 * (single letter or valid identifier) and there's more before it,
	 * treat it as the domain variable.
	 *
	 * Examples:
	 * - "sqrt(x)" -> { expression: "sqrt(x)", variable: "x" }
	 * - "x^3 y" -> { expression: "x^3", variable: "y" }
	 * - "1/(y-1) y" -> { expression: "1/(y-1)", variable: "y" }
	 */
	private parseInput(input: string): { expression: string; variable: string } {
		const trimmed = input.trim();

		// Try to find a trailing variable (single word at the end after whitespace)
		const match = trimmed.match(/^(.+?)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);

		if (match) {
			const [, expr, varCandidate] = match;
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
