/**
 * CLI Types for MathAST
 *
 * Type definitions for the command-line interface infrastructure.
 * All types use readonly modifiers for immutability.
 */

import type { MathNode } from '../types';

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
	| 'UNSUPPORTED_FORMAT';

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
}

/**
 * Result of command execution
 */
export interface CommandResult {
	readonly output: string;
	readonly success: boolean;
	readonly error?: CommandError;
	readonly ast?: MathNode;
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
