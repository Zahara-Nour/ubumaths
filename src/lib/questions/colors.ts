/**
 * Color palette system for question templates
 * Provides predefined color sets for use in mathematical questions
 */

export const COLOR_PALETTES = {
	// Primary colors for highlighting important elements
	primary: [
		'#FF5722', // Red-Orange
		'#2196F3', // Blue
		'#4CAF50', // Green
		'#FFC107', // Amber
		'#9C27B0', // Purple
		'#FF9800', // Orange
		'#00BCD4', // Cyan
		'#E91E63' // Pink
	],

	// Pastel colors for shapes and diagrams
	shapes: [
		'#FFCDD2', // Light Red
		'#C5CAE9', // Light Blue
		'#C8E6C9', // Light Green
		'#FFF9C4', // Light Yellow
		'#E1BEE7', // Light Purple
		'#FFE0B2', // Light Orange
		'#B2EBF2', // Light Cyan
		'#F8BBD0' // Light Pink
	],

	// Dark colors for text emphasis
	text: [
		'#D32F2F', // Dark Red
		'#1976D2', // Dark Blue
		'#388E3C', // Dark Green
		'#F57C00', // Dark Orange
		'#7B1FA2', // Dark Purple
		'#00796B', // Dark Teal
		'#C2185B', // Dark Pink
		'#512DA8' // Dark Deep Purple
	],

	// High contrast pairs for comparisons
	contrast: [
		['#FF5722', '#2196F3'], // Red vs Blue
		['#4CAF50', '#F44336'], // Green vs Red
		['#FFC107', '#9C27B0'], // Amber vs Purple
		['#FF9800', '#00BCD4'] // Orange vs Cyan
	],

	// Rainbow spectrum (ROYGBIV)
	rainbow: [
		'#FF0000', // Red
		'#FF7F00', // Orange
		'#FFFF00', // Yellow
		'#00FF00', // Green
		'#0000FF', // Blue
		'#4B0082', // Indigo
		'#9400D3' // Violet
	]
} as const;

export type PaletteName = keyof typeof COLOR_PALETTES;

/**
 * Resolves a color reference to an actual hex color code
 *
 * @param colorRef - Color reference in format: "paletteName" or "paletteName.index" or "paletteName.random"
 * @param seed - Optional seed for reproducible random selection
 * @returns Hex color code (e.g., "#FF5722")
 *
 * @example
 * getColor('primary') // Random from primary palette
 * getColor('primary.0') // First color in primary palette
 * getColor('primary.random', 42) // Seeded random selection
 * getColor('contrast.0.0') // First color of first contrast pair
 */
export function getColor(colorRef: string, seed?: number): string {
	const parts = colorRef.split('.');
	const paletteName = parts[0] as PaletteName;

	// Validate palette exists
	if (!(paletteName in COLOR_PALETTES)) {
		console.warn(`Unknown color palette: ${paletteName}, defaulting to primary`);
		return COLOR_PALETTES.primary[0];
	}

	const palette = COLOR_PALETTES[paletteName];

	// Handle contrast pairs (special case)
	if (paletteName === 'contrast') {
		const pairIndex = parts[1]
			? parseInt(parts[1])
			: seed
				? seed % palette.length
				: Math.floor(Math.random() * palette.length);
		const pair = palette[pairIndex % palette.length];
		const colorIndex = parts[2] ? parseInt(parts[2]) : 0;
		return pair[colorIndex % pair.length];
	}

	// Handle specific index
	if (parts[1] && parts[1] !== 'random') {
		const index = parseInt(parts[1]);
		if (!isNaN(index) && index >= 0) {
			// Type assertion needed because TypeScript doesn't know palette is not contrast here
			const colors = palette as readonly string[];
			return colors[index % colors.length];
		}
	}

	// Handle random selection (with optional seed)
	const colors = palette as readonly string[];
	if (seed !== undefined) {
		return colors[seed % colors.length];
	}

	return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Gets a specific color from a palette by index
 */
export function getColorByIndex(paletteName: PaletteName, index: number): string {
	const palette = COLOR_PALETTES[paletteName];
	if (paletteName === 'contrast') {
		// For contrast, index refers to pair, return first color
		return palette[index % palette.length][0];
	}
	const colors = palette as readonly string[];
	return colors[index % colors.length];
}

/**
 * Gets a random color from a palette using a seed
 */
export function getRandomColor(paletteName: PaletteName, seed: number): string {
	const palette = COLOR_PALETTES[paletteName];
	if (paletteName === 'contrast') {
		const pair = palette[seed % palette.length];
		return pair[0];
	}
	const colors = palette as readonly string[];
	return colors[seed % colors.length];
}

/**
 * Gets all colors from a palette (flattened)
 */
export function getAllColors(paletteName: PaletteName): string[] {
	const palette = COLOR_PALETTES[paletteName];
	if (paletteName === 'contrast') {
		return palette.flat();
	}
	const colors = palette as readonly string[];
	return [...colors];
}
