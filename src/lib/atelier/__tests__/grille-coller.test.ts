/**
 * La grille — coller, copier, télécharger, titres (tableur intégré, lot 1, PR 2).
 *
 * Phase 0 : `docs/archive/wip/atelier-tableur-phase0.md` §4 et T4. Un tableau copié de
 * LibreOffice, Excel ou d'une page web arrive en lignes et tabulations ; une
 * première ligne de mots au-dessus de nombres devient les titres des colonnes.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { mergeInto } from '../merge';
import { salvageGrid, type AtelierState } from '../persistence';
import {
	csvText,
	exportText,
	hasTitleRow,
	MAX_TITLE_LENGTH,
	readTable,
	tableText,
	GRID_ROWS
} from '../grid';

const A = 0;
const B = 1;
const C = 2;

describe('lire un tableau collé', () => {
	it('lignes et tabulations (LibreOffice, Excel, Google Sheets)', () => {
		expect(readTable('Taille\tMasse\r\n152\t41,5\r\n160\t48\r\n')).toEqual([
			['Taille', 'Masse'],
			['152', '41,5'],
			['160', '48']
		]);
	});

	it('une seule colonne : une valeur par ligne', () => {
		expect(readTable('12\n15\n9')).toEqual([['12'], ['15'], ['9']]);
	});

	it('un CSV à points-virgules sur plusieurs lignes : des colonnes', () => {
		expect(readTable('1;2\n3;4')).toEqual([
			['1', '2'],
			['3', '4']
		]);
	});

	it('une case entre guillemets garde sa tabulation et son retour à la ligne (Excel)', () => {
		expect(readTable('"a\tb"\t"c\nd"\t"e ""f"""\n1\t2\t3')).toEqual([
			['a\tb', 'c\nd', 'e "f"'],
			['1', '2', '3']
		]);
	});

	// Revue de la PR 2
	it('un guillemet ouvrant sans fermeture n’avale pas le reste', () => {
		expect(readTable('"Le Cid\n12\n15')).toEqual([['"Le Cid'], ['12'], ['15']]);
	});

	it('les lignes vides en tête et en fin (tableau d’une page web) ne comptent pas', () => {
		expect(readTable('\nNom\tAge\n\nAli\t12\n\n')).toEqual([['Nom', 'Age'], [''], ['Ali', '12']]);
	});

	it('une première ligne de mots au-dessus de nombres est une ligne de titres', () => {
		expect(
			hasTitleRow([
				['Taille', 'Masse'],
				['152', '41,5']
			])
		).toBe(true);
		expect(hasTitleRow([['fille'], ['garçon']])).toBe(false);
		expect(hasTitleRow([['12'], ['15']])).toBe(false);
		expect(hasTitleRow([['Taille']])).toBe(false);
	});
});

describe('copier, télécharger', () => {
	it('un nombre sort en décimal à virgule ; un mot tel quel', () => {
		expect(exportText('1/4')).toBe('0,25');
		expect(exportText('1.5')).toBe('1,5');
		expect(exportText('−3')).toBe('-3');
		expect(exportText('fille')).toBe('fille');
		expect(exportText('')).toBe('');
	});

	// Un tableur exécuterait `=…` en ouvrant le fichier (injection de formule)
	it('un mot qui commence par = + - @ est désarmé', () => {
		expect(exportText('=HYPERLINK("x")')).toBe('\'=HYPERLINK("x")');
		expect(exportText('@SUM')).toBe("'@SUM");
		expect(exportText('-abc')).toBe("'-abc");
	});

	it('tableText : tabulations et lignes, guillemets si besoin', () => {
		expect(
			tableText([
				['12', 'a\tb'],
				['1/2', '']
			])
		).toBe('12\t"a\tb"\n0,5\t');
	});

	it('csvText : « ; », virgule décimale, titres en première ligne, fin de ligne CRLF', () => {
		expect(
			csvText(
				['Taille', ''],
				[
					['152', 'a;b'],
					['1/2', '']
				]
			)
		).toBe('Taille;\r\n152;"a;b"\r\n0,5;\r\n');
	});
});

describe('coller dans la grille', () => {
	it('pose le tableau à partir de la cellule choisie, titres dans l’en-tête', () => {
		const a = new Atelier();

		const pasted = a.pasteTable(B, 1, [
			['Taille', 'Masse'],
			['152', '41,5'],
			['160', '48']
		]);

		expect(pasted.ok).toBe(true);
		expect(a.titleOf(B)).toBe('Taille');
		expect(a.titleOf(C)).toBe('Masse');
		expect(a.cell(B, 1)).toBe('152');
		expect(a.cell(C, 2)).toBe('48');
	});

	it('sans ligne de titres, tout est collé en cellules', () => {
		const a = new Atelier();

		a.pasteTable(A, 1, [['fille'], ['garçon']]);

		expect(a.cell(A, 1)).toBe('fille');
		expect(a.titleOf(A)).toBe('');
	});

	it('dans une colonne nommée : la liste change', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '1 ; 2 ; 3' });

		a.pasteTable(A, 2, [['7'], [''], ['9']]);

		const L = a.get('L');
		expect(L?.definition).toBe('1 ; 7 ;  ; 9');
	});

	it('un collage qui déborde est refusé entier, avec sa taille', () => {
		const a = new Atelier();
		const tall = Array.from({ length: 250 }, (_, i) => [`${i}`, `${i}`, `${i}`]);

		const pasted = a.pasteTable(A, 1, tall);

		expect(pasted.ok).toBe(false);
		if (!pasted.ok) {
			expect(pasted.message).toContain('250 lignes');
			expect(pasted.message).toContain(`${GRID_ROWS}`);
		}
		expect(a.cell(A, 1)).toBe('');
	});

	it('un collage qui dépasse la colonne Z est refusé entier', () => {
		const a = new Atelier();

		const pasted = a.pasteTable(24, 1, [['1', '2', '3']]);

		expect(pasted.ok).toBe(false);
		if (!pasted.ok) expect(pasted.message).toContain('Z');
	});

	// P2 : « 12 ; 15 ; 9 » collé dans une case se répartit vers le bas, comme tapé
	it('une seule case collée avec « ; » se répartit vers le bas (P2)', () => {
		const a = new Atelier();

		a.pasteTable(A, 1, readTable('12;15'));

		expect(a.cell(A, 1)).toBe('12');
		expect(a.cell(A, 2)).toBe('15');
	});

	// Revue : « 3;4 » devenait 3,4 — un faux nombre, sans un mot
	it('une case d’un tableau collé qui contient « ; » : refus entier, qui la cite', () => {
		const a = new Atelier();

		const pasted = a.pasteTable(A, 1, [
			['3;4', 'x'],
			['c', 'd']
		]);

		expect(pasted.ok).toBe(false);
		if (!pasted.ok) expect(pasted.message).toContain('3;4');
		expect(a.cell(A, 2)).toBe('');
	});

	// Revue : un titre trop long était coupé sans le dire (Q3)
	it('un titre collé trop long refuse le collage, en le disant', () => {
		const a = new Atelier();
		const long = 'T'.repeat(MAX_TITLE_LENGTH + 1);

		const pasted = a.pasteTable(A, 1, [[long], ['12']]);

		expect(pasted.ok).toBe(false);
		if (!pasted.ok) expect(pasted.message).toContain(`${MAX_TITLE_LENGTH}`);
		expect(a.cell(A, 1)).toBe('');
	});
});

describe('titres de colonnes (T4)', () => {
	it(`un titre se pose, se retire, et garde ${MAX_TITLE_LENGTH} caractères au plus`, () => {
		const a = new Atelier();

		expect(a.setTitle(A, '  Taille (cm) ').ok).toBe(true);
		expect(a.titleOf(A)).toBe('Taille (cm)');
		expect(a.setTitle(A, 'x'.repeat(MAX_TITLE_LENGTH + 1)).ok).toBe(false);
		expect(a.titleOf(A)).toBe('Taille (cm)');
		a.setTitle(A, '');
		expect(a.titleOf(A)).toBe('');
	});

	it('une colonne titrée n’est pas libre pour une nouvelle liste', () => {
		const a = new Atelier();
		a.setTitle(A, 'Taille');

		a.create({ kind: 'list', name: 'L', definition: '1' });

		expect(a.columnOf('L')).toBe(B);
	});

	it('supprimer la liste vide aussi son titre ; « Annuler » le remet', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '1' });
		a.setTitle(A, 'Taille');

		const removed = a.removeWithDependents('L');
		if (!removed.ok) throw new Error(removed.message);
		expect(a.titleOf(A)).toBe('');

		a.undoRemoval(removed);
		expect(a.titleOf(A)).toBe('Taille');
	});

	it('retirer le nom garde le titre', () => {
		const a = new Atelier();
		a.create({ kind: 'list', name: 'L', definition: '1' });
		a.setTitle(A, 'Taille');

		a.unnameColumn(A);

		expect(a.titleOf(A)).toBe('Taille');
	});

	it('les titres voyagent : sauvegarde, lien, fusion', () => {
		const a = new Atelier();
		a.setTitle(B, 'Masse');
		a.editCells([{ column: B, row: 1, text: '41' }]);

		const state = a.serialize();
		expect(state.grid?.titles).toEqual({ B: 'Masse' });

		const b = new Atelier();
		b.restore(state);
		expect(b.titleOf(B)).toBe('Masse');

		const personal = new Atelier();
		personal.editCells([{ column: A, row: 1, text: 'x' }]);
		const received: AtelierState = { version: 2, objects: [], grid: { titles: { B: 'Masse' } } };
		mergeInto(personal, received);
		expect(personal.titleOf(B)).toBe('Masse');
	});

	it('un titre abîmé est écarté seul', () => {
		const { grid, dropped } = salvageGrid({
			titles: { A: 'Taille', ZZ: 'x', B: 'x'.repeat(MAX_TITLE_LENGTH + 1), C: 3 }
		});

		expect(grid.titles).toEqual({ A: 'Taille' });
		expect(dropped).toBe(3);
	});
});
