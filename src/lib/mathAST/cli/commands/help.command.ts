/**
 * Help Command
 *
 * Display available commands and their usage.
 * Requires a reference to the command registry.
 */

import chalk from 'chalk';
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';
import type { CommandRegistry } from '../core/command-registry';

// =============================================================================
// Help Command
// =============================================================================

/**
 * Help command - shows available commands.
 *
 * Lists all registered commands with their descriptions and aliases.
 * Can optionally show detailed help for a specific command.
 *
 * @example
 * ```
 * > help
 * MathAST CLI - Available Commands
 *
 *   parse (p)
 *     Parse expression and display AST + LaTeX
 *   tree (t, ast)
 *     Display the AST as a tree
 *   latex (l, tex)
 *     Output LaTeX representation
 *   help (h, ?)
 *     Show available commands
 *
 * In REPL, prefix commands with . (e.g., .help, .tree)
 * ```
 */
export class HelpCommand extends BaseCommand {
	readonly name = 'help';
	readonly aliases = ['h', '?'] as const;
	readonly description = 'Show available commands';
	readonly usage = 'help [command]';
	readonly requiresAst = false;

	private registry?: CommandRegistry;

	constructor(registry?: CommandRegistry) {
		super();
		this.registry = registry;
	}

	/**
	 * Set the command registry reference.
	 * Called after registration to allow access to all commands.
	 *
	 * @param registry - The command registry
	 */
	setRegistry(registry: CommandRegistry): void {
		this.registry = registry;
	}

	execute(_ctx: CommandContext): CommandResult {
		if (!this.registry) {
			return {
				success: false,
				output: '',
				error: { code: 'INVALID_OPTIONS', message: 'Registry not set' }
			};
		}

		const lines: string[] = [chalk.bold('MathAST CLI - Available Commands'), ''];

		for (const cmd of this.registry.all()) {
			const aliases = cmd.aliases.length > 0 ? chalk.gray(` (${cmd.aliases.join(', ')})`) : '';
			lines.push(`  ${chalk.cyan(cmd.name)}${aliases}`);
			lines.push(`    ${cmd.description}`);
		}

		lines.push('');
		lines.push(chalk.gray('In REPL, prefix commands with . (e.g., .help, .tree)'));

		return { success: true, output: lines.join('\n') };
	}
}
