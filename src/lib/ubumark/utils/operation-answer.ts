/**
 * Bloc ```operation — la réponse de l'élève
 * =========================================
 *
 * Les cases du résultat forment UNE réponse (décision 5) : lues de gauche à
 * droite, virgule de la grille comprise, elles donnent un nombre passé au juge
 * ordinaire. La lecture retire ce que la grille impose et que l'élève ne
 * choisit pas : zéros de tête, zéros décimaux de fin (`1,0` → `1`), et pose
 * les espaces de milliers — jamais de remarque de forme qu'il n'a pas pu
 * éviter.
 *
 * Virgule : celle de la grille (addition, soustraction), ou celle que
 * l'élève pose (multiplication, Q3) — `comma` = la case à droite de laquelle
 * elle est, null sans virgule.
 *
 * Phase 0 : `docs/wip/operations-posees-progress.md` § 9 et § 11.
 *
 * @module ubumark/utils/operation-answer
 */

import { toFrenchDecimal, type FrenchDecimalOptions } from '$lib/utils/french-math';
import type { OperationSpec } from '../types/operation';
import { operationResult, type OperationScene } from './operation-scene';

/** `0045.50` → `45.5` ; `000` → `0` */
function canonical(integer: string, decimal: string): string {
	const int = integer.replace(/^0+(?=\d)/, '');
	const dec = decimal.replace(/0+$/, '');
	return dec === '' ? int : `${int}.${dec}`;
}

/** La réponse attendue, sous sa forme la plus simple : `82`, `291.55`, `1` (0,5 + 0,5) */
export function operationExpectedAnswer(spec: OperationSpec): string {
	const [integer, decimal = ''] = operationResult(spec).split(',');
	return canonical(integer, decimal);
}

/** Case suivie de la virgule de la grille ; null : pas de virgule (multiplication : l'élève la pose) */
export function gridComma(scene: OperationScene): number | null {
	const c = scene.result.findIndex((cell) => cell.comma);
	return c === -1 ? null : c;
}

/** Colonnes avant la virgule */
const integerColumnsOf = (scene: OperationScene, comma: number | null) =>
	comma === null ? scene.columns : comma + 1;

/**
 * Dernière case lue : les décimales de fin laissées vides comptent 0, comme
 * les cases de tête (`0,5 + 0,5`, élève « 1 » sans le 0 des dixièmes)
 */
function lastReadColumn(
	scene: OperationScene,
	digits: readonly string[],
	comma: number | null
): number {
	const integerColumns = integerColumnsOf(scene, comma);
	let last = scene.columns - 1;
	while (last >= integerColumns && (digits[last] ?? '') === '') last--;
	return last;
}

/**
 * La réponse lue dans les cases du résultat (`digits[c]` : '' si vide), en
 * LaTeX (`291{,}55`, `30\,000`). Cases de tête vides = rien ; décimales de fin
 * vides = 0, comme les cases de tête (`0,5 + 0,5`, élève « 1 » : `1`) ; une
 * autre case vide après le premier chiffre écrit rend la réponse incomplète : ''.
 * Virgule sans chiffre à sa gauche : 0 implicite (`, 1 5` → `0,15`).
 */
export function readOperationAnswer(
	scene: OperationScene,
	digits: readonly string[],
	options: FrenchDecimalOptions = {},
	comma: number | null = gridComma(scene)
): string {
	const first = digits.findIndex((d) => d !== '');
	if (first === -1) return '';
	const last = lastReadColumn(scene, digits, comma);
	if (digits.slice(first, last + 1).some((d) => d === '')) return '';
	const integerColumns = integerColumnsOf(scene, comma);
	const filled = digits.map((d) => (d === '' ? '0' : d)).join('');
	const value = canonical(filled.slice(0, integerColumns), filled.slice(integerColumns));
	return toFrenchDecimal(value, options);
}

/** `291{,}55`, `30\\,000` → ['291', '55'], ['30000', ''] ; null si ce n'est pas un nombre */
function splitAnswer(value: string): [string, string] | null {
	const plain = value
		.replace(/\\,|\s/g, '')
		.replace('{,}', ',')
		.replace('.', ',');
	const match = /^(\d+)(?:,(\d+))?$/.exec(plain);
	return match ? [match[1], match[2] ?? ''] : null;
}

/** Décimales remises dans la grille : celles de la grille, ou celles de la réponse quand l'élève pose la virgule */
function restoredDecimals(scene: OperationScene, decimal: string): number {
	return gridComma(scene) === null && scene.operator === '×' ? decimal.length : scene.decimals;
}

/**
 * La réponse déjà saisie remise dans les cases (retour sur la question) :
 * chiffres alignés à droite autour de la virgule de la grille ;
 * multiplication : autour de la virgule de la réponse (`commaFromAnswer`).
 */
export function digitsFromAnswer(scene: OperationScene, value: string): string[] {
	const empty = Array<string>(scene.columns).fill('');
	const parts = splitAnswer(value);
	if (!parts) return empty;
	const decimals = restoredDecimals(scene, parts[1]);
	const integerColumns = scene.columns - decimals;
	const integer = parts[0];
	const decimal = parts[1].padEnd(decimals, '0');
	if (integer.length > integerColumns || decimal.length > decimals) return empty;
	return [...integer.padStart(integerColumns, ' '), ...decimal].map((d) => (d === ' ' ? '' : d));
}

/** Multiplication : la virgule de la réponse déjà saisie, remise dans la grille (null : nombre entier) */
export function commaFromAnswer(scene: OperationScene, value: string): number | null {
	const parts = splitAnswer(value);
	if (!parts || parts[1] === '' || digitsFromAnswer(scene, value).every((d) => d === '')) {
		return null;
	}
	return scene.columns - parts[1].length - 1;
}

/**
 * Chiffres faux des cases du résultat, comparés à l'opération résolue (la
 * scène porte l'attendu de chaque case, '' pour un zéro de tête). Un zéro de
 * tête écrit ou laissé vide n'est jamais faux (le 0 des unités de `0,15`
 * compris) ; une décimale de fin laissée vide vaut 0, comme à la lecture.
 */
export function wrongResultDigits(
	scene: OperationScene,
	digits: readonly string[],
	comma: number | null = gridComma(scene)
): boolean[] {
	const last = lastReadColumn(scene, digits, comma);
	const first = digits.findIndex((d) => d !== '');
	return scene.result.map((cell, c) => {
		const typed = c > last ? '0' : (digits[c] ?? '');
		if (cell.digit === '') return typed !== '' && typed !== '0';
		// Case de tête vide là où 0 était attendu : le 0 implicite de la lecture (`, 1 5` → 0,15)
		if (typed === '' && cell.digit === '0' && (first === -1 || c < first)) return false;
		return typed !== cell.digit;
	});
}

/**
 * Multiplication : la virgule posée par l'élève, comparée à celle du résultat
 * (après le chiffre des unités). Une virgule après la dernière case compte
 * comme aucune virgule.
 */
export function wrongComma(
	scene: OperationScene,
	comma: number | null
): 'absente' | 'mal placée' | null {
	const placed = comma === scene.columns - 1 ? null : comma;
	const expected = scene.decimals === 0 ? null : scene.columns - scene.decimals - 1;
	if (placed === expected) return null;
	return placed === null ? 'absente' : 'mal placée';
}
