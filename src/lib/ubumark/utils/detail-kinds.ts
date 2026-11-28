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

import { resolveNamedColor, type NamedColor } from '#lib/theme/named-colors.ts';

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

/** Libellés en anglais, pour un document en anglais (PDF ; 2026-10-11). */
export const DETAIL_KIND_LABELS_EN: Record<DetailKind, string> = {
	calculation: 'Calculation',
	reminder: 'Reminder',
	method: 'Method',
	warning: 'Warning'
};

/** Libellé d'un type de détail dans la langue du document (français par défaut). */
export function detailKindLabel(kind: DetailKind, language?: string): string {
	return (language === 'en' ? DETAIL_KIND_LABELS_EN : DETAIL_KIND_LABELS)[kind];
}

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
 * Marquage en ligne `[texte]{.classe …}` : détail de correction (ADR 0017), mot du
 * dictionnaire (`.def`, `.def=…`, `.nodef`), couleur de la palette (ADR 0042),
 * plusieurs classes séparées par des espaces (`{.orange .def}`). Le texte peut
 * contenir UN niveau de crochets. Une classe est tout ce qui n'est ni espace, ni
 * accolade, ni crochet, ni `=` (un `{.#ff0000}` est donc lu, puis refusé) ;
 * `.def=…` va en dernier, sa cible peut contenir des espaces.
 */
export const SPAN_MARK_REGEX =
	/\[((?:[^[\]]|\[[^[\]]*\])+)\]\{(\.[^\s{}[\]=]+(?:\s+\.[^\s{}[\]=]+)*(?:=[^{}\n]+)?)\}/gu;

/** Ce que disent les classes d'un marquage `{.…}`. */
export interface SpanClasses {
	detail?: DetailKind;
	lexicon?: { mode: 'force' | 'block'; target?: string };
	color?: NamedColor;
	/** Classes qui ne sont ni un détail, ni une marque du dictionnaire, ni une couleur */
	unknown: string[];
}

/**
 * Lit la liste `.a .b .def=cible` (groupe 2 de {@link SPAN_MARK_REGEX}). La
 * première classe de chaque sorte compte ; les suivantes sont ignorées.
 */
export function parseSpanClasses(raw: string): SpanClasses {
	const result: SpanClasses = { unknown: [] };
	for (const token of raw.trim().split(/\s+(?=\.)/)) {
		// Casse ignorée, comme pour les couleurs et les détails : `{.Def}` = `{.def}`
		const raw = token.slice(1);
		const equals0 = raw.indexOf('=');
		const word =
			equals0 >= 0 ? raw.slice(0, equals0).toLowerCase() + raw.slice(equals0) : raw.toLowerCase();
		const equals = word.indexOf('=');
		if (equals >= 0) {
			const name = word.slice(0, equals);
			const target = word.slice(equals + 1).trim();
			if (name === 'def' && target) result.lexicon ??= { mode: 'force', target };
			else result.unknown.push(raw);
			continue;
		}
		if (word === 'def') {
			result.lexicon ??= { mode: 'force' };
			continue;
		}
		if (word === 'nodef') {
			result.lexicon ??= { mode: 'block' };
			continue;
		}
		const detail = parseDetailKind(word);
		if (detail) {
			result.detail ??= detail;
			continue;
		}
		const color = resolveNamedColor(word);
		if (color) {
			result.color ??= color;
			continue;
		}
		result.unknown.push(raw);
	}
	return result;
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
