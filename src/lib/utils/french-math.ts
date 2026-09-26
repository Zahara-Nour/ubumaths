/**
 * French Number Formatting for LaTeX
 *
 * Converts decimal numbers in LaTeX expressions to French notation:
 * - Decimal point → comma with proper LaTeX spacing: {,}
 * - Thin spaces every 3 digits (if >= 4 digits): \,
 *
 * Un document en anglais garde le point décimal (décision du 2026-09-25) mais
 * groupe aussi par espaces fines : voir {@link toLocaleDecimal}.
 *
 * @module utils/french-math
 */

import type { ContentLocale } from '$lib/types/locale';

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
function formatSingleNumber(
	numStr: string,
	options: Required<FrenchDecimalOptions>,
	separator: string
): string {
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

	// `{,}` en français : espacement LaTeX correct (pas d'espace après la virgule)
	return `${formattedInt}${separator}${formattedDec}`;
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
	return toLocaleDecimal(latex, 'fr', options);
}

/** Séparateur décimal écrit en LaTeX, par langue du document. */
const DECIMAL_SEPARATORS: Record<ContentLocale, string> = { fr: '{,}', en: '.' };

/**
 * Nombres d'une formule LaTeX mis en forme selon la langue du document :
 * virgule en français (`3{,}14`), point en anglais (`3.14`) ; groupement par
 * espaces fines dès 4 chiffres dans les deux langues (`12\,500`, `3.141\,59`).
 * Une langue inconnue est traitée en français, comme les libellés du document.
 *
 * @example
 * toLocaleDecimal("1234.5678", "en") → "1\\,234.567\\,8"
 */
export function toLocaleDecimal(
	latex: string,
	locale: ContentLocale | string | undefined,
	options: FrenchDecimalOptions = {}
): string {
	const opts = { ...DEFAULT_OPTIONS, ...options };
	const separator = locale === 'en' ? DECIMAL_SEPARATORS.en : DECIMAL_SEPARATORS.fr;

	// Match all numbers and convert them to French notation
	// Pattern: digit sequences with optional decimal point
	// Chiffres qui suivent une virgule LaTeX `{,}` déjà écrite (`0{,}0484`) : ce sont
	// des décimales, groupées depuis la gauche. Sans ce cas, « 0484 » était groupé
	// comme un entier et s'affichait « 0,0 484 ».
	// Un code couleur (`\\textcolor{#FF5722}`, `#2196F3`) n'est pas un nombre : groupé
	// (`#FF5\\,722`), la couleur devenait invalide et toute correction colorée cassait.
	return latex.replace(
		/(#[0-9A-Fa-f]{3,8}(?![0-9A-Za-z]))|(\{,\})?(\d+(?:\.\d+)?)/g,
		(match, hexColor, latexComma, numStr) => {
			if (hexColor) return hexColor;
			if (latexComma) return `{,}${formatDecimalPart(numStr, opts.formatSpaces)}`;
			return formatSingleNumber(numStr, opts, separator);
		}
	);
}
