/**
 * Atelier — une fonction PAR MORCEAUX : `f(x) = x pour x < k, x² pour x ≥ k`.
 *
 * Chantier `fonctions-par-morceaux`, PR 2 (phase 0 validée par David le
 * 2026-11-28, journal `docs/wip/fonctions-par-morceaux-progress.md`). Chaque
 * morceau est une formule suivie de « pour » et d'une condition, comme
 * `f(x) = x pour x > 2` (`interval.ts`) ; les morceaux sont séparés par des
 * virgules ; le dernier peut s'écrire « sinon » (Q2).
 *
 * La définition rangée garde TOUTE l'écriture (`x pour x < k, x^2 pour x ≥ k`),
 * relue par `astOf` en un nœud `piecewise` : l'atelier calcule sur l'arbre, la
 * carte réaffiche ce qui a été tapé. Les refus qui demandent l'atelier
 * (conditions qui se chevauchent, formule hors de son domaine, avec les valeurs
 * du moment) vivent dans `interval.ts` (`checkPieces`).
 *
 * Texte seulement ici, plus la construction de l'arbre : la lecture d'une
 * formule est donnée par l'appelant (`parse.ts`), sans dépendance circulaire.
 *
 * @module atelier/piecewise
 */

import type { MathNode } from '#lib/mathAST/types.ts';
import { logicalAnd, logicalOr, piecewise, piecewisePiece } from '#lib/mathAST/factory.ts';
import type { ReadingMode } from './parse';
import {
	intervalWord,
	isConditionWritten,
	JOIN_AS_TEXT,
	JOIN_GLUED,
	UNREADABLE_CONDITION
} from './interval-words';

// =============================================================================
// Types
// =============================================================================

/** Un morceau tel qu'écrit : sa formule, et sa condition (après « pour »). */
export interface WrittenPiece {
	readonly body: string;
	readonly condition: string;
}

/** Les morceaux lus : ceux à condition, et la formule de « sinon » (`null` sans). */
export type WrittenPieces =
	| {
			readonly ok: true;
			readonly pieces: readonly WrittenPiece[];
			readonly otherwise: string | null;
	  }
	| { readonly ok: false; readonly message: string };

// =============================================================================
// Constantes
// =============================================================================

export const PIECE_WITHOUT_CONDITION =
	'Chaque morceau a sa condition après « pour », par exemple x^2 pour x ≥ 2 ; seul le dernier peut s’écrire « sinon ».';

export const OTHERWISE_LAST =
	'« sinon » s’écrit au dernier morceau : il prend tous les nombres que les autres morceaux n’ont pas pris.';

export const PIECEWISE_ONLY_FUNCTIONS = 'Seule une fonction se définit par morceaux.';

export const SEQUENCE_PIECES = 'Une suite ne s’écrit pas encore par morceaux : seule une fonction.';

/** `\begin{cases}` tapé ou collé : les morceaux s'écrivent avec « pour », que la carte relit. */
export const WRITE_WITH_POUR =
	'Écris chaque morceau avec « pour », par exemple x pour x < 2, x^2 pour x ≥ 2.';

export const MISSING_FORMULA = 'Il manque la formule d’un morceau, devant « pour » ou « sinon ».';

/** « sinon » écrit en mot par MathLive ou par la carte (`\text{ sinon}`). */
const SINON_AS_TEXT = /\\(?:text|textrm|mathrm|operatorname)\s*\{\s*sinon\s*\}/g;

/** « sinon » en fin de morceau : collé à la formule en LaTeX (`x^2sinon`), un mot en texte. */
const SINON_AT_END_LATEX = /(?<!\\)sinon\s*$/;
const SINON_AT_END_TEXT = /(?<![A-Za-z\\])sinon\s*$/;

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Les morceaux d'une écriture par morceaux, leur refus, ou `null` : pas une
 * écriture par morceaux (une seule formule, `x pour x > 2` compris — elle
 * reste celle de `interval.ts`).
 *
 * Une écriture est par morceaux quand une virgule de premier niveau la coupe
 * en plusieurs parties, dont au moins une a sa condition (« pour ») ou finit
 * par « sinon ». La virgule d'un appel (`max(1,2)`), la virgule décimale
 * (`0,5` en texte, `{,}` en LaTeX) ne coupent pas.
 */
export function piecesOf(typed: string, mode: ReadingMode): WrittenPieces | null {
	const parts = topLevelParts(typed, mode);
	if (parts.length < 2) return null;
	const sinonAtEnd = mode === 'latex' ? SINON_AT_END_LATEX : SINON_AT_END_TEXT;
	const read = parts.map((part) => {
		const text = part.replace(SINON_AS_TEXT, ' sinon ');
		if (sinonAtEnd.test(text)) {
			return { kind: 'otherwise' as const, body: text.replace(sinonAtEnd, '').trim() };
		}
		const word = intervalWord(part, mode);
		if (word !== null && isConditionWritten(word.after)) {
			return { kind: 'piece' as const, body: word.before.trim(), condition: word.after.trim() };
		}
		return { kind: 'bare' as const, body: part.trim() };
	});
	if (!read.some((r) => r.kind !== 'bare')) return null;

	const pieces: WrittenPiece[] = [];
	let otherwise: string | null = null;
	for (const [i, r] of read.entries()) {
		if (r.kind === 'bare') return { ok: false, message: PIECE_WITHOUT_CONDITION };
		if (r.body === '') return { ok: false, message: MISSING_FORMULA };
		if (r.kind === 'otherwise') {
			if (i !== read.length - 1) return { ok: false, message: OTHERWISE_LAST };
			otherwise = r.body;
		} else pieces.push({ body: r.body, condition: r.condition });
	}
	return { ok: true, pieces, otherwise };
}

