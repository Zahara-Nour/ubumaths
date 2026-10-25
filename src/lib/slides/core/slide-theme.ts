/**
 * Thème d'une diapositive d'après son fond
 * ========================================
 *
 * Les couleurs du site sont écrites en `light-dark()` (`src/app.css`) : poser
 * `color-scheme` sur une diapositive fait basculer tout son contenu (texte,
 * tableaux, blocs ubumark). Encore faut-il savoir si le fond est clair ou sombre :
 *
 * - thème imposé (`theme="clair" | "sombre"`) → celui-là ;
 * - fond de couleur unie lisible (`#rgb`, `#rrggbb`, `rgb()`, `rgba()` opaque,
 *   `white`, `black`) → d'après sa luminance ;
 * - aucun fond → la diapositive est posée sur le fond du site : elle suit le site ;
 *   (un `theme` sans fond s'applique quand même : il doit accompagner un fond
 *   que la diapositive ne déclare pas, peint par son parent) ;
 * - dégradé, image, vidéo, page, couleur transparente ou illisible → on ne
 *   devine pas (la diapositive garde son texte blanc d'avant).
 *
 * Chantier demo-debug, PR 6i-b.
 */
import type { SlideTheme } from './types.js';

// Types
export type SlideColorScheme = 'light' | 'dark' | 'site' | 'unknown';

interface SlideBackground {
	background?: string;
	backgroundImage?: string;
	backgroundVideo?: string;
	backgroundIframe?: string;
	theme?: SlideTheme;
}

// Constantes
// Luminance où le contraste avec le noir égale celui avec le blanc (WCAG) :
// au-dessus, un texte foncé se lit mieux
const LUMINANCE_THRESHOLD = 0.179;

const NAMED_COLORS: Record<string, [number, number, number]> = {
	white: [255, 255, 255],
	black: [0, 0, 0]
};

const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/;
// rgb(r, g, b), rgba(r, g, b, 1), rgb(r g b), rgb(r g b / 1) : opaque seulement
const RGB_COLOR =
	/^rgba?\(\s*(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})(?:\s*,\s*|\s+)(\d{1,3})\s*(?:[,/]\s*(?:1|1\.0+|100%)\s*)?\)$/;

// Functions
/** Le thème de la diapositive : imposé, déduit de son fond, celui du site, ou inconnu. */
export function slideColorScheme(slide: SlideBackground): SlideColorScheme {
	if (slide.theme === 'clair') return 'light';
	if (slide.theme === 'sombre') return 'dark';
	if (slide.backgroundImage || slide.backgroundVideo || slide.backgroundIframe) return 'unknown';
	if (!slide.background) return 'site';
	const rgb = parseOpaqueColor(slide.background);
	if (rgb === null) return 'unknown';
	return relativeLuminance(rgb) > LUMINANCE_THRESHOLD ? 'light' : 'dark';
}

/** Les composantes d'une couleur unie opaque, ou null si elle n'est pas lisible. */
function parseOpaqueColor(value: string): [number, number, number] | null {
	const color = value.trim().toLowerCase();
	if (Object.hasOwn(NAMED_COLORS, color)) return NAMED_COLORS[color];
	const hex = HEX_COLOR.exec(color);
	if (hex) {
		const digits = hex[1].length === 3 ? [...hex[1]].map((d) => d + d).join('') : hex[1];
		return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16)) as [number, number, number];
	}
	const rgb = RGB_COLOR.exec(color);
	if (rgb) {
		const channels = [rgb[1], rgb[2], rgb[3]].map(Number);
		if (channels.some((channel) => channel > 255)) return null;
		return channels as [number, number, number];
	}
	return null;
}

/** Luminance relative WCAG d'une couleur sRGB. */
function relativeLuminance([r, g, b]: [number, number, number]): number {
	const [lr, lg, lb] = [r, g, b].map((channel) => {
		const c = channel / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	});
	return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}
