import { getColor, COLOR_PALETTES } from '../colors';
import type { RandomSource } from '$lib/utils/random';

export interface ColorParseResult {
	success: boolean;
	color?: string;
	error?: string;
}

/**
 * Parses color template syntax: {#color:ref}
 *
 * Formats supported:
 * - {#color:primary} - Random from primary palette
 * - {#color:primary.0} - Specific index
 * - {#color:primary.random} - Explicit random
 * - {#color:contrast.0.0} - First color of first contrast pair
 *
 * @param colorExpression - Expression after "#color:" (e.g., "primary.0")
 * @param random - Source de hasard de l'instance (consommée si la couleur est tirée)
 */
export function parseColorExpression(
	colorExpression: string,
	random: RandomSource = Math.random
): ColorParseResult {
	try {
		// Validate format
		if (!colorExpression || colorExpression.trim().length === 0) {
			return {
				success: false,
				error: 'Empty color expression'
			};
		}

		const parts = colorExpression.split('.');
		const paletteName = parts[0].trim();

		// Validate palette exists
		if (!(paletteName in COLOR_PALETTES)) {
			return {
				success: false,
				error: `Unknown color palette: ${paletteName}`
			};
		}

		// Get color
		const color = getColor(colorExpression, random);

		return {
			success: true,
			color
		};
	} catch (error) {
		return {
			success: false,
			error: `Failed to parse color expression: ${error instanceof Error ? error.message : String(error)}`
		};
	}
}

/**
 * Resolves all color references in a text string
 *
 * Supports both syntaxes:
 * - Legacy: {#color:...} (single brace)
 * - Markdown: {{color:...}} (double brace)
 *
 * @param text - Text containing color patterns
 * @param random - Source de hasard de l'instance : chaque couleur tirée la fait avancer
 * @returns Text with color references replaced by hex codes
 */
export function resolveColorReferences(text: string, random: RandomSource = Math.random): string {
	// Support both legacy {#color:...} and new {{color:...}} syntax
	const colorPattern = /\{#color:([^}]+)\}|\{\{color:([^}]+)\}\}/g;

	return text.replace(colorPattern, (match, legacyGroup, markdownGroup) => {
		// Use whichever group matched (legacy or markdown syntax)
		const colorExpression = legacyGroup || markdownGroup;

		const result = parseColorExpression(colorExpression, random);
		if (result.success && result.color) {
			return result.color;
		}
		// On error, leave original pattern for debugging
		console.warn(`Failed to resolve color: ${match}`, result.error);
		return match;
	});
}
