/**
 * Color Utilities - Function color palette and color management
 *
 * This module provides a curated palette of accessible colors for
 * mathematical functions that work well in both light and dark modes.
 *
 * The colors are chosen to be:
 * - Visually distinct from each other
 * - Accessible (sufficient contrast in both themes)
 * - Aesthetically pleasing for mathematical graphs
 *
 * @module grapheur/colors
 */

// =============================================================================
// Color Palette
// =============================================================================

/**
 * Palette of 8 accessible colors for function plotting
 *
 * These colors are carefully selected to:
 * - Work on both light and dark backgrounds
 * - Be distinguishable for most color vision types
 * - Match common mathematical graphing conventions
 *
 * The order is designed for optimal visual distinction when
 * multiple functions are plotted together.
 */
export const FUNCTION_COLORS = [
	'#2563eb', // Blue (primary, most common for first function)
	'#dc2626', // Red (classic secondary color)
	'#16a34a', // Green (good contrast with blue/red)
	'#9333ea', // Purple (distinct from primary colors)
	'#ea580c', // Orange (warm, stands out)
	'#0891b2', // Cyan (cool, complements orange)
	'#be185d', // Pink/Magenta (distinct from red)
	'#854d0e' // Brown/Amber (warm, high visibility)
] as const;

/**
 * Type for function colors from the palette
 */
export type FunctionColor = (typeof FUNCTION_COLORS)[number];

// =============================================================================
// Color Selection
// =============================================================================

/**
 * Get the next available color from the palette
 *
 * Cycles through the palette, preferring colors not already in use.
 * If all colors are used, returns the least recently used color
 * (the one that appears first in the palette but not in usedColors).
 *
 * @param usedColors - Array of colors currently in use
 * @returns The next recommended color to use
 *
 * @example
 * ```typescript
 * // First function gets blue
 * getNextColor([]); // '#2563eb'
 *
 * // Second function gets red
 * getNextColor(['#2563eb']); // '#dc2626'
 *
 * // If all colors used, cycles back to first unused
 * getNextColor(['#2563eb', '#dc2626', '#16a34a']); // '#9333ea'
 * ```
 */
export function getNextColor(usedColors: readonly string[]): string {
	// Create a Set for O(1) lookup
	const usedSet = new Set(usedColors.map((c) => c.toLowerCase()));

	// Find the first color not in use
	for (const color of FUNCTION_COLORS) {
		if (!usedSet.has(color.toLowerCase())) {
			return color;
		}
	}

	// All colors are used - return the first color in the palette
	// This creates a visual cycling effect
	return FUNCTION_COLORS[0];
}

/**
 * Get a color by index, cycling through the palette
 *
 * Useful when you want to assign colors based on function order.
 *
 * @param index - The index (can be any non-negative integer)
 * @returns A color from the palette
 *
 * @example
 * ```typescript
 * getColorByIndex(0); // '#2563eb' (blue)
 * getColorByIndex(1); // '#dc2626' (red)
 * getColorByIndex(8); // '#2563eb' (cycles back to blue)
 * ```
 */
export function getColorByIndex(index: number): string {
	const safeIndex = Math.abs(Math.floor(index)) % FUNCTION_COLORS.length;
	return FUNCTION_COLORS[safeIndex];
}

// =============================================================================
// Color Validation
// =============================================================================

/**
 * Check if a string is a valid CSS color
 *
 * Supports:
 * - Hex colors: #RGB, #RRGGBB, #RRGGBBAA
 * - RGB/RGBA: rgb(r, g, b), rgba(r, g, b, a)
 * - HSL/HSLA: hsl(h, s%, l%), hsla(h, s%, l%, a)
 * - Named colors: red, blue, etc.
 *
 * @param color - The color string to validate
 * @returns true if the color appears to be valid CSS
 *
 * @example
 * ```typescript
 * isValidColor('#2563eb');     // true
 * isValidColor('rgb(0,0,255)'); // true
 * isValidColor('blue');         // true
 * isValidColor('notacolor');    // false (but some invalid named colors may pass)
 * isValidColor('');             // false
 * ```
 */
