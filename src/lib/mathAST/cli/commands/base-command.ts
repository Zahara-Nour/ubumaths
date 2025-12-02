/**
 * Base Command
 *
 * Abstract base class for all CLI commands.
 * Provides a consistent interface and shared functionality.
 */

import type { CommandContext, CommandResult } from '../types';

// =============================================================================
// Option Definition
// =============================================================================

/**
 * Definition for a command option/flag
 */
export interface OptionDefinition {
	/** The flag string (e.g., '--no-colors', '--metadata') */
	readonly flag: string;
	/** Human-readable description of the option */
	readonly description: string;
	/** Default value if not provided */
	readonly defaultValue?: unknown;
}

// =============================================================================
// Base Command
// =============================================================================

/**
 * Abstract base class for CLI commands.
 *
 * All commands must extend this class and implement the required
 * abstract properties and methods.
 *
 * @example
 * ```typescript
 * export class MyCommand extends BaseCommand {
 *   readonly name = 'mycommand';
 *   readonly aliases = ['mc'] as const;
 *   readonly description = 'Does something useful';
 *   readonly usage = 'mycommand [options]';
 *
 *   execute(ctx: CommandContext): CommandResult {
 *     return { success: true, output: 'Done!' };
 *   }
 * }
 * ```
 */
export abstract class BaseCommand {
	/** Primary command name */
	abstract readonly name: string;

	/** Alternative names for the command */
	abstract readonly aliases: readonly string[];

	/** Human-readable description for help text */
	abstract readonly description: string;

	/** Usage pattern showing arguments and options */
	abstract readonly usage: string;

	/**
	 * Whether this command requires a parsed AST.
	 * Set to false for commands like 'help' that don't need input.
	 */
	readonly requiresAst: boolean = true;

	/**
	 * Execute the command with the given context.
	 *
	 * @param ctx - Command execution context
	 * @returns Command result with output and status
	 */
	abstract execute(ctx: CommandContext): CommandResult;

	/**
	 * Get option definitions for this command.
	 * Override to provide command-specific options.
	 *
	 * @returns Array of option definitions
	 */
	getOptionDefinitions(): readonly OptionDefinition[] {
		return [];
	}
}
