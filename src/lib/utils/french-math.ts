/**
 * French Number Formatting for LaTeX
 *
 * Converts decimal numbers in LaTeX expressions to French notation:
 * - Decimal point → comma with proper LaTeX spacing: {,}
 * - Thin spaces every 3 digits (if >= 5 digits, BIPM): \,
 *
 * Un document en anglais garde le point décimal (décision du 2026-09-25) mais
 * groupe aussi par espaces fines : voir {@link toLocaleDecimal}.
 *
 * @module utils/french-math
 */

import type { ContentLocale } from '$lib/types/locale';
import {
	groupDecimalDigits,
	groupIntegerDigits,
	MIN_DIGITS_FOR_GROUPING
} from '$lib/mathAST/digit-grouping';

// =============================================================================
// Types
// =============================================================================

export interface FrenchDecimalOptions {
	/**
	 * Add thin spaces every 3 digits when >= 5 digits present (règle du BIPM,
	 * `mathAST/digit-grouping.ts`) ; each side of the decimal comma counts apart.
	 * - Integer part: spaces from right to left (1234567 → 1\,234\,567)
	 * - Decimal part: spaces from left to right (89012345 → 890\,123\,45)
	 *
	 * @default true
	 */
	formatSpaces?: boolean;
	/**
	 * Seuil de groupement : 5 chiffres par défaut (BIPM), 4 pour un modèle de
	 * question réglé « Espaces dès 4 chiffres » (règle de l'école).
	 */
	minDigits?: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_OPTIONS: Required<FrenchDecimalOptions> = {
	formatSpaces: true,
	minDigits: MIN_DIGITS_FOR_GROUPING
};

// =============================================================================
// Internal Helpers
// =============================================================================

/** Partie entière groupée par espaces fines depuis la droite, dès le seuil. */
function formatIntegerPart(intPart: string, options: Required<FrenchDecimalOptions>): string {
	return options.formatSpaces ? groupIntegerDigits(intPart, '\\,', options.minDigits) : intPart;
}

/** Partie décimale groupée par espaces fines depuis la virgule, dès le seuil. */
function formatDecimalPart(decPart: string, options: Required<FrenchDecimalOptions>): string {
	return options.formatSpaces ? groupDecimalDigits(decPart, '\\,', options.minDigits) : decPart;
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
	const formattedInt = intPart ? formatIntegerPart(intPart, options) : '';

	// No decimal part - return integer only
	if (!decPart) {
		return formattedInt || numStr;
	}

	// Format decimal part
	const formattedDec = formatDecimalPart(decPart, options);

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
 * - Thin spaces every 3 digits (if >= 5 digits)
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
 * // With spacing (>= 5 digits)
 * toFrenchDecimal("12345.67891") → "12\\,345{,}678\\,91"
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
 * espaces fines dès 5 chiffres dans les deux langues (`12\,500`, `3.141\,59`).
 * Une langue inconnue est traitée en français, comme les libellés du document.
 *
 * @example
 * toLocaleDecimal("12345.67891", "en") → "12\\,345.678\\,91"
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
			if (latexComma) return `{,}${formatDecimalPart(numStr, opts)}`;
			return formatSingleNumber(numStr, opts, separator);
		}
	);
}

/**
 * Espaces fines de groupement posées dès `minDigits` chiffres, SANS toucher au
 * séparateur décimal (`3.14159` → `3.141\,59` au seuil 4) : pour un texte figé
 * dont la langue s'applique au rendu (série d'automatismes). Les espaces déjà
 * écrites restent ; le rendu (`toLocaleDecimal`) ne les défait pas.
 */
export function withDigitGrouping(latex: string, minDigits: number): string {
	return latex.replace(
		/(#[0-9A-Fa-f]{3,8}(?![0-9A-Za-z]))|(\{,\}|\.)?(\d+)/g,
		(match, hexColor, decimalSeparator: string | undefined, digits: string) => {
			if (hexColor) return hexColor;
			return decimalSeparator
				? `${decimalSeparator}${groupDecimalDigits(digits, '\\,', minDigits)}`
				: groupIntegerDigits(digits, '\\,', minDigits);
		}
	);
}
