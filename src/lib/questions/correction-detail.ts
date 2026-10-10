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
	INLINE_CODE_REGEX,
	INLINE_DETAIL_REGEX,
	maskSpans,
	parseCalloutKind,
	parseDetailKind,
	isLexiconMarkWord
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

/**
 * Accolade fermante de chaque accolade ouvrante (-1 si non fermée), en UNE
 * passe : `\x` est sauté (`\{`, `\}`, `\\`). Même résultat qu'un comptage
 * depuis chaque ouvrante, sans coût quadratique.
 */
function matchBraces(text: string): Map<number, number> {
	const closing = new Map<number, number>();
	const stack: number[] = [];
	for (let j = 0; j < text.length; j++) {
		const c = text[j];
		if (c === '\\') {
			j++;
		} else if (c === '{') {
			stack.push(j);
		} else if (c === '}' && stack.length > 0) {
			closing.set(stack.pop() as number, j);
		}
	}
	return closing;
}

const isBlank = (c: string | undefined) => c === ' ' || c === '\t';

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
 * Formule ouverte en fin de texte produit, suivie au fil des ajouts (chaque
 * caractère n'est lu qu'une fois).
 */
class OpenFormulaTracker {
	private scanned = 0;
	open: { token: string; index: number } | null = null;

	update(out: string): void {
		for (let k = this.scanned; k < out.length; k++) {
			if (out[k] === '\\') {
				k++;
				continue;
			}
			if (out[k] !== '$') continue;
			const token = out[k + 1] === '$' ? '$$' : '$';
			this.open = this.open ? null : { token, index: k };
			k += token.length - 1;
		}
		this.scanned = Math.max(this.scanned, out.length);
	}

	/** Le texte produit a été coupé juste avant l'ouvrante : plus rien d'ouvert. */
	truncatedTo(length: number): void {
		this.open = null;
		this.scanned = length;
	}
}

/**
 * Formule entièrement en détail (`$\detail{x}$`) : en concis, ses délimiteurs
 * disparaissent avec elle — sinon `$$` resterait, pris pour une formule centrée.
 * Rend la longueur à garder du texte produit et le nombre de caractères à sauter.
 */
function dropEmptyFormula(
	out: string,
	tracker: OpenFormulaTracker,
	text: string,
	from: number
): { keep: number; skip: number } | null {
	tracker.update(out);
	const opener = tracker.open;
	if (!opener) return null;
	for (let k = opener.index + opener.token.length; k < out.length; k++) {
		if (!/\s/.test(out[k])) return null;
	}
	let lead = from;
	while (lead < text.length && /\s/.test(text[lead])) lead++;
	if (!text.startsWith(opener.token, lead)) return null;
	if (opener.token === '$' && text[lead + 1] === '$') return null;
	return { keep: opener.index, skip: lead - from + opener.token.length };
}

function transformDetailCommands(text: string, mode: Mode, ctx: Context): string {
	// Le code en ligne n'est jamais transformé : recherche dans un texte où il est masqué
	const masked = maskSpans(text, [INLINE_CODE_REGEX]);
	if (!masked.includes(DETAIL_COMMAND)) return text;
	const closing = matchBraces(masked);
	const tracker = new OpenFormulaTracker();
	let out = '';
	let i = 0;

	while (i < text.length) {
		const at = masked.indexOf(DETAIL_COMMAND, i);
		if (at === -1) {
			out += text.slice(i);
			break;
		}
		if (!isDetailCommandAt(masked, at)) {
			out += text.slice(i, at + DETAIL_COMMAND.length);
			i = at + DETAIL_COMMAND.length;
			continue;
		}
		out += text.slice(i, at);
		const afterCommand = at + DETAIL_COMMAND.length;
		let open = afterCommand;
		while (open < masked.length && /\s/.test(masked[open])) open++;

		if (masked[open] !== '{') {
			ctx.errors.push('`\\detail` doit être suivi d’accolades : `\\detail{…}`.');
			i = afterCommand;
			continue;
		}
		const close = closing.get(open) ?? -1;
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
		const dropped = dropEmptyFormula(out, tracker, text, i);
		if (dropped) {
			out = out.slice(0, dropped.keep);
			tracker.truncatedTo(out.length);
			i += dropped.skip;
		}
		// `A \detail{B} C` → `A C` : une seule espace entre les deux
		if (isBlank(out[out.length - 1])) {
			while (i < text.length && isBlank(text[i])) i++;
		}
	}
	return out;
}

// ============================================================================
// DÉTAILS EN LIGNE [texte]{.type}
// ============================================================================

