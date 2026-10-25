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
 * Phase 0 : `docs/wip/operations-posees-progress.md` § 9.
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

/**
 * Dernière case lue : les décimales de fin laissées vides comptent 0, comme
 * les cases de tête (`0,5 + 0,5`, élève « 1 » sans le 0 des dixièmes)
 */
function lastReadColumn(scene: OperationScene, digits: readonly string[]): number {
	const integerColumns = scene.columns - scene.decimals;
	let last = scene.columns - 1;
	while (last >= integerColumns && (digits[last] ?? '') === '') last--;
	return last;
}

/**
 * La réponse lue dans les cases du résultat (`digits[c]` : '' si vide), en
 * LaTeX (`291{,}55`, `30\,000`). Cases de tête vides = rien ; décimales de fin
 * vides = 0, comme les cases de tête (`0,5 + 0,5`, élève « 1 » : `1`) ; une
 * autre case vide après le premier chiffre écrit rend la réponse incomplète : ''.
 */
export function readOperationAnswer(
	scene: OperationScene,
	digits: readonly string[],
	options: FrenchDecimalOptions = {}
): string {
	const first = digits.findIndex((d) => d !== '');
	if (first === -1) return '';
	if (digits.slice(first, lastReadColumn(scene, digits) + 1).some((d) => d === '')) return '';
	const integerColumns = scene.columns - scene.decimals;
	const filled = digits.map((d) => (d === '' ? '0' : d)).join('');
	const value = canonical(filled.slice(0, integerColumns), filled.slice(integerColumns));
	return toFrenchDecimal(value, options);
}

/**
 * La réponse déjà saisie remise dans les cases (retour sur la question) :
 * chiffres alignés à droite autour de la virgule de la grille.
 */
export function digitsFromAnswer(scene: OperationScene, value: string): string[] {
	const empty = Array<string>(scene.columns).fill('');
	const plain = value
		.replace(/\\,|\s/g, '')
		.replace('{,}', ',')
		.replace('.', ',');
	const match = /^(\d+)(?:,(\d+))?$/.exec(plain);
	if (!match) return empty;
	const integerColumns = scene.columns - scene.decimals;
	const integer = match[1];
	const decimal = (match[2] ?? '').padEnd(scene.decimals, '0');
	if (integer.length > integerColumns || decimal.length > scene.decimals) return empty;
	return [...integer.padStart(integerColumns, ' '), ...decimal].map((d) => (d === ' ' ? '' : d));
}

/**
 * Chiffres faux des cases du résultat, comparés à l'opération résolue (la
 * scène porte l'attendu de chaque case, '' pour un zéro de tête). Un zéro de
 * tête écrit ou laissé vide n'est jamais faux ; une décimale de fin laissée
 * vide vaut 0, comme à la lecture.
 */
export function wrongResultDigits(scene: OperationScene, digits: readonly string[]): boolean[] {
	const last = lastReadColumn(scene, digits);
	return scene.result.map((cell, c) => {
		const typed = c > last ? '0' : (digits[c] ?? '');
		if (cell.digit === '') return typed !== '' && typed !== '0';
		return typed !== cell.digit;
	});
}
