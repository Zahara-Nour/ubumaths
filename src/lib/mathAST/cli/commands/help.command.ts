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
		name: 'Commandes de base',
		description: 'Parsing et affichage',
		commands: ['parse', 'tree', 'latex', 'custom', 'help']
	},
	{
		name: 'Normalisation',
		description: 'Simplification et equivalence',
		commands: ['simplify', 'normal', 'hash', 'equiv']
	},
	{
		name: 'Variables',
		description: 'Liaisons de variables',
		commands: ['let', 'vars', 'unset', 'clear', 'mode', 'eval']
	},
	{
		name: 'Fonctions',
		description: 'Definition de fonctions',
		commands: ['def', "def'", 'fns', 'undef', 'inv']
	},
	{
		name: 'Calcul',
		description: 'Derivation, equations et series',
		commands: ['diff', 'solve', 'domain', 'taylor']
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
 */
export class HelpCommand extends BaseCommand {
	readonly name = 'help';
	readonly aliases = ['h', '?'] as const;
	readonly description = 'Afficher les commandes disponibles';
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

		// Build command map for lookup
		const commandMap = new Map<
			string,
			typeof this.registry extends { all(): Iterable<infer T> } ? T : never
		>();
		for (const cmd of this.registry.all()) {
			commandMap.set(cmd.name, cmd);
		}

		// Track displayed commands
		const displayedCommands = new Set<string>();

		// =================================================================
		// Plain text output (for terminal)
		// =================================================================
		const lines: string[] = [chalk.bold('MathAST CAS - Commandes disponibles'), ''];

		for (const category of COMMAND_CATEGORIES) {
			lines.push(chalk.bold.yellow(category.name + ':'));
			for (const cmdName of category.commands) {
				const cmd = commandMap.get(cmdName);
				if (cmd) {
					const aliases = cmd.aliases.length > 0 ? chalk.gray(` (${cmd.aliases.join(', ')})`) : '';
					lines.push(`  ${chalk.cyan(cmd.name)}${aliases} - ${cmd.description}`);
					displayedCommands.add(cmd.name);
				}
			}
			lines.push('');
		}

		// Uncategorized commands
		const uncategorized: string[] = [];
		for (const cmd of this.registry.all()) {
			if (!displayedCommands.has(cmd.name)) {
				uncategorized.push(cmd.name);
			}
		}

		if (uncategorized.length > 0) {
			lines.push(chalk.bold.yellow('Autres:'));
			for (const cmdName of uncategorized) {
				const cmd = commandMap.get(cmdName);
				if (cmd) {
					const aliases = cmd.aliases.length > 0 ? chalk.gray(` (${cmd.aliases.join(', ')})`) : '';
					lines.push(`  ${chalk.cyan(cmd.name)}${aliases} - ${cmd.description}`);
				}
			}
			lines.push('');
		}

		lines.push(chalk.bold.yellow('Syntaxe directe:'));
		lines.push(`  ${chalk.cyan('x := 5')}          Assigner une variable`);
		lines.push(`  ${chalk.cyan('x <- 5')}          Assigner (style R/algo)`);
		lines.push(`  ${chalk.cyan('f(x) := x^2')}     Definir une fonction`);
		lines.push(`  ${chalk.cyan('a = b')}           Tester l'equivalence`);
		lines.push('');
		lines.push(chalk.gray('Prefixez les commandes avec . (ex: .help, .tree)'));

		return {
			success: true,
			output: lines.join('\n')
		};
	}
}
