/**
 * Variations Command
 *
 * Computes and displays the variation study for mathematical expressions.
 * Analyzes the monotonicity (increase/decrease) of functions by:
 * 1. Computing the derivative
 * 2. Finding critical points
 * 3. Analyzing the sign of the derivative
 * 4. Determining intervals of increase/decrease
 * 5. Finding local and global extrema
 *
 * Syntax: .variations expr [variable]
 *
 * Examples:
 *   .variations x^2           -> Study of x^2 (variable x)
 *   .variations x^3 - 3x      -> Study of x^3 - 3x
 *   .variations exp(x)        -> Study of exp(x)
 *   .variations t^2 + 2t t    -> Study with variable t
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { parse } from '../core/pipeline';
import { computeVariations } from '../../variations/compute';
import { getDerivativeSignSymbol } from '../../variations/format';
import { toCustom } from '../../custom-generator';
import { formatInterval } from '../../domain/format';
import { endpointToNumber } from '$lib/math/intervals/endpoint';
import type { Interval } from '$lib/math/intervals/types';
import type { Domain } from '../../domain/types';
import type { MathNode } from '../../types';
import type {
	CriticalPointInfo,
	MonotonicInterval,
	ExtremumInfo,
	ExtremumType,
	BoundaryLimit,
	LimitValue,
	Monotonicity
} from '../../variations/types';

// =============================================================================
// Variations Command
// =============================================================================

/**
 * Variations command - computes the variation study for expressions.
 *
 * Parses the input expression and computes its variation study with respect
 * to the specified variable (or 'x' by default). Provides detailed output
 * showing:
 * - The expression and its derivative
 * - Domain of definition
 * - Critical points
 * - Sign of derivative and monotonicity
 * - Local and global extrema
 * - Boundary limits (optional)
 *
 * @example
 * ```
 * > .variations x^2
 * Expression : x^2
 * Derivee : f'(x) = 2x
 *
 * Domaine : R (tous les reels)
 *
 * Points critiques :
 *   x = 0 (f'=0)
 *
 * Signe de f'(x) :
 *   ]-inf, 0[ : -  (f decroissante)
 *   {0}       : 0  (f constante)
 *   ]0, +inf[ : +  (f croissante)
 *
 * Extrema :
 *   Minimum global : f(0) = 0
 *
 * > .variations x^3 - 3x
 * Expression : x^3 - 3x
 * Derivee : f'(x) = 3x^2 - 3
 *
 * Domaine : R (tous les reels)
 *
 * Points critiques :
 *   x = -1 (f'=0)
 *   x = 1 (f'=0)
 *
 * Signe de f'(x) :
 *   ]-inf, -1[ : +  (f croissante)
 *   {-1}       : 0  (f constante)
 *   ]-1, 1[    : -  (f decroissante)
 *   {1}        : 0  (f constante)
 *   ]1, +inf[  : +  (f croissante)
 *
 * Extrema :
 *   Maximum local : f(-1) = 2
 *   Minimum local : f(1) = -2
 * ```
 */
export class VariationsCommand extends BaseCommand {
	readonly name = 'variations';
	readonly aliases = ['var', 'monotone', 'etude'] as const;
	readonly description = "Etude des variations d'une expression : .variations expr [variable]";
	readonly usage = 'variations <expression> [variable]';
	readonly requiresAst = false;

