/**
 * Bloc ```operation — division en potence (lot 3, PR 3a ; phase 0 :
 * `docs/wip/operations-posees-progress.md` § 12)
 *
 * Lecture des lignes (aide `line`) : `_` carreau vide, `,` virgule après le
 * chiffre, `(0)` zéro ajouté au dividende (Q5) ; entre crochets, une case à
 * remplir avec son chiffre attendu (`[ ]` : rien d'attendu). Une ligne
 * d'étape soustraite est préfixée de `−`.
 */

import { describe, expect, it } from 'vitest';
import { parseOperationContent } from '$lib/ubumark/parser/operation-parser';
import {
	buildDivisionScene,
	divisionResult,
	type DivisionCell,
	type DivisionScene
} from '$lib/ubumark/utils/operation-division-scene';
import { generateOperationTypst } from '$lib/ubumark/generators/operation-typst';
import { OPERATION_UNAVAILABLE } from '$lib/ubumark/types/operation';

function parse(...lines: string[]) {
	return parseOperationContent(lines.join('\n'));
}

function scene(...lines: string[]): DivisionScene {
	const node = parse(...lines);
	expect(node.errors).toEqual([]);
	return buildDivisionScene(node.spec!);
}

function line(cells: readonly DivisionCell[]): string {
	return cells
		.map((c) => {
			const shown = c.blank ? `[${c.digit || ' '}]` : c.digit === '' ? '_' : c.digit;
			return `${c.added ? `(${shown})` : shown}${c.comma ? ',' : ''}`;
		})
		.join('');
}

function potence(s: DivisionScene) {
	return {
		dividend: line(s.dividend),
		divisor: s.divisor.join(''),
		quotient: line(s.quotient),
		rows: s.rows.map((r) => `${r.subtract ? '−' : ''}${line(r.cells)}`),
		zone: s.zone,
		remainder: s.remainder === null ? null : line(s.remainder)
	};
}

describe('division : lecture du bloc', () => {
	it.each(['9 456 ÷ 7', '9456 : 7', '9456 / 7'])('« %s » : signe ÷ (comportement 1)', (calcul) => {
		const node = parse(`calcul: ${calcul}`);
		expect(node.errors).toEqual([]);
		expect(node.spec).toMatchObject({
			operator: '÷',
			terms: [
				{ integer: '9456', decimal: '' },
				{ integer: '7', decimal: '' }
			],
			steps: 'soustractions',
			quotient: 'entier'
		});
	});

	it('quotient décimal par défaut quand le dividende est décimal (Q3)', () => {
		expect(parse('calcul: 148,2 ÷ 5').spec?.quotient).toBe('décimal');
		expect(parse('calcul: 785 ÷ 4', 'quotient: décimal').spec?.quotient).toBe('décimal');
		expect(parse('calcul: 785 ÷ 4', 'étapes: restes').spec?.steps).toBe('restes');
	});

	it.each([
		[['calcul: 12 ÷ 0'], 'division par 0'],
		[['calcul: 12 ÷ 2,5'], 'diviseur décimal'],
		[['calcul: 1234 ÷ 123'], '2 chiffres au plus'],
		[['calcul: 1234567 ÷ 7'], '6 chiffres au plus'],
		[['calcul: 14,8 ÷ 5', 'quotient: entier'], 'dividende décimal'],
		[['calcul: 10 ÷ 3', 'quotient: décimal'], 'ne s’arrête pas'],
		[['calcul: 1 ÷ 16', 'quotient: décimal'], 'ne s’arrête pas'],
		[['calcul: 12 ÷ 3 ÷ 2'], 'deux termes'],
		[['calcul: 12 ÷ 3 + 1'], 'un seul signe'],
		[['calcul: 12 ÷ 3', 'méthode: cassage'], 'seulement pour une soustraction'],
		[['calcul: 12 ÷ 3', 'retenues: non'], 'pas pour une division'],
		[['calcul: 12 + 3', 'étapes: restes'], 'seulement pour une division'],
		[['calcul: 12 × 3', 'quotient: décimal'], 'seulement pour une division'],
		[['calcul: 12 ÷ 3', 'étapes: toutes'], 'valeurs possibles'],
		[['calcul: 12 ÷ 3', 'quotient: entier', 'quotient: décimal'], 'déjà donnée']
	])('%j → %s (comportements 15 à 18)', (lines, expected) => {
		const node = parse(...lines);
		expect(node.spec).toBeNull();
		expect(node.errors.map((e) => e.message).join(' ')).toContain(expected);
	});

	it('quotient au millième accepté (1 ÷ 8 = 0,125)', () => {
		expect(parse('calcul: 1 ÷ 8', 'quotient: décimal').errors).toEqual([]);
	});
});

