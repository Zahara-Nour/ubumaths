/**
 * Annuler dans la grille (tableur intégré, lot 1, PR 3a — décision T6).
 *
 * Exception à D6 (« pas d'annulation globale »), limitée à la grille : saisie,
 * collage, effacement et titres s'annulent ; nommer ou supprimer une liste
 * reste un geste d'objet, avec son propre « Annuler ».
 */

import { describe, it, expect } from 'vitest';
import { Atelier, MAX_GRID_UNDO } from '../atelier.svelte';

const A = 0;
const B = 1;

describe('annuler, rétablir', () => {
	it('une saisie s’annule puis se rétablit', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '12' }]);
		a.editCells([{ column: A, row: 1, text: '15' }]);

		expect(a.undoGrid().ok).toBe(true);
		expect(a.cell(A, 1)).toBe('12');
		expect(a.undoGrid().ok).toBe(true);
		expect(a.cell(A, 1)).toBe('');

		expect(a.redoGrid().ok).toBe(true);
		expect(a.cell(A, 1)).toBe('12');
	});

	it('un collage de plusieurs cases, titres compris, s’annule en une fois', () => {
		const a = new Atelier();
		a.pasteTable(A, 1, [
			['Taille', 'Masse'],
			['152', '41'],
			['160', '48']
		]);

		a.undoGrid();

		expect(a.cell(A, 1)).toBe('');
		expect(a.cell(B, 2)).toBe('');
		expect(a.titleOf(A)).toBe('');
		expect(a.gridHistory.undo).toBe(0);
	});

	it('dans une colonne nommée, la liste revient', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '1 ; 2' });
		a.editCells([{ column: A, row: 2, text: '7' }]);

		a.undoGrid();

		expect(a.get('L')?.definition).toBe('1 ; 2');
	});

	it('« ; » réparti vers le bas (P2) : un seul geste', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '1 ; 2 ; 3' }]);

		a.undoGrid();

		expect(a.cell(A, 3)).toBe('');
	});

	it('un nouveau geste efface ce qui pouvait être rétabli', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '1' }]);
		a.undoGrid();
		a.editCells([{ column: A, row: 1, text: '2' }]);

		expect(a.redoGrid().ok).toBe(false);
		expect(a.gridHistory.redo).toBe(0);
	});

	it('rien à annuler : refus, rien ne bouge', () => {
		const a = new Atelier();

		const undone = a.undoGrid();

		expect(undone.ok).toBe(false);
		if (!undone.ok) expect(undone.message).toContain('Rien à annuler');
	});

	it('une case changée ailleurs depuis (carte, Calcul) : refus, jamais par-dessus', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '1' });
		a.editCells([{ column: A, row: 1, text: '5' }]);
		a.update('L', '9');

		const undone = a.undoGrid();

		expect(undone.ok).toBe(false);
		expect(a.cell(A, 1)).toBe('9');
		expect(a.gridHistory.undo).toBe(0);
	});

	it('un geste sans effet n’entre pas dans l’historique', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '' }]);
		a.setTitle(A, '');

		expect(a.gridHistory.undo).toBe(0);
	});

	it(`l’historique garde ${MAX_GRID_UNDO} gestes au plus`, () => {
		const a = new Atelier();
		for (let i = 1; i <= MAX_GRID_UNDO + 5; i++) a.editCells([{ column: A, row: 1, text: `${i}` }]);

		expect(a.gridHistory.undo).toBe(MAX_GRID_UNDO);
	});

	it('relire un atelier (lien, sauvegarde, zéro) vide l’historique', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '1' }]);

		a.restore({ version: 2, objects: [] });

		expect(a.gridHistory.undo).toBe(0);
		expect(a.undoGrid().ok).toBe(false);
	});

	// Revue de la PR 3a : la grille annulait un geste PLUS ANCIEN qu'une
	// suppression, et la suppression ne pouvait plus s'annuler (objets perdus)
	it('une suppression de carte ferme l’historique de la grille ; son « Annuler » marche', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '1 ; 2 ; 3' });
		a.create({ kind: 'value', name: 'k', definition: '2' });
		a.editCells([{ column: A, row: 3, text: '' }]);

		const removed = a.removeWithDependents('k');
		if (!removed.ok) throw new Error(removed.message);

		expect(a.gridHistory.undo).toBe(0);
		expect(a.undoGrid().ok).toBe(false);
		expect(a.undoRemoval(removed)).toBe(true);
		expect(a.get('k')).toBeDefined();
	});

	// Revue : une même case écrite deux fois dans un geste faisait croire à un
	// changement venu d'ailleurs, et l'historique était effacé
	it('une case écrite deux fois dans un même geste s’annule', () => {
		const a = new Atelier();
		a.editCells([
			{ column: A, row: 1, text: '1 ; 2' },
			{ column: A, row: 2, text: '9' }
		]);

		expect(a.undoGrid().ok).toBe(true);
		expect(a.cell(A, 1)).toBe('');
		expect(a.cell(A, 2)).toBe('');
	});

	it('nommer une colonne n’est pas un geste de la grille', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '1' }]);
		a.nameColumn(A, 'L');

		a.undoGrid();

		// L'annulation défait la SAISIE ; la liste reste, vide
		expect(a.get('L')).toBeDefined();
		expect(a.cell(A, 1)).toBe('');
	});
});
