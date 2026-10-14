/**
 * La grille de la vue Données — lot 1 du tableur intégré, PR 1 (le modèle).
 *
 * Phase 0 : `docs/wip/atelier-tableur-phase0.md` (T1, T3, T7, P2, §1 et §7).
 * Une liste est une colonne NOMMÉE : ses cellules sont les entrées de sa
 * définition, une par ligne. Les colonnes sans nom gardent leurs cellules dans
 * la grille.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { mergeInto, mergeRefusal } from '../merge';
import { salvageGrid, ATELIER_STATE_VERSION, type AtelierState } from '../persistence';
import { definitionFrom, entriesOf, spreadText, GRID_ROWS, MAX_CELL_LENGTH } from '../grid';
import { isList, MAX_LISTS, type ListObject } from '../types';

function listOf(atelier: Atelier, name: string): ListObject {
	const object = atelier.get(name);
	if (object === undefined || !isList(object)) throw new Error(`pas de liste ${name}`);
	return object;
}

const A = 0;
const B = 1;
const C = 2;
const D = 3;

describe('entrées d’une colonne', () => {
	it('une entrée par ligne, cases vides comprises', () => {
		expect(entriesOf('12 ; ; 15')).toEqual(['12', '', '15']);
	});

	it('les cases vides finales ne comptent pas', () => {
		expect(entriesOf('12 ; 15 ; ;')).toEqual(['12', '15']);
		expect(definitionFrom(['12', '', '15', '', ''])).toBe('12 ;  ; 15');
		expect(definitionFrom(['', ''])).toBe('');
	});

	it('P2 : « 12 ; 15 ; 9 » tapé dans une cellule se répartit vers le bas', () => {
		expect(spreadText(3, '12 ; 15 ; 9')).toEqual([
			{ row: 3, text: '12' },
			{ row: 4, text: '15' },
			{ row: 5, text: '9' }
		]);
		expect(spreadText(3, '12')).toEqual([{ row: 3, text: '12' }]);
	});
});

describe('T1 — une liste est une colonne nommée', () => {
	it('une liste créée prend la première colonne libre', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '12 ; 15 ; 9' });
		a.create({ kind: 'list', name: 'M', definition: '1 ; 2' });

		expect(a.columnOf('L')).toBe(A);
		expect(a.columnOf('M')).toBe(B);
		expect(a.cell(A, 1)).toBe('12');
		expect(a.cell(A, 3)).toBe('9');
		expect(a.cell(B, 2)).toBe('2');
		expect(a.cell(B, 3)).toBe('');
	});

	it('modifier une cellule d’une colonne nommée réécrit la liste', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '12 ; 15 ; 9' });

		const edited = a.editCells([{ column: A, row: 2, text: '' }]);

		expect(edited.ok).toBe(true);
		const L = listOf(a, 'L');
		expect(L.definition).toBe('12 ;  ; 9');
		expect(L.values).toEqual([12, 9]);
		// Une case vide n'est pas une valeur ignorée (§1 limite)
		expect(L.skipped).toBe(0);
	});

	it('redéfinir la liste (carte, `L = …`) réécrit sa colonne', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '12 ; 15' });

		a.update('L', '3 ; 4 ; 5');

		expect(a.columnOf('L')).toBe(A);
		expect(a.cell(A, 3)).toBe('5');
	});

	it('une colonne sans nom garde ses cellules, et ce n’est pas une liste', () => {
		const a = new Atelier();
		const before = a.revision;

		a.editCells([
			{ column: C, row: 1, text: 'fille' },
			{ column: C, row: 2, text: '3,5' }
		]);

		expect(a.cell(C, 1)).toBe('fille');
		expect(a.cell(C, 2)).toBe('3,5');
		expect(a.listAt(C)).toBeUndefined();
		expect(a.objects).toHaveLength(0);
		// La sauvegarde écoute `revision`
		expect(a.revision).toBeGreaterThan(before);
	});

	it('une liste créée saute une colonne sans nom déjà remplie', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '7' }]);

		a.create({ kind: 'list', name: 'L', definition: '1' });

		expect(a.columnOf('L')).toBe(B);
		expect(a.cell(A, 1)).toBe('7');
	});

	it('la zone utilisée suit les cellules et les listes', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '1 ; 2 ; 3' });
		a.editCells([{ column: C, row: 7, text: 'x' }]);

		expect(a.usedExtent).toEqual({ columns: 3, rows: 7 });
	});
});

describe('P2 et plafonds de saisie', () => {
	it('un collage qui dépasse la ligne 200 est refusé entier', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '1' });

		const edited = a.editCells(
			spreadText(GRID_ROWS - 1, '1 ; 2 ; 3').map((e) => ({ column: A, ...e }))
		);

		expect(edited.ok).toBe(false);
		if (!edited.ok) expect(edited.message).toContain('200');
		expect(listOf(a, 'L').definition).toBe('1');
	});

	it(`une cellule garde au plus ${MAX_CELL_LENGTH} caractères`, () => {
		const a = new Atelier();

		const edited = a.editCells([{ column: A, row: 1, text: 'x'.repeat(MAX_CELL_LENGTH + 1) }]);

		expect(edited.ok).toBe(false);
		expect(a.cell(A, 1)).toBe('');
	});

	it('une colonne hors de A-Z est refusée', () => {
		const a = new Atelier();

		expect(a.editCells([{ column: 26, row: 1, text: '1' }]).ok).toBe(false);
		expect(a.editCells([{ column: 0, row: 0, text: '1' }]).ok).toBe(false);
	});

	it('la grille pleine refuse une nouvelle liste', () => {
		const a = new Atelier();
		a.editCells(Array.from({ length: 26 }, (_, column) => ({ column, row: 1, text: '1' })));

		const created = a.create({ kind: 'list', name: 'L', definition: '1 ; 2' });

		expect(created.ok).toBe(false);
		if (!created.ok) expect(created.message).toContain('grille est pleine');
	});
});

describe('nommer une colonne, retirer son nom', () => {
	it('nommer une colonne en fait une liste avec ses cellules', () => {
		const a = new Atelier();
		a.editCells([
			{ column: B, row: 1, text: '12' },
			{ column: B, row: 3, text: '15' }
		]);

		const named = a.nameColumn(B, 'M');

		expect(named.ok).toBe(true);
		const M = listOf(a, 'M');
		expect(M.definition).toBe('12 ;  ; 15');
		expect(M.values).toEqual([12, 15]);
		expect(a.columnOf('M')).toBe(B);
		expect(a.cell(B, 3)).toBe('15');
	});

	it('un nom pris ou qui n’est pas un nom de l’atelier est refusé', () => {
		const a = new Atelier();
		a.create({ kind: 'value', name: 'a', definition: '2' });

		expect(a.nameColumn(B, 'a').ok).toBe(false);
		expect(a.nameColumn(B, 'AB').ok).toBe(false);
		expect(a.nameColumn(B, 'L2').ok).toBe(false);
		expect(a.listAt(B)).toBeUndefined();
	});

	it('une colonne déjà nommée ne se renomme pas par ici', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '1' });

		const named = a.nameColumn(A, 'M');

		expect(named.ok).toBe(false);
		expect(a.columnOf('L')).toBe(A);
	});

	it(`au-delà de ${MAX_LISTS} listes, le refus d’aujourd’hui`, () => {
		const a = new Atelier();
		for (let i = 0; i < MAX_LISTS; i++) a.create({ kind: 'list', definition: `${i}` });
		a.editCells([{ column: 20, row: 1, text: '1' }]);

		const named = a.nameColumn(20, 'Z');

		expect(named.ok).toBe(false);
		expect(a.cell(20, 1)).toBe('1');
	});

	it('retirer le nom supprime la liste et garde les cellules', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '12 ; 15' });

		const unnamed = a.unnameColumn(A);

		expect(unnamed.ok).toBe(true);
		expect(a.get('L')).toBeUndefined();
		expect(a.cell(A, 2)).toBe('15');
	});

	it('« Annuler » après le retrait du nom remet la liste, sans doubler les cellules', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '12 ; 15' });
		const unnamed = a.unnameColumn(A);
		if (!unnamed.ok) throw new Error(unnamed.message);

		expect(a.undoRemoval(unnamed)).toBe(true);

		expect(listOf(a, 'L').definition).toBe('12 ; 15');
		expect(a.columnOf('L')).toBe(A);
		// La colonne n'a qu'un propriétaire : la liste
		a.update('L', '1');
		expect(a.cell(A, 2)).toBe('');
	});
});

describe('T3 — supprimer la liste vide sa colonne', () => {
	it('la colonne redevient libre, « Annuler » la remet', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '12 ; 15' });

		const removed = a.removeWithDependents('L');
		if (!removed.ok) throw new Error(removed.message);

		expect(a.cell(A, 1)).toBe('');
		expect(a.usedExtent).toEqual({ columns: 0, rows: 0 });

		expect(a.undoRemoval(removed)).toBe(true);
		expect(a.cell(A, 1)).toBe('12');
	});
});

describe('§7 — sauvegarde, lien, conversion', () => {
	it('aller-retour : colonnes des listes et cellules sans nom', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: 'brouillon' }]);
		a.create({ kind: 'list', name: 'L', definition: '12 ; 15' });
		a.editCells([{ column: D, row: 2, text: '4' }]);

		const state = a.serialize();
		const b = new Atelier();
		b.restore(state);

		expect(state.version).toBe(ATELIER_STATE_VERSION);
		expect(ATELIER_STATE_VERSION).toBe(2);
		expect(b.columnOf('L')).toBe(B);
		expect(b.cell(A, 1)).toBe('brouillon');
		expect(b.cell(D, 2)).toBe('4');
	});

	it('un atelier de version 1 range ses listes en A, B… dans l’ordre des cartes', () => {
		const v1: AtelierState = {
			version: 1,
			objects: [
				{ name: 'a', kind: 'value', definition: '2' },
				{ name: 'M', kind: 'list', definition: '1 ; 2' },
				{ name: 'L', kind: 'list', definition: '12 ; 15' }
			]
		};
		const b = new Atelier();

		b.restore(v1);

		expect(b.columnOf('M')).toBe(A);
		expect(b.columnOf('L')).toBe(B);
	});

	it('deux listes rangées sur la même colonne : la seconde prend la suivante libre', () => {
		const b = new Atelier();
		b.restore({
			version: 2,
			objects: [
				{ name: 'L', kind: 'list', definition: '1', column: 'A' },
				{ name: 'M', kind: 'list', definition: '2', column: 'A' }
			],
			grid: { cells: { A3: 'x' } }
		});

		expect(b.columnOf('L')).toBe(A);
		expect(b.columnOf('M')).toBe(B);
		// Une cellule sans nom rangée sur la colonne d'une liste : la liste gagne
		expect(b.cell(A, 3)).toBe('');
	});

	it('une grille abîmée perd ses cellules abîmées, pas le reste', () => {
		const { grid, dropped } = salvageGrid({
			cells: { A1: '12', ZZ9: '1', A0: '1', B201: '1', C2: 4, D3: 'x'.repeat(MAX_CELL_LENGTH + 1) }
		});

		expect(grid.cells).toEqual({ A1: '12' });
		expect(dropped).toBe(5);
	});
});

describe('T7 — garder un atelier reçu', () => {
	it('ses colonnes vont dans les premières colonnes libres', () => {
		const personal = new Atelier();
		personal.create({ kind: 'list', name: 'L', definition: '1 ; 2' });
		const received: AtelierState = {
			version: 2,
			objects: [{ name: 'L', kind: 'list', definition: '7 ; 8', column: 'A' }],
			grid: { cells: { B1: 'note' } }
		};

		const report = mergeInto(personal, received);

		expect(report.renamed).toEqual([{ from: 'L', to: expect.any(String) }]);
		const arrived = report.renamed[0].to;
		expect(personal.columnOf('L')).toBe(A);
		expect(personal.columnOf(arrived)).toBe(B);
		expect(personal.cell(C, 1)).toBe('note');
	});

	it('pas assez de colonnes libres : refus, rien n’est versé', () => {
		const personal = new Atelier();
		personal.editCells(Array.from({ length: 25 }, (_, column) => ({ column, row: 1, text: '1' })));
		const received: AtelierState = {
			version: 2,
			objects: [{ name: 'L', kind: 'list', definition: '7', column: 'A' }],
			grid: { cells: { B1: 'note' } }
		};

		const refusal = mergeRefusal(personal, received);

		expect(refusal).toContain('2 colonnes');
	});
});
