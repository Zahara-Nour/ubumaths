/**
 * Codes précis des refus de lecture — chantier lecture-grandeurs, PR 3 (2026-10-20)
 *
 * Partagé par les quatre parseurs (maison et LaTeX, Pratt et RD). La lecture ne
 * change pas : un refus qui rendait `INVALID_UNIT` ou `UNEXPECTED_TOKEN` rend
 * désormais le code qui dit CE qui manque ou ce qui est mal écrit. Le texte anglais
 * reste le même (l'atelier traduit par le texte), sauf `LEADING_DECIMAL_POINT`.
 *
 * Décisions de David (docs/archive/wip/lecture-grandeurs-phase0.md, PR 3) :
 * - `MISSING_OPERATOR` : un nombre juste après un facteur, comme le refus « nombre
 *   après un facteur » du LaTeX (David, 2026-10-20 : « suis LaTeX ») — lettre,
 *   nombre, `)`, `]`, `}`, `|`, `%` (`x2`, `(1+x)2`, `x^2 3`, `|x|2`) ; `(2)(3)`
 *   reste un produit ;
 * - `MISSING_DELIMITER` : la fin arrive avant le `)`, `]` ou `}` attendu ;
 * - `LEADING_DECIMAL_POINT` : `.5` (le zéro manque) ;
 * - PR 6 (page virgule, 2026-10-20) : `DECIMAL_COMMA` (`2,5` : chiffre, virgule, chiffre
 *   collés), `UNEXPECTED_COMMA` (une virgule hors d'une fonction ou d'une matrice),
 *   `SEMICOLON` (`max(2;5)`) — le parseur maison n'a que le point décimal et la virgule
 *   séparatrice ; le français est traduit avant lui ;
 * - unités : `UNKNOWN_UNIT`, `EMPTY_UNIT`, `AMBIGUOUS_UNIT` (et, posés là où le
 *   refus naît, `UNIT_EXPONENT_OUTSIDE`, `SPACE_IN_UNIT`).
 *
 * @module mathAST/parser/refusal-codes
 */

import { unitWritingProblem } from '../units/parser';
import type { ParseErrorCode } from './types';

// =============================================================================
// Types
// =============================================================================

/** Ce que les règles doivent savoir d'un jeton, quel que soit le tokenizer */
interface RefusalToken {
	readonly type: string;
	readonly value: string;
	readonly position: number;
	readonly length: number;
}

/** Un refus `UNEXPECTED_TOKEN` rendu précis : son code, et son texte s'il change */
export interface PreciseRefusal {
	readonly code: ParseErrorCode;
	readonly message?: string;
	readonly position?: number;
	readonly length?: number;
}

// =============================================================================
// Constantes
// =============================================================================

/** Les jetons qui ferment un groupe */
const CLOSING_TOKENS: ReadonlySet<string> = new Set(['RPAREN', 'RBRACKET', 'RBRACE']);

/** Une seule lettre : le tokenizer maison range aussi `.` et `;` parmi les LETTER */
const SINGLE_LETTER = /^\p{L}$/u;

/** Les jetons qui terminent un facteur (hors lettre, vérifiée à part) */
const FACTOR_END_TOKENS: ReadonlySet<string> = new Set([
	'NUMBER',
	'SYMBOL',
	'RPAREN',
	'RBRACKET',
	'RBRACE',
	'PIPE',
	'PERCENT'
]);

/** Le refus d'une virgule hors d'une fonction ou d'une matrice (`1, 2`, `,5`) */
const UNEXPECTED_COMMA_MESSAGE = "Unexpected comma: ',' only separates function arguments";

/** Le refus d'un point-virgule (`max(2;5)`, `x;y`) */
const SEMICOLON_MESSAGE = "';' is not a separator: use ',' between arguments";

/** Un nombre entier, sans point ni exposant : les deux moitiés d'un `2,5` */
const DIGITS = /^\d+$/;

// =============================================================================
// Fonctions
// =============================================================================

/** Le message d'une virgule décimale (`2,5`) */
export function decimalCommaMessage(integer: string, fraction: string): string {
	return `Decimal comma: the decimal separator is '.' (write ${integer}.${fraction})`;
}