/**
 * Formules `$…$` / `$$…$$` : masquées avant de chercher un détail en ligne,
 * pour qu'un intervalle `$]0;1[$` n'ouvre pas de crochet (le parseur ubumark
 * fait de même avec ses `§M:n§`).
 */
const MATH_SPAN_REGEX = /(?<!\\)\$\$[\s\S]*?(?<!\\)\$\$|(?<!\\)\$(?:\\.|[^$\\\n])+\$/g;

/** Trace d'un détail en ligne retiré en concis (pour le ménage des parenthèses). */
const REMOVED = '';

function transformInlineDetails(text: string, mode: Mode, ctx: Context): string {
	const masked = maskSpans(text, [INLINE_CODE_REGEX, MATH_SPAN_REGEX]);
	const regex = new RegExp(INLINE_DETAIL_REGEX.source, INLINE_DETAIL_REGEX.flags);
	let out = '';
	let last = 0;
	let match: RegExpExecArray | null;

	while ((match = regex.exec(masked)) !== null) {
		const start = match.index;
		const end = start + match[0].length;
		// `[mot]{.def}` marque un mot du lexique : il reste dans les deux versions
		if (isLexiconMarkWord(match[2])) continue;
		if (!parseDetailKind(match[2])) {
			ctx.errors.push(
				`Détail en ligne « {.${match[2]}} » : type inconnu. Types possibles : calcul, rappel, méthode, attention.`
			);
			continue;
		}
		ctx.found = true;
		if (mode === 'detailed') continue;
		// Concis : l'espace qui précédait le détail disparaît avec lui devant une
		// ponctuation basse, une fin de ligne ou une autre espace (« 81 . » → « 81. »).
		let spaceStart = start;
		while (spaceStart > last && isBlank(text[spaceStart - 1])) spaceStart--;
		const next = text.charAt(end);
		const keepSpace = next !== '' && !/[.,)\s]/.test(next);
		out +=
			text.slice(last, spaceStart) + (keepSpace ? text.slice(spaceStart, start) : '') + REMOVED;
		last = end;
	}
	return mode === 'detailed' ? text : out + text.slice(last);
}

// ============================================================================
// MÉNAGE DE LA VERSION CONCISE (hors blocs de code)
// ============================================================================

/** `a \\ \end{align}` → `a \end{align}` : pas de rangée vide en fin d'`align`. */
function dropTrailingRowBreaks(text: string): string {
	const regex = /\\\\(\s*)\\end\{/g;
	let out = '';
	let last = 0;
	let match: RegExpExecArray | null;
	while ((match = regex.exec(text)) !== null) {
		let k = match.index;
		while (k > last && /\s/.test(text[k - 1])) k--;
		out += text.slice(last, k) + ' \\end{';
		last = match.index + match[0].length;
	}
	return out + text.slice(last);
}

/** Formule devenue vide (seuls restent `\begin{…}`, `\end{…}`, `\\`) : retirée. */
function dropEmptyFormulas(text: string): string {
	const tokens = mathDelimiters(text);
	let out = '';
	let last = 0;
	for (let t = 0; t + 1 < tokens.length; ) {
		const [a, b] = [tokens[t], tokens[t + 1]];
		if (a.token !== b.token) {
			t++;
			continue;
		}
		const content = text.slice(a.index + a.token.length, b.index);
		const rest = content.replace(/\\(?:begin|end)\{[^}]*\}/g, '').replace(/\\\\/g, '');
		if (rest.trim() === '') {
			out += text.slice(last, a.index);
			last = b.index + b.token.length;
		}
		t += 2;
	}
	return out + text.slice(last);
}

function tidyConciseSegment(text: string): string {
	return dropEmptyFormulas(dropTrailingRowBreaks(text))
		.replace(/[ \t]?\([ \t]*[ \t]*\)/g, '')
		.replaceAll(REMOVED, '')
		.replace(/\n{3,}/g, '\n\n');
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
			const result = transformInlineDetails(withoutCommands, mode, ctx);
			return mode === 'concise' ? tidyConciseSegment(result) : result;
		})
		.join('\n');
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
			// Un même marqueur cassé répété ne donne qu'un message
			errors: [...new Set(ctx.errors)]
		};
	}

	// Le ménage est fait segment par segment (hors code) : ici, les bords seulement
	const concise = transform(markdown, 'concise', { found: false, errors: [] }).trim();
	return {
		concise,
		detailed,
		hasDetails: true,
		conciseEmpty: concise === '',
		errors: []
	};
}

/**
 * Version détaillée seule, pour les affichages sans interrupteur (aperçus,
 * PDF) : jamais de marqueur brut, que MathLive ou Typst refuseraient.
 */
export function detailedCorrection(markdown: string): string {
	return splitCorrectionDetail(markdown).detailed;
}