describe('division : le résultat', () => {
	it.each([
		['9456 ÷ 7', '1350', '6'],
		['456 ÷ 7', '65', '1'],
		['5 ÷ 7', '0', '5'],
		['9 ÷ 1', '9', '0'],
		['0 ÷ 7', '0', '0'],
		['7035 ÷ 7', '1005', '0'],
		['9876 ÷ 47', '210', '6']
	])('%s = %s reste %s (comportements 2, 10-12)', (calcul, quotient, remainder) => {
		expect(divisionResult(parse(`calcul: ${calcul}`).spec!)).toEqual({ quotient, remainder });
	});

	it.each([
		['785 ÷ 4', '196,25'],
		['148,2 ÷ 5', '29,64'],
		['986,3 ÷ 5', '197,26'],
		['3 ÷ 4', '0,75'],
		['1 ÷ 8', '0,125'],
		['12 ÷ 3', '4'],
		['7,5 ÷ 3', '2,5']
	])('%s = %s (quotient décimal, comportements 7, 13)', (calcul, quotient) => {
		const spec = parse(`calcul: ${calcul}`, 'quotient: décimal').spec!;
		expect(divisionResult(spec)).toEqual({ quotient, remainder: null });
	});
});

describe('division résolue (cases: aucune)', () => {
	it('9456 ÷ 7, soustractions écrites : un 0 au quotient ne fait pas de ligne (comportement 2, Q9)', () => {
		expect(potence(scene('calcul: 9456 ÷ 7', 'cases: aucune'))).toEqual({
			dividend: '9456',
			divisor: '7',
			quotient: '1350',
			rows: ['−7___', '24__', '−21__', '_35_', '−_35_', '___6'],
			zone: 0,
			remainder: null
		});
	});

	it('étapes: restes : seuls les restes, chiffre abaissé compris (comportement 3)', () => {
		expect(potence(scene('calcul: 9456 ÷ 7', 'cases: aucune', 'étapes: restes')).rows).toEqual([
			'24__',
			'_35_',
			'___6'
		]);
	});

	it('456 ÷ 7 : premier dividende partiel à deux chiffres (comportement 10)', () => {
		expect(potence(scene('calcul: 456 ÷ 7', 'cases: aucune'))).toMatchObject({
			quotient: '65',
			rows: ['−42_', '_36', '−_35', '__1']
		});
	});

	it('7035 ÷ 7 : zéros au milieu du quotient, le chiffre suivant abaissé sur la même ligne', () => {
		expect(potence(scene('calcul: 7035 ÷ 7', 'cases: aucune'))).toMatchObject({
			quotient: '1005',
			rows: ['−7___', '__35', '−__35', '___0']
		});
	});

	it('5 ÷ 7 : quotient 0, aucune étape, le reste est le dividende (comportement 10)', () => {
		expect(potence(scene('calcul: 5 ÷ 7', 'cases: aucune'))).toMatchObject({
			quotient: '0',
			rows: []
		});
	});

	it('diviseur à deux chiffres (6-123) : 9876 ÷ 47', () => {
		expect(potence(scene('calcul: 9876 ÷ 47', 'cases: aucune'))).toMatchObject({
			divisor: '47',
			quotient: '210',
			rows: ['−94__', '_47_', '−_47_', '___6']
		});
	});

	it('785 ÷ 4 décimal : zéros ajoutés au dividende, virgule au quotient (comportement 7, Q5)', () => {
		expect(potence(scene('calcul: 785 ÷ 4', 'quotient: décimal', 'cases: aucune'))).toEqual({
			dividend: '785,(0)(0)',
			divisor: '4',
			quotient: '196,25',
			rows: [
				'−4____',
				'38___',
				'−36___',
				'_25__',
				'−_24__',
				'__10_',
				'−___8_',
				'___20',
				'−___20',
				'____0'
			],
			zone: 0,
			remainder: null
		});
	});

	it('148,2 ÷ 5 : virgule du dividende à sa place, un zéro ajouté (comportement 13)', () => {
		expect(potence(scene('calcul: 148,2 ÷ 5', 'cases: aucune'))).toMatchObject({
			dividend: '148,2(0)',
			quotient: '29,64'
		});
	});

	it('3 ÷ 4 : quotient 0,75, le dividende partiel reste sur la ligne du dividende', () => {
		expect(potence(scene('calcul: 3 ÷ 4', 'quotient: décimal', 'cases: aucune'))).toMatchObject({
			dividend: '3,(0)(0)',
			quotient: '0,75',
			rows: ['−28_', '_20', '−_20', '__0']
		});
	});

	it('12 ÷ 3 décimal exact sans décimale : pas de virgule', () => {
		expect(potence(scene('calcul: 12 ÷ 3', 'quotient: décimal', 'cases: aucune'))).toMatchObject({
			dividend: '12',
			quotient: '4'
		});
	});
});

