/**
 * NBVAL et NB.VIDE dans la grille : compter les cases non vides, et les vides.
 *
 * Phase 0 `docs/archive/wip/atelier-tableur-nbval-phase0.md`, Q-NV-1 à Q-NV-4
 * (validées le 2026-10-18).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { functionHint } from '../grid-functions';

const D = 3;

function shown(atelier: Atelier, column: number, row: number): string {
	const v = atelier.cellValue(column, row);
	if (v.kind === 'number') return v.shown;
	if (v.kind === 'error') return `erreur : ${v.message}`;
	if (v.kind === 'word') return `mot : ${v.text}`;
	return v.message === undefined ? 'vide' : `vide : ${v.message}`;
}

/**
 * A1 `12`, A2 `fille`, A3 vide, A4 une formule qui rend une case vide, A5 `=A1*2`,
 * A6 une formule qui rend un mot, A7 `7,5` ; C1 en erreur ; la liste L = `12 ; ; 15`
 * (colonne B). La formule à tester en D1.
 */
function grid(formula: string) {
	const a = new Atelier();
	const texts = ['12', 'fille', '', '=SI(1>0;"";1)', '=A1*2', '=SI(1>0;"oui";1)', '7,5'];
	a.editCells(texts.map((text, i) => ({ column: 0, row: i + 1, text })));
	a.create({ kind: 'list', name: 'L', definition: '12 ; ; 15' });
	a.editCells([
		{ column: 2, row: 1, text: '=1/0' },
		{ column: D, row: 1, text: formula }
	]);
	return a;
}

const value = (formula: string) => shown(grid(formula), D, 1);

describe('§1 NBVAL : les cases non vides', () => {
	const cases: [string, string][] = [
		// A1, A2, A5, A6, A7 : nombres et mots, tapés ou rendus par une formule
		['=NBVAL(A1:A7)', '5'],
		['=nbval(A1:A7)', '5'],
		['=NBVAL(A1:A3)', '2'],
		['=NBVAL(A1:A2;A5:A7)', '5'],
		['=NBVAL(A3)', '0'],
		['=NBVAL(A2)', '1'],
		['=NBVAL(A:A)', '5'],
		['=NBVAL(L)', '2'],
		['=NBVAL(E1:E10)', '0'],
		['=2*NBVAL(A1:A3)', '4']
	];
	for (const [formula, expected] of cases) {
		it(formula, () => expect(value(formula)).toBe(expected));
	}

	it('Q-NV-1 : une formule qui rend une case vide ne compte pas', () => {
		expect(value('=NBVAL(A4)')).toBe('0');
	});

	it('Q-NV-2 : une case en erreur arrête le compte', () => {
		expect(value('=NBVAL(A1:C1)')).toBe('erreur : C1 est en erreur.');
	});

	it('sans argument', () => {
		expect(value('=NBVAL()')).toBe(
			'erreur : NBVAL attend au moins un argument, par exemple NBVAL(A2:A21).'
		);
	});

	it('une valeur compte si elle n’est pas vide', () => {
		expect(value('=NBVAL(3)')).toBe('1');
		// A3 vide : A3*1 est vide (T5), il ne compte pas
		expect(value('=NBVAL(A3*1)')).toBe('0');
		expect(value('=NBVAL(1/0)')).toMatch(/^erreur/);
	});

	it('recalculé quand une case de la plage change', () => {
		const a = grid('=NBVAL(A1:A3)');
		a.editCells([{ column: D, row: 2, text: '=NB.VIDE(A1:A3)' }]);
		expect([shown(a, D, 1), shown(a, D, 2)]).toEqual(['2', '1']);
		a.editCells([{ column: 0, row: 3, text: '5' }]);
		expect([shown(a, D, 1), shown(a, D, 2)]).toEqual(['3', '0']);
	});

	it('NB compte toujours les nombres seuls', () => {
		expect(value('=NB(A1:A7)')).toBe('3');
	});
});

