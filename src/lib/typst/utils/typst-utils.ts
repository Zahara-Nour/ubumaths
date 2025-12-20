/**
 * Typst Utilities
 * ===============
 *
 * Common utility functions for Typst document generation.
 * These functions are used across different generators.
 *
 * @module typst/utils
 */

/**
 * Escape special Typst characters in text
 * Re-exports from custom-markdown/generators for convenience
 */
export { escapeTypst, escapeTypstBrackets } from '$lib/ubumark/generators';

/**
 * Format a number according to numbering style
 *
 * @param num - Number to format (1-based)
 * @param style - Numbering style to use
 * @returns Formatted number string
 *
 * @example
 * formatNumber(1, 'numeric') // '1'
 * formatNumber(1, 'alphabetic') // 'A'
 * formatNumber(4, 'roman') // 'IV'
 */
export function formatNumber(num: number, style: 'numeric' | 'alphabetic' | 'roman'): string {
	switch (style) {
		case 'alphabetic':
			// Convert to A, B, C, etc. (1 -> A, 2 -> B, etc.)
			return String.fromCharCode(64 + num);

		case 'roman':
			return toRoman(num);

		case 'numeric':
		default:
			return num.toString();
	}
}

/**
 * Convert number to Roman numerals
 *
 * @param num - Number to convert (1-3999)
 * @returns Roman numeral representation
 *
 * @example
 * toRoman(4) // 'IV'
 * toRoman(9) // 'IX'
 * toRoman(42) // 'XLII'
 * toRoman(2024) // 'MMXXIV'
 */
export function toRoman(num: number): string {
	const romanNumerals: [number, string][] = [
		[1000, 'M'],
		[900, 'CM'],
		[500, 'D'],
		[400, 'CD'],
		[100, 'C'],
		[90, 'XC'],
		[50, 'L'],
		[40, 'XL'],
		[10, 'X'],
		[9, 'IX'],
		[5, 'V'],
		[4, 'IV'],
		[1, 'I']
	];

	let result = '';
	for (const [value, symbol] of romanNumerals) {
		while (num >= value) {
			result += symbol;
			num -= value;
		}
	}
	return result;
}

/**
 * Format date in French locale
 *
 * @param date - Date to format (defaults to current date)
 * @returns Formatted date string in French (e.g., "15 decembre 2024")
 *
 * @example
 * formatDateFR(new Date(2024, 11, 15)) // '15 decembre 2024'
 * formatDateFR() // current date in French format
 */
export function formatDateFR(date?: Date): string {
	const d = date || new Date();
	return d.toLocaleDateString('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric'
	});
}

/**
 * Get localized type label for worksheet type
 *
 * @param type - Worksheet type string
 * @returns French label for the type
 *
 * @example
 * getTypeLabel('worksheet') // "Feuille d'exercices"
 * getTypeLabel('exam') // 'Examen'
 */
export function getTypeLabel(type: string): string {
	const labels: Record<string, string> = {
		worksheet: "Feuille d'exercices",
		assessment: 'Evaluation',
		exam: 'Examen',
		quiz: 'Quiz',
		homework: 'Devoirs'
	};
	return labels[type] || "Feuille d'exercices";
}
