/**
 * French Number Formatting for LaTeX
 *
 * Converts decimal numbers in LaTeX expressions to French notation:
 * - Decimal point → comma with proper LaTeX spacing: {,}
 * - Thin spaces every 3 digits (if >= 4 digits): \,
 *
 * @module utils/french-math
 */

// =============================================================================
// Types
// =============================================================================

export interface FrenchDecimalOptions {
	/**
	 * Add thin spaces every 3 digits when >= 4 digits present.
	 * - Integer part: spaces from right to left (1234567 → 1\,234\,567)
	 * - Decimal part: spaces from left to right (89012345 → 890\,123\,45)
	 *
	 * @default true
	 */
	formatSpaces?: boolean;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_OPTIONS: Required<FrenchDecimalOptions> = {
	formatSpaces: true
};

/** Minimum digits to apply spacing (4 or more digits triggers spacing) */
const MIN_DIGITS_FOR_SPACING = 4;

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Format integer part with thin spaces from right to left.
 * Only applies spacing if >= MIN_DIGITS_FOR_SPACING digits.
 *
 * @example
 * formatIntegerPart("1234567") → "1\\,234\\,567"
 * formatIntegerPart("123") → "123"
 */
function formatIntegerPart(intPart: string, applySpaces: boolean): string {
	if (!applySpaces || intPart.length < MIN_DIGITS_FOR_SPACING) {
		return intPart;
	}
	// Insert \, every 3 digits from the right
	return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');
}

/**
 * Format decimal part with thin spaces from left to right.
 * Only applies spacing if >= MIN_DIGITS_FOR_SPACING digits.
 *
 * @example
 * formatDecimalPart("14159265") → "141\\,592\\,65"
 * formatDecimalPart("14") → "14"
 */
function formatDecimalPart(decPart: string, applySpaces: boolean): string {
	if (!applySpaces || decPart.length < MIN_DIGITS_FOR_SPACING) {
		return decPart;
	}
	// Insert \, every 3 digits from the left
	return decPart.replace(/(\d{3})(?=\d)/g, '$1\\,');
}

/**
 * Format a single number string to French LaTeX notation.
 *
 * @param numStr - Number string (e.g., "3.14", "1234567.89")
 * @param options - Formatting options
 * @returns French-formatted LaTeX string
 */
function formatSingleNumber(numStr: string, options: Required<FrenchDecimalOptions>): string {
	// Match: optional digits, optional decimal point, optional more digits
	const match = numStr.match(/^(\d*)(?:\.(\d+))?$/);
	if (!match) return numStr;

	const [, intPart = '', decPart] = match;

	// Handle case where number starts with decimal (e.g., ".5")
	const formattedInt = intPart ? formatIntegerPart(intPart, options.formatSpaces) : '';

	// No decimal part - return integer only
	if (!decPart) {
		return formattedInt || numStr;
	}

	// Format decimal part
	const formattedDec = formatDecimalPart(decPart, options.formatSpaces);

	// Use {,} for proper LaTeX spacing (avoids extra space after comma)
	return `${formattedInt}{,}${formattedDec}`;
}

// =============================================================================
// Main Export
// =============================================================================

/**
 * Convert decimal numbers in LaTeX to French notation.
 *
 * Finds standalone numbers in the LaTeX string and converts them:
 * - Decimal point → comma: 3.14 → 3{,}14
 * - Thin spaces every 3 digits (if >= 4 digits)
 *
 * Preserves LaTeX commands and structure.
 *
 * @param latex - LaTeX string containing numbers
 * @param options - Formatting options
 * @returns LaTeX with French-formatted numbers
 *
 * @example
 * // Basic conversion
 * toFrenchDecimal("x = 3.14") → "x = 3{,}14"
 *
 * // With spacing (>= 4 digits)
 * toFrenchDecimal("1234.5678") → "1\\,234{,}567\\,8"
 *
 * // Preserves LaTeX
 * toFrenchDecimal("\\frac{3.14}{2}") → "\\frac{3{,}14}{2}"
 *
 * // Disable spacing
 * toFrenchDecimal("1234.56", { formatSpaces: false }) → "1234{,}56"
 */
export function toFrenchDecimal(latex: string, options: FrenchDecimalOptions = {}): string {
	const opts = { ...DEFAULT_OPTIONS, ...options };

	// Match all numbers and convert them to French notation
	// Pattern: digit sequences with optional decimal point
	return latex.replace(/(\d+(?:\.\d+)?)/g, (match, numStr) => {
		return formatSingleNumber(numStr, opts);
	});
}
