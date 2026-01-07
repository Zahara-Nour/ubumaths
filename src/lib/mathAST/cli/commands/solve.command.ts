/**
 * Solve Command
 *
 * Solves equations symbolically with step-by-step solutions.
 * Supports linear, quadratic, and transcendental equations.
 *
 * Syntax: .solve equation [variable]
 * - .solve 2x + 4 = 0        -> x = -2
 * - .solve x^2 - 4x + 3 = 0  -> x = 1, x = 3
 * - .solve ln(x) = 0         -> x = 1
 *
 * Options:
 * - --verbose or -v: Show detailed steps
 * - --quiet or -q: Show only result
 */

import chalk from 'chalk';
import { BaseCommand, type OptionDefinition } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';
import { parse } from '../core/pipeline';
import { solve, type SolvingVerbosity, SolveError } from '../../solve';
import { isRelation } from '../../guards';

// =============================================================================
// Solve Command
// =============================================================================

/**
 * Solve command - solves equations symbolically.
 *
 * Parses the input equation and computes its solutions
 * with step-by-step explanations in French.
 *
 * @example
 * ```
 * > .solve 2x + 4 = 0
 * Equation lineaire: 2x + 4 = 0
 * Solution: x = -2
 *
 * > .solve x^2 - 5x + 6 = 0 --verbose
 * Equation quadratique: x^2 - 5x + 6 = 0
 * Coefficients: a = 1, b = -5, c = 6
 * Discriminant: Delta = 25 - 24 = 1 > 0
 * Deux solutions reelles distinctes
 * x_1 = (5 - 1) / 2 = 2
 * x_2 = (5 + 1) / 2 = 3
 * ```
 */
export class SolveCommand extends BaseCommand {
	readonly name = 'solve';
	readonly aliases = ['s', 'resoudre'] as const;
	readonly description = 'Solve equation: .solve equation [variable] [--verbose|-v] [--quiet|-q]';
	readonly usage = 'solve <equation> [variable] [options]';
	readonly requiresAst = false;

	override getOptionDefinitions(): readonly OptionDefinition[] {
		return [
			{ flag: '--verbose', description: 'Show detailed steps' },
			{ flag: '-v', description: 'Short for --verbose' },
			{ flag: '--quiet', description: 'Show only the result' },
			{ flag: '-q', description: 'Short for --quiet' }
		];
	}

