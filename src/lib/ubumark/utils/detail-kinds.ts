/**
 * Types de détail d'une correction (ADR 0017)
 * ===========================================
 *
 * Un détail est une partie de la correction masquée en vue concise. Quatre
 * types : calcul intermédiaire, rappel, méthode, attention. Les auteurs les
 * écrivent en français (`> [!méthode]`, `[…]{.rappel}`) ; le code les nomme en
 * anglais.
 *
 * @module ubumark/utils/detail-kinds
 */

/** Type d'un détail, quel que soit son marqueur. */
export type DetailKind = 'calculation' | 'reminder' | 'method' | 'warning';

/** Types admis pour un encadré `> [!type]` (le calcul vit dans le calcul). */
export type CalloutKind = Exclude<DetailKind, 'calculation'>;

/** Libellés visibles, en français. */
export const DETAIL_KIND_LABELS: Record<DetailKind, string> = {
	calculation: 'Calcul',
	reminder: 'Rappel',
	method: 'Méthode',
	warning: 'Attention'
};

// Mots d'auteur (sans accent, en minuscules) → type
const AUTHOR_WORDS: Record<string, DetailKind> = {
	calcul: 'calculation',
	rappel: 'reminder',
	methode: 'method',
	attention: 'warning'
};

/** Minuscules et accents retirés : `Méthode` → `methode`. */
function normalizeWord(raw: string): string {
	return raw.trim().normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Type d'un détail en ligne `[…]{.mot}`, ou `null` si le mot est inconnu. */
export function parseDetailKind(raw: string): DetailKind | null {
	return AUTHOR_WORDS[normalizeWord(raw)] ?? null;
}

/** Type d'un encadré `> [!mot]`, ou `null` si le mot est inconnu (ou `calcul`). */
export function parseCalloutKind(raw: string): CalloutKind | null {
	const kind = parseDetailKind(raw);
	return kind === null || kind === 'calculation' ? null : kind;
}

/**
 * Marqueur d'encadré en tête de citation : `[!méthode]` puis le reste de la
 * ligne. Le mot est capturé tel quel (validé ensuite).
 */
export const CALLOUT_MARKER_REGEX = /^\s*\[!([^\]\s]*)\]\s?(.*)$/;

/**
 * Détail en ligne `[texte]{.mot}`. Le texte peut contenir UN niveau de
 * crochets (`$[0;1]$`) ; le mot est capturé tel quel (validé ensuite).
 */
export const INLINE_DETAIL_REGEX = /\[((?:[^[\]]|\[[^[\]]*\])+)\]\{\.(\p{L}+)\}/gu;
