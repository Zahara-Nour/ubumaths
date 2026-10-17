/**
 * Points nommés collés : `AB` (longueur d'un segment), `ABC` (nom de figure).
 *
 * Lecture sur les JETONS bruts, avant le parseur : seuls les jetons savent si deux
 * lettres sont collées dans la source (`AB`) ou séparées par une espace (`A B`,
 * produit — décision Q-E du 2026-10-12). Un point = une majuscule, ses primes (`'`,
 * `^\prime`, `^{\prime\prime}`) et un indice (`_1`, `_n`, `_{12}`).
 *
 * Ne consomme rien : rend les points lus et le nombre de jetons qu'ils occupent ;
 * le parseur avance d'autant. Utilisé par les parseurs LaTeX Pratt et rd, et par les
 * parseurs de la syntaxe maison (lot 5) : les deux tokenizers nomment de la même façon
 * les jetons utiles (`LETTER`, `PRIME`, `UNDERSCORE`, `NUMBER`, accolades), et la syntaxe
 * maison n'a pas de `\prime` (ses primes sont des `'`).
 *
 * @module mathAST/parser/latex/point-names
 */

import type { PointName } from '../../types';
import { pointName } from '../../factory';

// =============================================================================
// Types
// =============================================================================

/** Des points nommés collés, et le nombre de jetons bruts qu'ils occupent. */
export interface PointNamesScan {
	readonly points: readonly PointName[];
	readonly tokenCount: number;
}

/**
 * Ce que le scanner lit d'un jeton : commun aux jetons LaTeX (`Token`) et à ceux de la
 * syntaxe maison (`CustomToken`).
 */
export interface ScannedToken {
	readonly type: string;
	readonly value: string;
	readonly position: number;
	readonly length: number;
}

/** Jeton brut à la position relative `offset` (0 = le jeton courant du parseur). */
export type TokenAt = (offset: number) => ScannedToken;

/** Réglages propres à une syntaxe. */
export interface PointNamesSyntax {
	/**
	 * Indice de plusieurs chiffres sans accolades (`A_12`). Faux en LaTeX (l'indice n'y est
	 * que `1`), vrai en syntaxe maison, où `x_12` est l'indice 12.
	 */
	readonly bareMultiDigitIndex: boolean;
}

const LATEX_SYNTAX: PointNamesSyntax = { bareMultiDigitIndex: false };

// =============================================================================
// Constantes
// =============================================================================

const CAPITAL = /^[A-Z]$/;
const SINGLE_DIGIT = /^\d$/;
const DIGITS = /^\d+$/;
const LOWER_LETTER = /^[a-z]$/;

// =============================================================================
// Fonctions
// =============================================================================

/** `next` commence exactement où finit `previous` : rien entre les deux dans la source. */
function isAdjacent(previous: ScannedToken, next: ScannedToken): boolean {
	return next.position === previous.position + previous.length;
}

/**
 * Les primes à partir de `offset` : `'`, `^\prime`, `^{\prime…}`. Rend le nombre de
 * primes et de jetons, ou `null` si rien ne commence ici.
 */
function scanPrimes(at: TokenAt, offset: number): { primes: number; tokenCount: number } | null {
	const first = at(offset);
	if (first.type === 'PRIME') return { primes: 1, tokenCount: 1 };
	if (first.type !== 'CARET') return null;

	const second = at(offset + 1);
	if (!isAdjacent(first, second)) return null;
	if (second.type === 'COMMAND' && second.value === 'prime') return { primes: 1, tokenCount: 2 };
	if (second.type !== 'LBRACE') return null;

	let primes = 0;
	let previous = second;
	let index = offset + 2;
	while (true) {
		const token = at(index);
		if (!isAdjacent(previous, token)) return null;
		if (token.type === 'COMMAND' && token.value === 'prime') {
			primes++;
			previous = token;
			index++;
			continue;
		}
		if (token.type === 'RBRACE' && primes > 0) {
			return { primes, tokenCount: index - offset + 1 };
		}
		return null;
	}
}

/**
 * L'indice d'un point à partir de `offset` : `_1`, `_n`, `_{12}`, `_{n}`. Rend
 * l'indice et le nombre de jetons, ou `null`. `_12` sans accolades n'est pas un
 * indice de point (en LaTeX, l'indice n'y est que `1`).
 */
