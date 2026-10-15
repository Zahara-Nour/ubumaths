/**
 * Les fonctions de calcul du tableur et l'aide sous la barre (lot 4, PR 2).
 *
 * Phase 0 `docs/wip/atelier-tableur-lot4-phase0.md` §3 et §5 : ARRONDI, ENT,
 * RACINE, ABS, LN, EXP, PI ; mêmes refus que Calcul ; une aide qui donne la
 * forme de la fonction en cours d'écriture.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
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

function cellOf(formula: string, a1 = '2,567') {
	const a = new Atelier();
	a.editCells([
		{ column: A, row: 1, text: a1 },
		{ column: C, row: 1, text: formula }
	]);
	return a;
}

describe('§3 les fonctions de calcul', () => {
	const cases: [string, string][] = [
		['=ARRONDI(A1;2)', '2,57'],
		['=ARRONDI(A1;0)', '3'],
		['=ARRONDI(2,5;0)', '3'],
		['=ARRONDI(-2,5;0)', '-3'],
		['=ARRONDI(1234;-2)', '1200'],
		['=ARRONDI(2,675;2)', '2,68'],
		['=ARRONDI(1/3;3)', '0,333'],
		['=ARRONDI(RACINE(2);4)', '1,4142'],
		['=ENT(2,5)', '2'],
		['=ENT(-2,5)', '-3'],
		['=ENT(A1)', '2'],
		['=RACINE(9)', '3'],
		['=RACINE(2)', '≈ 1,4142'],
		['=ABS(-3)', '3'],
		['=LN(1)', '0'],
		['=EXP(0)', '1'],
		['=EXP(1)', '≈ 2,7183'],
		['=PI()', '≈ 3,1416'],
		['=2*PI()*3', '≈ 18,8496'],
		['=ARRONDI(MOYENNE(1;2;4);1)', '2,3']
	];
	for (const [formula, expected] of cases) {
		it(formula, () => {
			expect(shown(cellOf(formula), C, 1)).toBe(expected);
		});
	}

	it('exact : RACINE(8) vaut 2√2, ARRONDI rend un décimal', () => {
		const root = cellOf('=RACINE(8)').cellValue(C, 1);
		expect(root.kind === 'number' && root.exact && root.latex).toBe('2 \\sqrt{2}');
		const rounded = cellOf('=ARRONDI(A1;1)').cellValue(C, 1);
		expect(rounded.kind === 'number' && rounded.value).toBe(2.6);
	});

	it('mêmes refus que Calcul', () => {
		expect(shown(cellOf('=RACINE(-1)'), C, 1)).toBe(
			'erreur : Le résultat n’est pas un nombre réel.'
		);
		expect(shown(cellOf('=LN(0)'), C, 1)).toContain('erreur');
	});

	it('une case vide citée : la formule reste vide (T5, ce n’est pas une plage)', () => {
		expect(shown(cellOf('=RACINE(A5)'), C, 1)).toBe('vide : A5 est vide.');
	});

	it('mauvais nombre d’arguments', () => {
		expect(shown(cellOf('=ARRONDI(A1)'), C, 1)).toBe(
			'erreur : ARRONDI attend deux arguments : ARRONDI(x ; n).'
		);
		expect(shown(cellOf('=RACINE(4;9)'), C, 1)).toBe(
			'erreur : RACINE attend un argument : RACINE(x).'
		);
		expect(shown(cellOf('=PI(2)'), C, 1)).toBe('erreur : PI s’écrit sans argument : PI().');
	});

	it('ARRONDI : un nombre de décimales entier', () => {
		expect(shown(cellOf('=ARRONDI(A1;1,5)'), C, 1)).toBe(
			'erreur : ARRONDI : le nombre de décimales doit être un entier (ARRONDI(x ; 2)).'
		);
	});

	it('une plage n’est pas un nombre', () => {
		expect(shown(cellOf('=RACINE(A1:A3)'), C, 1)).toBe(
			'erreur : RACINE attend un nombre, pas une plage : RACINE(A1).'
		);
	});

	it('les noms d’avant restent lus, réécrits en capitales (Q-L4-7)', () => {
		const a = cellOf('=racine(4)+exp(0)+abs(-1)+ln(1)+pi()');

		expect(a.cell(C, 1)).toBe('=RACINE(4)+EXP(0)+ABS(-1)+LN(1)+PI()');
		expect(shown(a, C, 1)).toBe('≈ 7,1416');
		expect(shown(cellOf('=sqrt(4)'), C, 1)).toBe('2');
	});
});

describe('§5 l’aide sous la barre', () => {
	it('la fonction dont on écrit les arguments', () => {
		expect(functionHint('=MOYENNE(A1:A')).toBe('MOYENNE(plage ; …) — la moyenne des nombres');
		expect(functionHint('=arrondi(moyenne(A1:A4);')).toBe(
			'ARRONDI(x ; n) — x arrondi à n décimales'
		);
		expect(functionHint('=ARRONDI(MOYENNE(A1:A4')).toBe(
			'MOYENNE(plage ; …) — la moyenne des nombres'
		);
	});

	it('un nom en cours d’écriture : les fonctions qui commencent ainsi', () => {
		expect(functionHint('=ECART')).toBe(
			'ECARTYPE(plage ; …) — l’écart type (divise par n − 1) · ECARTYPEP(plage ; …) — l’écart type (divise par n), le σ de .stats'
		);
		expect(functionHint('=2*ra')).toBe('RACINE(x) — √x');
	});

	it('rien à dire : pas d’aide', () => {
		expect(functionHint('12')).toBeNull();
		expect(functionHint('=A1+2')).toBeNull();
		expect(functionHint('=SOMME(A1:A4)')).toBeNull();
		expect(functionHint('=f(')).toBeNull();
	});
});