/** Le message d'un nombre écrit sans son zéro de tête (`.5`) */
export function leadingDecimalPointMessage(digits: string): string {
	return `Missing zero before the decimal point (write 0.${digits})`;
}

/**
 * Le code d'un `expect` manqué : `MISSING_DELIMITER` quand l'écriture s'arrête
 * avant le délimiteur fermant attendu (`(1+2`, `[1,2`, `5[m`).
 */
export function expectCode(expected: string, current: RefusalToken): ParseErrorCode {
	return CLOSING_TOKENS.has(expected) && current.type === 'EOF'
		? 'MISSING_DELIMITER'
		: 'UNEXPECTED_TOKEN';
}

/** Le jeton termine-t-il un facteur (lettre, nombre, `)`, `|`…) ? */
function endsFactor(token: RefusalToken): boolean {
	if (FACTOR_END_TOKENS.has(token.type)) return true;
	return token.type === 'LETTER' && SINGLE_LETTER.test(token.value);
}

/** Deux jetons collés, sans espace entre eux */
function glued(left: RefusalToken, right: RefusalToken): boolean {
	return left.position + left.length === right.position;
}

/**
 * Le refus précis d'un jeton inattendu dans le parseur maison, ou `null` s'il
 * garde `UNEXPECTED_TOKEN`. Ne regarde que le jeton COURANT, celui qui est refusé.
 */
export function preciseUnexpectedToken(
	current: RefusalToken,
	previous: RefusalToken | undefined,
	beforePrevious: RefusalToken | undefined,
	next: RefusalToken
): PreciseRefusal | null {
	if (current.type === 'SEMICOLON') return { code: 'SEMICOLON', message: SEMICOLON_MESSAGE };
	// `√2,5` : la parenthèse implicite de `√` (longueur 0) sépare le 2 de la virgule
	if (current.type === 'COMMA') {
		return preciseComma(current, previous?.length === 0 ? beforePrevious : previous, next);
	}
	if (current.type !== 'NUMBER' || !previous) return null;

	// `.5` : le tokenizer lit le `.` seul comme une lettre, collée au nombre.
	// Collé à un facteur à sa gauche, ce n'est pas un point de tête : `1.2.3`, `x.5`
	const isLeadingPoint =
		previous.type === 'LETTER' &&
		previous.value === '.' &&
		glued(previous, current) &&
		!(beforePrevious && glued(beforePrevious, previous) && endsFactor(beforePrevious));
	if (isLeadingPoint) {
		return {
			code: 'LEADING_DECIMAL_POINT',
			message: leadingDecimalPointMessage(current.value),
			position: previous.position,
			length: previous.length + current.length
		};
	}

	return endsFactor(previous) ? { code: 'MISSING_OPERATOR' } : null;
}

/**
 * Une virgule là où rien ne se sépare : décimale si elle est collée entre deux
 * entiers (`2,5`, `(1,2)`, `[1,2]`), sinon simplement inattendue (`1, 2`, `x,2`).
 */
function preciseComma(
	comma: RefusalToken,
	previous: RefusalToken | undefined,
	next: RefusalToken
): PreciseRefusal {
	const isDecimal =
		previous !== undefined &&
		previous.type === 'NUMBER' &&
		next.type === 'NUMBER' &&
		DIGITS.test(previous.value) &&
		/^\d/.test(next.value) &&
		glued(previous, comma) &&
		glued(comma, next);
	if (!isDecimal) return { code: 'UNEXPECTED_COMMA', message: UNEXPECTED_COMMA_MESSAGE };
	return {
		code: 'DECIMAL_COMMA',
		message: decimalCommaMessage(previous.value, next.value),
		position: previous.position,
		length: next.position + next.length - previous.position
	};
}

/** Le code d'une écriture d'unité refusée, commun aux parseurs */
export function unitErrorCode(input: string): ParseErrorCode {
	if (input.trim() === '') return 'EMPTY_UNIT';
	return unitWritingProblem(input) ? 'AMBIGUOUS_UNIT' : 'UNKNOWN_UNIT';
}
