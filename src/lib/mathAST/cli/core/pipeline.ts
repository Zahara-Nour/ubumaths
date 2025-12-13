/**
 * Parsing Pipeline
 *
 * Converts input strings to MathAST nodes using the appropriate parser.
 * Handles format detection, parsing, and error collection.
 * Supports state-aware parsing with generic function names from EvalState.
 */

import type { PipelineResult, PipelineError, InputFormat } from '../types';
import type { LatexParserOptions } from '../../parser';
import { parseLatexSafe } from '../../parser';
import { parseCustomSafe } from '../../parser/custom';
import { detectInputFormat } from './input-detector';
import type { EvalState } from './eval-state';

// =============================================================================
// Pipeline Options
// =============================================================================

/**
 * Options for the parsing pipeline
 */
export interface PipelineOptions {
	/** Force a specific input format instead of auto-detecting */
	readonly forceFormat?: InputFormat;
	/** Evaluation state for parser configuration (generic functions) */
	readonly evalState?: EvalState;
}

// =============================================================================
// Parser Options from State
// =============================================================================

/**
 * Get parser options that include generic function names from EvalState.
 *
 * When functions are defined in the REPL (e.g., f(x) = x^2), the parser needs
 * to know these names to correctly parse expressions like f(3) or f'(x).
 *
 * @param state - Optional evaluation state containing function definitions
 * @returns LatexParserOptions configured for the state's functions
 *
 * @example
 * ```typescript
 * // With functions defined
 * const state = createEvalState();
 * createFunctionBinding(state, 'f', ['x'], parseLatex('x^2'));
 *
 * const options = getParserOptions(state);
 * // options = {
 * //   genericFunctions: {
 * //     names: ['f'],
 * //     allowDerivatives: true,
 * //     allowInverse: true,
 * //     allowComposition: true
 * //   }
 * // }
 * ```
 */
export function getParserOptions(state?: EvalState): LatexParserOptions {
	if (!state || state.functionNames.size === 0) {
		return {};
	}

	return {
		genericFunctions: {
			names: [...state.functionNames],
			allowDerivatives: true,
			allowInverse: true
		}
	};
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

	// Handle unknown format
	if (detection.format === 'unknown') {
		errors.push({
			code: 'UNSUPPORTED_FORMAT',
			message: 'Could not determine input format.',
			suggestion: 'Try using LaTeX syntax, e.g., x^2 + 3x - 5'
		});
		return { errors, inputFormat: detection.format };
	}

	// Parse based on detected format
	if (detection.format === 'custom') {
		const result = parseCustomSafe(trimmedInput, { mode: 'tolerant' });

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

	// Parse as LaTeX (default)
	// Get parser options from evaluation state (includes generic function names)
	const parserOptions = getParserOptions(options?.evalState);
	const result = parseLatexSafe(trimmedInput, {
		mode: 'tolerant',
		...parserOptions
	});

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
