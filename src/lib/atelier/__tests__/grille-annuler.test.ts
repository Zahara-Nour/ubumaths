/**
 * Annuler dans la grille (tableur intégré, lot 1, PR 3a — décision T6).
 *
 * Depuis le lot 5 de la refonte (2026-10-19), la grille n'a plus sa propre
 * pile : ses gestes sont des étapes de la pile commune de l'atelier
 * (`atelier-annuler-retablir-phase0.md`). Un geste reste UNE étape.
 */

import { describe, it, expect } from 'vitest';
import { Atelier, OUTSIDE_STEP_LABEL } from '../atelier.svelte';
import { DEFAULT_HISTORY_LIMITS } from '../history-stack';

const A = 0;
const B = 1;

describe('annuler, rétablir', () => {
	it('une saisie s’annule puis se rétablit', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '12' }]);
		a.editCells([{ column: A, row: 1, text: '15' }]);

		expect(a.undo()).toBe('modifier la grille');
		expect(a.cell(A, 1)).toBe('12');
		expect(a.undo()).not.toBeNull();
		expect(a.cell(A, 1)).toBe('');

		expect(a.redo()).not.toBeNull();
		expect(a.cell(A, 1)).toBe('12');
	});

	it('un collage de plusieurs cases, titres compris, s’annule en une fois', () => {
		const a = new Atelier();
		a.pasteTable(A, 1, [
			['Taille', 'Masse'],
			['152', '41'],
			['160', '48']
		]);

		expect(a.undo()).toBe('coller dans la grille');

		expect(a.cell(A, 1)).toBe('');
		expect(a.cell(B, 2)).toBe('');
		expect(a.titleOf(A)).toBe('');
		expect(a.history.steps).toBe(0);
	});

	it('dans une colonne nommée, la liste revient', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '1 ; 2' });
		a.editCells([{ column: A, row: 2, text: '7' }]);

		a.undo();

		expect(a.get('L')?.definition).toBe('1 ; 2');
	});

	it('« ; » réparti vers le bas (P2) : un seul geste', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '1 ; 2 ; 3' }]);

		a.undo();

		expect(a.cell(A, 3)).toBe('');
		expect(a.history.steps).toBe(0);
	});

	it('un nouveau geste efface ce qui pouvait être rétabli', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '1' }]);
		a.undo();
		a.editCells([{ column: A, row: 1, text: '2' }]);

		expect(a.redo()).toBeNull();
		expect(a.history.redo).toBeNull();
	});

	it('rien à annuler : null, rien ne bouge', () => {
		const a = new Atelier();

		expect(a.undo()).toBeNull();
	});

	// Avant le lot 5, la grille refusait d'annuler par-dessus un changement venu
	// d'ailleurs. Avec des photos, ce changement devient sa propre étape :
	// Annuler le défait d'abord, rien n'est jamais écrasé ni perdu
	it('une case changée ailleurs depuis (carte, Calcul) : défaite d’abord, puis la saisie', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '1' });
		a.editCells([{ column: A, row: 1, text: '5' }]);
		a.update('L', '9');

		expect(a.undo()).toBe(OUTSIDE_STEP_LABEL);
		expect(a.cell(A, 1)).toBe('5');
		expect(a.undo()).toBe('modifier la grille');
		expect(a.cell(A, 1)).toBe('1');
	});

	it('un geste sans effet n’entre pas dans l’historique', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '' }]);
		a.setTitle(A, '');

		expect(a.history.steps).toBe(0);
	});

	it(`l’historique garde ${DEFAULT_HISTORY_LIMITS.maxSteps} étapes au plus`, () => {
		const a = new Atelier();
		for (let i = 1; i <= DEFAULT_HISTORY_LIMITS.maxSteps + 5; i++) {
			a.editCells([{ column: A, row: 1, text: `${i}` }]);
		}

		expect(a.history.steps).toBe(DEFAULT_HISTORY_LIMITS.maxSteps);
	});

	it('relire un atelier (lien, sauvegarde, zéro) vide l’historique', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '1' }]);

		a.restore({ version: 2, objects: [] });

		expect(a.history.steps).toBe(0);
		expect(a.undo()).toBeNull();
	});

	// Revue de la PR 3a : une suppression devait rester annulable après des
	// gestes de grille. Une seule pile désormais : elle est la dernière étape
	it('une suppression de carte après une saisie : son « Annuler » marche', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '1 ; 2 ; 3' });
		a.create({ kind: 'value', name: 'k', definition: '2' });
		a.editCells([{ column: A, row: 3, text: '' }]);

		const removed = a.removeWithDependents('k');
		if (!removed.ok) throw new Error(removed.message);

		expect(a.history.undo).toBe('supprimer k');
		expect(a.undoRemoval(removed)).toBe(true);
		expect(a.get('k')).toBeDefined();
		expect(a.undo()).toBe('modifier la grille');
		expect(a.get('L')?.definition).toBe('1 ; 2 ; 3');
	});

	// Revue : une même case écrite deux fois dans un geste
	it('une case écrite deux fois dans un même geste s’annule', () => {
		const a = new Atelier();
		a.editCells([
			{ column: A, row: 1, text: '1 ; 2' },
			{ column: A, row: 2, text: '9' }
		]);

		expect(a.undo()).not.toBeNull();
		expect(a.cell(A, 1)).toBe('');
		expect(a.cell(A, 2)).toBe('');
	});

	it('nommer une colonne est sa propre étape', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '1' }]);
		a.nameColumn(A, 'L');

		expect(a.undo()).toBe('nommer la colonne A');
		expect(a.get('L')).toBeUndefined();
		expect(a.cell(A, 1)).toBe('1');
	});
});
