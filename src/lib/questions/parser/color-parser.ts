import { getColor, COLOR_PALETTES } from '../colors';

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
 * @param seed - Optional seed for reproducible randomization
 */
export function parseColorExpression(colorExpression: string, seed?: number): ColorParseResult {
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
		const color = getColor(colorExpression, seed);

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
 * @param text - Text containing {#color:...} patterns
 * @param seed - Optional seed for reproducible colors
 * @returns Text with color references replaced by hex codes
 */
export function resolveColorReferences(text: string, seed?: number): string {
	const colorPattern = /\{#color:([^}]+)\}/g;

	// Track color counter for seeding to ensure different colors get different seeds
	let colorCounter = 0;

	return text.replace(colorPattern, (match, colorExpression) => {
		// If seed is provided, modify it for each color occurrence to get variety
		const effectiveSeed = seed !== undefined ? seed + colorCounter++ : undefined;

		const result = parseColorExpression(colorExpression, effectiveSeed);
		if (result.success && result.color) {
			return result.color;
		}
		// On error, leave original pattern for debugging
		console.warn(`Failed to resolve color: ${match}`, result.error);
		return match;
	});
}
