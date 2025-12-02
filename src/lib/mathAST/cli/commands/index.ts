/**
 * CLI Commands
 *
 * Aggregate exports for all CLI commands and factory for default registry.
 */

// =============================================================================
// Command Exports
// =============================================================================

export { BaseCommand, type OptionDefinition } from './base-command';
export { ParseCommand } from './parse.command';
export { TreeCommand } from './tree.command';
export { LatexCommand } from './latex.command';
export { CustomCommand } from './custom.command';
export { HelpCommand } from './help.command';

// =============================================================================
// Default Registry Factory
// =============================================================================

import { CommandRegistry } from '../core/command-registry';
import { ParseCommand } from './parse.command';
import { TreeCommand } from './tree.command';
import { LatexCommand } from './latex.command';
import { CustomCommand } from './custom.command';
import { HelpCommand } from './help.command';

/**
 * Create a command registry with all default commands registered.
 *
 * Includes: parse, tree, latex, custom, help
 *
 * @returns A fully configured CommandRegistry
 *
 * @example
 * ```typescript
 * const registry = createDefaultRegistry();
 *
 * // Get a command
 * const parseCmd = registry.get('parse');
 * const treeCmd = registry.get('t'); // alias for 'tree'
 *
 * // Execute a command
 * const result = parseCmd?.execute({
 *   input: 'x^2',
 *   ast: parsedAst,
 *   format: 'latex',
 *   options: {},
 *   isRepl: false
 * });
 * ```
 */
export function createDefaultRegistry(): CommandRegistry {
	const registry = new CommandRegistry();

	const helpCmd = new HelpCommand();

	registry.register(new ParseCommand());
	registry.register(new TreeCommand());
	registry.register(new LatexCommand());
	registry.register(new CustomCommand());
	registry.register(helpCmd);

	// Set registry reference for help command after registration
	helpCmd.setRegistry(registry);

	return registry;
}
