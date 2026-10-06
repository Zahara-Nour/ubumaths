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
	 * Ordre du développement : le degré maximal (convention des
	 * développements limités) — `order: 4` calcule les degrés 0 à 4.
	 * Entier entre 0 et `MAX_TAYLOR_ORDER`.
	 * @default 4
	 */
	readonly order?: number;
}

/**
 * Default options for Taylor expansion
 */
export const DEFAULT_TAYLOR_OPTIONS: Required<TaylorOptions> = {
	variable: 'x',
	center: 0,
	order: 4
} as const;

/**
 * Ordre maximal d'un développement (20 termes, degrés 0 à 19).
 * Cette limite évite les calculs de factorielles et de dérivées trop lourds.
 */
export const MAX_TAYLOR_ORDER = 19;

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
