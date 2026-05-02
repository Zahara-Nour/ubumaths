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
 * Standard lowercase LaTeX Greek-letter commands. `pi` is included here for
 * tokenization, but is special-cased by parsers as a MathConstant rather than
 * a GreekLetter node. Omicron is omitted (rendered as the latin letter `o`).
 */
export const SUPPORTED_GREEK_LETTERS: ReadonlySet<string> = new Set([
	'alpha',
	'beta',
	'gamma',
	'delta',
	'epsilon',
	'zeta',
	'eta',
	'theta',
	'iota',
	'kappa',
	'lambda',
	'mu',
	'nu',
	'xi',
	'pi',
	'rho',
	'sigma',
	'tau',
	'upsilon',
	'phi',
	'chi',
	'psi',
	'omega'
]);

/**
 * Type for supported Greek letter names
 */
export type SupportedGreekLetter =
	| 'alpha'
	| 'beta'
	| 'gamma'
	| 'delta'
	| 'epsilon'
	| 'zeta'
	| 'eta'
	| 'theta'
	| 'iota'
	| 'kappa'
	| 'lambda'
	| 'mu'
	| 'nu'
	| 'xi'
	| 'pi'
	| 'rho'
	| 'sigma'
	| 'tau'
	| 'upsilon'
	| 'phi'
	| 'chi'
	| 'psi'
	| 'omega';

/**
 * Check if a string is a supported Greek letter
 */
export function isSupportedGreekLetter(name: string): name is SupportedGreekLetter {
	return SUPPORTED_GREEK_LETTERS.has(name);
}
