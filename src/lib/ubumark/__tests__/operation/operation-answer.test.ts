/**
 * Bloc ```operation — la réponse de l'élève (PR 1b, phase 0 :
 * `docs/archive/wip/operations-posees-progress.md` § 9)
 *
 * Les cases du résultat, lues de gauche à droite, donnent UNE réponse : un
 * nombre en LaTeX, passé au juge ordinaire. `_` = case vide dans les aides.
 */

import { describe, expect, it } from 'vitest';
import { parseOperationContent } from '$lib/ubumark/parser/operation-parser';
import { buildOperationScene, type OperationScene } from '$lib/ubumark/utils/operation-scene';
import {
	commaFromAnswer,
	digitsFromAnswer,
	operationExpectedAnswer,
	readOperationAnswer,
	wrongComma,
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
		expect(readOperationAnswer(scene('calcul: 2,5 + 1,25'), cells('_3_5'))).toBe('');
		expect(readOperationAnswer(scene('calcul: 1,125 + 2'), cells('_31_5'))).toBe('');
	});

	it('décimales de fin laissées vides : comptées 0, comme les cases de tête (2026-10-25)', () => {
		expect(readOperationAnswer(scene('calcul: 0,5 + 0,5'), cells('_1_'))).toBe('1');
		expect(readOperationAnswer(scene('calcul: 2,5 + 1,5'), cells('_4_'))).toBe('4');
		expect(readOperationAnswer(scene('calcul: 12,50 + 7,85'), cells('_203_'))).toBe('20{,}3');
		expect(readOperationAnswer(scene('calcul: 1,125 + 2'), cells('_31__'))).toBe('3{,}1');
	});

	it('décimales de fin vides et réponse fausse : lue, donc jugée fausse', () => {
		expect(readOperationAnswer(scene('calcul: 2,5 + 1,25'), cells('_37_'))).toBe('3{,}7');
	});

	it('unités laissées vides : toujours incomplète, la règle ne vaut qu’après la virgule', () => {
		expect(readOperationAnswer(scene('calcul: 45 + 37'), cells('_8_'))).toBe('');
		expect(readOperationAnswer(scene('calcul: 0,5 + 0,5'), cells('___'))).toBe('');
	});

	it('aucune case remplie : réponse vide', () => {
		expect(readOperationAnswer(scene('calcul: 45 + 37'), cells('___'))).toBe('');
	});
});

