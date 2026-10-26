/**
 * Le hasard dans la grille (tableur intégré, lot 5, PR 1) : ALEA,
 * ALEA.ENTRE.BORNES, la graine.
 *
 * Phase 0 `docs/archive/wip/atelier-tableur-lot5-phase0.md` : un tirage ne dépend que
 * de la graine de l'atelier et de sa place (case, rang de l'appel) — il ne
 * change qu'au clic sur « Relancer » (T8, Q-L5-5) ; la graine est rangée et
 * voyage dans le lien (Q-L5-4).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';
import { decodeAtelier, encodeAtelier } from '../url';
import type { AtelierState } from '../persistence';

const A = 0;
const C = 2;

/** Un atelier de graine connue, ces cases écrites. */
function seeded(cells: Record<string, string>, seed = 12345): Atelier {
	const a = new Atelier();
	const state: AtelierState = { version: 2, objects: [], grid: { cells, seed } };
	a.restore(state);
	return a;
}

function number(a: Atelier, column: number, row: number): number {
	const v = a.cellValue(column, row);
	if (v.kind !== 'number') throw new Error(JSON.stringify(v));
	return v.value;
}

describe('§1 les fonctions', () => {
	it('ALEA() : un nombre de [0 ; 1[, approché', () => {
		const a = seeded({ A1: '=ALEA()' });

		const v = a.cellValue(A, 1);
		expect(v.kind === 'number' && v.exact).toBe(false);
		expect(number(a, A, 1)).toBeGreaterThanOrEqual(0);
		expect(number(a, A, 1)).toBeLessThan(1);
	});

	it('ALEA.ENTRE.BORNES(1;6) : un entier de 1 à 6, exact', () => {
		const a = seeded({ A1: '=ALEA.ENTRE.BORNES(1;6)' });

		const v = a.cellValue(A, 1);
		expect(v.kind === 'number' && v.exact).toBe(true);
		expect([1, 2, 3, 4, 5, 6]).toContain(number(a, A, 1));
	});

	it('deux appels d’une même formule tirent deux fois', () => {
		const a = seeded({ A1: '=ALEA()-ALEA()' });

		expect(number(a, A, 1)).not.toBe(0);
	});

	it('distribution : 2 000 lancers de dé, chaque face entre 280 et 390', () => {
		const cells: Record<string, string> = {};
		for (let column = 0; column < 10; column++) {
			for (let row = 1; row <= 200; row++) {
				cells[`${String.fromCharCode(65 + column)}${row}`] = '=ALEA.ENTRE.BORNES(1;6)';
			}
		}
		const a = seeded(cells);
		const faces = [0, 0, 0, 0, 0, 0];
		for (let column = 0; column < 10; column++) {
			for (let row = 1; row <= 200; row++) faces[number(a, column, row) - 1]++;
		}

		for (const count of faces) {
			expect(count).toBeGreaterThanOrEqual(280);
			expect(count).toBeLessThanOrEqual(390);
		}
	});

	it('noms réécrits en capitales ; l’aide de la barre les connaît', async () => {
		const { functionHint } = await import('../grid-functions');
		const a = seeded({});
		a.editCells([{ column: A, row: 1, text: '=alea.entre.bornes(1;6)' }]);

		expect(a.cell(A, 1)).toBe('=ALEA.ENTRE.BORNES(1;6)');
		expect(functionHint('=ALEA.ENTRE.BORNES(')).toBe(
			'ALEA.ENTRE.BORNES(a ; b) — un entier au hasard de a à b'
		);
	});

	it('refus', () => {
		const a = seeded({
			A1: '=ALEA(2)',
			A2: '=ALEA.ENTRE.BORNES(6;1)',
			A3: '=ALEA.ENTRE.BORNES(1,5;6)'
		});
		const message = (row: number) => {
			const v = a.cellValue(A, row);
			return v.kind === 'error' ? v.message : JSON.stringify(v);
		};

		expect(message(1)).toBe('ALEA s’écrit sans argument : ALEA().');
		expect(message(2)).toBe(
			'ALEA.ENTRE.BORNES attend deux entiers a ⩽ b : ALEA.ENTRE.BORNES(1 ; 6).'
		);
		expect(message(3)).toBe(
			'ALEA.ENTRE.BORNES attend deux entiers a ⩽ b : ALEA.ENTRE.BORNES(1 ; 6).'
		);
	});
});

