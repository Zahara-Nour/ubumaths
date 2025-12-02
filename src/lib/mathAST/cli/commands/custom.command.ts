/**
 * Custom Syntax Command
 *
 * Output the custom syntax representation of the parsed AST.
 * Supports rendering metadata (colors) in the output.
 */

import { BaseCommand, type OptionDefinition } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { toCustom } from '../../index';

// =============================================================================
// Custom Command
// =============================================================================

/**
 * Custom command - outputs custom syntax representation.
 *
 * Converts the AST to custom syntax, optionally including
 * metadata like colors.
 *
 * @example
 * ```
 * > custom \frac{a}{b}
 * a/b
 *
 * > custom --metadata colored_expression
 * @red{x}^2+3x-5
 * ```
 */
export class CustomCommand extends BaseCommand {
	readonly name = 'custom';
	readonly aliases = ['c', 'cust'] as const;
	readonly description = 'Output custom syntax representation';
	readonly usage = 'custom [--metadata]';

	getOptionDefinitions(): readonly OptionDefinition[] {
		return [
			{
				flag: '--metadata',
				description: 'Render metadata (colors)',
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
		const output = toCustom(ctx.ast, { renderMetadata });

		return { success: true, output, ast: ctx.ast };
	}
}
