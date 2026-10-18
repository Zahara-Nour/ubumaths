/**
 * Atelier — REPÉRER les mesures dans un texte (géométrie v2, lot 2, PR 2 : L4)
 *
 * La partie sans atelier de `measures.ts` : où sont les appels de mesure
 * (`aire(…)`, `\operatorname{aire}\left(…\right)`), quels noms ils citent, et
 * le texte sans eux — ce que les lectures sans atelier (`parse.ts`) savent lire.
 * Séparé pour que `parse.ts` n'importe pas le calcul (boucle d'imports).
 *
 * @module atelier/measures-read
 */

import {
	constructionText,
	measureWordOf,
	readArguments,
	type MeasureWord,
	type ReadArgument
} from './construction-read';
import type { Provenance } from './parse';

// =============================================================================
// Types
// =============================================================================

/** Un appel de mesure repéré dans un texte. */
export interface MeasureCall {
	readonly start: number;
	/** Juste après la parenthèse fermante. */
	readonly end: number;
	readonly word: MeasureWord;
	/** Ce qui est entre les parenthèses, LaTeX retiré. */
	readonly content: string;
}

// =============================================================================
// Constantes
// =============================================================================

/** `aire(`, `périmètre (`, `\operatorname{aire}\left(`, `aire\left(` — pas `\aire`, pas `gaire(`. */
const MEASURE_HEAD =
	/(?<![A-Za-zÀ-ɏ_\\])(?:\\operatorname\{)?(distance|aire|p[eé]rim[eè]tre|angle)\}?\s*(\\left\s*)?\(/g;

/**
 * Deux noms collés (`AM`, `A_1M`, `A_{1}M`), que rien d'alphabétique n'entoure :
 * ni une commande (`\pi`), ni un mot (`max`), ni un appel (`ab(`), ni une unité
 * entre crochets (`12[km]`).
 */
export const PAIR =
	/(?<![A-Za-z\\_[])([A-Za-z](?:_\d+|_\{\d+\})?)([A-Za-z](?:_\d+|_\{\d+\})?)(?![A-Za-z_({])/g;

// =============================================================================
// Repérer (sans l'atelier)
// =============================================================================

export function isLatex(provenance: Provenance): boolean {
	return provenance === 'mathfield' || provenance === 'keyboard' || provenance === 'storage';
}

/** La fin d'un appel ouvert en `open` (texte) ou par `\left(` (LaTeX), ou -1. */
function callEnd(text: string, open: number, latex: boolean): number {
	if (latex) {
		let depth = 1;
		const pattern = /\\left\b|\\right\s*\)|\\right\b/g;
		pattern.lastIndex = open + 1;
		for (let m = pattern.exec(text); m !== null; m = pattern.exec(text)) {
			if (m[0].startsWith('\\left')) depth++;
			else if (--depth === 0) return m.index + m[0].length;
		}
		return -1;
	}
	// `[AB)` (une demi-droite) ferme une parenthèse qu'il n'a pas ouverte : masqué
	const scan = text.replace(/\[\s*[A-Za-z](?:_\d+)?\s*[A-Za-z](?:_\d+)?\s*\)/g, (m) =>
		'#'.repeat(m.length)
	);
	let depth = 0;
	for (let i = open; i < scan.length; i++) {
		if (scan[i] === '(') depth++;
		else if (scan[i] === ')' && --depth === 0) return i + 1;
	}
	return -1;
}

/** Les appels de mesure d'un texte, dans l'ordre. */
export function measureCalls(text: string, provenance: Provenance): MeasureCall[] {
	const calls: MeasureCall[] = [];
	for (const match of text.matchAll(MEASURE_HEAD)) {
		const word = measureWordOf(match[1]);
		if (word === null) continue;
		const open = match.index + match[0].length - 1;
		const latex = match[2] !== undefined;
		const end = callEnd(text, latex ? match.index + match[0].length - 1 : open, latex);
		if (end === -1) continue;
		const inner = text.slice(open + 1, latex ? end - '\\right)'.length : end - 1);
		calls.push({
			start: match.index,
			end,
			word,
			content: constructionText(inner, isLatex(provenance) ? 'keyboard' : 'text')
		});
	}
	// Une mesure dans une autre (`aire(…)` en argument) n'est pas une mesure de premier niveau
	return calls.filter(
		(call) =>
			!calls.some((other) => other !== call && other.start < call.start && call.end <= other.end)
	);
}

/** Le texte cite-t-il un appel de mesure (`aire(…)`) ? */
export function hasMeasureCall(text: string, provenance: Provenance): boolean {
	return measureCalls(text, provenance).length > 0;
}

/**
 * Le texte, chaque appel de mesure remplacé par `1` : ce que les lectures sans
 * atelier (forme, unités, noms cités comme des nombres) savent lire.
 */
export function withoutMeasureCalls(text: string, provenance: Provenance): string {
	let out = text;
	for (const call of measureCalls(text, provenance).reverse()) {
		out = `${out.slice(0, call.start)}1${out.slice(call.end)}`;
	}
	return out;
}

/** Les noms cités dans les appels de mesure (`aire(A, M, N)` → A, M, N), raccourcis compris. */
export function measureCallNames(text: string, provenance: Provenance): string[] {
	const names = new Set<string>();
	const visit = (argument: ReadArgument): void => {
		if (argument.kind === 'name') names.add(argument.name);
		else if (argument.kind === 'call') {
			argument.call.positional.forEach(visit);
			argument.call.named.forEach(visit);
		}
	};
	for (const call of measureCalls(text, provenance)) {
		const read = readArguments(call.content, call.word);
		if (read.ok) read.args.forEach(visit);
	}
	return [...names];
}

/** Le refus de FORME d'un appel de mesure (séparateurs, argument vide), ou `null`. */
export function measureShapeRefusal(text: string, provenance: Provenance): string | null {
	for (const call of measureCalls(text, provenance)) {
		const read = readArguments(call.content, call.word);
		if (!read.ok) return read.message;
	}
	return null;
}

/** `A_{1}` (MathLive) et `A_1` sont le même nom. */
export function plainName(name: string): string {
	return name.replace(/_\{(\d+)\}/, '_$1');
}

/**
 * Le texte, chaque `AM` de deux POINTS remplacé par `1` — avec les appels de
 * mesure, ce qui reste cite des nombres : un point y est refusé (P9).
 */
export function withoutMeasures(
	text: string,
	provenance: Provenance,
	isPoint: (name: string) => boolean
): string {
	return withoutMeasureCalls(text, provenance).replace(PAIR, (whole, a: string, b: string) =>
		isPoint(plainName(a)) && isPoint(plainName(b)) ? '1' : whole
	);
}

/** Les deux noms de chaque `AM` de deux points du texte. */
export function pairNames(
	text: string,
	provenance: Provenance,
	isPoint: (name: string) => boolean
): string[] {
	const names: string[] = [];
	for (const match of withoutMeasureCalls(text, provenance).matchAll(PAIR)) {
		const [a, b] = [plainName(match[1]), plainName(match[2])];
		if (isPoint(a) && isPoint(b)) names.push(a, b);
	}
	return names;
}

/** Le texte cite-t-il une mesure (appel, ou `AM` de deux points) ? */
export function citesMeasure(
	text: string,
	provenance: Provenance,
	isPoint: (name: string) => boolean
): boolean {
	return hasMeasureCall(text, provenance) || pairNames(text, provenance, isPoint).length > 0;
}

/**
 * Renommer `from` en `to` dans chaque `AM` de deux points (`AM` → `AK`), texte
 * ou LaTeX (`A_{1}M`) : le renommage par mots y voit l'identifiant `AM`.
 */
export function renamePairs(
	text: string,
	from: string,
	to: string,
	isPoint: (name: string) => boolean
): string {
	const written = (id: string) => (id.includes('{') ? to.replace(/_(\d+)/, '_{$1}') : to);
	return text.replace(PAIR, (whole, a: string, b: string) => {
		const [p, q] = [plainName(a), plainName(b)];
		if ((p !== from && q !== from) || !isPoint(p) || !isPoint(q)) return whole;
		return `${p === from ? written(a) : a}${q === from ? written(b) : b}`;
	});
}

/** Le texte appelle-t-il `angle(…)` (une grandeur, décision de David du 2026-10-18) ? */
export function hasAngleCall(text: string, provenance: Provenance): boolean {
	return measureCalls(text, provenance).some((call) => call.word === 'angle');
}
