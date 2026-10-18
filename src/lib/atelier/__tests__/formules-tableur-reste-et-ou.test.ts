/**
 * RESTE, ET et OU dans la grille, repris de `/spreadsheet` (V4).
 *
 * Phase 0 `docs/wip/atelier-tableur-reste-et-ou-csv-phase0.md` §1 et §2,
 * Q-RE-1 à Q-RE-3 et Q-RE-6 (validées le 2026-10-18).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { functionHint } from '../grid-functions';

const A = 0;
const C = 2;

function shown(atelier: Atelier, column: number, row: number): string {
	const v = atelier.cellValue(column, row);
	if (v.kind === 'number') return v.shown;
	if (v.kind === 'error') return `erreur : ${v.message}`;
	if (v.kind === 'word') return `mot : ${v.text}`;
	return v.message === undefined ? 'vide' : `vide : ${v.message}`;
}

/** Notes en A1:A5, sexe en B1:B5, et une formule en C1. */
function withClass(formula: string) {
	const a = new Atelier();
	const notes = ['12', '8', '15', '10', '7,5'];
	const sexes = ['fille', 'garçon', 'Fille', 'garçon', 'fille'];
	a.editCells([
		...notes.map((text, i) => ({ column: A, row: i + 1, text })),
		...sexes.map((text, i) => ({ column: 1, row: i + 1, text })),
		{ column: C, row: 1, text: formula }
	]);
	return a;
}

const value = (formula: string) => shown(withClass(formula), C, 1);

describe('§1 RESTE', () => {
	const cases: [string, string][] = [
		['=RESTE(17;5)', '2'],
		['=RESTE(A1;2)', '0'],
		['=RESTE(A3;2)', '1'],
		['=reste(17;5)', '2'],
		// Le reste de la division euclidienne : du signe du diviseur (LibreOffice)
		['=RESTE(-7;3)', '2'],
		['=RESTE(7;-3)', '-2'],
		['=RESTE(15;5)', '0'],
		// Décimaux et fractions : exacts
		['=RESTE(7,5;2)', '1,5'],
		['=RESTE(1/3;1/6)', '0'],
		['=RESTE(A5;2)', '1,5'],
		['=2*RESTE(17;5)+1', '5'],
		// Q-RE-6 : le quotient, c'est ENT(n/d) — les deux vont ensemble
		['=ENT(-7/3)', '-3']
	];
	for (const [formula, expected] of cases) {
		it(formula, () => expect(value(formula)).toBe(expected));
	}

	it('une valeur approchée donne un reste approché', () => {
		expect(value('=RESTE(RACINE(2);1)')).toMatch(/^≈ 0,41/);
	});

	it('on ne divise pas par 0', () => {
		expect(value('=RESTE(5;0)')).toBe('erreur : RESTE : on ne divise pas par 0.');
		expect(value('=RESTE(5;A1-12)')).toBe('erreur : RESTE : on ne divise pas par 0.');
	});

	it('deux arguments, ni plus ni moins', () => {
		const message = 'erreur : RESTE attend deux arguments : RESTE(nombre ; diviseur).';
		expect(value('=RESTE(5)')).toBe(message);
		expect(value('=RESTE(5;2;1)')).toBe(message);
	});

	it('une case vide : la formule reste vide (T5)', () => {
		expect(value('=RESTE(A9;2)')).toBe('vide : A9 est vide.');
	});

	it('l’aide sous la barre', () => {
		expect(functionHint('=RESTE(')).toBe('RESTE(n ; d) — le reste de la division de n par d');
		expect(functionHint('=RES')).toContain('RESTE(n ; d)');
	});

	it('Calcul renvoie vers la grille', () => {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };
		const result = runInput(s, 'reste(17;5)');
		expect(result.kind === 'refus' ? result.message : result.kind).toBe(
			'RESTE est une fonction de la grille (onglet Données).'
		);
	});
});

