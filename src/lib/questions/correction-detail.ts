/**
 * Correction concise / détaillée — transformation de texte (ADR 0017)
 * ===================================================================
 *
 * À partir du markdown d'une correction, produit ses deux versions AVANT le
 * rendu (MathLive à l'écran, Typst en PDF) :
 *
 * - `\detail{…}` : concis → retiré avec son contenu ; détaillé → contenu sans
 *   l'enveloppe. Accolades comptées, `\{` `\}` (et `\\`) ignorés : marche dans
 *   `$…$`, `$$…$$` et autour de rangées entières d'un `align`.
 * - `> [!méthode]`, `> [!rappel]`, `> [!attention]` : concis → bloc entier
 *   retiré ; détaillé → gardé (ubumark le rend en encadré typé).
 * - `[texte]{.rappel}` (`.méthode`, `.attention`, `.calcul`) : concis → retiré ;
 *   détaillé → gardé (ubumark le met en valeur).
 *
 * Les variables `{{a}}` ne sont jamais touchées : leurs accolades sont
 * équilibrées, la transformation marche donc avant comme après leur
 * résolution. Les composants l'appliquent APRÈS (sur l'instance), là où le
 * texte est affiché.
 *
 * Un marqueur mal formé ne lève jamais d'exception (D5) : `errors` porte un
 * message d'auteur, et la version concise retombe sur la version détaillée.
 *
 * @module questions/correction-detail
 */

import {
	CALLOUT_MARKER_REGEX,
	INLINE_DETAIL_REGEX,
	parseCalloutKind,
	parseDetailKind
} from '$lib/ubumark/utils/detail-kinds';

// ============================================================================
// TYPES
// ============================================================================

export interface CorrectionVersions {
	/** Ce que l'élève voit d'abord : la correction sans ses détails. */
	concise: string;
	/** La correction avec ses détails (enveloppes `\detail{}` retirées). */
	detailed: string;
	/** Au moins un détail bien formé, et aucune erreur : l'interrupteur a un sens. */
	hasDetails: boolean;
	/** Tout est détail : la vue concise montrera la réponse attendue (D6). */
	conciseEmpty: boolean;
	/** Messages d'auteur, en français (marqueurs mal formés). */
	errors: string[];
}

type Mode = 'concise' | 'detailed';

interface Context {
	found: boolean;
	errors: string[];
}

// ============================================================================
// CONSTANTES
// ============================================================================

