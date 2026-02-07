/**
 * Simplify Command
 *
 * Simplifies a mathematical expression using rewrite rules and displays
 * the simplified result with LaTeX, custom syntax, and hash outputs.
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toLatex, toCustom } from '../../index';
import { simplify } from '../../simplify';
import { preprocess } from '../../normal/rules';
import { normalize, hashNormalForm } from '../../normal';

// =============================================================================
// Simplify Command
// =============================================================================

/**
 * Simplify command - simplifies expressions and shows canonical form.
 *
 * Uses both rule-based simplification and normalization to produce
 * the most simplified form of an expression.
 *
 * @example
 * ```
 * > simplify 2x + 3x
 * Simplified: 5x
 * LaTeX: 5 x
 * Custom: 5x
 * Hash: poly:1:[5/1:[]:[x:1/1]]
 * ```
 */
export class SimplifyCommand extends BaseCommand {
	readonly name = 'simplify';
	readonly aliases = ['s', 'simp'] as const;
	readonly description = 'Simplify mathematical expression';
	readonly usage = 'simplify <expression>';

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.ast) {
			return {
				success: false,
				output: '',
				error: { code: 'NO_AST', message: 'No expression to simplify' }
			};
		}

		try {
			// Use the unified simplify pipeline
			const { result } = simplify(ctx.ast);

			// Generate hash from normal form (for structural comparison)
			const normalForm = normalize(preprocess(result));
			const hash = hashNormalForm(normalForm);

			// Generate outputs
			const latex = toLatex(result);
			const custom = toCustom(result);

			// Build output
			const lines = [
				chalk.bold('Simplified:') + ' ' + chalk.green(custom),
				'',
				chalk.dim('LaTeX:') + '  ' + latex,
				chalk.dim('Custom:') + ' ' + custom,
				chalk.dim('Hash:') + '   ' + chalk.cyan(hash)
			];

			return {
				success: true,
				output: lines.join('\n'),
				ast: result
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error during simplification';
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message }
			};
		}
	}
}
