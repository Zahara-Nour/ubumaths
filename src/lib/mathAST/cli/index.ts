/**
 * MathAST CLI Public API
 *
 * This module provides programmatic access to CLI functionality:
 * - Types for command system
 * - Core infrastructure (detection, parsing, formatting)
 * - Commands (parse, tree, latex, custom, help)
 * - REPL entry point with mode toggle (LaTeX/custom/auto)
 *
 * @module mathAST/cli
 *
 * @example
 * ```typescript
 * import { parse, createDefaultRegistry, startRepl } from '$lib/mathAST/cli';
 *
 * // Parse an expression (auto-detects LaTeX or custom syntax)
 * const result = parse('\\frac{a}{b}');
 * if (result.ast) {
 *   const registry = createDefaultRegistry();
 *   const treeCmd = registry.get('tree');
 *   console.log(treeCmd?.execute({ ast: result.ast, ... }).output);
 * }
 *
 * // Force custom syntax input
 * const customResult = parse('a/b', { forceFormat: 'custom' });
 *
 * // Start REPL
 * startRepl();
 * ```
 */

// =============================================================================
// Types
// =============================================================================

export type {
	CommandContext,
	CommandResult,
	CommandError,
	InputFormat,
	ErrorCode,
	DetectionResult,
	PipelineResult,
	PipelineError
} from './types';

// =============================================================================
// Core Infrastructure
// =============================================================================

export {
	detectInputFormat,
	parse,
	formatError,
	formatSuccess,
	formatCommandResult,
	formatInputError,
	CommandRegistry
} from './core';

export type { Command, PipelineOptions } from './core';

// =============================================================================
// Commands
// =============================================================================

export {
	BaseCommand,
	ParseCommand,
	TreeCommand,
	LatexCommand,
	CustomCommand,
	HelpCommand,
	createDefaultRegistry
} from './commands';

export type { OptionDefinition } from './commands';

// =============================================================================
// REPL
// =============================================================================

export { startRepl } from './repl';