function scanIndex(
	at: TokenAt,
	offset: number,
	syntax: PointNamesSyntax
): { index: string; tokenCount: number } | null {
	const underscore = at(offset);
	if (underscore.type !== 'UNDERSCORE') return null;

	const first = at(offset + 1);
	if (!isAdjacent(underscore, first)) return null;
	const bareDigits = syntax.bareMultiDigitIndex ? DIGITS : SINGLE_DIGIT;
	if (first.type === 'NUMBER' && bareDigits.test(first.value)) {
		return { index: first.value, tokenCount: 2 };
	}
	if (first.type === 'LETTER' && LOWER_LETTER.test(first.value)) {
		return { index: first.value, tokenCount: 2 };
	}
	if (first.type !== 'LBRACE') return null;

	let index = '';
	let previous = first;
	let position = offset + 2;
	while (true) {
		const token = at(position);
		if (!isAdjacent(previous, token)) return null;
		if (token.type === 'NUMBER' && DIGITS.test(token.value)) {
			index += token.value;
		} else if (token.type === 'LETTER' && LOWER_LETTER.test(token.value)) {
			index += token.value;
		} else if (token.type === 'RBRACE' && index !== '') {
			return { index, tokenCount: position - offset + 1 };
		} else {
			return null;
		}
		previous = token;
		position++;
	}
}

/** Un point à partir de `offset` : majuscule, puis primes et indice dans un ordre quelconque. */
function scanPoint(
	at: TokenAt,
	offset: number,
	syntax: PointNamesSyntax
): { point: PointName; tokenCount: number } | null {
	const letter = at(offset);
	if (letter.type !== 'LETTER' || !CAPITAL.test(letter.value)) return null;

	let primes = 0;
	let index: string | undefined;
	let tokenCount = 1;
	let previous = letter;
	while (true) {
		const next = at(offset + tokenCount);
		if (!isAdjacent(previous, next)) break;
		const primeScan = scanPrimes(at, offset + tokenCount);
		if (primeScan) {
			primes += primeScan.primes;
			tokenCount += primeScan.tokenCount;
			previous = at(offset + tokenCount - 1);
			continue;
		}
		const indexScan = index === undefined ? scanIndex(at, offset + tokenCount, syntax) : null;
		if (indexScan) {
			index = indexScan.index;
			tokenCount += indexScan.tokenCount;
			previous = at(offset + tokenCount - 1);
			continue;
		}
		break;
	}
	return { point: pointName(letter.value, primes, index), tokenCount };
}

/**
 * Les points nommés collés à partir du jeton courant (`offset` 0), s'il y en a au
 * moins deux : `AB` → 2 points, `ABC` → 3. `null` sinon (une majuscule seule, une
 * minuscule, `A B` avec une espace…), et le parseur lit comme avant.
 */
export function scanPointNames(
	at: TokenAt,
	syntax: PointNamesSyntax = LATEX_SYNTAX
): PointNamesScan | null {
	const points: PointName[] = [];
	let tokenCount = 0;
	while (true) {
		if (tokenCount > 0 && !isAdjacent(at(tokenCount - 1), at(tokenCount))) break;
		const scan = scanPoint(at, tokenCount, syntax);
		if (!scan) break;
		points.push(scan.point);
		tokenCount += scan.tokenCount;
	}
	return points.length >= 2 ? { points, tokenCount } : null;
}

// =============================================================================
// Espaces entre deux majuscules
// =============================================================================

/**
 * Fin d'un point (majuscule, primes, indice) qui n'est pas la fin d'un nom de
 * commande (`\LaTeX`), suivie d'espacements (`\,`, `\;`, `\ `, `~`, `\quad`, espaces),
 * puis d'une majuscule.
 */
const SPACED_CAPITALS =
	/(?<!\\[A-Za-z]*)([A-Z](?:'+|\^\{?(?:\\prime)+\}?|_\{?[a-z0-9]+\}?)*)(?:\s|~|\\[,;:!> ]|\\(?:quad|qquad|enspace|thinspace|medspace|thickspace)(?![A-Za-z]))+(?=[A-Z])/g;

/**
 * Deux majuscules SÉPARÉES par un espacement restent séparées par une espace
 * ordinaire : `A\,B` → `A B` (un produit, décision Q-E du 2026-10-12), pour les
 * nettoyages qui retirent ensuite les `\,` (groupement des chiffres). Sans cela,
 * `A\,B` — ce qu'écrit MathLive quand l'élève tape « A espace B » (mesuré dans
 * Chromium) — devenait `AB`, la longueur.
 */
export function separateSpacedCapitals(latex: string): string {
	return latex.replace(SPACED_CAPITALS, '$1 ');
}
