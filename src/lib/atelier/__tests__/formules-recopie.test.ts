/**
 * Recopier des formules (tableur intégré, lot 2, PR 3).
 *
 * Phase 0 `docs/wip/atelier-tableur-lot2-phase0.md` §5 et §7 : les références
 * relatives se décalent, `$` les fige, une valeur se recopie telle quelle ;
 * copier-coller dans la grille décale aussi (Q-L2-4) ; le lien range les
 * formules en relatif ; un atelier reçu garde des références qui suivent
 * leurs colonnes (T7).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { mergeInto } from '../merge';
import { shiftFormula, toRelative, fromRelative } from '../formula';
import { decodeAtelier, encodeAtelier } from '../url';
import type { AtelierState } from '../persistence';

const A = 0;
const B = 1;
const C = 2;

function numberAt(atelier: Atelier, column: number, row: number): number {
	const v = atelier.cellValue(column, row);
	if (v.kind !== 'number') throw new Error(`pas un nombre : ${JSON.stringify(v)}`);
	return v.value;
}

describe('décaler une formule', () => {
	it('une référence relative suit la recopie', () => {
		expect(shiftFormula('=0,8*B2+3', 0, 2)).toBe('=0,8*B4+3');
		expect(shiftFormula('=f(A1)+A2', 1, 0)).toBe('=f(B1)+B2');
	});

	it('`$` fige la colonne, la ligne, ou les deux', () => {
		expect(shiftFormula('=$B$2*A3', 0, 2)).toBe('=$B$2*A5');
		expect(shiftFormula('=$A2+A$2', 1, 1)).toBe('=$A3+B$2');
	});

	it('une valeur ne change pas (pas de série devinée)', () => {
		expect(shiftFormula('7', 0, 3)).toBe('7');
		expect(shiftFormula('fille', 0, 3)).toBe('fille');
	});

	it('une référence poussée hors de la grille : la cellule le dit', () => {
		const shifted = shiftFormula('=A1+1', 0, -1);
		expect(shifted).toBe('=#HORS+1');

		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: shifted }]);
		const v = a.cellValue(A, 1);
		expect(v.kind === 'error' && v.message).toBe(
			'Référence hors de la grille (après une recopie).'
		);
	});

	it('la notation scientifique ne bouge pas (`1e5`)', () => {
		expect(shiftFormula('=1e5*A1', 0, 1)).toBe('=1e5*A2');
	});
});

describe('§5 recopier vers le bas', () => {
	it('la première ligne de la zone, recopiée sur toute la zone', () => {
		const a = new Atelier();
		a.editCells([
			{ column: A, row: 1, text: '1' },
			{ column: A, row: 2, text: '=A1*2' },
			{ column: B, row: 2, text: '=$A$1+A2' }
		]);

		const filled = a.fillDown({ left: A, right: B, top: 2, bottom: 6 });

		expect(filled.ok).toBe(true);
		expect(a.cell(A, 6)).toBe('=A5*2');
		expect(numberAt(a, A, 6)).toBe(32);
		expect(a.cell(B, 6)).toBe('=$A$1+A6');
	});

	it('une valeur se recopie telle quelle', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '7' }]);

		a.fillDown({ left: A, right: A, top: 1, bottom: 3 });

		expect(a.cell(A, 3)).toBe('7');
	});

	it('une recopie s’annule en une fois (T6)', () => {
		const a = new Atelier();
		a.editCells([
			{ column: A, row: 1, text: '1' },
			{ column: A, row: 2, text: '=A1+1' }
		]);

		a.fillDown({ left: A, right: A, top: 2, bottom: 10 });
		a.undoGrid();

		expect(a.cell(A, 3)).toBe('');
		expect(a.cell(A, 10)).toBe('');
		expect(a.cell(A, 2)).toBe('=A1+1');
	});

	it('au-delà de la ligne 200 : refusé entier', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '=1' }]);

		const filled = a.fillDown({ left: A, right: A, top: 1, bottom: 201 });

		expect(filled.ok).toBe(false);
		expect(a.cell(A, 2)).toBe('');
	});
});

describe('§5 copier-coller dans la grille (Q-L2-4)', () => {
	it('coller une formule copiée décale ses références relatives', () => {
		const a = new Atelier();
		a.editCells([
			{ column: A, row: 1, text: '3' },
			{ column: A, row: 2, text: '=A1*2' }
		]);

		a.pasteTable(C, 5, [['=A1*2']], { column: A, row: 2 });

		expect(a.cell(C, 5)).toBe('=C4*2');
	});
});

describe('§7 lien et atelier reçu', () => {
	it('le lien range les formules en relatif, et les relit à l’identique', async () => {
		const a = new Atelier();
		const cells = [{ column: A, row: 1, text: '1' }];
		for (let row = 2; row <= 30; row++)
			cells.push({ column: A, row, text: `=0,8*A${row - 1}+$A$1` });
		a.editCells(cells);
		const state = a.serialize();

		expect(JSON.stringify(toRelative(state))).not.toContain('*A29');
		const decoded = await decodeAtelier((await encodeAtelier(state)).payload);

		expect(decoded.ok).toBe(true);
		if (!decoded.ok) return;
		const b = new Atelier();
		b.restore(decoded.state);
		expect(b.cell(A, 30)).toBe('=0,8*A29+$A$1');
	});

	it('toRelative puis fromRelative : rien ne change', () => {
		const state: AtelierState = {
			version: 2,
			objects: [{ name: 'L', kind: 'list', definition: '1 ; =A1*2 ; =$A$1+B2', column: 'A' }],
			grid: { cells: { B2: '=A2-1', C3: 'mot' } }
		};

		expect(fromRelative(toRelative(state))).toEqual(state);
	});

	it('un atelier reçu : ses références suivent leurs colonnes (T7)', () => {
		const personal = new Atelier();
		personal.editCells([{ column: A, row: 1, text: 'à moi' }]);
		const received: AtelierState = {
			version: 2,
			objects: [{ name: 'L', kind: 'list', definition: '5 ; 6', column: 'A' }],
			grid: { cells: { B1: '=A1*2', B2: '=$A$2+B1' } }
		};

		mergeInto(personal, received);

		// A reçue → B, B reçue → C : les références suivent, absolues comprises
		expect(personal.cell(C, 1)).toBe('=B1*2');
		expect(personal.cell(C, 2)).toBe('=$B$2+C1');
		expect(numberAt(personal, C, 1)).toBe(10);
	});
});
