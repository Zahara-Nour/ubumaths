/**
 * Couleurs nommées des figures, courbes et graphiques (`couleur: rouge`).
 *
 * Un auteur écrit un NOM ; le nom suit le thème à l'écran (`var(--color-fig-<nom>)`,
 * défini en `light-dark()` dans `src/app.css`) et prend sa variante claire au PDF.
 * Les codes hexadécimaux écrits par un auteur restent tels quels (décision D2a).
 *
 * Le vocabulaire est un contrat avec le contenu stocké en base : un synonyme
 * ajouté ici l'est pour toujours. Décisions et palette :
 * docs/wip/palette-figures-progress.md.
 *
 * @module theme/named-colors
 */

// =============================================================================
// Vocabulaire
// =============================================================================

/** Les 10 couleurs à teinte propre : variantes claire et sombre dans app.css */
export const CHROMATIC_NAMED_COLORS = [
	'bleu',
	'rouge',
	'vert',
	'orange',
	'violet',
	'jaune',
	'cyan',
	'marron',
	'rose',
	'gris'
] as const;

/** Les 12 noms : les 10 teintes, plus noir et blanc qui suivent la page */
export const NAMED_COLORS = [...CHROMATIC_NAMED_COLORS, 'noir', 'blanc'] as const;

export type NamedColor = (typeof NAMED_COLORS)[number];
export type ChromaticNamedColor = (typeof CHROMATIC_NAMED_COLORS)[number];

/** Anciennes formes acceptées dans le contenu existant (anglais) */
const ALIASES: Readonly<Record<string, NamedColor>> = {
	blue: 'bleu',
	red: 'rouge',
	green: 'vert',
	purple: 'violet',
	yellow: 'jaune',
	brown: 'marron',
	pink: 'rose',
	gray: 'gris',
	grey: 'gris',
	black: 'noir',
	white: 'blanc'
};

/**
 * Variante claire de chaque nom : ce que le PDF imprime. Doit être identique à
 * la première valeur de `--color-fig-<nom>` dans app.css (vérifié par test).
 * Noir et blanc s'impriment en noir et blanc purs : le papier est blanc.
 */
export const NAMED_COLOR_PRINT: Readonly<Record<NamedColor, string>> = {
	bleu: '#2563eb',
	rouge: '#dc2626',
	vert: '#018639',
	orange: '#b65a00',
	violet: '#9333ea',
	jaune: '#906f06',
	cyan: '#037e9c',
	marron: '#863805',
	rose: '#d92475',
	gris: '#6c727e',
	noir: '#000000',
	blanc: '#ffffff'
};

/** Formes hexadécimales admises (celles que `rgb("…")` de Typst accepte) */
export const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

// =============================================================================
// Résolution
// =============================================================================

/** Le nom canonique d'une couleur nommée (synonymes compris), ou null */
export function resolveNamedColor(raw: string): NamedColor | null {
	const value = raw.trim().toLowerCase();
	if ((NAMED_COLORS as readonly string[]).includes(value)) return value as NamedColor;
	return ALIASES[value] ?? null;
}

/**
 * Ce qu'on peint à l'écran : une variable du thème pour un nom, l'hexadécimal
 * tel quel, null pour tout le reste.
 *
 * ⚠️ Le résultat va dans `style:` (Svelte le concatène sans échapper) : seules
 * ces deux formes sortent, jamais une chaîne d'auteur brute.
 */
export function colorForScreen(raw: string): string | null {
	const named = resolveNamedColor(raw);
	if (named !== null) return namedColorScreen(named);
	const value = raw.trim();
	return HEX_COLOR.test(value) ? value : null;
}

/** La valeur écran d'un nom de la palette : variable du thème (noir / blanc suivent la page) */
export function namedColorScreen(named: NamedColor): string {
	if (named === 'noir') return 'var(--color-foreground)';
	if (named === 'blanc') return 'var(--color-background)';
	return `var(--color-fig-${named})`;
}

/** La forme Typst d'un nom de la palette : sa variante claire */
export function namedColorTypst(named: NamedColor): string {
	if (named === 'noir') return 'black';
	if (named === 'blanc') return 'white';
	return `rgb("${NAMED_COLOR_PRINT[named]}")`;
}

/** Ce qu'on imprime (PDF, exports) : la variante claire d'un nom, l'hex tel quel, ou null */
export function colorForPrint(raw: string): string | null {
	const named = resolveNamedColor(raw);
	if (named !== null) return NAMED_COLOR_PRINT[named];
	const value = raw.trim();
	return HEX_COLOR.test(value) ? value : null;
}
