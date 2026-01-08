/**
 * Integrate Command
 *
 * Integrates mathematical expressions symbolically.
 * Supports specifying the integration variable (defaults to 'x').
 * Can compute definite integrals with bounds.
 *
 * Syntax: .integrate expr [variable] [lower upper]
 * - .integrate x^2          -> x^3/3 (indefinite, var: x)
 * - .integrate x*y^2 y      -> x*y^3/3 (explicit var: y)
 * - .integrate x^2 x 0 1    -> 1/3 (definite integral)
 */

import chalk from 'chalk';
import { BaseCommand, type OptionDefinition } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';
import { parse } from '../core/pipeline';
import { integrate, integrateDefinite, IntegrationError } from '../../integration';
import type {
	IntegrationVerbosity,
	IntegrateResult,
	DefiniteIntegrateResult
} from '../../integration';
import type { MathNode } from '../../types';
import { number } from '../../factory';

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
 * > .integrate x^2 x 0 1
 * ∫₀¹ x^2 dx = 1/3
 *
 * > .integrate -v x^2
 * [Shows step-by-step solution]
 * ```
 */
export class IntegrateCommand extends BaseCommand {
	readonly name = 'integrate';
	readonly aliases = ['int', 'integral'] as const;
	readonly description = 'Integrate expression: .integrate expr [variable] [a b]';
	readonly usage = 'integrate <expression> [variable] [lower upper]';
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
						'No expression to integrate. Usage: .integrate <expression> [variable] [lower upper]'
				}
			};
		}

		// Parse input to extract expression, variable, and optional bounds
		const { expression, variable, bounds } = this.parseInput(input);

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

		try {
			// Determine verbosity from options
			let verbosity: IntegrationVerbosity = 'result';
			if (ctx.options.verbose) {
				verbosity = 'detailed';
			}

			const allowNumeric = Boolean(ctx.options.numeric);

			if (bounds) {
				// Definite integral - create MathNode bounds
				const lowerNode = number(String(bounds.lower));
				const upperNode = number(String(bounds.upper));

				const result = integrateDefinite(parseResult.ast, lowerNode, upperNode, {
					variable,
					verbosity,
					allowNumeric
				});

				return this.formatDefiniteResult(parseResult.ast, variable, bounds, result, verbosity);
			} else {
				// Indefinite integral
				const result = integrate(parseResult.ast, {
					variable,
					verbosity
				});

				return this.formatIndefiniteResult(parseResult.ast, variable, result, verbosity);
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
	 * Parse the input to extract expression, variable, and optional bounds.
	 */
	private parseInput(input: string): {
		expression: string;
		variable: string;
		bounds: { lower: number; upper: number } | null;
	} {
		const trimmed = input.trim();
		const parts = trimmed.split(/\s+/);

		// Check for definite integral: expr var lower upper
		if (parts.length >= 4) {
			const upper = parseFloat(parts[parts.length - 1]);
			const lower = parseFloat(parts[parts.length - 2]);
			const varCandidate = parts[parts.length - 3];

			if (!isNaN(lower) && !isNaN(upper) && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varCandidate)) {
				return {
					expression: parts.slice(0, -3).join(' '),
					variable: varCandidate,
					bounds: { lower, upper }
				};
			}
		}

		// Check for definite integral with default variable: expr lower upper
		if (parts.length >= 3) {
			const upper = parseFloat(parts[parts.length - 1]);
			const lower = parseFloat(parts[parts.length - 2]);

			if (!isNaN(lower) && !isNaN(upper)) {
				return {
					expression: parts.slice(0, -2).join(' '),
					variable: 'x',
					bounds: { lower, upper }
				};
			}
		}

		// Check for indefinite with variable: expr var
		if (parts.length >= 2) {
			const varCandidate = parts[parts.length - 1];
			if (/^[a-zA-Z_]$/.test(varCandidate)) {
				return {
					expression: parts.slice(0, -1).join(' '),
					variable: varCandidate,
					bounds: null
				};
			}
		}

		// Default: entire input is the expression
		return {
			expression: trimmed,
			variable: 'x',
			bounds: null
		};
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
		bounds: { lower: number; upper: number },
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

			return { success: true, output: lines.join('\n'), ast: result.antiderivative ?? undefined };
		} else {
			lines.push(
				chalk.yellow(`∫[${boundStr}] ${exprCustom} d${variable}`) + ' : ' + chalk.red('Non résolu')
			);

			return {
				success: false,
				output: lines.join('\n'),
				error: { code: 'PARSE_ERROR', message: 'Integration not supported for this expression' }
			};
		}
	}
}
