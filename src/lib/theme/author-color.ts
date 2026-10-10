/**
 * Couleur écrite par un auteur dans un bloc (droite graduée, cercle trigo, figure).
 *
 * - Résolution : nom de la palette (français ou anglais) → variable du thème à
 *   l'écran, variante claire au PDF ; hexadécimal → tel quel dans les deux modes
 *   (D2a) ; tout le reste → la couleur par défaut du bloc.
 * - Avertissements à l'auteur (jamais d'erreur : le bloc s'affiche toujours) :
 *   couleur inconnue (L3-a), hex peu lisible sur le fond SOMBRE (D2 : contraste
 *   WCAG < 3:1, ou opacité < 50 %), avec le nom de la palette le plus proche (ΔE OKLab).
 *
 * Décisions : docs/archive/wip/couleurs-lot3-progress.md.
 *
 * @module theme/author-color
 */

import {
	CHROMATIC_NAMED_COLORS,
	HEX_COLOR,
	NAMED_COLORS,
	NAMED_COLOR_PRINT,
	namedColorScreen,
	resolveNamedColor,
	type NamedColor
} from './named-colors';

// =============================================================================
// Types
// =============================================================================

export interface AuthorColor {
	/** Valeur sûre pour `style:` : `var(--color-…)` ou `#hex` validé */
	screen: string;
	/** Hex `#rrggbb` (ou forme courte) imprimé au PDF : variante claire */
	print: string;
	/** Message pour l'auteur, ou null */
	warning: string | null;
}

// =============================================================================
// Constantes
// =============================================================================

/**
 * Fonds sombres sur lesquels un bloc peut s'afficher : la page et les cartes
 * (`--color-background`, `--color-card` d'app.css, valeurs sombres — vérifié
 * par test). Le contraste retenu est le pire des deux.
 */
export const DARK_BACKGROUNDS = ['#262624', '#2f2f2f'] as const;

/** Seuil WCAG pour un élément graphique (1.4.11, contraste non textuel) */
export const MIN_DARK_CONTRAST = 3;

/** En dessous, une couleur est un gris : on propose `noir`, qui suit le texte */
const ACHROMATIC_CHROMA = 0.04;

/** Longueur maximale d'une valeur d'auteur citée dans un message */
const MAX_QUOTED = 40;

// =============================================================================
// Conversions
// =============================================================================

/** `#rgb`, `#rgba`, `#rrggbb`, `#rrggbbaa` → [r, g, b] dans 0..1 (alpha ignoré) */
function hexToRgb(hex: string): [number, number, number] {
	let digits = hex.trim().replace(/^#/, '');
	if (digits.length <= 4) digits = [...digits].map((c) => c + c).join('');
	return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255) as [
		number,
		number,
		number
	];
}

