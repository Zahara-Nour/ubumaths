/**
 * Codes précis des refus de lecture — chantier lecture-grandeurs, PR 3 (2026-10-20)
 *
 * Partagé par les quatre parseurs (maison et LaTeX, Pratt et RD). La lecture ne
 * change pas : un refus qui rendait `INVALID_UNIT` ou `UNEXPECTED_TOKEN` rend
 * désormais le code qui dit CE qui manque ou ce qui est mal écrit. Le texte anglais
 * reste le même (l'atelier traduit par le texte), sauf `LEADING_DECIMAL_POINT`.
 *
 * Décisions de David (docs/wip/lecture-grandeurs-phase0.md, PR 3) :
 * - `MISSING_OPERATOR` : un nombre juste après une lettre (`x2`, `x 2`) ou une
 *   parenthèse fermante (`(1+x)2`, `sqrt(2)3`) ; `(2)(3)` reste un produit ;
 * - `MISSING_DELIMITER` : la fin arrive avant le `)`, `]` ou `}` attendu ;
 * - `LEADING_DECIMAL_POINT` : `.5` (le zéro manque) ;
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

// =============================================================================
// Fonctions
// =============================================================================

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

/** Le jeton précédent est-il une lettre (variable, constante nommée) ou une `)` ? */
function endsWithLetterOrParen(previous: RefusalToken): boolean {
	if (previous.type === 'RPAREN' || previous.type === 'SYMBOL') return true;
	return previous.type === 'LETTER' && SINGLE_LETTER.test(previous.value);
}

/**
 * Le refus précis d'un jeton inattendu dans le parseur maison, ou `null` s'il
 * garde `UNEXPECTED_TOKEN`. Ne regarde que le jeton COURANT, celui qui est refusé.
 */
export function preciseUnexpectedToken(
	current: RefusalToken,
	previous: RefusalToken | undefined
): PreciseRefusal | null {
	if (current.type !== 'NUMBER' || !previous) return null;

	// `.5` : le tokenizer lit le `.` seul comme une lettre, collée au nombre
	const isLeadingPoint =
		previous.type === 'LETTER' &&
		previous.value === '.' &&
		previous.position + previous.length === current.position;
	if (isLeadingPoint) {
		return {
			code: 'LEADING_DECIMAL_POINT',
			message: leadingDecimalPointMessage(current.value),
			position: previous.position,
			length: previous.length + current.length
		};
	}

	return endsWithLetterOrParen(previous) ? { code: 'MISSING_OPERATOR' } : null;
}

/** Le code d'une écriture d'unité refusée, commun aux parseurs */
export function unitErrorCode(input: string): ParseErrorCode {
	if (input.trim() === '') return 'EMPTY_UNIT';
	return unitWritingProblem(input) ? 'AMBIGUOUS_UNIT' : 'UNKNOWN_UNIT';
}
