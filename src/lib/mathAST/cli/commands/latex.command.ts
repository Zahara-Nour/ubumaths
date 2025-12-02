/**
 * LaTeX Command
 *
 * Output the LaTeX representation of the parsed AST.
 * Supports rendering metadata (colors, styles) in the output.
 */

import { BaseCommand, type OptionDefinition } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toLatex } from '../../index';

// =============================================================================
// LaTeX Command
// =============================================================================

/**
 * LaTeX command - outputs LaTeX representation.
 *
 * Converts the AST back to LaTeX, optionally including
 * metadata like colors and styles.
 *
 * @example
 * ```
 * > latex x^2 + 3x - 5
 * x^{2}+3x-5
 *
 * > latex --metadata colored_expression
 * {\color{red}x}^{2}+3x-5
 * ```
 */
export class LatexCommand extends BaseCommand {
	readonly name = 'latex';
	readonly aliases = ['l', 'tex'] as const;
	readonly description = 'Output LaTeX representation';
	readonly usage = 'latex [--metadata]';

	getOptionDefinitions(): readonly OptionDefinition[] {
		return [
			{
				flag: '--metadata',
				description: 'Render metadata (colors, styles)',
				defaultValue: false
			}
		];
	}

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.ast) {
			return {
				success: false,
				output: '',
				error: { code: 'NO_AST', message: 'No AST available' }
			};
		}

		const renderMetadata = ctx.options['metadata'] === true;
		const output = toLatex(ctx.ast, { renderMetadata });

		return { success: true, output, ast: ctx.ast };
	}
}
