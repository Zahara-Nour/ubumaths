/**
 * Bloc ```operation — la réponse d'une division posée
 * ===================================================
 *
 * Euclidienne : DEUX cases de la question (Q2), le quotient puis le reste ;
 * décimale : une seule, le quotient (son reste est nul). Chaque case est
 * passée au juge ordinaire, comme le résultat des lots 1-2.
 *
 * - Quotient : écrit de gauche à droite (n° 5) ; cases vides à droite
 *   ignorées, zéros de tête retirés, case vide au milieu → incomplet ;
 *   virgule posée par l'élève (Q6, comme au lot 2), `comma` = la case à
 *   droite de laquelle elle est ; décimales de fin vides = 0.
 * - Reste : comme le résultat du lot 1 (de droite à gauche, sous les
 *   colonnes de la scène) ; vide → incomplet, pas de 0 implicite (n° 12).
 *
 * Phase 0 : `docs/wip/operations-posees-progress.md` § 12 et § 13.
 *
 * @module ubumark/utils/operation-division-answer
 */

import { toFrenchDecimal, type FrenchDecimalOptions } from '$lib/utils/french-math';
import type { OperationSpec } from '../types/operation';
import { canonical, splitAnswer } from './operation-answer';
import { buildDivisionScene, divisionResult, type DivisionScene } from './operation-division-scene';

/** Faute de virgule du quotient, et la case qui la montre */
export interface QuotientCommaMistake {
	mistake: 'absente' | 'mal placée';
	/** Absente : la case où elle devait être ; mal placée : celle de l'élève */
	at: number;
}

// ============================================================================
// ATTENDU
// ============================================================================

/** Cases de la question portées par une division : 2 en euclidienne (quotient, reste), 1 sinon */
export function divisionCaseCount(spec: OperationSpec): 1 | 2 {
	return spec.quotient === 'entier' ? 2 : 1;
}

/** Cases de la question portées par un bloc ```operation à remplir */
export function operationCaseCount(spec: OperationSpec): number {
	return spec.operator === '÷' ? divisionCaseCount(spec) : 1;
}

/** Les réponses attendues, sous leur forme la plus simple : `['1350', '6']`, `['196.25']` */
export function divisionExpectedAnswers(spec: OperationSpec): string[] {
	const { quotient, remainder } = divisionResult(spec);
	const [integer, decimal = ''] = quotient.split(',');
	const value = canonical(integer, decimal);
	return remainder === null ? [value] : [value, remainder];
}

// ============================================================================
// LECTURE
// ============================================================================

/** Dernière case écrite ; -1 si rien n'est écrit */
const lastWritten = (digits: readonly string[]) => digits.findLastIndex((d) => d !== '');

/** La virgule lue : une virgule posée après le dernier chiffre écrit n'en est pas une */
function placedComma(digits: readonly string[], comma: number | null): number | null {
	return comma !== null && comma < lastWritten(digits) ? comma : null;
}

/**
 * Le quotient lu dans ses cases (`digits[c]` : '' si vide), en LaTeX. Cases
 * de tête vides = rien ; une case vide entre deux chiffres écrits, ou en
 * tête des décimales, rend la réponse incomplète : ''. Virgule sans chiffre
 * à sa gauche : 0 implicite (`, 3` → `0,3`).
 */
export function readQuotientAnswer(
	digits: readonly string[],
	comma: number | null,
	options: FrenchDecimalOptions = {}
): string {
	const last = lastWritten(digits);
	if (last === -1) return '';
	const first = digits.findIndex((d) => d !== '');
	const placed = placedComma(digits, comma);
	const units = placed ?? last;
	const integer = first > units ? [] : digits.slice(first, units + 1);
	const decimal = placed === null ? [] : digits.slice(placed + 1, last + 1);
	if ([...integer, ...decimal].some((d) => d === '')) return '';
	const value = canonical(integer.join('') || '0', decimal.join(''));
	return toFrenchDecimal(value, options);
}

/** Colonnes des cases du reste, de gauche à droite */
const remainderColumns = (scene: DivisionScene) =>
	(scene.remainder ?? []).flatMap((cell, c) => (cell.blank ? [c] : []));

/**
 * Le reste lu dans ses cases (`digits[c]` sous la colonne `c` de la scène).
 * Cases de tête vides = rien ; vide après le premier chiffre écrit, ou tout
 * vide : incomplet.
 */
export function readRemainderAnswer(
	scene: DivisionScene,
	digits: readonly string[],
	options: FrenchDecimalOptions = {}
): string {
	const typed = remainderColumns(scene).map((c) => digits[c] ?? '');
	const first = typed.findIndex((d) => d !== '');
	if (first === -1 || typed.slice(first).some((d) => d === '')) return '';
	return toFrenchDecimal(canonical(typed.slice(first).join(''), ''), options);
}