describe('digitsFromAnswer : la réponse déjà saisie remise dans les cases', () => {
	it.each([
		['calcul: 45 + 37', '82', '_82'],
		['calcul: 56,75 + 234 + 0,8', '291{,}55', '_29155'],
		// Décimale de fin laissée vide : rendue en 0 au retour, même valeur lue
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

	it('décimale de fin laissée vide là où 0 était attendu : jamais fausse', () => {
		expect(wrongResultDigits(scene('calcul: 0,5 + 0,5'), cells('_2_'))).toEqual([
			false,
			true,
			false
		]);
		expect(wrongResultDigits(scene('calcul: 2,25 + 1,25'), cells('_45_'))).toEqual([
			false,
			true,
			false,
			false
		]);
	});

	it('décimale de fin laissée vide là où un chiffre non nul était attendu : fausse', () => {
		expect(wrongResultDigits(scene('calcul: 2,5 + 1,25'), cells('_37_'))).toEqual([
			false,
			false,
			false,
			true
		]);
	});

	it('case vide là où un chiffre était attendu : fausse', () => {
		expect(wrongResultDigits(scene('calcul: 45 + 37'), cells('__2'))).toEqual([false, true, false]);
	});

	it('chiffre écrit dans une case de tête qui devait rester vide : faux', () => {
		expect(wrongResultDigits(scene('calcul: 45 + 37'), cells('182'))).toEqual([true, false, false]);
	});
});

/**
 * Multiplication (PR 2b, § 11) : la grille n'a pas de virgule, l'élève la
 * pose ; `comma` = case à droite de laquelle elle est (null : pas de virgule).
 */
describe('multiplication : la virgule posée par l’élève (§ 11)', () => {
	const m = (line: string) => scene(line);

	it('attendu : 7 × 46,55 → 325,85 ; 2,5 × 4 → 10 (comportement 1)', () => {
		expect(operationExpectedAnswer(spec('calcul: 548 × 16'))).toBe('8768');
		expect(operationExpectedAnswer(spec('calcul: 7 × 46,55'))).toBe('325.85');
		expect(operationExpectedAnswer(spec('calcul: 2,5 × 4'))).toBe('10');
	});

	it('lue avec la virgule de l’élève (comportement 4)', () => {
		expect(readOperationAnswer(m('calcul: 7 × 46,55'), cells('32585'), {}, 2)).toBe('325{,}85');
		expect(readOperationAnswer(m('calcul: 7 × 46,55'), cells('32585'), {}, 3)).toBe('3258{,}5');
		expect(readOperationAnswer(m('calcul: 548 × 16'), cells('_8768'), {}, null)).toBe('8768');
	});

	it('sans virgule : nombre entier, même si le résultat attendu est décimal', () => {
		expect(readOperationAnswer(m('calcul: 7 × 46,55'), cells('32585'), {}, null)).toBe('32\\,585');
	});

	it('2,5 × 4 : 1 0 , 0 → 10 ; 1 0 sans virgule → 10 (comportements 4, 10)', () => {
		expect(readOperationAnswer(m('calcul: 2,5 × 4'), cells('100'), {}, 1)).toBe('10');
		expect(readOperationAnswer(m('calcul: 2,5 × 4'), cells('_10'), {}, null)).toBe('10');
	});

	it('virgule dans un produit d’entiers : lue (comportement 11)', () => {
		expect(readOperationAnswer(m('calcul: 48 × 16'), cells('_768'), {}, 2)).toBe('76{,}8');
	});

	it('virgule sans chiffre à sa gauche : 0 implicite (comportement 12)', () => {
		expect(readOperationAnswer(m('calcul: 0,5 × 0,3'), cells('__15'), {}, 1)).toBe('0{,}15');
		expect(readOperationAnswer(m('calcul: 0,5 × 0,3'), cells('_015'), {}, 1)).toBe('0{,}15');
	});

	it('0 des dixièmes non écrit : incomplète, pas de 0 implicite après la virgule (David, 2026-10-25)', () => {
		// 0,05 × 0,3 saisi `_ _ , _ 1 5` : n'est pas 0,015
		expect(readOperationAnswer(m('calcul: 0,05 × 0,3'), cells('___15'), {}, 1)).toBe('');
		expect(readOperationAnswer(m('calcul: 0,05 × 0,3'), cells('__015'), {}, 1)).toBe('0{,}015');
		// Même règle avec la virgule de la grille
		expect(readOperationAnswer(scene('calcul: 0,03 + 0,02'), cells('___5'))).toBe('');
		expect(readOperationAnswer(scene('calcul: 0,03 + 0,02'), cells('__05'))).toBe('0{,}05');
	});

	it('0 des dixièmes non écrit : sa case surlignée à la correction', () => {
		expect(wrongResultDigits(m('calcul: 0,05 × 0,3'), cells('___15'), 1)).toEqual([
			false,
			false,
			true,
			false,
			false
		]);
		expect(wrongResultDigits(scene('calcul: 0,03 + 0,02'), cells('___5'))).toEqual([
			false,
			false,
			true,
			false
		]);
	});

	it('virgule après la dernière case : nombre entier', () => {
		expect(readOperationAnswer(m('calcul: 548 × 16'), cells('_8768'), {}, 4)).toBe('8768');
	});

	it('cases vides (comportement 13)', () => {
		// À droite du dernier chiffre, virgule à leur gauche : ignorées
		expect(readOperationAnswer(m('calcul: 2,5 × 4'), cells('10_'), {}, 1)).toBe('10');
		// Sans virgule à leur gauche : incomplète (`_ 3 2 _` n'est pas 32)
		expect(readOperationAnswer(m('calcul: 0,5 × 0,3'), cells('_32_'), {}, null)).toBe('');
		expect(readOperationAnswer(m('calcul: 0,5 × 0,3'), cells('_32_'), {}, 3)).toBe('');
		// Au milieu : incomplète
		expect(readOperationAnswer(m('calcul: 7 × 46,55'), cells('3_585'), {}, 2)).toBe('');
	});

	it('addition : la virgule reste celle de la grille (lot 1 inchangé)', () => {
		expect(readOperationAnswer(scene('calcul: 56,75 + 234 + 0,8'), cells('_29155'))).toBe(
			'291{,}55'
		);
	});

	it('chiffres faux comparés case par case, avec la virgule de l’élève', () => {
		expect(wrongResultDigits(m('calcul: 7 × 46,55'), cells('32586'), 2)).toEqual([
			false,
			false,
			false,
			false,
			true
		]);
		expect(wrongResultDigits(m('calcul: 2,5 × 4'), cells('10_'), 1)).toEqual([false, false, false]);
	});

	it('0 implicite des unités jamais surligné (revue #1745, comportement 12)', () => {
		expect(wrongResultDigits(m('calcul: 0,5 × 0,3'), cells('__16'), 1)).toEqual([
			false,
			false,
			false,
			true
		]);
		expect(wrongResultDigits(scene('calcul: 0,2 + 0,3'), cells('__6'))).toEqual([
			false,
			false,
			true
		]);
	});

	it('virgule à la correction : absente, mal placée, à sa place (comportements 8, 11)', () => {
		const decimal = m('calcul: 7 × 46,55');
		expect(wrongComma(decimal, 2)).toBeNull();
		expect(wrongComma(decimal, null)).toBe('absente');
		expect(wrongComma(decimal, 3)).toBe('mal placée');
		const integer = m('calcul: 48 × 16');
		expect(wrongComma(integer, null)).toBeNull();
		expect(wrongComma(integer, 3)).toBeNull();
		expect(wrongComma(integer, 2)).toBe('mal placée');
	});

	it('retour sur la question : alignée à droite, virgule remise (comportement 14)', () => {
		const decimal = m('calcul: 7 × 46,55');
		expect(digitsFromAnswer(decimal, '325{,}85')).toEqual(cells('32585'));
		expect(commaFromAnswer(decimal, '325{,}85')).toBe(2);
		const trailing = m('calcul: 2,5 × 4');
		expect(digitsFromAnswer(trailing, '10')).toEqual(cells('_10'));
		expect(commaFromAnswer(trailing, '10')).toBeNull();
		expect(digitsFromAnswer(decimal, '3258{,}5')).toEqual(cells('32585'));
		expect(commaFromAnswer(decimal, '3258{,}5')).toBe(3);
		expect(commaFromAnswer(decimal, '')).toBeNull();
	});
});
