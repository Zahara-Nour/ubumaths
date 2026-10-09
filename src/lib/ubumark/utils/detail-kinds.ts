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

/**
 * Mot du lexique marqué à la main (lot 2 du lexique) : `[mot]{.def}`,
 * `[mot]{.def=carré (géométrie)}` (entrée visée) ou `[mot]{.nodef}`. Même
 * syntaxe que les détails en ligne, mais ce n'est pas un détail de correction.
 */
export const LEXICON_MARK_REGEX =
	/\[((?:[^[\]]|\[[^[\]]*\])+)\]\{\.(def|nodef)(?:=([^{}\n]+))?\}/gu;

/** `def` / `nodef` : mots réservés au lexique, jamais un type de détail. */
export function isLexiconMarkWord(raw: string): boolean {
	return raw === 'def' || raw === 'nodef';
}

/** Caractère de masquage : ni crochet, ni accolade, ni lettre. */
const MASK_CHAR = '';

/** Code en ligne `` `…` `` : jamais un détail (même motif que le parseur). */
export const INLINE_CODE_REGEX = /`[^`\n]+`/g;

/**
 * Remplace chaque correspondance des motifs par autant de caractères neutres :
 * les positions sont conservées, on cherche les marqueurs dans le texte masqué
 * et on découpe le texte d'origine aux mêmes indices.
 */
export function maskSpans(text: string, patterns: RegExp[]): string {
	let masked = text;
	for (const pattern of patterns) {
		masked = masked.replace(new RegExp(pattern.source, pattern.flags), (match) =>
			MASK_CHAR.repeat(match.length)
		);
	}
	return masked;
}
