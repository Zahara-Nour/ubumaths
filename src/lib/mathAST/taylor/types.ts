/**
 * Taylor Series Types
 *
 * Type definitions for Taylor series expansion functionality.
 *
 * @module mathAST/taylor
 */

// =============================================================================
// Taylor Options
// =============================================================================

/**
 * Options for Taylor series expansion
 */
export interface TaylorOptions {
	/**
	 * Variable to expand with respect to.
	 * @default 'x'
	 */
	readonly variable?: string;

	/**
	 * Point around which to expand (the center of the series).
	 * For Maclaurin series, use 0.
	 * @default 0
	 */
	readonly center?: number;

	/**
	 * Number of terms to compute (0 to terms-1).
	 * Maximum allowed is 20 to prevent performance issues.
	 * @default 5
	 */
	readonly terms?: number;
}

/**
 * Default options for Taylor expansion
 */
export const DEFAULT_TAYLOR_OPTIONS: Required<TaylorOptions> = {
	variable: 'x',
	center: 0,
	terms: 5
} as const;

/**
 * Maximum number of terms allowed in Taylor expansion.
 * This limit prevents performance issues with factorial computation.
 */
export const MAX_TAYLOR_TERMS = 20;

// =============================================================================
// Taylor Error
// =============================================================================

/**
 * Error thrown during Taylor series expansion
 */
export class TaylorError extends Error {
	constructor(
		message: string,
		public readonly nodeType?: string,
		public readonly details?: string
	) {
		super(message);
		this.name = 'TaylorError';
	}
}