function toLinear(c: number): number {
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
	const [r, g, b] = hexToRgb(hex).map(toLinear);
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** OKLab (Björn Ottosson, 2020) : [L, a, b] */
function toOklab(hex: string): [number, number, number] {
	const [r, g, b] = hexToRgb(hex).map(toLinear);
	const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
	const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
	const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
	return [
		0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
		1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
		0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
	];
}

// =============================================================================
// Mesures
// =============================================================================

/** Contraste WCAG 2 entre deux hex, de 1 à 21 */
export function contrastRatio(a: string, b: string): number {
	const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

/** OKLab d'un hex : [L, a, b] (exposé pour les valeurs de référence des tests) */
export function hexToOklab(hex: string): [number, number, number] {
	return toOklab(hex);
}

/** Distance perceptuelle ΔE dans OKLab (euclidienne) */
export function deltaEOk(a: string, b: string): number {
	const [l1, a1, b1] = toOklab(a);
	const [l2, a2, b2] = toOklab(b);
	return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * Le nom de palette le plus proche d'un hex : `noir` pour un gris (il suit le
 * texte, lisible dans les deux modes), sinon la teinte la plus proche en ΔE
 * OKLab, comparée à sa variante claire (celle qu'un auteur a sous les yeux).
 */
export function nearestNamedColor(hex: string): NamedColor {
	const [, a, b] = toOklab(hex);
	if (Math.hypot(a, b) < ACHROMATIC_CHROMA) return 'noir';
	let best: NamedColor = CHROMATIC_NAMED_COLORS[0];
	let bestDistance = Infinity;
	for (const name of CHROMATIC_NAMED_COLORS) {
		const distance = deltaEOk(hex, NAMED_COLOR_PRINT[name]);
		if (distance < bestDistance) {
			best = name;
			bestDistance = distance;
		}
	}
	return best;
}

/** Opacité d'un hex à 4 ou 8 chiffres (0..1) ; 1 sans canal alpha */
export function hexAlpha(hex: string): number {
	const digits = hex.trim().replace(/^#/, '');
	if (digits.length === 4) return parseInt(digits[3] + digits[3], 16) / 255;
	if (digits.length === 8) return parseInt(digits.slice(6, 8), 16) / 255;
	return 1;
}

/** En dessous, une couleur trop transparente est signalée (le contraste l'ignorerait) */
export const MIN_ALPHA = 0.5;

/** Contraste du hex sur le pire des fonds sombres */
function worstDarkContrast(hex: string): number {
	return Math.min(...DARK_BACKGROUNDS.map((bg) => contrastRatio(hex, bg)));
}

function formatRatio(ratio: number): string {
	return ratio.toFixed(1).replace('.', ',');
}

/**
 * Avertissement D2 : un hex d'auteur peu lisible en mode sombre, ou null.
 * Le hex n'est PAS modifié (D2a) ; on suggère un nom qui suit le thème.
 */
export function darkContrastWarning(hex: string): string | null {
	if (!HEX_COLOR.test(hex.trim())) return null;
	// Le contraste se calcule sur la couleur opaque : un alpha faible le fausserait
	const alpha = hexAlpha(hex);
	if (alpha < MIN_ALPHA) {
		return (
			`la couleur ${hex.trim()} est trop transparente (opacité ${Math.round(alpha * 100)} %, ` +
			`minimum ${MIN_ALPHA * 100} %) : écrire plutôt « ${nearestNamedColor(hex)} », qui s’adapte au thème`
		);
	}
	const ratio = worstDarkContrast(hex);
	if (ratio >= MIN_DARK_CONTRAST) return null;
	const suggestion = nearestNamedColor(hex);
	return (
		`la couleur ${hex.trim()} est peu lisible en mode sombre (contraste ${formatRatio(ratio)}:1, ` +
		`minimum ${MIN_DARK_CONTRAST}:1) : écrire plutôt « ${suggestion} », qui s’adapte au thème`
	);
}

// =============================================================================
// Résolution
// =============================================================================

function quoted(raw: string): string {
	const value = raw.trim();
	return value.length > MAX_QUOTED ? `${value.slice(0, MAX_QUOTED)}…` : value;
}

/** Message L3-a : couleur inconnue, remplacée par le défaut du bloc */
export function unknownColorWarning(raw: string, fallback: NamedColor): string {
	return (
		`couleur inconnue « ${quoted(raw)} », remplacée par ${fallback} ` +
		`(noms acceptés : ${NAMED_COLORS.join(', ')}, ou leur nom anglais, ou un code comme #2563eb)`
	);
}

/**
 * La couleur d'un auteur, prête pour l'écran et le PDF. Ne lève jamais : une
 * valeur inconnue ou hostile (`red; background:url(…)`) devient le défaut,
 * avec un avertissement.
 */
export function resolveAuthorColor(raw: string | undefined, fallback: NamedColor): AuthorColor {
	const byDefault = { screen: namedColorScreen(fallback), print: NAMED_COLOR_PRINT[fallback] };
	if (raw === undefined || raw.trim() === '') return { ...byDefault, warning: null };

	const named = resolveNamedColor(raw);
	if (named !== null) {
		return { screen: namedColorScreen(named), print: NAMED_COLOR_PRINT[named], warning: null };
	}

	const value = raw.trim();
	if (HEX_COLOR.test(value)) {
		return { screen: value, print: value, warning: darkContrastWarning(value) };
	}

	return { ...byDefault, warning: unknownColorWarning(raw, fallback) };
}

/** La forme Typst d'une couleur résolue : toujours `rgb("#…")` */
export function authorColorTypst(color: AuthorColor): string {
	return `rgb("${color.print}")`;
}