	execute(ctx: CommandContext): CommandResult {
		const input = ctx.input.trim();

		if (!input) {
			return {
				success: false,
				output: '',
				error: {
					code: 'PARSE_ERROR',
					message: 'Aucune expression fournie. Usage : .variations <expression> [variable]'
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
			// Compute variations
			const result = computeVariations(parseResult.ast, {
				variable,
				verbosity: 'summarized',
				includeBoundaryLimits: true
			});

			// Format output with colors
			const lines: string[] = [];

			// Expression header
			lines.push(chalk.bold('Expression :') + ' ' + chalk.cyan(toCustom(result.expression)));
			lines.push(
				chalk.bold('Derivee :') + ` f'(${variable}) = ` + chalk.cyan(toCustom(result.derivative))
			);
			lines.push('');

			// Domain
			const domainStr = this.formatDomain(result.domain);
			lines.push(chalk.bold('Domaine :') + ' ' + chalk.green(domainStr));
			lines.push('');

			// Critical points
			lines.push(this.formatCriticalPointsColored(result.criticalPoints, variable));
			lines.push('');

			// Sign of derivative and monotonicity
			lines.push(this.formatMonotonicIntervalsColored(result.monotonicIntervals, variable));
			lines.push('');

			// Extrema
			lines.push(this.formatExtremaColored(result.extrema));

			// Boundary limits (if available)
			if (result.boundaryLimits && result.boundaryLimits.length > 0) {
				lines.push('');
				lines.push(this.formatBoundaryLimitsColored(result.boundaryLimits, variable));
			}

			// Warnings
			if (result.warnings && result.warnings.length > 0) {
				lines.push('');
				lines.push(chalk.yellow('Avertissements :'));
				for (const warning of result.warnings) {
					lines.push(chalk.yellow('  ! ' + warning));
				}
			}

			return {
				success: true,
				output: lines.join('\n'),
				ast: parseResult.ast
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : "Erreur lors de l'etude des variations";
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
	 * - "x^2" -> { expression: "x^2", variable: "x" }
	 * - "x^3 - 3x" -> { expression: "x^3 - 3x", variable: "x" }
	 * - "t^2 + 2t t" -> { expression: "t^2 + 2t", variable: "t" }
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

	/**
	 * Format domain for display.
	 */
	private formatDomain(domain: Domain): string {
		switch (domain.kind) {
			case 'empty':
				return 'ensemble vide';
			case 'universal':
				return 'R (tous les reels)';
			default:
				return formatInterval(domain);
		}
	}

	/**
	 * Format critical points with colors.
	 */
	private formatCriticalPointsColored(
		points: readonly CriticalPointInfo[],
		variable: string
	): string {
		if (points.length === 0) {
			return chalk.bold('Points critiques :') + ' ' + chalk.dim('aucun');
		}

		const lines: string[] = [];
		lines.push(chalk.bold('Points critiques :'));

		for (const point of points) {
			const xStr = toCustom(point.x);
			const nature =
				point.nature === 'derivative_zero' ? chalk.dim("(f'=0)") : chalk.dim("(f' non definie)");
			lines.push(`  ${variable} = ${chalk.yellow(xStr)} ${nature}`);
		}

		return lines.join('\n');
	}

	/**
	 * Format monotonic intervals with colors.
	 */
	private formatMonotonicIntervalsColored(
		intervals: readonly MonotonicInterval[],
		variable: string
	): string {
		if (intervals.length === 0) {
			return chalk.bold(`Signe de f'(${variable}) :`) + ' ' + chalk.dim('indetermine');
		}

		const lines: string[] = [];
		lines.push(chalk.bold(`Signe de f'(${variable}) :`));

		// Calculate max interval width for alignment
		const intervalStrs = intervals.map((mi) => this.formatSingleInterval(mi.interval));
		const maxWidth = Math.max(...intervalStrs.map((s) => s.length));

		for (let i = 0; i < intervals.length; i++) {
			const mi = intervals[i];
			const intervalStr = intervalStrs[i].padEnd(maxWidth);
			const signStr = getDerivativeSignSymbol(mi.derivativeSign);
			const signColored = this.colorSign(signStr);
			const monotonicityDesc = this.getMonotonicityShortDescription(mi.monotonicity);
			const monoColored = this.colorMonotonicity(mi.monotonicity, monotonicityDesc);
			lines.push(`  ${chalk.cyan(intervalStr)} : ${signColored}  ${monoColored}`);
		}

		return lines.join('\n');
	}

	/**
	 * Format extrema with colors.
	 */
	private formatExtremaColored(extrema: readonly ExtremumInfo[]): string {
		if (extrema.length === 0) {
			return chalk.bold('Extrema :') + ' ' + chalk.dim('aucun');
		}

		const lines: string[] = [];
		lines.push(chalk.bold('Extrema :'));

		for (const ext of extrema) {
			const typeStr = this.getExtremumTypeFr(ext.type);
			const xStr = toCustom(ext.x);
			const yStr = toCustom(ext.y);
			const isGlobal = ext.type.includes('global');
			const isMin = ext.type.includes('minimum');

			const typeColored = isGlobal ? chalk.bold(typeStr) : typeStr;
			const valueColored = isMin ? chalk.blue(yStr) : chalk.magenta(yStr);

			lines.push(`  ${typeColored} : f(${chalk.yellow(xStr)}) = ${valueColored}`);
		}

		return lines.join('\n');
	}

	/**
	 * Format boundary limits with colors.
	 */
	private formatBoundaryLimitsColored(limits: readonly BoundaryLimit[], variable: string): string {
		if (limits.length === 0) {
			return '';
		}

		const lines: string[] = [];
		lines.push(chalk.bold('Limites aux bornes :'));

		for (const bl of limits) {
			const pointStr = toCustom(bl.point);
			const limitStr = this.formatLimitValue(bl.limit);
			const dirStr = bl.direction === 'left' ? '^-' : bl.direction === 'right' ? '^+' : '';
			lines.push(
				`  lim_{${variable} -> ${chalk.yellow(pointStr)}${dirStr}} f(${variable}) = ${chalk.cyan(limitStr)}`
			);
		}

		return lines.join('\n');
	}

	/**
	 * Format a single interval.
	 */
	private formatSingleInterval(interval: Interval): string {
		const lowerNum = endpointToNumber(interval.lower.value);
		const upperNum = endpointToNumber(interval.upper.value);

		// Check for point interval
		if (
			Number.isFinite(lowerNum) &&
			Number.isFinite(upperNum) &&
			Math.abs(lowerNum - upperNum) < 1e-10 &&
			interval.lower.type === 'closed' &&
			interval.upper.type === 'closed'
		) {
			return `{${this.formatEndpointValue(interval.lower.value)}}`;
		}

		const lowerBracket = interval.lower.type === 'closed' ? '[' : ']';
		const upperBracket = interval.upper.type === 'closed' ? ']' : '[';
		const lowerStr = this.formatEndpointValue(interval.lower.value);
		const upperStr = this.formatEndpointValue(interval.upper.value);

		return `${lowerBracket}${lowerStr}, ${upperStr}${upperBracket}`;
	}

	/**
	 * Format an endpoint value.
	 */
	private formatEndpointValue(value: MathNode): string {
		if (value.type === 'infinity') {
			return value.sign === 'positive' ? '+inf' : '-inf';
		}
		return toCustom(value);
	}

	/**
	 * Color a sign symbol.
	 */
	private colorSign(sign: string): string {
		switch (sign) {
			case '+':
				return chalk.green('+');
			case '-':
				return chalk.red('-');
			case '0':
				return chalk.dim('0');
			default:
				return chalk.yellow('?');
		}
	}

	/**
	 * Color monotonicity description.
	 */
	private colorMonotonicity(monotonicity: Monotonicity, description: string): string {
		switch (monotonicity) {
			case 'increasing':
				return chalk.green(`(${description})`);
			case 'decreasing':
				return chalk.red(`(${description})`);
			case 'constant':
				return chalk.dim(`(${description})`);
			default:
				return chalk.yellow(`(${description})`);
		}
	}

	/**
	 * Get short French description of monotonicity.
	 */
	private getMonotonicityShortDescription(monotonicity: Monotonicity): string {
		switch (monotonicity) {
			case 'increasing':
				return 'f croissante';
			case 'decreasing':
				return 'f decroissante';
			case 'constant':
				return 'f constante';
			case 'unknown':
				return 'indetermine';
		}
	}

	/**
	 * Get French extremum type description.
	 */
	private getExtremumTypeFr(type: ExtremumType): string {
		switch (type) {
			case 'local_minimum':
				return 'Minimum local';
			case 'local_maximum':
				return 'Maximum local';
			case 'global_minimum':
				return 'Minimum global';
			case 'global_maximum':
				return 'Maximum global';
		}
	}

	/**
	 * Format a limit value.
	 */
	private formatLimitValue(value: LimitValue): string {
		if (value === 'infinity') return '+inf';
		if (value === 'negative_infinity') return '-inf';
		if (value === 'indeterminate') return 'indetermine';
		return toCustom(value);
	}
}
