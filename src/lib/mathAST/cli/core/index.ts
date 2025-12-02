/**
 * CLI Core Infrastructure
 *
 * This module provides the core infrastructure for the MathAST CLI:
 * - Input format detection
 * - Parsing pipeline
 * - Output formatting with colors
 * - Command registry for extensibility
 *
 * @module mathAST/cli/core
 */

// =============================================================================
// Input Detection
// =============================================================================

export { detectInputFormat } from './input-detector';

// =============================================================================
// Parsing Pipeline
// =============================================================================

export { parse } from './pipeline';
export type { PipelineOptions } from './pipeline';

// =============================================================================
// Output Formatting
// =============================================================================

export {
	formatError,
	formatSuccess,
	formatCommandResult,
	formatInputError
} from './output-formatter';

// =============================================================================
// Command Registry
// =============================================================================

export { CommandRegistry } from './command-registry';
export type { Command } from './command-registry';
