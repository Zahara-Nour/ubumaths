/**
 * Parse Command
 *
 * Parse mathematical expressions and display both AST tree and LaTeX output.
 * This is the default command when no specific command is given.
 */

import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import { prettyPrint, toLatex } from '../../index';

// =============================================================================
// Parse Command
// =============================================================================

/**
 * Parse command - parses input and displays AST + LaTeX.
 *
 * This is the primary command for exploring how expressions are parsed.
 * It shows both the tree structure and the LaTeX round-trip result.
 *
 * @example
 * ```
 * > parse x^2 + 3x - 5
 * Addition
 * ├── Superscript
 * │   ├── Variable: x
 * │   └── Number: 2
 * ├── Multiplication [implicit]
 * │   ├── Number: 3
 * │   └── Variable: x
 * └── Number: 5 [negative]
 *
 * LaTeX: x^{2}+3x-5
 * ```
 */
export class ParseCommand extends BaseCommand {
	readonly name = 'parse';
	readonly aliases = ['p'] as const;
	readonly description = 'Parse expression and display AST + LaTeX';
	readonly usage = 'parse <expression>';
	readonly requiresAst = false; // We handle the case when parsing fails

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.ast) {
			return {
				success: false,
				output: '',
				error: { code: 'NO_AST', message: 'Failed to parse expression' }
			};
		}

		const tree = prettyPrint(ctx.ast, { colors: true });
		const latex = toLatex(ctx.ast);

		const output = `${tree}\n\nLaTeX: ${latex}`;

		return { success: true, output, ast: ctx.ast };
	}
}