	execute(ctx: CommandContext): CommandResult {
		const { input, verbosity } = this.parseOptions(ctx);

		if (!input) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'No equation to solve. Usage: .solve <equation> [variable]'
				}
			};
		}

		// Parse input to extract equation and optional variable
		const { expression, variable } = this.parseInput(input);

		// Parse the expression with state-aware parser options
		const parserOptions = ctx.evalState ? { evalState: ctx.evalState } : undefined;
		const parseResult = parse(expression, parserOptions);

		if (parseResult.errors.length > 0 || !parseResult.ast) {
			const errorMsg = parseResult.errors[0]?.message ?? 'Failed to parse equation';
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message: errorMsg }
			};
		}

		// Verify it's an equation (relation with =)
		if (!isRelation(parseResult.ast) || parseResult.ast.relation !== '=') {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: "L'entree doit etre une equation (ex: 2x + 3 = 0)"
				}
			};
		}

		try {
			// Solve the equation
			const result = solve(parseResult.ast, {
				variable: variable || undefined,
				verbosity
			});

			// Format output
			const output = this.formatOutput(parseResult.ast, result, verbosity);

			return {
				success: true,
				output,
				ast: result.solutions[0]?.value
			};
		} catch (err) {
			if (err instanceof SolveError) {
				const message = err.details ? `${err.message}: ${err.details}` : err.message;
				return {
					success: false,
					output: '',
					error: { code: 'PARSE_ERROR', message }
				};
			}

			const message = err instanceof Error ? err.message : 'Erreur inconnue lors de la resolution';
			return {
				success: false,
				output: '',
				error: { code: 'UNKNOWN_ERROR', message }
			};
		}
	}

	/**
	 * Parse options from context.
	 */
	private parseOptions(ctx: CommandContext): { input: string; verbosity: SolvingVerbosity } {
		let input = ctx.input.trim();
		let verbosity: SolvingVerbosity = 'summarized';

		// Check for verbose flag
		if (
			ctx.options['verbose'] ||
			ctx.options['v'] ||
			input.includes('--verbose') ||
			input.includes('-v')
		) {
			verbosity = 'detailed';
			input = input.replace(/--verbose|-v/g, '').trim();
		}

		// Check for quiet flag
		if (
			ctx.options['quiet'] ||
			ctx.options['q'] ||
			input.includes('--quiet') ||
			input.includes('-q')
		) {
			verbosity = 'result';
			input = input.replace(/--quiet|-q/g, '').trim();
		}

		return { input, verbosity };
	}

	/**
	 * Parse the input to extract equation and optional variable.
	 */
	private parseInput(input: string): { expression: string; variable: string | null } {
		const trimmed = input.trim();

		// Try to find a trailing variable after the equation
		// Match pattern: equation = ... [variable]
		const match = trimmed.match(/^(.+=.+?)\s+([a-zA-Z_][a-zA-Z0-9_]*)$/);

		if (match) {
			const [, expr, varCandidate] = match;
			// Only treat as variable if it's a simple identifier
			if (expr.trim() && /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(varCandidate)) {
				return {
					expression: expr.trim(),
					variable: varCandidate
				};
			}
		}

		// Default: entire input is the equation, variable auto-detected
		return {
			expression: trimmed,
			variable: null
		};
	}

	/**
	 * Format the output based on solve result and verbosity.
	 */
	private formatOutput(
		equation: import('../../types').MathNode,
		result: import('../../solve').SolveResult,
		verbosity: SolvingVerbosity
	): string {
		const lines: string[] = [];
		const eqCustom = toCustom(equation);

		// Header with equation type
		const typeLabels: Record<string, string> = {
			linear: 'lineaire',
			quadratic: 'quadratique',
			polynomial: 'polynomiale',
			exponential: 'exponentielle',
			logarithmic: 'logarithmique',
			trigonometric: 'trigonometrique',
			mixed: 'mixte',
			constant: 'constante',
			unknown: 'inconnue'
		};

		const typeLabel = typeLabels[result.equationType] ?? result.equationType;

		if (verbosity !== 'result') {
			lines.push(chalk.bold(`Equation ${typeLabel}: `) + chalk.cyan(eqCustom));
		}

		// Show steps if not quiet mode
		if (verbosity === 'detailed' && result.steps.length > 0) {
			lines.push('');
			lines.push(chalk.dim('--- Etapes ---'));
			for (const step of result.steps) {
				lines.push(chalk.yellow(`[${step.rule}]`) + ' ' + step.description);
			}
			lines.push(chalk.dim('--- Fin des etapes ---'));
		}

		// Show result
		lines.push('');

		switch (result.status) {
			case 'unique':
			case 'multiple': {
				const solutionLabel = result.solutions.length === 1 ? 'Solution' : 'Solutions';
				const solutionList = result.solutions
					.map((sol) => {
						const valueStr = toCustom(sol.value);
						const approxStr =
							sol.approximate !== undefined ? ` ≈ ${sol.approximate.toPrecision(6)}` : '';
						return `${result.variable} = ${valueStr}${approxStr}`;
					})
					.join(', ');

				lines.push(chalk.green(`${solutionLabel}: ${solutionList}`));

				// LaTeX for each solution
				if (verbosity !== 'result') {
					const latexSolutions = result.solutions.map((sol) => toLatex(sol.value)).join(', ');
					lines.push(chalk.dim('LaTeX: ') + `${result.variable} = ${latexSolutions}`);
				}
				break;
			}

			case 'infinite':
				lines.push(chalk.blue('Solutions infinies: toute valeur est solution'));
				break;

			case 'no-solution':
				lines.push(chalk.red("Pas de solution: l'equation est contradictoire"));
				break;

			case 'no-real-solution':
				lines.push(chalk.red('Pas de solution reelle'));
				break;

			default:
				if (result.error) {
					lines.push(chalk.red(`Erreur: ${result.error}`));
				} else {
					lines.push(chalk.yellow('Resolution non supportee'));
				}
		}

		return lines.join('\n');
	}
}
