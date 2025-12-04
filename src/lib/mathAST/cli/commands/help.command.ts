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
// Command Categories
// =============================================================================

/**
 * Command category definitions for organized help display.
 */
const COMMAND_CATEGORIES: { name: string; commands: string[]; description: string }[] = [
	{
		name: 'Core Commands',
		description: 'Basic parsing and output',
		commands: ['parse', 'tree', 'latex', 'custom', 'help']
	},
	{
		name: 'Normalization Commands',
		description: 'Simplification and equivalence',
		commands: ['simplify', 'normal', 'hash', 'equiv']
	},
	{
		name: 'Variable Commands',
		description: 'Variable bindings and state',
		commands: ['let', 'vars', 'unset', 'clear', 'mode', 'eval']
	},
	{
		name: 'Function Commands',
		description: 'Define and manage functions',
		commands: ['def', "def'", 'fns', 'undef', 'inv']
	},
	{
		name: 'Calculus Commands',
		description: 'Differentiation and series',
		commands: ['diff', 'taylor']
	}
];

// =============================================================================
// Help Command
// =============================================================================

/**
 * Help command - shows available commands.
 *
 * Lists all registered commands with their descriptions and aliases,
 * organized by category. Also shows inline syntax shortcuts.
 *
 * @example
 * ```
 * > help
 * MathAST CLI - Available Commands
 *
 * Core Commands:
 *   parse (p)       Parse expression and display AST + LaTeX
 *   tree (t, ast)   Display the AST as a tree
 *   ...
 *
 * Function Commands:
 *   def (fn)        Define a function: .def f(x) = x^2
 *   ...
 *
 * Inline Syntax:
 *   x = 5           Assign value to variable (same as .let x = 5)
 *   f(x) = x^2      Define function (same as .def f(x) = x^2)
 *   expr1 === expr2 Check equivalence
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

		// Build a map of command names to commands for quick lookup
		const commandMap = new Map<
			string,
			typeof this.registry extends { all(): Iterable<infer T> } ? T : never
		>();
		for (const cmd of this.registry.all()) {
			commandMap.set(cmd.name, cmd);
		}

		// Track which commands we've displayed
		const displayedCommands = new Set<string>();

		// Display commands by category
		for (const category of COMMAND_CATEGORIES) {
			lines.push(chalk.bold.yellow(category.name + ':'));

			for (const cmdName of category.commands) {
				const cmd = commandMap.get(cmdName);
				if (cmd) {
					const aliases = cmd.aliases.length > 0 ? chalk.gray(` (${cmd.aliases.join(', ')})`) : '';
					lines.push(`  ${chalk.cyan(cmd.name)}${aliases}`);
					lines.push(`    ${cmd.description}`);
					displayedCommands.add(cmd.name);
				}
			}
			lines.push('');
		}

		// Display any uncategorized commands
		const uncategorized: string[] = [];
		for (const cmd of this.registry.all()) {
			if (!displayedCommands.has(cmd.name)) {
				uncategorized.push(cmd.name);
			}
		}

		if (uncategorized.length > 0) {
			lines.push(chalk.bold.yellow('Other Commands:'));
			for (const cmdName of uncategorized) {
				const cmd = commandMap.get(cmdName);
				if (cmd) {
					const aliases = cmd.aliases.length > 0 ? chalk.gray(` (${cmd.aliases.join(', ')})`) : '';
					lines.push(`  ${chalk.cyan(cmd.name)}${aliases}`);
					lines.push(`    ${cmd.description}`);
				}
			}
			lines.push('');
		}

		// Add inline syntax section
		lines.push(chalk.bold.yellow('Inline Syntax:'));
		lines.push(`  ${chalk.cyan('x = 5')}           Assign value to variable (same as .let x = 5)`);
		lines.push(`  ${chalk.cyan('f(x) = x^2')}      Define function (same as .def f(x) = x^2)`);
		lines.push(`  ${chalk.cyan('expr1 === expr2')} Check equivalence`);
		lines.push('');

		lines.push(chalk.gray('In REPL, prefix commands with . (e.g., .help, .tree)'));

		return { success: true, output: lines.join('\n') };
	}
}
