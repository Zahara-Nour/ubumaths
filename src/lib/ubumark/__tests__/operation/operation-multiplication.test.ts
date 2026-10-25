/**
 * Bloc ```operation — multiplication (lot 2, PR 2a ; phase 0 :
 * `docs/archive/wip/operations-posees-progress.md` § 10)
 *
 * Lecture des lignes (aide `line`) : `_` carreau vide, `,` virgule après le
 * chiffre ; entre crochets, une case à remplir avec son chiffre attendu.
 * Rangées de retenues (`above`, `partialCarries`) : `_` sans retenue, sinon
 * le texte ; entre crochets, une case à remplir.
 */

import { describe, expect, it } from 'vitest';
import { parseOperationContent } from '$lib/ubumark/parser/operation-parser';
import {
	buildOperationScene,
	operationResult,
	type OperationCell,
	type OperationMark,
	type OperationResultCell,
	type OperationScene
} from '$lib/ubumark/utils/operation-scene';
import { operationExpectedAnswer } from '$lib/ubumark/utils/operation-answer';
import { generateOperationTypst } from '$lib/ubumark/generators/operation-typst';

function parse(...lines: string[]) {
	return parseOperationContent(lines.join('\n'));
}

function scene(...lines: string[]): OperationScene {
	const node = parse(...lines);
	expect(node.errors).toEqual([]);
	return buildOperationScene(node.spec!);
}

const mark = (m: OperationMark | null) => (m === null ? '_' : m.blank ? `[${m.text}]` : m.text);

function line(cells: readonly (OperationCell | OperationResultCell)[]): string {
	return cells
		.map((c) => `${c.blank ? `[${c.digit}]` : c.digit === '' ? '_' : c.digit}${c.comma ? ',' : ''}`)
		.join('');
}

function grid(s: OperationScene) {
	return {
		above: s.above.map(mark).join(' '),
		terms: s.terms.map(line),
		partialCarries: s.partialCarries === null ? null : s.partialCarries.map(mark).join(' '),
		partials: s.partials.map(line),
		result: line(s.result)
	};
}

describe('multiplication : lecture du bloc', () => {
	it.each(['548 × 16', '548 x 16', '548 * 16'])('« %s » : signe ×', (calcul) => {
		const node = parse(`calcul: ${calcul}`);
		expect(node.errors).toEqual([]);
		expect(node.spec?.operator).toBe('×');
	});

	it('le facteur qui a le plus de chiffres est posé en haut (Q1)', () => {
		expect(parse('calcul: 16 × 548').spec?.terms).toEqual([
			{ integer: '548', decimal: '' },
			{ integer: '16', decimal: '' }
		]);
		// Chiffres comptés virgule ôtée : 46,55 en a 4
		expect(parse('calcul: 7 × 46,55').spec?.terms[0]).toEqual({ integer: '46', decimal: '55' });
	});

	it('zéros de tête non comptés : 0,5 × 12 pose 12 en haut ; 0,001 × 0,001 accepté', () => {
		expect(parse('calcul: 0,5 × 12').spec?.terms[0]).toEqual({ integer: '12', decimal: '' });
		expect(parse('calcul: 0,001 × 0,001').errors).toEqual([]);
	});

	it('égalité de chiffres : ordre écrit gardé', () => {
		expect(parse('calcul: 876 × 20,8').spec?.terms[0]).toEqual({ integer: '876', decimal: '' });
		expect(parse('calcul: 20,8 × 876').spec?.terms[0]).toEqual({ integer: '20', decimal: '8' });
	});

	it.each([
		[['calcul: 3 × 4 × 5'], 'deux facteurs'],
		[['calcul: 3 × 4 + 1'], 'un seul signe'],
		[['calcul: 1234567 × 2'], '6 chiffres au plus'],
		[['calcul: 1234 × 5678'], '3 chiffres au plus'],
		[['calcul: 12 × 3', 'méthode: cassage'], 'seulement pour une soustraction']
	])('%j → %s (comportements 13 à 15)', (lines, expected) => {
		const node = parse(...lines);
		expect(node.spec).toBeNull();
		expect(node.errors.map((e) => e.message).join(' ')).toContain(expected);
	});
});

