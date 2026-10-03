/**
 * Re-exports from geometry-core/rendering/colors.
 *
 * This file maintains backward compatibility — all existing imports
 * from '$lib/grapheur/colors' continue to work.
 */

export {
	CURVE_COLORS,
	CURVE_COLOR_LABELS,
	CURVE_SLOTS,
	curveColorValue,
	getNextSlot,
	isCurveColor,
	migrateLegacyColor,
	isValidColor,
	normalizeColor
} from '$lib/geometry-core/rendering/colors';

export type { CurveColor, CurveSlot } from '$lib/geometry-core/rendering/colors';