describe('§2 ET et OU, dans la condition de SI', () => {
	const cases: [string, string][] = [
		['=SI(ET(A1>=10;A3>=10);"oui";"non")', 'mot : oui'],
		['=SI(ET(A1>=10;A2>=10);"oui";"non")', 'mot : non'],
		['=SI(OU(A2<10;A3>20);1;0)', '1'],
		['=SI(OU(A1<10;A3>20);1;0)', '0'],
		['=SI(ET(B1="fille";A1>=10);1;0)', '1'],
		['=SI(ET(B2="fille";A1>=10);1;0)', '0'],
		['=SI(ET(A1>=10);1;0)', '1'],
		['=SI(ET(A1>=10;A3>=10;A4>=10);1;0)', '1'],
		['=SI(ET(A1>=10;A3>=10;A5>=10);1;0)', '0'],
		['=SI(OU(A2>=10;A5>=10;A4>=10);1;0)', '1'],
		['=SI(et(A1>=10;A3>=10);1;0)', '1'],
		['=SI(ou(A2>=10;A5>=10);1;0)', '0'],
		['=SI( ET( A1 >= 10 ; A3 >= 10 ) ;1;0)', '1'],
		['=SI(ET(MOYENNE(A1:A5)>=10;MAX(A1:A5)<20);"bien";"")', 'mot : bien'],
		// iPad : ≥ et guillemets courbes
		['=SI(ET(A1≥10;B1=“fille”);1;0)', '1']
	];
	for (const [formula, expected] of cases) {
		it(formula, () => expect(value(formula)).toBe(expected));
	}

	it('une case vide dans une comparaison : la formule reste vide (T5)', () => {
		expect(value('=SI(ET(A1>=10;A9>=10);1;0)')).toBe('vide : A9 est vide.');
		expect(value('=SI(OU(A1>=10;A9>=10);1;0)')).toBe('vide : A9 est vide.');
	});

	it('une erreur dans une comparaison donne l’erreur, comme pour SI', () => {
		expect(value('=SI(ET(A1>=10;1/0>1);1;0)')).toBe(value('=SI(1/0>1;1;0)'));
		expect(value('=SI(1/0>1;1;0)')).toMatch(/^erreur/);
	});

	it('Q-RE-2 : hors de SI, refusé avec la bonne écriture', () => {
		expect(value('=ET(A1>1;A2>1)')).toBe(
			'erreur : ET s’écrit dans la condition de SI : =SI(ET(A1>=10;B1>=10);"oui";"non").'
		);
		expect(value('=OU(A1>1;A2>1)')).toBe(
			'erreur : OU s’écrit dans la condition de SI : =SI(OU(A1>=10;B1>=10);"oui";"non").'
		);
		expect(value('=SI(A1>1;ET(A1>1;A2>1);0)')).toMatch(/ET s’écrit dans la condition de SI/);
	});

	it('chaque argument est une comparaison', () => {
		expect(value('=SI(ET(A1;A2);1;0)')).toBe(
			'erreur : Dans ET, chaque argument compare deux choses : ET(A1>=10 ; B1="fille").'
		);
		expect(value('=SI(OU(A1>1;"oui");1;0)')).toBe(
			'erreur : Dans OU, chaque argument compare deux choses : OU(A1>=10 ; B1="fille").'
		);
	});

	it('au moins une comparaison', () => {
		expect(value('=SI(ET();1;0)')).toBe(
			'erreur : ET attend au moins une comparaison : ET(A1>=10 ; B1="fille").'
		);
	});

	it('Q-RE-3 : un seul niveau', () => {
		expect(value('=SI(OU(ET(A1>0;A2>0);A3=1);1;0)')).toBe(
			'erreur : Un ET dans un OU n’est pas pris en charge : écris deux SI.'
		);
		expect(value('=SI(ET(A1>0;ET(A2>0;A3>0));1;0)')).toBe(
			'erreur : Un ET dans un ET n’est pas pris en charge : écris deux SI.'
		);
	});

	it('Q-RE-1 : pas de NON (la comparaison inversée suffit)', () => {
		expect(value('=SI(NON(A1>3);1;0)')).toMatch(/^erreur/);
	});

	it('une comparaison à trois termes reste refusée dans ET', () => {
		expect(value('=SI(ET(A1<A2<A3;A1>0);1;0)')).toMatch(/^erreur/);
	});

	it('la recopie décale les cases de ET', () => {
		const a = withClass('=SI(ET(A1>=10;B1="fille");1;0)');
		const filled = a.fillDown({ left: C, right: C, top: 1, bottom: 5 });
		expect(filled.ok).toBe(true);
		expect([1, 2, 3, 4, 5].map((row) => shown(a, C, row))).toEqual(['1', '0', '1', '0', '0']);
		expect(a.cell(C, 3)).toBe('=SI(ET(A3>=10;B3="fille");1;0)');
	});

	it('l’aide sous la barre', () => {
		expect(functionHint('=SI(ET(')).toBe(
			'ET(comparaison ; …) — vrai si toutes le sont, dans la condition de SI'
		);
		expect(functionHint('=SI(OU(')).toBe(
			'OU(comparaison ; …) — vrai si l’une l’est, dans la condition de SI'
		);
	});

	it('Calcul : et(…) et ou(…) restent des produits, comme nb et si', () => {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };
		const result = runInput(s, 'et(2)');
		expect(result.kind === 'refus' ? result.message : '').not.toContain('fonction de la grille');
	});
});
