/**
 * Tree Command
 *
 * Display the AST as a formatted tree structure.
 * Supports colored output for better readability.
 */

import { BaseCommand, type OptionDefinition } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { prettyPrint } from '../../index';

// =============================================================================
// Tree Command
// =============================================================================

/**
 * Tree command - displays the AST as a tree.
 *
 * Shows the hierarchical structure of the parsed expression
 * with optional ANSI color highlighting.
 *
 * @example
 * ```
 * > tree x^2 + 1
 * Addition
 * ├── Superscript
 * │   ├── Variable: x
 * │   └── Number: 2
 * └── Number: 1
 * ```
 */
export class TreeCommand extends BaseCommand {
	readonly name = 'tree';
	readonly aliases = ['t', 'ast'] as const;
	readonly description = 'Display the AST as a tree';
	readonly usage = 'tree [--no-colors]';

	getOptionDefinitions(): readonly OptionDefinition[] {
		return [{ flag: '--no-colors', description: 'Disable ANSI colors', defaultValue: false }];
	}

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.ast) {
			return {
				success: false,
				output: '',
				error: { code: 'NO_AST', message: 'No AST available' }
			};
		}

		// Check for --no-colors flag (colors defaults to true)
		const colors = ctx.options['colors'] !== false;
		const output = prettyPrint(ctx.ast, { colors });

		return { success: true, output, ast: ctx.ast };
	}
}