describe('multiplication : le résultat', () => {
	it.each([
		['46 × 7', '322'],
		['548 × 16', '8768'],
		['876 × 208', '182208'],
		['7 × 46,55', '325,85'],
		['876 × 20,8', '18220,8'],
		['8,76 × 208', '1822,08'],
		['2,5 × 4', '10,0'],
		['0,5 × 4', '2,0'],
		['2,5 × 1,4', '3,50'],
		['548 × 0', '0'],
		['548 × 1', '548']
	])('%s = %s', (calcul, expected) => {
		expect(operationResult(parse(`calcul: ${calcul}`).spec!)).toBe(expected);
	});

	it('réponse attendue sous sa forme la plus simple', () => {
		expect(operationExpectedAnswer(parse('calcul: 7 × 46,55').spec!)).toBe('325.85');
		expect(operationExpectedAnswer(parse('calcul: 2,5 × 4').spec!)).toBe('10');
	});
});

describe('multiplication résolue (cases: aucune)', () => {
	it('46 × 7 : un chiffre en bas, résultat sous le trait, retenues au-dessus (comportements 2, 6)', () => {
		const s = scene('calcul: 46 × 7', 'cases: aucune');
		expect(s.operator).toBe('×');
		expect(s.columns).toBe(3);
		expect(grid(s)).toEqual({
			above: '_ 4 _',
			terms: ['_46', '__7'],
			partialCarries: null,
			partials: [],
			result: '322'
		});
	});

	it('548 × 16 : produits partiels décalés, retenues de l’addition seules (Q5)', () => {
		expect(grid(scene('calcul: 16 × 548', 'cases: aucune'))).toEqual({
			above: '_ _ _ _',
			terms: ['_548', '__16'],
			partialCarries: '_ 1 _ _',
			partials: ['3288', '5480'],
			result: '8768'
		});
	});

	it('876 × 208 : la ligne du 0 est sautée, la suivante a deux zéros (Q2)', () => {
		expect(grid(scene('calcul: 876 × 208', 'cases: aucune'))).toEqual({
			above: '_ _ _ _ _ _',
			terms: ['___876', '___208'],
			partialCarries: '_ 1 _ _ _ _',
			partials: ['__7008', '175200'],
			result: '182208'
		});
	});

	it('7 × 46,55 : alignés à droite, virgules à leur place, décimales réunies (comportement 5)', () => {
		const s = scene('calcul: 7 × 46,55', 'cases: aucune');
		expect(s.decimals).toBe(2);
		expect(grid(s)).toEqual({
			above: '_ 4 3 3 _',
			terms: ['_46,55', '____7'],
			partialCarries: null,
			partials: [],
			result: '325,85'
		});
	});

	it('876 × 20,8 : produits partiels sans virgule', () => {
		const s = grid(scene('calcul: 876 × 20,8', 'cases: aucune'));
		expect(s.terms).toEqual(['___876', '___20,8']);
		expect(s.partials).toEqual(['__7008', '175200']);
		expect(s.result).toBe('18220,8');
	});

	it('2,5 × 4 : zéro de fin gardé (comportement 6) ; 0,5 × 4 : 0 de tête posé (limite 11)', () => {
		expect(grid(scene('calcul: 2,5 × 4', 'cases: aucune')).result).toBe('10,0');
		expect(grid(scene('calcul: 0,5 × 4', 'cases: aucune'))).toMatchObject({
			above: '2 _',
			terms: ['0,5', '_4'],
			result: '2,0'
		});
	});

	it('208 × 34 : un zéro dans le nombre du haut', () => {
		expect(grid(scene('calcul: 208 × 34', 'cases: aucune'))).toEqual({
			above: '_ _ _ _',
			terms: ['_208', '__34'],
			partialCarries: '1 _ _ _',
			partials: ['_832', '6240'],
			result: '7072'
		});
		// Un seul chiffre en bas : la retenue passe au-dessus du 0
		expect(grid(scene('calcul: 208 × 4', 'cases: aucune')).above).toBe('_ 3 _');
	});

	it('décimal × décimal (Q7) : 0,5 × 0,5 → 0,25 ; 12,345 × 6,78', () => {
		expect(grid(scene('calcul: 0,5 × 0,5', 'cases: aucune'))).toMatchObject({
			terms: ['_0,5', '_0,5'],
			result: '0,25'
		});
		const s = scene('calcul: 12,345 × 6,78', 'cases: aucune');
		expect(s.decimals).toBe(5);
		expect(grid(s).result).toBe('83,69910');
	});

	it('548 × 10 : une seule ligne non nulle, résultat directement sous le trait', () => {
		expect(grid(scene('calcul: 548 × 10', 'cases: aucune'))).toMatchObject({
			partialCarries: null,
			partials: [],
			result: '5480'
		});
	});

	it('548 × 0 et 548 × 1 (limite 10)', () => {
		expect(grid(scene('calcul: 548 × 0', 'cases: aucune')).result).toBe('__0');
		expect(grid(scene('calcul: 548 × 1', 'cases: aucune')).result).toBe('548');
	});

	it('retenues: non : aucune retenue écrite', () => {
		const s = grid(scene('calcul: 548 × 16', 'cases: aucune', 'retenues: non'));
		expect(s.above).toBe('_ _ _ _');
		expect(s.partialCarries).toBeNull();
	});
});

