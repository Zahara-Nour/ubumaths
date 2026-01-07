/**
 * CLI Types for MathAST
 *
 * Type definitions for the command-line interface infrastructure.
 * All types use readonly modifiers for immutability.
 */

import type { MathNode } from '../types';
import type { EvalState } from './core/eval-state';

// =============================================================================
// Input/Output Formats
// =============================================================================

/**
 * Supported input formats for mathematical expressions
 */
export type InputFormat = 'latex' | 'custom' | 'unknown';

// =============================================================================
// Error Types
// =============================================================================

/**
 * Error codes for CLI operations
 */
export type ErrorCode =
	| 'PARSE_ERROR'
	| 'NO_AST'
	| 'UNKNOWN_COMMAND'
	| 'UNKNOWN_ERROR'
	| 'INVALID_OPTIONS'
	| 'UNSUPPORTED_FORMAT'
	| 'UNKNOWN_UNIT'
	| 'DIMENSION_MISMATCH'
	| 'MATH_ERROR';

/**
 * Structured error for command execution
 */
export interface CommandError {
	readonly code: ErrorCode;
	readonly message: string;
	readonly details?: unknown;
}

/**
 * Structured error from the parsing pipeline
 */
export interface PipelineError {
	readonly code: ErrorCode;
	readonly message: string;
	readonly position?: number;
	readonly suggestion?: string;
}

// =============================================================================
// Command System
// =============================================================================

/**
 * Context provided to command execution
 */
export interface CommandContext {
	readonly ast?: MathNode;
	readonly input: string;
	readonly format: InputFormat;
	readonly options: Record<string, unknown>;
	readonly isRepl: boolean;
	/** Evaluation state for variable bindings and mode (REPL only) */
	readonly evalState?: EvalState;
}

/**
 * Result of command execution
 */
export interface CommandResult {
	readonly output: string;
	readonly success: boolean;
	readonly error?: CommandError;
	readonly ast?: MathNode;
	/** Optional HTML-formatted output for web display */
	readonly outputHtml?: string;

	// Toggle support for exact/decimal display (like eval results)
	/** Exact representation (e.g., "x = -1", "x = sqrt(2)") */
	readonly exactOutput?: string;
	readonly exactOutputHtml?: string;
	/** Decimal representation (e.g., "x ≈ -1.00000", "x ≈ 1.41421") */
	readonly decimalOutput?: string;
	readonly decimalOutputHtml?: string;
	/** Whether user can toggle between exact and decimal display */
	readonly canToggle?: boolean;
}

// =============================================================================
// Detection and Pipeline
// =============================================================================

/**
 * Result of input format detection
 */
export interface DetectionResult {
	readonly format: InputFormat;
	readonly confidence: number;
}

/**
 * Result of the parsing pipeline
 */
export interface PipelineResult {
	readonly ast?: MathNode;
	readonly errors: readonly PipelineError[];
	readonly inputFormat: InputFormat;
}