describe('division à remplir (cases: résultat)', () => {
	it('9456 ÷ 7 : quotient de 4 cases, zone libre, reste en bas (comportement 4, Q7)', () => {
		expect(potence(scene('calcul: 9456 ÷ 7'))).toEqual({
			dividend: '9456',
			divisor: '7',
			quotient: '[1][3][5][0]',
			rows: [],
			zone: 8,
			remainder: '___[6]'
		});
	});

	it('la zone ne dépend que du dividende et du diviseur, pas du quotient (Q7)', () => {
		// 1 000 ÷ 7 et 9 999 ÷ 7 : même zone, même nombre de cases au quotient
		const small = scene('calcul: 1000 ÷ 7');
		const big = scene('calcul: 9999 ÷ 7');
		expect(small.zone).toBe(big.zone);
		expect(small.quotient.length).toBe(big.quotient.length);
		expect(scene('calcul: 9456 ÷ 7', 'étapes: restes').zone).toBe(4);
		expect(scene('calcul: 9876 ÷ 47').zone).toBe(6);
	});

	it('reste : autant de cases que de chiffres du diviseur', () => {
		expect(potence(scene('calcul: 9876 ÷ 47')).remainder).toBe('__[ ][6]');
	});

	it('quotient décimal : carreaux libres à droite du dividende, pas de case de reste (comportement 7)', () => {
		expect(potence(scene('calcul: 785 ÷ 4', 'quotient: décimal'))).toMatchObject({
			dividend: '785___',
			quotient: '[1][9][6][2][5][ ]',
			remainder: null
		});
		expect(potence(scene('calcul: 148,2 ÷ 5'))).toMatchObject({
			dividend: '148,2__',
			quotient: '[2][9][6][4][ ][ ]'
		});
	});
});

describe('division au PDF', () => {
	const typst = (...lines: string[]) =>
		generateOperationTypst(parseOperationContent(lines.join('\n')));

	it('potence : trait vertical et trait sous le diviseur ; à remplir, ni quotient ni reste', () => {
		const out = typst('calcul: 9456 ÷ 7');
		expect(out).toContain('table.vline(');
		expect(out).toContain('table.hline(y: 1,');
		for (const d of ['9', '4', '5', '6', '7']) expect(out).toContain(`[#[${d}]]`);
		expect(out).not.toContain('[#[1]]');
		expect(out).not.toContain('[#[3]]');
	});

	it('résolue : quotient, soustractions et signe moins écrits', () => {
		const out = typst('calcul: 9456 ÷ 7', 'cases: aucune');
		expect(out).toContain('[#[1]]');
		expect(out).toContain('[#[3]]');
		expect(out).toContain('[−]');
	});

	it('bloc en erreur : cadre neutre', () => {
		expect(typst('calcul: 12 ÷ 0')).toContain(OPERATION_UNAVAILABLE);
	});
});