const DETAIL_COMMAND = '\\detail';
const QUOTE_LINE = /^\s*>/;
const FENCE_LINE = /^\s*```/;

// ============================================================================
// BLOCS DE CODE : jamais transformés
// ============================================================================

interface Segment {
	code: boolean;
	text: string;
}

function splitFences(markdown: string): Segment[] {
	const segments: Segment[] = [];
	let current: string[] = [];
	let inFence = false;

	const flush = (code: boolean) => {
		if (current.length > 0) segments.push({ code, text: current.join('\n') });
		current = [];
	};

	for (const line of markdown.split('\n')) {
		if (FENCE_LINE.test(line)) {
			if (inFence) {
				current.push(line);
				flush(true);
				inFence = false;
			} else {
				flush(false);
				current.push(line);
				inFence = true;
			}
		} else {
			current.push(line);
		}
	}
	flush(inFence);
	return segments;
}

// ============================================================================
// ENCADRÉS > [!type]
// ============================================================================

function transformCallouts(text: string, mode: Mode, ctx: Context): string {
	const lines = text.split('\n');
	const out: string[] = [];
	let i = 0;

	while (i < lines.length) {
		if (!QUOTE_LINE.test(lines[i])) {
			out.push(lines[i]);
			i++;
			continue;
		}
		const start = i;
		while (i < lines.length && QUOTE_LINE.test(lines[i])) i++;
		const group = lines.slice(start, i);

		const firstContent = group[0].replace(/^\s*>\s?/, '');
		const marker = firstContent.match(CALLOUT_MARKER_REGEX);
		if (marker) {
			const kind = parseCalloutKind(marker[1]);
			if (kind) {
				ctx.found = true;
				if (mode === 'concise') continue;
			} else {
				ctx.errors.push(
					`Encadré « [!${marker[1]}] » : type inconnu. Types possibles : méthode, rappel, attention.`
				);
			}
		}
		out.push(...group);
	}
	return out.join('\n');
}

// ============================================================================
// \detail{…}
// ============================================================================

/** `\detail` à `index` est-il une vraie commande (ni `\\detail`, ni `\details`) ? */
function isDetailCommandAt(text: string, index: number): boolean {
	const next = text[index + DETAIL_COMMAND.length];
	if (next !== undefined && /[A-Za-z]/.test(next)) return false;
	let backslashes = 0;
	for (let k = index - 1; k >= 0 && text[k] === '\\'; k--) backslashes++;
	return backslashes % 2 === 0;
}

/** Accolade fermante associée à celle en `open`, ou -1. `\x` est sauté. */
function findClosingBrace(text: string, open: number): number {
	let depth = 0;
	for (let j = open; j < text.length; j++) {
		const c = text[j];
		if (c === '\\') {
			j++;
			continue;
		}
		if (c === '{') depth++;
		else if (c === '}') {
			depth--;
			if (depth === 0) return j;
		}
	}
	return -1;
}

/** Délimiteurs maths (`$` ou `$$`) de `text`, `\$` exclus. */
function mathDelimiters(text: string): { token: string; index: number }[] {
	const tokens: { token: string; index: number }[] = [];
	for (let k = 0; k < text.length; k++) {
		if (text[k] === '\\') {
			k++;
			continue;
		}
		if (text[k] === '$') {
			const token = text[k + 1] === '$' ? '$$' : '$';
			tokens.push({ token, index: k });
			k += token.length - 1;
		}
	}
	return tokens;
}

/**
 * Formule entièrement en détail (`$\detail{x}$`) : en concis, ses délimiteurs
 * disparaissent avec elle — sinon `$$` resterait, pris pour une formule centrée.
 * Rend le texte avant (sans l'ouvrant) et le nombre de caractères à sauter après.
 */
function dropEmptyFormula(before: string, after: string): { before: string; skip: number } | null {
	const tokens = mathDelimiters(before);
	if (tokens.length % 2 === 0) return null;
	const opener = tokens[tokens.length - 1];
	if (before.slice(opener.index + opener.token.length).trim() !== '') return null;
	const lead = after.match(/^\s*/)?.[0].length ?? 0;
	if (!after.startsWith(opener.token, lead)) return null;
	if (opener.token === '$' && after[lead + 1] === '$') return null;
	return { before: before.slice(0, opener.index), skip: lead + opener.token.length };
}

function transformDetailCommands(text: string, mode: Mode, ctx: Context): string {
	let out = '';
	let i = 0;

	while (i < text.length) {
		const at = text.indexOf(DETAIL_COMMAND, i);
		if (at === -1) {
			out += text.slice(i);
			break;
		}
		if (!isDetailCommandAt(text, at)) {
			out += text.slice(i, at + DETAIL_COMMAND.length);
			i = at + DETAIL_COMMAND.length;
			continue;
		}
		out += text.slice(i, at);
		const afterCommand = at + DETAIL_COMMAND.length;
		const open = afterCommand + (text.slice(afterCommand).match(/^\s*/)?.[0].length ?? 0);

		if (text[open] !== '{') {
			ctx.errors.push('`\\detail` doit être suivi d’accolades : `\\detail{…}`.');
			i = afterCommand;
			continue;
		}
		const close = findClosingBrace(text, open);
		if (close === -1) {
			// L'élève voit le reste sans l'enveloppe ouvrante
			ctx.errors.push('`\\detail{` non fermé : il manque une accolade fermante `}`.');
			i = open + 1;
			continue;
		}
		const inner = text.slice(open + 1, close);
		i = close + 1;
		if (inner.trim() === '') {
			ctx.errors.push('`\\detail{}` vide : rien à masquer.');
			continue;
		}
		ctx.found = true;
		if (mode === 'detailed') {
			out += transformDetailCommands(inner, mode, ctx);
			continue;
		}
		const dropped = dropEmptyFormula(out, text.slice(i));
		if (dropped) {
			out = dropped.before;
			i += dropped.skip;
		}
	}
	return out;
}

// ============================================================================
// DÉTAILS EN LIGNE [texte]{.type}
// ============================================================================

/** Détail en ligne précédé de ses espaces (pour ne pas laisser « 81 . » en concis). */
const INLINE_DETAIL_WITH_SPACE_REGEX = new RegExp(
	`([ \\t]*)${INLINE_DETAIL_REGEX.source}`,
	INLINE_DETAIL_REGEX.flags
);

function transformInlineDetails(text: string, mode: Mode, ctx: Context): string {
	return text.replace(
		INLINE_DETAIL_WITH_SPACE_REGEX,
		(match: string, space: string, _inner: string, word: string, offset: number, whole: string) => {
			if (!parseDetailKind(word)) {
				ctx.errors.push(
					`Détail en ligne « {.${word}} » : type inconnu. Types possibles : calcul, rappel, méthode, attention.`
				);
				return match;
			}
			ctx.found = true;
			if (mode === 'detailed') return match;
			// Concis : l'espace qui précédait le détail disparaît avec lui devant une
			// ponctuation basse, une fin de ligne ou une autre espace (« 81 . » → « 81. »).
			const next = whole.charAt(offset + match.length);
			return next === '' || /[.,)\s]/.test(next) ? '' : space;
		}
	);
}

// ============================================================================
// API
// ============================================================================

function transform(markdown: string, mode: Mode, ctx: Context): string {
	return splitFences(markdown)
		.map((segment) => {
			if (segment.code) return segment.text;
			const withoutCallouts = transformCallouts(segment.text, mode, ctx);
			const withoutCommands = transformDetailCommands(withoutCallouts, mode, ctx);
			return transformInlineDetails(withoutCommands, mode, ctx);
		})
		.join('\n');
}

/** Ménage de la version concise après retraits : rangée vide d'`align`, lignes vides. */
function tidyConcise(text: string): string {
	return text
		.replace(/\s*\\\\\s*(\\end\{)/g, ' $1')
		.replace(/\n{3,}/g, '\n\n')
		.trim();
}

/**
 * Les deux versions d'une correction. Ne lève jamais : un marqueur mal formé
 * est signalé dans `errors`, et la version concise vaut alors la détaillée.
 */
export function splitCorrectionDetail(markdown: string): CorrectionVersions {
	const ctx: Context = { found: false, errors: [] };
	const detailed = transform(markdown, 'detailed', ctx);

	if (ctx.errors.length > 0 || !ctx.found) {
		return {
			concise: detailed,
			detailed,
			hasDetails: false,
			conciseEmpty: false,
			errors: ctx.errors
		};
	}

	const concise = tidyConcise(transform(markdown, 'concise', { found: false, errors: [] }));
	return {
		concise,
		detailed,
		hasDetails: true,
		conciseEmpty: concise === '',
		errors: []
	};
}
