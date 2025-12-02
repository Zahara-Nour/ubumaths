/**
 * Command Registry
 *
 * Registry for discovering and executing CLI commands.
 * Supports command aliases for convenience.
 */

import type { CommandContext, CommandResult } from '../types';

// =============================================================================
// Command Interface
// =============================================================================

/**
 * Interface for CLI commands.
 *
 * Commands must implement this interface to be registered with the registry.
 * Each command has a name, optional aliases, and an execute method.
 */
export interface Command {
	/** Primary command name */
	readonly name: string;

	/** Alternative names for the command */
	readonly aliases: readonly string[];

	/** Human-readable description for help text */
	readonly description: string;

	/**
	 * Execute the command with the given context.
	 *
	 * @param ctx - Command execution context
	 * @returns Command result with output and status
	 */
	execute(ctx: CommandContext): CommandResult;
}

// =============================================================================
// Command Registry
// =============================================================================

/**
 * Registry for CLI commands with alias support.
 *
 * Provides command registration, lookup by name or alias,
 * and enumeration of all registered commands.
 *
 * @example
 * ```typescript
 * const registry = new CommandRegistry();
 *
 * // Register a command
 * registry.register({
 *   name: 'tree',
 *   aliases: ['t', 'ast'],
 *   description: 'Display AST as tree',
 *   execute: (ctx) => ({ output: '...', success: true })
 * });
 *
 * // Get command by name or alias
 * const cmd = registry.get('t'); // Returns 'tree' command
 *
 * // Check if command exists
 * if (registry.has('tree')) { ... }
 *
 * // List all commands
 * for (const cmd of registry.all()) {
 *   console.log(cmd.name);
 * }
 * ```
 */
export class CommandRegistry {
	private readonly commands = new Map<string, Command>();
	private readonly aliases = new Map<string, string>();

	/**
	 * Register a command with the registry.
	 *
	 * Registers the command by its primary name and all aliases.
	 * Overwrites any existing command with the same name.
	 *
	 * @param command - The command to register
	 */
	register(command: Command): void {
		this.commands.set(command.name, command);
		for (const alias of command.aliases) {
			this.aliases.set(alias, command.name);
		}
	}

	/**
	 * Get a command by name or alias.
	 *
	 * @param nameOrAlias - Command name or alias
	 * @returns The command, or undefined if not found
	 */
	get(nameOrAlias: string): Command | undefined {
		const name = this.aliases.get(nameOrAlias) ?? nameOrAlias;
		return this.commands.get(name);
	}

	/**
	 * Check if a command exists by name or alias.
	 *
	 * @param nameOrAlias - Command name or alias
	 * @returns True if the command exists
	 */
	has(nameOrAlias: string): boolean {
		return this.commands.has(nameOrAlias) || this.aliases.has(nameOrAlias);
	}

	/**
	 * Get all registered commands.
	 *
	 * @returns Array of all commands (not aliases)
	 */
	all(): readonly Command[] {
		return Array.from(this.commands.values());
	}

	/**
	 * Get all command names (not aliases).
	 *
	 * @returns Array of command names
	 */
	names(): readonly string[] {
		return Array.from(this.commands.keys());
	}

	/**
	 * Get the number of registered commands.
	 *
	 * @returns Number of commands (not counting aliases)
	 */
	size(): number {
		return this.commands.size;
	}

	/**
	 * Remove all registered commands.
	 */
	clear(): void {
		this.commands.clear();
		this.aliases.clear();
	}
}
