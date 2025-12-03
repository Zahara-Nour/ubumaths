/**
 * Hash Command
 *
 * Computes and displays the canonical hash of a mathematical expression.
 * The hash uniquely identifies the expression's normal form.
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { normalize, hashNormalForm } from '../../normal';

// =============================================================================
// Hash Command
// =============================================================================

/**
 * Hash command - computes the canonical hash of an expression.
 *
 * The hash is computed from the normalized form of the expression.
 * Two mathematically equivalent expressions will have the same hash.
 *
 * @example
 * ```
 * > hash 2x + 3x
 * Hash: poly:1:[5/1:[]:[x:1/1]]
 * ```
 */
export class HashCommand extends BaseCommand {
	readonly name = 'hash';
	readonly aliases = ['h'] as const;
	readonly description = 'Compute canonical hash of expression';
	readonly usage = 'hash <expression>';

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.ast) {
			return {
				success: false,
				output: '',
				error: { code: 'NO_AST', message: 'No expression to hash' }
			};
		}

		try {
			// Normalize and compute hash
			const normalForm = normalize(ctx.ast);
			const hash = hashNormalForm(normalForm);

			const output = chalk.dim('Hash:') + ' ' + chalk.cyan(hash);

			return {
				success: true,
				output,
				ast: ctx.ast
			};
		} catch (err) {
			const message = err instanceof Error ? err.message : 'Unknown error computing hash';
			return {
				success: false,
				output: '',
				error: { code: 'PARSE_ERROR', message }
			};
		}
	}
}
