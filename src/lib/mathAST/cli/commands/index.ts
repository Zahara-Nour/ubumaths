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
export { SimplifyCommand } from './simplify.command';
export { NormalCommand } from './normal.command';
export { HashCommand } from './hash.command';
export { EquivCommand } from './equiv.command';

// Evaluation commands
export { EvalCommand } from './eval.command';
export { LetCommand } from './let.command';
export { VarsCommand } from './vars.command';
export { ClearCommand } from './clear.command';
export { UnsetCommand } from './unset.command';
export { ModeCommand } from './mode.command';

// Function commands
export { DefCommand } from './def.command';
export { DefDerivCommand } from './def-deriv.command';
export { InvCommand } from './inv.command';
export { FnsCommand } from './fns.command';
export { UndefCommand } from './undef.command';

// Calculus commands
export { DiffCommand } from './diff.command';
export { TaylorCommand } from './taylor.command';

// Domain command
export { DomainCommand } from './domain.command';

// Equation solving
export { SolveCommand } from './solve.command';

// =============================================================================
// Default Registry Factory
// =============================================================================

import { CommandRegistry } from '../core/command-registry';
import { ParseCommand } from './parse.command';
import { TreeCommand } from './tree.command';
import { LatexCommand } from './latex.command';
import { CustomCommand } from './custom.command';
import { HelpCommand } from './help.command';
import { SimplifyCommand } from './simplify.command';
import { NormalCommand } from './normal.command';
import { HashCommand } from './hash.command';
import { EquivCommand } from './equiv.command';
import { EvalCommand } from './eval.command';
import { LetCommand } from './let.command';
import { VarsCommand } from './vars.command';
import { ClearCommand } from './clear.command';
import { UnsetCommand } from './unset.command';
import { ModeCommand } from './mode.command';
import { DefCommand } from './def.command';
import { DefDerivCommand } from './def-deriv.command';
import { InvCommand } from './inv.command';
import { FnsCommand } from './fns.command';
import { UndefCommand } from './undef.command';
import { DiffCommand } from './diff.command';
import { TaylorCommand } from './taylor.command';
import { DomainCommand } from './domain.command';
import { SolveCommand } from './solve.command';

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

	// Core commands
	registry.register(new ParseCommand());
	registry.register(new TreeCommand());
	registry.register(new LatexCommand());
	registry.register(new CustomCommand());
	registry.register(helpCmd);

	// Normalization commands
	registry.register(new SimplifyCommand());
	registry.register(new NormalCommand());
	registry.register(new HashCommand());
	registry.register(new EquivCommand());

	// Evaluation commands
	registry.register(new EvalCommand());
	registry.register(new LetCommand());
	registry.register(new VarsCommand());
	registry.register(new ClearCommand());
	registry.register(new UnsetCommand());
	registry.register(new ModeCommand());

	// Function commands
	registry.register(new DefCommand());
	registry.register(new DefDerivCommand());
	registry.register(new InvCommand());
	registry.register(new FnsCommand());
	registry.register(new UndefCommand());

	// Calculus commands
	registry.register(new DiffCommand());
	registry.register(new TaylorCommand());

	// Domain command
	registry.register(new DomainCommand());

	// Equation solving
	registry.register(new SolveCommand());

	// Set registry reference for help command after registration
	helpCmd.setRegistry(registry);

	return registry;
}