describe('§2 quand le hasard tire (T8, Q-L5-5)', () => {
	it('écrire ailleurs ne change pas un tirage', () => {
		const a = seeded({ A1: '=ALEA()' });
		const before = number(a, A, 1);

		a.editCells([{ column: C, row: 1, text: '7' }]);

		expect(number(a, A, 1)).toBe(before);
	});

	it('réécrire la case à l’identique non plus', () => {
		const a = seeded({ A1: '=ALEA()' });
		const before = number(a, A, 1);

		a.editCells([{ column: A, row: 1, text: '' }]);
		a.editCells([{ column: A, row: 1, text: '=ALEA()' }]);

		expect(number(a, A, 1)).toBe(before);
	});

	it('le tirage ne dépend pas des autres cases (ordre de calcul)', () => {
		const alone = seeded({ B5: '=ALEA()' });
		const crowded = seeded({ A1: '=ALEA()', B4: '=B5*2', B5: '=ALEA()', C9: '=ALEA()' });

		expect(number(crowded, 1, 5)).toBe(number(alone, 1, 5));
	});

	it('une recopie tire une valeur par case', () => {
		const a = seeded({ A1: '=ALEA.ENTRE.BORNES(1;100)' });
		a.fillDown({ left: A, right: A, top: 1, bottom: 20 });

		const drawn = new Set(Array.from({ length: 20 }, (_, i) => number(a, A, i + 1)));
		expect(drawn.size).toBeGreaterThan(10);
	});

	it('mêmes tirages au rechargement (la graine est rangée)', () => {
		const a = seeded({ A1: '=ALEA()', A2: '=ALEA.ENTRE.BORNES(1;6)' }, 777);

		const b = new Atelier();
		b.restore(JSON.parse(JSON.stringify(a.serialize())));

		expect(number(b, A, 1)).toBe(number(a, A, 1));
		expect(number(b, A, 2)).toBe(number(a, A, 2));
	});

	it('une grille sans hasard ne range pas de graine', () => {
		const a = seeded({ A1: '1' });

		expect(a.serialize().grid?.seed).toBeUndefined();
	});

	it('Relancer change les tirages ; ce qui les cite suit', () => {
		const cells: Record<string, string> = { C1: '=NB.SI(A1:A20;6)' };
		for (let row = 1; row <= 20; row++) cells[`A${row}`] = '=ALEA.ENTRE.BORNES(1;6)';
		const a = seeded(cells);
		const before = Array.from({ length: 20 }, (_, i) => number(a, A, i + 1));

		a.relaunch();

		const after = Array.from({ length: 20 }, (_, i) => number(a, A, i + 1));
		expect(after).not.toEqual(before);
		expect(number(a, C, 1)).toBe(after.filter((face) => face === 6).length);
	});
});

describe('§4 le lien garde la graine (Q-L5-4)', () => {
	it('celui qui ouvre le lien voit les mêmes tirages', async () => {
		const a = seeded({ A1: '=ALEA()', A2: '=ALEA.ENTRE.BORNES(1;6)' }, 4242);

		const decoded = await decodeAtelier((await encodeAtelier(a.serialize())).payload);

		expect(decoded.ok).toBe(true);
		if (!decoded.ok) return;
		const b = new Atelier();
		b.restore(decoded.state);
		expect(number(b, A, 1)).toBe(number(a, A, 1));
		expect(number(b, A, 2)).toBe(number(a, A, 2));
	});
});

describe('Calcul renvoie vers la grille', () => {
	it('alea()', () => {
		const s = { atelier: new Atelier(), engine: new WebReplEngine() };
		const result = runInput(s, 'alea()');

		expect(result.kind === 'refus' && result.message).toBe(
			'ALEA est une fonction de la grille (onglet Données).'
		);
	});
});