export function isValidColor(color: string): boolean {
	if (!color || typeof color !== 'string') {
		return false;
	}

	const trimmed = color.trim();
	if (trimmed.length === 0) {
		return false;
	}

	// Hex color patterns
	const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{4}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;
	if (hexPattern.test(trimmed)) {
		return true;
	}

	// RGB/RGBA pattern
	const rgbPattern = /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(,\s*[\d.]+\s*)?\)$/i;
	if (rgbPattern.test(trimmed)) {
		return true;
	}

	// HSL/HSLA pattern
	const hslPattern = /^hsla?\(\s*\d{1,3}\s*,\s*\d{1,3}%\s*,\s*\d{1,3}%\s*(,\s*[\d.]+\s*)?\)$/i;
	if (hslPattern.test(trimmed)) {
		return true;
	}

	// Named colors (basic check - just verify it looks like a valid identifier)
	// This is a loose check; proper validation would need the full CSS color list
	const namedColorPattern = /^[a-zA-Z]+$/;
	if (namedColorPattern.test(trimmed)) {
		// Check against a list of known CSS color names
		return CSS_COLOR_NAMES.has(trimmed.toLowerCase());
	}

	return false;
}

/**
 * Check if a color is from the function palette
 *
 * @param color - The color to check
 * @returns true if the color is in FUNCTION_COLORS
 */
export function isPaletteColor(color: string): boolean {
	return FUNCTION_COLORS.some((c) => c.toLowerCase() === color.toLowerCase());
}

/**
 * Normalize a color to lowercase for comparison
 *
 * @param color - The color to normalize
 * @returns Normalized color string
 */
export function normalizeColor(color: string): string {
	return color.trim().toLowerCase();
}

// =============================================================================
// CSS Named Colors Set
// =============================================================================

/**
 * Set of valid CSS named colors (lowercase)
 */
const CSS_COLOR_NAMES = new Set([
	'aliceblue',
	'antiquewhite',
	'aqua',
	'aquamarine',
	'azure',
	'beige',
	'bisque',
	'black',
	'blanchedalmond',
	'blue',
	'blueviolet',
	'brown',
	'burlywood',
	'cadetblue',
	'chartreuse',
	'chocolate',
	'coral',
	'cornflowerblue',
	'cornsilk',
	'crimson',
	'cyan',
	'darkblue',
	'darkcyan',
	'darkgoldenrod',
	'darkgray',
	'darkgreen',
	'darkgrey',
	'darkkhaki',
	'darkmagenta',
	'darkolivegreen',
	'darkorange',
	'darkorchid',
	'darkred',
	'darksalmon',
	'darkseagreen',
	'darkslateblue',
	'darkslategray',
	'darkslategrey',
	'darkturquoise',
	'darkviolet',
	'deeppink',
	'deepskyblue',
	'dimgray',
	'dimgrey',
	'dodgerblue',
	'firebrick',
	'floralwhite',
	'forestgreen',
	'fuchsia',
	'gainsboro',
	'ghostwhite',
	'gold',
	'goldenrod',
	'gray',
	'green',
	'greenyellow',
	'grey',
	'honeydew',
	'hotpink',
	'indianred',
	'indigo',
	'ivory',
	'khaki',
	'lavender',
	'lavenderblush',
	'lawngreen',
	'lemonchiffon',
	'lightblue',
	'lightcoral',
	'lightcyan',
	'lightgoldenrodyellow',
	'lightgray',
	'lightgreen',
	'lightgrey',
	'lightpink',
	'lightsalmon',
	'lightseagreen',
	'lightskyblue',
	'lightslategray',
	'lightslategrey',
	'lightsteelblue',
	'lightyellow',
	'lime',
	'limegreen',
	'linen',
	'magenta',
	'maroon',
	'mediumaquamarine',
	'mediumblue',
	'mediumorchid',
	'mediumpurple',
	'mediumseagreen',
	'mediumslateblue',
	'mediumspringgreen',
	'mediumturquoise',
	'mediumvioletred',
	'midnightblue',
	'mintcream',
	'mistyrose',
	'moccasin',
	'navajowhite',
	'navy',
	'oldlace',
	'olive',
	'olivedrab',
	'orange',
	'orangered',
	'orchid',
	'palegoldenrod',
	'palegreen',
	'paleturquoise',
	'palevioletred',
	'papayawhip',
	'peachpuff',
	'peru',
	'pink',
	'plum',
	'powderblue',
	'purple',
	'rebeccapurple',
	'red',
	'rosybrown',
	'royalblue',
	'saddlebrown',
	'salmon',
	'sandybrown',
	'seagreen',
	'seashell',
	'sienna',
	'silver',
	'skyblue',
	'slateblue',
	'slategray',
	'slategrey',
	'snow',
	'springgreen',
	'steelblue',
	'tan',
	'teal',
	'thistle',
	'tomato',
	'transparent',
	'turquoise',
	'violet',
	'wheat',
	'white',
	'whitesmoke',
	'yellow',
	'yellowgreen'
]);
