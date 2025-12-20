/**
 * Display Options for Mathematical Expressions
 * =============================================
 *
 * Controls transformations applied to expressions before rendering.
 * Supports a 3-level cascade:
 * 1. GLOBAL (hardcoded defaults - most conservative)
 * 2. TEMPLATE (defaultDisplayOptions on QuestionTemplate)
 * 3. VARIABLE (displayOptions on individual Variable - highest priority)
 *
 * @module custom-markdown/parameterization/display-options
 *
 * @example Basic usage
 * ```typescript
 * import { resolveDisplayOptions, GLOBAL_DISPLAY_DEFAULTS } from '$lib/ubumark/parameterization';
 *
 * // Template-level defaults
 * const templateDefaults = { shuffleTerms: true, removeNullTerms: true };
 *
 * // Variable-level override
 * const variableOptions = { shuffleTerms: false }; // Override for this variable
 *
 * // Resolve with cascade: global -> template -> variable
 * const resolved = resolveDisplayOptions(templateDefaults, variableOptions);
 * // Result: { shuffleTerms: false, removeNullTerms: true, ... }
 * ```
 */

// ============================================================================
// DISPLAY OPTIONS INTERFACE
// ============================================================================

/**
 * Display options for mathematical expressions
 *
 * Controls transformations applied before rendering.
 * All options are optional - unset values inherit from parent level.
 */
export interface DisplayOptions {
	// === Structural transformations ===

	/**
	 * Randomly shuffle terms in a sum (a + b + c -> c + a + b)
	 *
	 * Applies recursively to nested sums unless shallowShuffleTerms is used.
	 */
	shuffleTerms?: boolean;

	/**
	 * Randomly shuffle factors in a product (a * b * c -> b * c * a)
	 *
	 * Applies recursively to nested products unless shallowShuffleFactors is used.
	 */
	shuffleFactors?: boolean;

	/**
	 * Shuffle both terms AND factors
	 *
	 * Convenience option equivalent to { shuffleTerms: true, shuffleFactors: true }
	 */
	shuffleTermsAndFactors?: boolean;

	/**
	 * Shallow shuffle - only at root level for terms
	 *
	 * Does not apply recursively to nested sums.
	 */
	shallowShuffleTerms?: boolean;

	/**
	 * Shallow shuffle - only at root level for factors
	 *
	 * Does not apply recursively to nested products.
	 */
	shallowShuffleFactors?: boolean;

	/**
	 * Remove null terms (x + 0 -> x) via CE canonization
	 *
	 * Uses Compute Engine's canonical form to simplify.
	 */
	removeNullTerms?: boolean;

	/**
	 * Remove unnecessary brackets
	 *
	 * Applies standard mathematical conventions for bracket removal.
	 */
	removeUnnecessaryBrackets?: boolean;

	// === LaTeX formatting options ===

	/**
	 * Add spaces in LaTeX output
	 *
	 * When true, adds spacing around operators for better readability.
	 * @default true
	 */
	addSpaces?: boolean;

	/**
	 * Keep unnecessary zeros (3.00 instead of 3)
	 *
	 * Useful for preserving decimal precision in display.
	 */
	keepUnnecessaryZeros?: boolean;
}

// ============================================================================
// GLOBAL DEFAULTS
// ============================================================================

/**
 * Global hardcoded defaults - most conservative settings
 *
 * These are the base values used when no template or variable options are specified.
 * All boolean options default to false (no transformation) except addSpaces.
 */
export const GLOBAL_DISPLAY_DEFAULTS: Required<DisplayOptions> = {
	// Structural transformations - all off by default
	shuffleTerms: false,
	shuffleFactors: false,
	shuffleTermsAndFactors: false,
	shallowShuffleTerms: false,
	shallowShuffleFactors: false,
	removeNullTerms: false,
	removeUnnecessaryBrackets: false,

	// LaTeX formatting
	addSpaces: true,
	keepUnnecessaryZeros: false
};

// ============================================================================
// CASCADE RESOLUTION
// ============================================================================

/**
 * Expand the convenience option shuffleTermsAndFactors
 *
 * @param options - Options that may contain the convenience flag
 * @returns Options with shuffleTerms/shuffleFactors set if convenience flag is true
 */
function expandConvenienceOptions(options: DisplayOptions | undefined): DisplayOptions | undefined {
	if (!options) return undefined;

	// If shuffleTermsAndFactors is set, expand it to individual options
	// but don't override explicitly set individual options
	if (options.shuffleTermsAndFactors) {
		return {
			shuffleTerms: options.shuffleTerms ?? true,
			shuffleFactors: options.shuffleFactors ?? true,
			...options
		};
	}

	return options;
}

/**
 * Resolve display options using cascade: global -> template -> variable
 *
 * Each level overrides the previous, with variable-level having highest priority.
 * The convenience option `shuffleTermsAndFactors` is expanded at each level
 * before applying the cascade, ensuring proper override semantics.
 *
 * @param templateDefaults - Options set at template level (overrides global)
 * @param variableOptions - Options set on individual variable (overrides template)
 * @returns Fully resolved options with all values defined
 *
 * @example Simple cascade
 * ```typescript
 * const resolved = resolveDisplayOptions(
 *   { shuffleTerms: true },           // template enables shuffle
 *   { shuffleTerms: false }           // variable disables it
 * );
 * // Result: shuffleTerms is false (variable wins)
 * ```
 *
 * @example Partial override
 * ```typescript
 * const resolved = resolveDisplayOptions(
 *   { shuffleTerms: true, removeNullTerms: true },
 *   { shuffleTerms: false }           // only overrides shuffleTerms
 * );
 * // Result: shuffleTerms: false, removeNullTerms: true
 * ```
 *
 * @example Convenience option expansion
 * ```typescript
 * const resolved = resolveDisplayOptions(
 *   { shuffleTermsAndFactors: true },  // expands to shuffleTerms + shuffleFactors
 *   { shuffleTerms: false }            // variable can override individual flags
 * );
 * // Result: shuffleTerms: false, shuffleFactors: true
 * ```
 */
export function resolveDisplayOptions(
	templateDefaults?: DisplayOptions,
	variableOptions?: DisplayOptions
): Required<DisplayOptions> {
	// Expand convenience options at each level before cascade
	const expandedTemplate = expandConvenienceOptions(templateDefaults);
	const expandedVariable = expandConvenienceOptions(variableOptions);

	return {
		...GLOBAL_DISPLAY_DEFAULTS,
		...expandedTemplate,
		...expandedVariable
	};
}