/**
 * L'arbre d'une écriture par morceaux : un nœud `piecewise`, conditions en
 * comparaisons (`x < k`, `2 ≤ x < 4`, reliées par « ou », « et »). Le refus
 * dit le morceau qui ne se lit pas.
 *
 * @param read - La lecture d'une formule ou d'une comparaison, dans le mode de la saisie
 */
export function piecewiseNodeOf(
	written: Extract<WrittenPieces, { ok: true }>,
	mode: ReadingMode,
	read: (text: string) => MathNode | null
):
	{ readonly ok: true; readonly ast: MathNode } | { readonly ok: false; readonly message: string } {
	const pieces = [];
	for (const piece of written.pieces) {
		const value = read(piece.body);
		if (value === null) return { ok: false, message: unreadablePiece(piece.body) };
		const condition = conditionNodeOf(piece.condition, mode, read);
		if (condition === null) return { ok: false, message: UNREADABLE_CONDITION };
		pieces.push(piecewisePiece(condition, value));
	}
	if (written.otherwise === null) return { ok: true, ast: piecewise(pieces) };
	const otherwise = read(written.otherwise);
	if (otherwise === null) return { ok: false, message: unreadablePiece(written.otherwise) };
	return { ok: true, ast: piecewise(pieces, otherwise) };
}

/** « Je n'ai pas su lire le morceau x^ : … » */
function unreadablePiece(body: string): string {
	return `Je n'ai pas su lire la formule « ${body} » d'un morceau.`;
}

/**
 * Une condition en arbre : chaque comparaison lue seule (`x < 0`, `2 ≤ x < 4`),
 * reliées par « ou », « et ». Un mélange des deux (`x < 0 ou x > 1 et x ≠ 3`)
 * est refusé avant, par la lecture de l'ensemble (`readInterval`). `null` si
 * une comparaison ne se lit pas.
 */
function conditionNodeOf(
	condition: string,
	mode: ReadingMode,
	read: (text: string) => MathNode | null
): MathNode | null {
	const text = condition.replace(JOIN_AS_TEXT, ' $1 ').replace(JOIN_GLUED, ' $1 ');
	const alternatives: MathNode[] = [];
	for (const alternative of text.split(/\s+ou\s+/)) {
		const all: MathNode[] = [];
		for (const part of alternative.split(/\s+et\s+/)) {
			const node = comparisonNodeOf(part, mode, read);
			if (node === null) return null;
			all.push(node);
		}
		alternatives.push(all.reduce((a, b) => logicalAnd(a, b)));
	}
	return alternatives.reduce((a, b) => logicalOr(a, b));
}

/** Une comparaison seule, ou `null`. `\lt` et `\gt` de MathLive deviennent `<`, `>`. */
function comparisonNodeOf(
	text: string,
	mode: ReadingMode,
	read: (text: string) => MathNode | null
): MathNode | null {
	const normalized =
		mode === 'latex'
			? text
					.replace(/\\lt(?![A-Za-z])/g, '<')
					.replace(/\\gt(?![A-Za-z])/g, '>')
					.replace(/\\leqslant(?![A-Za-z])|\\leq(?![A-Za-z])|≤|⩽/g, '\\le ')
					.replace(/\\geqslant(?![A-Za-z])|\\geq(?![A-Za-z])|≥|⩾/g, '\\ge ')
					.replace(/≠/g, '\\ne ')
			: text.replace(/⩽/g, '≤').replace(/⩾/g, '≥');
	if (normalized.trim() === '') return null;
	const node = read(normalized.trim());
	return node?.type === 'relation' ? node : null;
}

/**
 * Les parties d'une saisie coupée à ses virgules de premier niveau : hors
 * parenthèses et accolades, jamais une virgule décimale (`0,5` en texte ; en
 * LaTeX, MathLive l'écrit `{,}`, déjà dans une accolade).
 */
function topLevelParts(typed: string, mode: ReadingMode): string[] {
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < typed.length; i++) {
		const c = typed[i];
		if (c === '(' || c === '{') depth++;
		else if (c === ')' || c === '}') depth = Math.max(0, depth - 1);
		else if (c === ',' && depth === 0) {
			const decimal =
				mode !== 'latex' && /\d/.test(typed[i - 1] ?? '') && /\d/.test(typed[i + 1] ?? '');
			if (decimal) continue;
			parts.push(typed.slice(start, i));
			start = i + 1;
		}
	}
	parts.push(typed.slice(start));
	return parts;
}
