/**
 * « Valeur exacte » sous la barre, seulement quand la fraction vient d'un vrai
 * calcul (décision de David du 2026-10-15, option 3).
 *
 * Une case qui écrit un décimal fini montre sa fraction sous la barre (Q-L3-2)
 * — mais 3,1416 = 3927/1250 n'apprend rien. Règle : la fraction se montre si
 * le calcul contient une DIVISION (écrite, d'une fonction comme MOYENNE, d'une
 * fonction de l'élève, d'une case citée) ; sans division (décimal tapé, somme de
 * décimaux, ARRONDI), elle est masquée (`shownExact`).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';

const A = 0;
const C = 2;

/** `true` : pas de « Valeur exacte » sous la barre (la case montre déjà ce qui compte). */
function hidden(formula: string, before: { column: number; row: number; text: string }[] = []) {
	const a = new Atelier();
	a.editCells([...before, { column: C, row: 1, text: formula }]);
	const v = a.cellValue(C, 1);
	if (v.kind !== 'number') throw new Error(`pas un nombre : ${JSON.stringify(v)}`);
	return v.shownExact === true;
}

const series = [
	{ column: A, row: 1, text: '12' },
	{ column: A, row: 2, text: '15' },
	{ column: A, row: 3, text: '9' },
	{ column: A, row: 4, text: '14' }
];

describe('sans division : la fraction est masquée', () => {
	const cases = ['=0,25', '=-2+0,5', '=1,5+2,25', '=0,1*3', '=ARRONDI(PI();4)', '=ARRONDI(1/3;2)'];
	for (const formula of cases) {
		it(formula, () => expect(hidden(formula)).toBe(true));
	}

	it('=ARRONDI(ECARTYPE(A1:A4);2)', () => {
		expect(hidden('=ARRONDI(ECARTYPE(A1:A4);2)', series)).toBe(true);
	});

	it('une somme de décimaux (=SOMME)', () => {
		expect(
			hidden('=SOMME(A1:A2)', [
				{ column: A, row: 1, text: '1,25' },
				{ column: A, row: 2, text: '2,5' }
			])
		).toBe(true);
	});
});

describe('avec une division : la fraction se montre', () => {
	const cases = ['=1/4', '=509/128', '=-3/2', '=6:8'];
	for (const formula of cases) {
		it(formula, () => expect(hidden(formula)).toBe(false));
	}

	it('une moyenne', () => {
		expect(hidden('=MOYENNE(A1:A4)', series)).toBe(false);
	});

	it('une case citée qui vient d’une division', () => {
		expect(hidden('=A1*3', [{ column: A, row: 1, text: '=1/4' }])).toBe(false);
	});
});
