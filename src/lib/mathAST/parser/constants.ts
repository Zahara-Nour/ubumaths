/**
 * Shared Parser Constants
 *
 * Constants that are shared between both LaTeX and Custom syntax parsers
 * to ensure consistent support for Greek letters and symbols.
 *
 * @module mathAST/parser/constants
 */

// =============================================================================
// Supported Greek Letters
// =============================================================================

/**
 * Greek letters supported by both parsers (LaTeX and Custom).
 *
 * This is the source of truth for which Greek letters can be used.
 * Both parsers MUST support exactly this set.
 *
 * Supported: pi, alpha, beta, gamma, theta
 * Not supported: All other Greek letters (omega, sigma, delta, etc.)
 */
export const SUPPORTED_GREEK_LETTERS: ReadonlySet<string> = new Set([
	'pi',
	'alpha',
	'beta',
	'gamma',
	'theta'
]);

/**
 * Type for supported Greek letter names
 */
export type SupportedGreekLetter = 'pi' | 'alpha' | 'beta' | 'gamma' | 'theta';

/**
 * Check if a string is a supported Greek letter
 */
export function isSupportedGreekLetter(name: string): name is SupportedGreekLetter {
	return SUPPORTED_GREEK_LETTERS.has(name);
}