describe('§2 NB.VIDE : les cases vides', () => {
	const cases: [string, string][] = [
		// A3 vide, A4 rend une case vide (Q-NV-1)
		['=NB.VIDE(A1:A7)', '2'],
		['=nb.vide(A1:A7)', '2'],
		['=NB.VIDE(A1:A2)', '0'],
		['=NB.VIDE(E1:E10)', '10'],
		['=NB.VIDE(A3)', '1'],
		// Q-NV-4 : les trous d'une liste, de sa première à sa dernière entrée
		['=NB.VIDE(L)', '1']
	];
	for (const [formula, expected] of cases) {
		it(formula, () => expect(value(formula)).toBe(expected));
	}

	it('NBVAL + NB.VIDE = la taille de la plage (Q-NV-1)', () => {
		const a = grid('=NBVAL(A1:A7)+NB.VIDE(A1:A7)');
		expect(shown(a, D, 1)).toBe('7');
	});

	it('Q-NV-2 : une case en erreur arrête le compte', () => {
		expect(value('=NB.VIDE(A1:C3)')).toBe('erreur : C1 est en erreur.');
	});

	it('Q-NV-3 : une colonne entière est refusée, sous toutes ses écritures', () => {
		for (const range of ['A:A', '$A:$A', 'a:b', ' A : A ']) {
			expect(value(`=NB.VIDE(${range})`)).toBe(
				'erreur : NB.VIDE compte dans une plage : NB.VIDE(A2:A31).'
			);
		}
	});

	it('Q-NV-4 : un trou en tête de liste compte, pas les lignes sous sa dernière valeur', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: ' ; 12 ; ; 15' });
		a.editCells([{ column: D, row: 1, text: '=NB.VIDE(L)' }]);
		expect(shown(a, D, 1)).toBe('2');
		// La liste change : le compte suit
		a.update('L', '12 ; ; ; ; 15', 'text');
		expect(shown(a, D, 1)).toBe('3');
	});

	it('un nom qui n’est pas une liste : le refus le nomme (revue)', () => {
		expect(value('=NB.VIDE(M)')).toMatch(/^erreur : .*M/);
		expect(value('=NB.VIDE(M)')).not.toContain('compte dans une plage');
	});

	it('une seule plage', () => {
		const message = 'erreur : NB.VIDE attend une plage : NB.VIDE(B2:B31).';
		expect(value('=NB.VIDE(A1:A3;A5:A7)')).toBe(message);
		expect(value('=NB.VIDE()')).toBe(message);
	});

	it('un nombre n’est pas une plage', () => {
		expect(value('=NB.VIDE(3)')).toBe('erreur : NB.VIDE compte dans une plage : NB.VIDE(A2:A31).');
	});

	it('la recopie décale la plage', () => {
		const a = grid('=NB.VIDE(A1:A2)');
		a.fillDown({ left: D, right: D, top: 1, bottom: 2 });
		expect(a.cell(D, 2)).toBe('=NB.VIDE(A2:A3)');
		expect(shown(a, D, 2)).toBe('1');
	});
});

describe('§3 aide et Calcul', () => {
	it('l’aide sous la barre', () => {
		expect(functionHint('=NBVAL(')).toBe('NBVAL(plage ; …) — combien de cases ne sont pas vides');
		expect(functionHint('=NB.VIDE(')).toBe('NB.VIDE(plage) — combien de cases sont vides');
	});

	it('Calcul renvoie vers la grille', () => {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };
		runInput(s, 'L = 12 ; 15 ; 9');
		const result = runInput(s, 'nbval(L)');
		expect(result.kind === 'refus' ? result.message : result.kind).toBe(
			'NBVAL est une fonction de la grille (onglet Données). Pour une liste, tape .stats L.'
		);
		// NB.VIDE : pas de conseil .stats, qui ne compte pas de trous (revue)
		const empties = runInput(s, 'nb.vide(L)');
		expect(empties.kind === 'refus' ? empties.message : empties.kind).toBe(
			'NB.VIDE est une fonction de la grille (onglet Données).'
		);
	});
});
