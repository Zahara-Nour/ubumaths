/**
 * Equiv Command
 *
 * Checks if two mathematical expressions are equivalent by comparing their
 * normalized forms. Supports two syntaxes:
 * 1. Two separate arguments: equiv "2x + 3x" "5x"
 * 2. Single expression with === operator: "2x + 3x === 5x"
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { normalize, hashNormalForm, normalFormsEquivalent } from '../../normal';
import { parse } from '../core/pipeline';

// =============================================================================
// Equiv Command
// =============================================================================

/**
 * Equiv command - checks if two expressions are mathematically equivalent.
 *
 * Two expressions are equivalent if they have the same normal form hash.
 * This command supports both two-argument syntax and === operator syntax.
 *
 * @example
 * ```
 * > equiv "2x + 3x" "5x"
 * Equivalent: true
 *
 * Expression 1: 2x + 3x
 *   Hash: poly:1:[5/1:[]:[x:1/1]]
 *
 * Expression 2: 5x
 *   Hash: poly:1:[5/1:[]:[x:1/1]]
 * ```
 */
export class EquivCommand extends BaseCommand {
	readonly name = 'equiv';
	readonly aliases = ['eq', 'equivalent'] as const;
	readonly description = 'Check if two expressions are equivalent';
	readonly usage = 'equiv <expr1> <expr2> | <expr1> === <expr2>';
	readonly requiresAst = false; // We parse the expressions ourselves

	execute(ctx: CommandContext): CommandResult {
		const input = ctx.input.trim();

		// Check for === operator syntax
		if (input.includes('===')) {
			return this.handleEquivOperator(input);
		}

		// Two-argument syntax: the input should be two expressions
		// The first expression is in ctx.ast (already parsed)
		// We need to extract the second expression from ctx.options
		const secondExpr = ctx.options['secondExpression'] as string | undefined;

		if (!secondExpr) {
			// If no second expression, check if input contains two quoted expressions
			const twoExprResult = this.handleTwoExpressions(input);
			if (twoExprResult.success || !ctx.isRepl) {
				return twoExprResult;
			}

			// In REPL mode: try to parse input as a single expression and compare with lastAst
			if (ctx.ast && input) {
				const result = parse(input);
				if (result.ast) {
					// Compare lastAst with the new expression
					return this.compareExpressions('(previous)', ctx.ast, input, result.ast);
				}
			}

			// If we still don't have a match, return the error from handleTwoExpressions
			return twoExprResult;
		}

		if (!ctx.ast) {
			return {
				success: false,
				output: '',
				error: { code: 'NO_AST', message: 'Failed to parse first expression' }
			};
		}

		// Parse second expression
		const result2 = parse(secondExpr);
		if (!result2.ast) {
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message: `Failed to parse second expression: ${secondExpr}` }
			};
		}

		return this.compareExpressions(ctx.input, ctx.ast, secondExpr, result2.ast);
	}

	/**
	 * Handle === operator syntax: "expr1 === expr2"
	 */
	private handleEquivOperator(input: string): CommandResult {
		const parts = input.split('===');
		if (parts.length !== 2) {
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message: 'Invalid === syntax. Use: expr1 === expr2' }
			};
		}

		const expr1 = parts[0].trim();
		const expr2 = parts[1].trim();

		if (!expr1 || !expr2) {
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message: 'Both expressions are required' }
			};
		}

		// Parse both expressions
		const result1 = parse(expr1);
		const result2 = parse(expr2);

		if (!result1.ast) {
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message: `Failed to parse first expression: ${expr1}` }
			};
		}

		if (!result2.ast) {
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message: `Failed to parse second expression: ${expr2}` }
			};
		}

		return this.compareExpressions(expr1, result1.ast, expr2, result2.ast);
	}

	/**
	 * Handle two separate expressions from input.
	 * Expects input like: "2x + 3x" "5x"
	 */
	private handleTwoExpressions(input: string): CommandResult {
		// Try to extract two quoted expressions
		const quotedMatch = input.match(/"([^"]+)"\s+"([^"]+)"/);
		if (quotedMatch) {
			const expr1 = quotedMatch[1];
			const expr2 = quotedMatch[2];

			const result1 = parse(expr1);
			const result2 = parse(expr2);

			if (!result1.ast) {
				return {
					success: false,
					output: '',
					error: { code: 'PARSE_ERROR', message: `Failed to parse first expression: ${expr1}` }
				};
			}

			if (!result2.ast) {
				return {
					success: false,
					output: '',
					error: { code: 'PARSE_ERROR', message: `Failed to parse second expression: ${expr2}` }
				};
			}

			return this.compareExpressions(expr1, result1.ast, expr2, result2.ast);
		}

		// Try single quotes
		const singleQuotedMatch = input.match(/'([^']+)'\s+'([^']+)'/);
		if (singleQuotedMatch) {
			const expr1 = singleQuotedMatch[1];
			const expr2 = singleQuotedMatch[2];

			const result1 = parse(expr1);
			const result2 = parse(expr2);

			if (!result1.ast) {
				return {
					success: false,
					output: '',
					error: { code: 'PARSE_ERROR', message: `Failed to parse first expression: ${expr1}` }
				};
			}

			if (!result2.ast) {
				return {
					success: false,
					output: '',
					error: { code: 'PARSE_ERROR', message: `Failed to parse second expression: ${expr2}` }
				};
			}

			return this.compareExpressions(expr1, result1.ast, expr2, result2.ast);
		}

		// Try space-separated unquoted expressions (simple case)
		// This is tricky because expressions can contain spaces
		// Only try this for simple expressions without spaces
		const spaceMatch = input.match(/^(\S+)\s+(\S+)$/);
		if (spaceMatch) {
			const expr1 = spaceMatch[1];
			const expr2 = spaceMatch[2];

			const result1 = parse(expr1);
			const result2 = parse(expr2);

			if (result1.ast && result2.ast) {
				return this.compareExpressions(expr1, result1.ast, expr2, result2.ast);
			}
		}

		return {
			success: false,
			output: '',
			error: {
				code: 'PARSE_ERROR',
				message: 'Usage: equiv "expr1" "expr2" or expr1 === expr2'
			}
		};
	}

	/**
	 * Compare two parsed expressions and format the result.
	 */
	private compareExpressions(
		expr1Str: string,
		expr1: import('../../types').MathNode,
		expr2Str: string,
		expr2: import('../../types').MathNode
	): CommandResult {
		try {
			// Normalize both expressions
			const form1 = normalize(expr1);
			const form2 = normalize(expr2);

			// Check equivalence
			const isEquivalent = normalFormsEquivalent(form1, form2);

			// Get hashes
			const hash1 = hashNormalForm(form1);
			const hash2 = hashNormalForm(form2);

			// Format output
			const equivLabel = isEquivalent
				? chalk.bold.green('Equivalent: true')
				: chalk.bold.red('Equivalent: false');

			const lines = [
				equivLabel,
				'',
				chalk.dim('Expression 1:') + ' ' + expr1Str,
				'  ' + chalk.dim('Hash:') + ' ' + chalk.cyan(hash1),
				'',
				chalk.dim('Expression 2:') + ' ' + expr2Str,
				'  ' + chalk.dim('Hash:') + ' ' + chalk.cyan(hash2)
			];

			return {
				success: true,
				output: lines.join('\n'),
				ast: expr1 // Return the first AST
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error checking equivalence';
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message }
			};
		}
	}
}
