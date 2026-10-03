/**
 * Couleurs des courbes du grapheur.
 *
 * Une courbe stocke une **identité** (`curve-1`…`curve-4`), jamais une valeur :
 * la teinte vit dans `src/app.css` (`--color-curve-N`, en `light-dark()`), et
 * suit donc le mode clair / sombre sans que la courbe enregistrée change.
 *
 * Quatre couleurs seulement : sous la contrainte de contraste (≥ 4,5 sur le fond
 * du grapheur), huit couleurs ne peuvent pas rester distinctes pour un élève
 * daltonien. Les courbes 5 à 8 reprennent donc les quatre couleurs en pointillés.
 * Mesures et décisions : docs/wip/grapheur-couleurs-theme-progress.md.
 *
 * @module geometry-core/rendering/colors
 */

import type { LineStyle } from '../viewport/types';

// =============================================================================
// Palette
// =============================================================================

/** Les 4 identités de couleur, dans l'ordre d'attribution */
export const CURVE_COLORS = ['curve-1', 'curve-2', 'curve-3', 'curve-4'] as const;

export type CurveColor = (typeof CURVE_COLORS)[number];

/** Nom affiché à l'élève (sélecteur de couleur) */
export const CURVE_COLOR_LABELS: Record<CurveColor, string> = {
	'curve-1': 'bleu',
	'curve-2': 'framboise',
	'curve-3': 'ocre',
	'curve-4': 'violet'
};

/** Une place : une couleur et un style de trait */
export interface CurveSlot {
	readonly color: CurveColor;
	readonly lineStyle: LineStyle;
}

/** Les 8 places, dans l'ordre d'attribution : trait plein, puis pointillés */
export const CURVE_SLOTS: readonly CurveSlot[] = [
	...CURVE_COLORS.map((color) => ({ color, lineStyle: 'solid' as const })),
	...CURVE_COLORS.map((color) => ({ color, lineStyle: 'dashed' as const }))
];

export function isCurveColor(color: string): color is CurveColor {
	return (CURVE_COLORS as readonly string[]).includes(color);
}

/**
 * Ce qu'on écrit dans `style:stroke` / `style:fill`.
 *
 * ⚠️ Pas dans un attribut de présentation SVG (`stroke={…}`) : une `var()` n'y est
 * pas garantie. Une couleur hors palette (ancienne sauvegarde non reconnue) passe
 * telle quelle.
 */
export function curveColorValue(color: string): string {
	return isCurveColor(color) ? `var(--color-${color})` : color;
}

// =============================================================================
// Attribution
// =============================================================================

/**
 * La première place libre pour une nouvelle courbe.
 *
 * Une place est prise par une courbe qui a **à la fois** sa couleur et son style :
 * une courbe bleue que l'élève a passée en pointillés libère le bleu plein.
 * Les 8 places prises, on recommence au bleu plein.
 */
export function getNextSlot(
	used: readonly { readonly color: string; readonly lineStyle: LineStyle }[]
): CurveSlot {
	const taken = new Set(used.map((u) => `${u.color}|${u.lineStyle}`));
	return CURVE_SLOTS.find((s) => !taken.has(`${s.color}|${s.lineStyle}`)) ?? CURVE_SLOTS[0];
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