// ============================================================================
// RETOUR SUR LA QUESTION
// ============================================================================

/** Le quotient déjà saisi, remis de gauche à droite avec sa virgule ; illisible ou trop long : cases vides */
export function quotientFromAnswer(
	scene: DivisionScene,
	value: string
): { digits: string[]; comma: number | null } {
	const columns = scene.quotient.length;
	const empty = { digits: Array<string>(columns).fill(''), comma: null };
	const parts = splitAnswer(value);
	if (!parts) return empty;
	const written = parts[0] + parts[1];
	if (written.length > columns) return empty;
	return {
		digits: [...written.padEnd(columns, ' ')].map((d) => (d === ' ' ? '' : d)),
		comma: parts[1] === '' ? null : parts[0].length - 1
	};
}

/** Le reste déjà saisi, remis aligné à droite dans ses cases */
export function remainderFromAnswer(scene: DivisionScene, value: string): string[] {
	const digits = Array<string>(scene.columns).fill('');
	const parts = splitAnswer(value);
	const columns = remainderColumns(scene);
	if (!parts || parts[1] !== '' || parts[0].length > columns.length) return digits;
	const padded = parts[0].padStart(columns.length, ' ');
	columns.forEach((c, k) => {
		digits[c] = padded[k].trim();
	});
	return digits;
}

// ============================================================================
// CORRECTION
// ============================================================================

/** Le quotient attendu, chiffres sans virgule, et ses chiffres avant la virgule */
function expectedQuotient(spec: OperationSpec): { digits: string; integer: string } {
	const { quotient } = divisionResult(spec);
	const [integer] = quotient.split(',');
	return { digits: quotient.replace(',', ''), integer };
}

/**
 * Décalage du quotient de l'élève : son premier chiffre non nul face au premier
 * chiffre non nul attendu. Les cases de tête vides ou à 0 (jamais fausses) ne
 * décalent donc rien de plus que ce qu'elles occupent (`0 1 3 5 0`,
 * `_ 0 , 8 5` pour 0,85). Rien de non nul : aucun décalage.
 */
function quotientShift(digits: readonly string[], expected: string): number {
	const typed = digits.findIndex((d) => d !== '' && d !== '0');
	const wanted = expected.search(/[1-9]/);
	return typed === -1 || wanted === -1 ? 0 : typed - wanted;
}

/**
 * Chiffres faux du quotient, comparés case par case depuis la gauche au
 * quotient attendu. Un zéro de tête écrit n'est jamais faux (il décale la
 * comparaison) ; un chiffre de la partie entière oublié est faux ; une
 * décimale de fin laissée vide vaut 0.
 */
export function wrongQuotientDigits(spec: OperationSpec, digits: readonly string[]): boolean[] {
	const expected = expectedQuotient(spec);
	const shift = quotientShift(digits, expected.digits);
	const last = lastWritten(digits);
	return digits.map((typed, c) => {
		if (c < shift) return false;
		const e = c - shift;
		const digit = expected.digits[e] ?? '';
		if (digit === '') return typed !== '';
		if (typed !== '') return typed !== digit;
		// Le 0 des unités de `0,3`, laissé vide : le 0 implicite de la lecture
		if (e === 0 && expected.integer === '0') return false;
		// Décimale de fin laissée vide : 0
		return !(e >= expected.integer.length && c > last && digit === '0');
	});
}

/**
 * La virgule du quotient posée par l'élève, comparée à celle de l'attendu
 * (même décalage que les chiffres). Une virgule après le dernier chiffre
 * écrit compte comme aucune virgule.
 */
export function wrongQuotientComma(
	spec: OperationSpec,
	digits: readonly string[],
	comma: number | null
): QuotientCommaMistake | null {
	const expected = expectedQuotient(spec);
	const placed = placedComma(digits, comma);
	const hasDecimals = expected.digits.length > expected.integer.length;
	const at = hasDecimals
		? quotientShift(digits, expected.digits) + expected.integer.length - 1
		: null;
	if (placed === at) return null;
	if (placed === null) return { mistake: 'absente', at: at! };
	return { mistake: 'mal placée', at: placed };
}

/** Chiffres faux du reste (`digits[c]` sous la colonne `c`) ; une case de tête vide ou à 0 n'est jamais fausse */
export function wrongRemainderDigits(spec: OperationSpec, digits: readonly string[]): boolean[] {
	const scene = buildDivisionScene(spec);
	return (scene.remainder ?? []).map((cell, c) => {
		if (!cell.blank) return false;
		const typed = digits[c] ?? '';
		if (cell.digit === '') return typed !== '' && typed !== '0';
		return typed !== cell.digit;
	});
}