describe('multiplication à remplir (cases: résultat)', () => {
	it('46 × 7 : cases du résultat (largeur = chiffres réunis), retenues au-dessus du haut', () => {
		expect(grid(scene('calcul: 46 × 7'))).toEqual({
			above: '_ [4] _',
			terms: ['_46', '__7'],
			partialCarries: null,
			partials: [],
			result: '[3][2][2]'
		});
	});

	it('548 × 16 : lignes de produits partiels à remplir, zéros de décalage compris (Q4, Q6)', () => {
		expect(grid(scene('calcul: 548 × 16'))).toEqual({
			above: '_ _ [] [] _',
			terms: ['__548', '___16'],
			partialCarries: '[] [] [1] [] _',
			partials: ['_[3][2][8][8]', '[][5][4][8][0]'],
			result: '[][8][7][6][8]'
		});
	});

	it('7 × 46,55 : la virgule du résultat n’est pas dessinée, l’élève la pose (Q3)', () => {
		const s = grid(scene('calcul: 7 × 46,55'));
		expect(s.result).toBe('[3][2][5][8][5]');
		expect(s.above).toBe('_ [4] [3] [3] _');
	});

	it('0,5 × 0,5 à remplir : 0 de tête posé, case de retenue au-dessus de lui', () => {
		expect(grid(scene('calcul: 0,5 × 0,5'))).toEqual({
			above: '_ _ [2] _',
			terms: ['__0,5', '__0,5'],
			partialCarries: null,
			partials: [],
			result: '[][0][2][5]'
		});
	});

	it('548 × 10 : une seule ligne, pas de produits partiels', () => {
		expect(grid(scene('calcul: 548 × 10'))).toMatchObject({
			partialCarries: null,
			partials: [],
			result: '[][5][4][8][0]'
		});
	});
});

describe('multiplication au PDF (comportement 9)', () => {
	const typst = (...lines: string[]) => generateOperationTypst(parse(...lines));

	it('signe ×, + devant le dernier produit partiel, second trait', () => {
		const out = typst('calcul: 548 × 16');
		expect(out).toContain('[×]');
		expect(out).toContain('[+]');
		// Retenues, termes (2), rangée des retenues de l'addition, 2 produits partiels
		expect(out).toContain('table.hline(y: 3,');
		expect(out).toContain('table.hline(y: 6,');
		// Rien de l'attendu
		expect(out).not.toContain('[#[3]]');
		expect(out).not.toContain('[#[7]]');
	});

	it('résolue : produits partiels et résultat écrits', () => {
		const out = typst('calcul: 548 × 16', 'cases: aucune');
		for (const d of ['3', '2', '7', '6']) expect(out).toContain(`[#[${d}]]`);
		expect(out).toContain('text(size: 7pt)[1]');
	});

	it('un chiffre en bas : un seul trait', () => {
		const out = typst('calcul: 46 × 7');
		expect(out).toContain('table.hline(y: 3,');
		expect(out.match(/table\.hline/g)).toHaveLength(1);
	});
});
