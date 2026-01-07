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
		description: 'Derivation et series',
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

		// =================================================================
		// HTML output (for web REPL) - compact monospace style
		// =================================================================
		const htmlParts: string[] = [];

		htmlParts.push('<div class="font-mono text-sm leading-relaxed">');

		// Reset displayed for HTML generation
		displayedCommands.clear();

		// Categories as compact sections
		for (const category of COMMAND_CATEGORIES) {
			htmlParts.push(
				`<div class="text-yellow-500 font-medium mt-3 first:mt-0">${this.escapeHtml(category.name)}</div>`
			);

			for (const cmdName of category.commands) {
				const cmd = commandMap.get(cmdName);
				if (cmd) {
					const aliasStr =
						cmd.aliases.length > 0
							? ` <span class="text-muted-foreground">(${cmd.aliases.join(', ')})</span>`
							: '';
					htmlParts.push(
						`<div class="pl-2"><span class="text-cyan-400">.${this.escapeHtml(cmd.name)}</span>${aliasStr} <span class="text-foreground/70">- ${this.escapeHtml(cmd.description)}</span></div>`
					);
					displayedCommands.add(cmd.name);
				}
			}
		}

		// Uncategorized
		const uncategorizedHtml: string[] = [];
		for (const cmd of this.registry.all()) {
			if (!displayedCommands.has(cmd.name)) {
				uncategorizedHtml.push(cmd.name);
			}
		}

		if (uncategorizedHtml.length > 0) {
			htmlParts.push('<div class="text-yellow-500 font-medium mt-3">Autres</div>');
			for (const cmdName of uncategorizedHtml) {
				const cmd = commandMap.get(cmdName);
				if (cmd) {
					const aliasStr =
						cmd.aliases.length > 0
							? ` <span class="text-muted-foreground">(${cmd.aliases.join(', ')})</span>`
							: '';
					htmlParts.push(
						`<div class="pl-2"><span class="text-cyan-400">.${this.escapeHtml(cmd.name)}</span>${aliasStr} <span class="text-foreground/70">- ${this.escapeHtml(cmd.description)}</span></div>`
					);
				}
			}
		}

		// Inline syntax section
		htmlParts.push('<div class="text-yellow-500 font-medium mt-3">Syntaxe directe</div>');
		htmlParts.push(
			'<div class="pl-2"><span class="text-cyan-400">x := 5</span> <span class="text-foreground/70">- Assigner une variable</span></div>'
		);
		htmlParts.push(
			'<div class="pl-2"><span class="text-cyan-400">x &lt;- 5</span> <span class="text-foreground/70">- Assigner (style R/algo)</span></div>'
		);
		htmlParts.push(
			'<div class="pl-2"><span class="text-cyan-400">f(x) := x^2</span> <span class="text-foreground/70">- Definir une fonction</span></div>'
		);
		htmlParts.push(
			'<div class="pl-2"><span class="text-cyan-400">a = b</span> <span class="text-foreground/70">- Tester l\'equivalence</span></div>'
		);

		// Mode shortcuts
		htmlParts.push('<div class="text-yellow-500 font-medium mt-3">Modes</div>');
		htmlParts.push(
			'<div class="pl-2"><span class="text-cyan-400">.exact</span> <span class="text-foreground/70">- Resultats exacts (1/3)</span></div>'
		);
		htmlParts.push(
			'<div class="pl-2"><span class="text-cyan-400">.decimal</span> <span class="text-foreground/70">- Resultats decimaux (≈0.333)</span></div>'
		);

		// Unit commands
		htmlParts.push('<div class="text-yellow-500 font-medium mt-3">Unites</div>');
		htmlParts.push(
			'<div class="pl-2"><span class="text-cyan-400">5[km]</span> ou <span class="text-cyan-400">5~\\unit{km}</span> <span class="text-foreground/70">- Quantite avec unite</span></div>'
		);
		htmlParts.push(
			'<div class="pl-2"><span class="text-cyan-400">.convert m</span> <span class="text-foreground/70">- Convertir le dernier resultat</span></div>'
		);
		htmlParts.push(
			'<div class="pl-2"><span class="text-cyan-400">.unitmode first|si|best</span> <span class="text-foreground/70">- Mode de conversion</span></div>'
		);

		// Utilities
		htmlParts.push('<div class="text-yellow-500 font-medium mt-3">Utilitaires</div>');
		htmlParts.push(
			'<div class="pl-2"><span class="text-cyan-400">.export</span> <span class="text-foreground/70">- Exporter l\'historique (JSON)</span></div>'
		);
		htmlParts.push(
			'<div class="pl-2"><span class="text-cyan-400">.stats</span> <span class="text-foreground/70">- Statistiques (moyenne, mediane...)</span></div>'
		);
		htmlParts.push(
			'<div class="pl-2"><span class="text-cyan-400">.linreg</span> <span class="text-foreground/70">- Regression lineaire</span></div>'
		);

		// Keyboard shortcuts - inline
		htmlParts.push('<div class="text-yellow-500 font-medium mt-3">Raccourcis clavier</div>');
		htmlParts.push(
			'<div class="pl-2 text-foreground/70">↑↓ historique · Ctrl+R rechercher · Esc annuler</div>'
		);

		htmlParts.push('</div>');

		return {
			success: true,
			output: lines.join('\n'),
			outputHtml: htmlParts.join('\n')
		};
	}

	/**
	 * Escape HTML special characters.
	 */
	private escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#039;');
	}
}
