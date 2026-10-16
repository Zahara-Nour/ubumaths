/**
 * Taille du texte des PDF de fiche
 * =================================
 *
 * Accessibilité (élèves malvoyants, demande de David le 2026-10-16) : trois
 * paliers, normale (10 pt, le gabarit tel quel), grande (14 pt) et très
 * grande (18 pt). Réglage enregistré par élève (`student_print_settings`), ou
 * choisi au coup par coup par le prof sur l'aperçu générique.
 *
 * Le GABARIT est transformé avant d'y placer les exercices : chaque taille en
 * points est multipliée, et la page passe sur une seule colonne (deux colonnes
 * serrent trop les calculs à 14-18 pt). Le rendu des exercices n'a aucune
 * taille fixe : il suit la taille du texte, maths comprises. Un gabarit écrit
 * par un prof est transformé de la même façon.
 */

import { endOfTypstCall } from './correction-fonts';

// ============================================================================
// TYPES
// ============================================================================

export const TEXT_SIZES = ['normal', 'large', 'x_large'] as const;

export type TextSize = (typeof TEXT_SIZES)[number];

// ============================================================================
// CONSTANTES
// ============================================================================

/** Facteur appliqué aux tailles du gabarit (le texte de base est à 10 pt) */
const TEXT_SIZE_SCALE: Record<TextSize, number> = {
	normal: 1,
	large: 1.4,
	x_large: 1.8
};

/** Le menu « Taille du texte » */
export const TEXT_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
	{ value: 'normal', label: 'Normale' },
	{ value: 'large', label: 'Grande' },
	{ value: 'x_large', label: 'Très grande' }
];

/** Une taille en points : `size: 10pt`, `size:11.5pt` */
const POINT_SIZE = /(\bsize:\s*)(\d+(?:\.\d+)?)pt\b/g;

/** Le réglage de la page (où vivent les colonnes) */
const SET_PAGE = /#set page\(/g;

/** Les colonnes, dans un `#set page(…)` */
const PAGE_COLUMNS = /(\bcolumns:\s*)\d+/;

// ============================================================================
// FONCTIONS
// ============================================================================

export function isTextSize(value: unknown): value is TextSize {
	return typeof value === 'string' && (TEXT_SIZES as readonly string[]).includes(value);
}

/** La taille retenue : une valeur inconnue (ancienne donnée, requête bricolée) donne la normale */
export function textSizeOf(value: unknown): TextSize {
	return isTextSize(value) ? value : 'normal';
}

/** Le gabarit à la taille voulue ; inchangé en taille normale */
export function withTextSize(typst: string, size: TextSize): string {
	const scale = TEXT_SIZE_SCALE[size];
	if (scale === 1) return typst;

	const scaled = typst.replace(POINT_SIZE, (_, prefix: string, points: string) => {
		const value = Math.round(Number(points) * scale * 10) / 10;
		return `${prefix}${value}pt`;
	});
	return withSingleColumnPages(scaled);
}

/** Chaque `#set page(…)` sur une colonne ; une grille hors de la page ne bouge pas */
function withSingleColumnPages(typst: string): string {
	let result = '';
	let cursor = 0;
	for (const match of typst.matchAll(SET_PAGE)) {
		const end = endOfTypstCall(typst, match.index);
		if (end === null || match.index < cursor) continue;
		const call = typst.slice(match.index, end);
		result +=
			typst.slice(cursor, match.index) +
			call.replace(PAGE_COLUMNS, (_, prefix: string) => `${prefix}1`);
		cursor = end;
	}
	return result + typst.slice(cursor);
}
