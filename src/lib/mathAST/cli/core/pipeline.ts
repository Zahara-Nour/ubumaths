/**
 * Parsing Pipeline
 *
 * Converts input strings to MathAST nodes using the appropriate parser.
 * Handles format detection, parsing, and error collection.
 */

import type { PipelineResult, PipelineError, InputFormat } from '../types';
import { parseLatexSafe } from '../../parser';
import { detectInputFormat } from './input-detector';

// =============================================================================
// Pipeline Options
// =============================================================================

/**
 * Options for the parsing pipeline
 */
export interface PipelineOptions {
	/** Force a specific input format instead of auto-detecting */
	readonly forceFormat?: InputFormat;
}

// =============================================================================
// Pipeline Implementation
// =============================================================================

/**
 * Parse a mathematical expression into a MathAST node.
 *
 * This is the main entry point for the CLI parsing pipeline. It:
 * 1. Detects or uses the forced input format
 * 2. Routes to the appropriate parser
 * 3. Collects and formats any errors
 *
 * @param input - The mathematical expression to parse
 * @param options - Pipeline options
 * @returns Pipeline result with AST and any errors
 *
 * @example
 * ```typescript
 * // Auto-detect format
 * const result = parse('\\frac{a}{b}');
 *
 * // Force LaTeX format
 * const result = parse('a/b', { forceFormat: 'latex' });
 *
 * // Check for errors
 * if (result.errors.length > 0) {
 *   console.error('Parse errors:', result.errors);
 * }
 * ```
 */
export function parse(input: string, options?: PipelineOptions): PipelineResult {
	const trimmedInput = input.trim();

	// Detect or use forced format
	const detection = options?.forceFormat
		? { format: options.forceFormat, confidence: 1 }
		: detectInputFormat(trimmedInput);

	const errors: PipelineError[] = [];

	// Handle unsupported custom format
	if (detection.format === 'custom') {
		errors.push({
			code: 'UNSUPPORTED_FORMAT',
			message: 'Custom syntax not yet supported. Use LaTeX.',
			suggestion: 'Example: \\frac{a}{b} instead of a/b'
		});
		return { errors, inputFormat: detection.format };
	}

	// Handle unknown format
	if (detection.format === 'unknown') {
		errors.push({
			code: 'UNSUPPORTED_FORMAT',
			message: 'Could not determine input format.',
			suggestion: 'Try using LaTeX syntax, e.g., x^2 + 3x - 5'
		});
		return { errors, inputFormat: detection.format };
	}

	// Parse as LaTeX
	const result = parseLatexSafe(trimmedInput, { mode: 'tolerant' });

	// Convert parser errors to pipeline errors
	for (const err of result.errors) {
		errors.push({
			code: 'PARSE_ERROR',
			message: err.message,
			position: err.position
		});
	}

	return {
		ast: result.ast ?? undefined,
		errors,
		inputFormat: detection.format
	};
}
