/**
 * Normal Command
 *
 * Displays the detailed normal form structure of a mathematical expression.
 * Shows numerator/denominator polynomials with their terms, coefficients, and monomials.
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import {
	normalize,
	hashNormalForm,
	polynomialToString,
	monomialToString,
	algebraicToString
} from '../../normal';
import type { NormalForm, NormalTerm } from '../../normal/types';

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Formats a single term for display.
 */
function formatTerm(term: NormalTerm, index: number): string[] {
	const lines: string[] = [];
	const prefix = chalk.dim(`  Term ${index + 1}:`);

	// Coefficient
	const coeffStr = algebraicToString(term.coefficient);

	// Monomial
	const monomialStr =
		term.monomial.length === 0 ? chalk.dim('[1]') : monomialToString(term.monomial);

	lines.push(
		`${prefix} coefficient=${chalk.yellow(coeffStr)}, monomial=${chalk.blue(monomialStr)}`
	);

	return lines;
}

/**
 * Formats a polynomial (array of terms) for display.
 */
function formatPolynomial(terms: readonly NormalTerm[], label: string): string[] {
	const lines: string[] = [];

	if (terms.length === 0) {
		lines.push(`  ${label}: ${chalk.dim('[0]')}`);
		return lines;
	}

	// Check if it's just [1]
	if (
		terms.length === 1 &&
		terms[0].monomial.length === 0 &&
		terms[0].coefficient.terms.length === 1 &&
		terms[0].coefficient.terms[0].radicals.length === 0 &&
		terms[0].coefficient.terms[0].rational.n === 1n &&
		terms[0].coefficient.terms[0].rational.d === 1n
	) {
		lines.push(`  ${label}: ${chalk.dim('[1]')}`);
		return lines;
	}

	lines.push(`  ${label}:`);
	for (let i = 0; i < terms.length; i++) {
		lines.push(...formatTerm(terms[i], i));
	}

	return lines;
}

/**
 * Formats a NormalForm for detailed display.
 */
function formatNormalForm(form: NormalForm): string[] {
	const lines: string[] = [];

	lines.push(chalk.bold('NormalForm:'));
	lines.push(...formatPolynomial(form.numerator, 'Numerator'));
	lines.push(...formatPolynomial(form.denominator, 'Denominator'));

	return lines;
}

// =============================================================================
// Normal Command
// =============================================================================

/**
 * Normal command - displays the detailed normal form structure.
 *
 * Shows the internal representation of an expression's canonical form,
 * useful for understanding how expressions are normalized.
 *
 * @example
 * ```
 * > normal 2x + 3x
 * NormalForm:
 *   Numerator:
 *     Term 1: coefficient=5, monomial=[x^1]
 *   Denominator: [1]
 * Hash: poly:1:[5/1:[]:[x:1/1]]
 * ```
 */
export class NormalCommand extends BaseCommand {
	readonly name = 'normal';
	readonly aliases = ['n', 'norm'] as const;
	readonly description = 'Display detailed normal form structure';
	readonly usage = 'normal <expression>';

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.ast) {
			return {
				success: false,
				output: '',
				error: { code: 'NO_AST', message: 'No expression to normalize' }
			};
		}

		try {
			// Normalize the expression
			const normalForm = normalize(ctx.ast);

			// Format the structure
			const structureLines = formatNormalForm(normalForm);

			// Add hash and polynomial string
			const hash = hashNormalForm(normalForm);
			const polyStr = polynomialToString(normalForm.numerator);

			const lines = [
				...structureLines,
				'',
				chalk.dim('Polynomial:') + ' ' + chalk.green(polyStr),
				chalk.dim('Hash:') + '       ' + chalk.cyan(hash)
			];

			return {
				success: true,
				output: lines.join('\n'),
				ast: ctx.ast
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error during normalization';
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message }
			};
		}
	}
}
