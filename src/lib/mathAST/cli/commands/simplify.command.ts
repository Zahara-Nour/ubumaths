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
import { simplifyKeepingDomain } from '../../pedagogical-simplify/keep-domain';
import { preprocess } from '../../normal/rules';
import { normalize, hashNormalForm } from '../../normal';
import { mapNode } from '../../transforms';
import type { MathNode } from '../../types';

// =============================================================================
// Fonctions
// =============================================================================

/** Les divisions tapées en ligne (`1/2`), écrites en fraction. */
function typedFractions(node: MathNode): MathNode {
	return mapNode(node, (n) =>
		n.type === 'division' && n.displayStyle === 'inline' ? { ...n, displayStyle: 'fraction' } : n
	);
}

// =============================================================================
// Simplify Command
// =============================================================================

/**
 * Simplify command - simplifies expressions and shows canonical form.
 *
 * La réponse simplifie sans changer le domaine (`keep-domain.ts`, ADR 0032
 * S3) ; le hash vient de la forme normale.
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
			// La forme propre qui garde le domaine (ADR 0032, S3) : `x/x` reste
			// écrit, `e^{2x}/e^x` → `e^x` — la réponse de l'Atelier. Une division
			// tapée `1/2` est une fraction : le parseur maison la lit « en ligne »,
			// que `toLatex` écrirait `1 / 2`
			const result = simplifyKeepingDomain(typedFractions(ctx.ast));

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
				ast: result,
				answer: latex
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