describe('revue de la PR 1', () => {
	it('des bornes au-delà des entiers sûrs, ou plus d’un million d’issues : refus', () => {
		const a = seeded({
			A1: '=ALEA.ENTRE.BORNES(2^53;2^53+5)',
			A2: '=ALEA.ENTRE.BORNES(1;2000000)',
			A3: '=ALEA.ENTRE.BORNES(1;1000000)'
		});
		const message = (row: number) => {
			const v = a.cellValue(A, row);
			return v.kind === 'error' ? v.message : v.kind;
		};

		expect(message(1)).toBe(
			'ALEA.ENTRE.BORNES attend deux entiers a ⩽ b : ALEA.ENTRE.BORNES(1 ; 6).'
		);
		expect(message(2)).toBe('ALEA.ENTRE.BORNES : au plus un million d’issues (b − a ⩽ 1 000 000).');
		expect(message(3)).toBe('number');
	});
});

// Lot 5, PR 2 : « Relancer » est un geste de la grille (Q-L5-3), compté (§3)
describe('§5 annuler « Relancer » (Q-L5-3)', () => {
	function dice(): Atelier {
		const cells: Record<string, string> = {};
		for (let row = 1; row <= 20; row++) cells[`A${row}`] = '=ALEA.ENTRE.BORNES(1;6)';
		return seeded(cells);
	}
	const faces = (a: Atelier) => Array.from({ length: 20 }, (_, i) => number(a, A, i + 1));

	it('Ctrl+Z retrouve les tirages d’avant, Ctrl+Y ceux d’après', () => {
		const a = dice();
		const before = faces(a);
		a.relaunch();
		const after = faces(a);

		expect(a.undo()).not.toBeNull();
		expect(faces(a)).toEqual(before);
		expect(a.redo()).not.toBeNull();
		expect(faces(a)).toEqual(after);
	});

	it('le nombre de cases à hasard (pour le bouton et l’annonce)', () => {
		const a = dice();
		a.editCells([
			{ column: C, row: 1, text: '=SI(ALEA()<0,5;1;0)' },
			{ column: C, row: 2, text: '=A1*2' }
		]);

		expect(a.randomCells).toBe(21);
		expect(seeded({ A1: '1' }).randomCells).toBe(0);
	});
});

describe('§4 garder un atelier reçu : les tirages sont refaits, et on le dit', () => {
	it('le rapport de fusion le signale', async () => {
		const { mergeInto } = await import('../merge');
		const personal = seeded({ A1: 'à moi' });
		const received: AtelierState = {
			version: 2,
			objects: [],
			grid: { cells: { A1: '=ALEA.ENTRE.BORNES(1;6)' }, seed: 99 }
		};

		expect(mergeInto(personal, received).redrawn).toBe(true);
		// Revue : une grille reçue refusée n'a rien tiré chez nous
		const refused: AtelierState = {
			version: 2,
			objects: [],
			grid: { cells: { A1: '=ALEA.ENTRE.BORNES(1;6)', B1: 'x'.repeat(300) }, seed: 99 }
		};
		expect(mergeInto(seeded({}), refused).redrawn).toBe(false);
		const list: AtelierState = {
			version: 2,
			objects: [{ name: 'L', kind: 'list', definition: '=ALEA.ENTRE.BORNES(1;6) ; 2', column: 'A' }]
		};
		expect(mergeInto(seeded({}), list).redrawn).toBe(true);
		expect(
			mergeInto(seeded({}), { version: 2, objects: [], grid: { cells: { A1: '3' } } }).redrawn
		).toBe(false);
	});

	// Revue des écarts du lot 9 de verifs-auto (2026-10-26) : une grille seule, gardée,
	// était annoncée « Il n'y avait rien à garder. »
	it('le rapport dit qu’une grille (cases, titres, mise en forme) est arrivée', async () => {
		const { mergeInto } = await import('../merge');
		expect(
			mergeInto(seeded({}), { version: 2, objects: [], grid: { cells: { A1: '3' } } }).grid
		).toBe(true);
		expect(
			mergeInto(seeded({}), { version: 2, objects: [], grid: { titles: { A: 'taille' } } }).grid
		).toBe(true);
		const list: AtelierState = {
			version: 2,
			objects: [{ name: 'L', kind: 'list', definition: '1 ; 2', column: 'A' }]
		};
		// Une liste nommée est un objet, déjà compté comme tel
		expect(mergeInto(seeded({}), list).grid).toBe(false);
	});
});
