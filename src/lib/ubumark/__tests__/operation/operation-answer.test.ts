/**
 * Bloc ```operation — la réponse de l'élève (PR 1b, phase 0 :
 * `docs/wip/operations-posees-progress.md` § 9)
 *
 * Les cases du résultat, lues de gauche à droite, donnent UNE réponse : un
 * nombre en LaTeX, passé au juge ordinaire. `_` = case vide dans les aides.
 */

import { describe, expect, it } from 'vitest';
import { parseOperationContent } from '$lib/ubumark/parser/operation-parser';
import { buildOperationScene, type OperationScene } from '$lib/ubumark/utils/operation-scene';
import {
	digitsFromAnswer,
	operationExpectedAnswer,
	readOperationAnswer,
	wrongResultDigits
} from '$lib/ubumark/utils/operation-answer';

function spec(...lines: string[]) {
	const node = parseOperationContent(lines.join('\n'));
	expect(node.errors).toEqual([]);
	return node.spec!;
}

const scene = (...lines: string[]): OperationScene => buildOperationScene(spec(...lines));

/** `_82` → ['', '8', '2'] */
const cells = (typed: string) => typed.split('').map((d) => (d === '_' ? '' : d));

describe('operationExpectedAnswer : la réponse attendue, sous sa forme la plus simple', () => {
	it.each([
		['calcul: 45 + 37', '82'],
		['calcul: 56,75 + 234 + 0,8', '291.55'],
		['calcul: 0,5 + 0,5', '1'],
		['calcul: 2,5 + 1,25', '3.75'],
		['calcul: 3,2 + 0,08', '3.28'],
		['calcul: 1000 - 998', '2'],
		['calcul: 5 - 5', '0'],
		['calcul: 34,5 - 2,58', '31.92']
	])('%s → %s (comportement 2)', (line, expected) => {
		expect(operationExpectedAnswer(spec(line))).toBe(expected);
	});
});

describe('readOperationAnswer : les cases lues comme un nombre (comportement 4)', () => {
	it('45 + 37 : case de tête vide ignorée', () => {
		expect(readOperationAnswer(scene('calcul: 45 + 37'), cells('_82'))).toBe('82');
	});

	it('99 + 1 : case de tête remplie, elle compte (comportement 10)', () => {
		expect(readOperationAnswer(scene('calcul: 99 + 1'), cells('100'))).toBe('100');
	});

	it('décimaux : virgule de la grille', () => {
		expect(readOperationAnswer(scene('calcul: 56,75 + 234 + 0,8'), cells('_29155'))).toBe(
			'291{,}55'
		);
	});

	it('zéro décimal imposé par la grille retiré : 0,5 + 0,5 → 1', () => {
		expect(readOperationAnswer(scene('calcul: 0,5 + 0,5'), cells('_10'))).toBe('1');
		expect(readOperationAnswer(scene('calcul: 3,2 + 0,08'), cells('_328'))).toBe('3{,}28');
	});

	it('zéros de tête retirés : 1 000 − 998, élève 0 0 0 2 (comportement 12)', () => {
		expect(readOperationAnswer(scene('calcul: 1000 - 998'), cells('0002'))).toBe('2');
		expect(readOperationAnswer(scene('calcul: 1000 - 998'), cells('___2'))).toBe('2');
	});

	it('0 avant la virgule gardé : 0,75 − 0,5 → 0,25', () => {
		expect(readOperationAnswer(scene('calcul: 0,75 - 0,5'), cells('025'))).toBe('0{,}25');
		expect(readOperationAnswer(scene('calcul: 0,75 - 0,5'), cells('_25'))).toBe('0{,}25');
	});

	it('espaces de milliers écrits pour l’élève (BIPM par défaut, dès 4 chiffres sur réglage)', () => {
		const s = scene('calcul: 25000 + 5000');
		expect(readOperationAnswer(s, cells('_30000'))).toBe('30\\,000');
		const small = scene('calcul: 7000 + 900');
		expect(readOperationAnswer(small, cells('_7900'))).toBe('7900');
		expect(readOperationAnswer(small, cells('_7900'), { minDigits: 4 })).toBe('7\\,900');
	});

	it('case vide au milieu : réponse incomplète, rien n’est lu (comportement 11)', () => {
		expect(readOperationAnswer(scene('calcul: 45 + 37'), cells('8_2'))).toBe('');
		expect(readOperationAnswer(scene('calcul: 45 + 37'), cells('_8_'))).toBe('');
		expect(readOperationAnswer(scene('calcul: 2,5 + 1,25'), cells('_37_'))).toBe('');
	});

	it('aucune case remplie : réponse vide', () => {
		expect(readOperationAnswer(scene('calcul: 45 + 37'), cells('___'))).toBe('');
	});
});

describe('digitsFromAnswer : la réponse déjà saisie remise dans les cases', () => {
	it.each([
		['calcul: 45 + 37', '82', '_82'],
		['calcul: 56,75 + 234 + 0,8', '291{,}55', '_29155'],
		['calcul: 0,5 + 0,5', '1', '_10'],
		['calcul: 25000 + 5000', '30\\,000', '_30000'],
		['calcul: 45 + 37', '', '___']
	])('%s, %s → %s', (line, value, typed) => {
		expect(digitsFromAnswer(scene(line), value)).toEqual(cells(typed));
	});
});

describe('wrongResultDigits : chiffres faux surlignés à la correction (comportement 7)', () => {
	it('45 + 37, élève 72 : seul le chiffre des dizaines est faux', () => {
		expect(wrongResultDigits(scene('calcul: 45 + 37'), cells('_72'))).toEqual([false, true, false]);
	});

	it('zéro de tête écrit ou laissé vide : jamais faux', () => {
		expect(wrongResultDigits(scene('calcul: 1000 - 998'), cells('0002'))).toEqual([
			false,
			false,
			false,
			false
		]);
	});

	it('case vide là où un chiffre était attendu : fausse', () => {
		expect(wrongResultDigits(scene('calcul: 45 + 37'), cells('__2'))).toEqual([false, true, false]);
	});

	it('chiffre écrit dans une case de tête qui devait rester vide : faux', () => {
		expect(wrongResultDigits(scene('calcul: 45 + 37'), cells('182'))).toEqual([true, false, false]);
	});
});
