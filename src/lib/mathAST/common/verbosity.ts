/**
 * Verbosity Levels for Step Recording
 *
 * Shared verbosity types and utilities used across all step recorders
 * (normalization, limits, integration, solve).
 *
 * @module mathAST/common/verbosity
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Verbosity level for step recording.
 *
 * - `result`: No steps recorded (fastest, for computation only)
 * - `summarized`: Important transformations only (default for pedagogical display)
 * - `detailed`: All transformations including micro-steps (for debugging/advanced)
 */
export type Verbosity = 'result' | 'summarized' | 'detailed';

// =============================================================================
// Constants
// =============================================================================

/**
 * Ordering of verbosity levels for filtering.
 * Higher number = more verbose.
 */
export const VERBOSITY_ORDER: Readonly<Record<Verbosity, number>> = {
	result: 0,
	summarized: 1,
	detailed: 2
};

// =============================================================================
// Utilities
// =============================================================================

/**
 * Check if a step should be included at a given verbosity level.
 *
 * A step is included if its verbosity level is less than or equal to
 * the requested verbosity level.
 *
 * @param stepVerbosity - The verbosity level of the step
 * @param requestedVerbosity - The verbosity level requested by the user
 * @returns true if the step should be included
 *
 * @example
 * ```typescript
 * // A 'summarized' step is included at 'detailed' level
 * shouldIncludeStep('summarized', 'detailed'); // true
 *
 * // A 'detailed' step is NOT included at 'summarized' level
 * shouldIncludeStep('detailed', 'summarized'); // false
 *
 * // Nothing is included at 'result' level
 * shouldIncludeStep('summarized', 'result'); // false
 * ```
 */
export function shouldIncludeStep(
	stepVerbosity: Verbosity,
	requestedVerbosity: Verbosity
): boolean {
	return VERBOSITY_ORDER[stepVerbosity] <= VERBOSITY_ORDER[requestedVerbosity];
}
