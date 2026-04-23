/**
 * Re-exports from geometry-core/rendering/colors.
 *
 * This file maintains backward compatibility — all existing imports
 * from '$lib/grapheur/colors' continue to work.
 */

export {
	FUNCTION_COLORS,
	getNextColor,
	getColorByIndex,
	isValidColor,
	isPaletteColor,
	normalizeColor
} from '$lib/geometry-core/rendering/colors';

export type { FunctionColor } from '$lib/geometry-core/rendering/colors';
