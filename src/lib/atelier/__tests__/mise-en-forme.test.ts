/**
 * La mise en forme des cases (tableur intégré, reprise de V4, PR 1 : le modèle).
 *
 * Phase 0 `docs/wip/atelier-tableur-mise-en-forme-phase0.md` (Q-MF-1 à Q-MF-5) :
 * sur une zone, ne change que l'AFFICHAGE ; s'annule (T6) ; suit la recopie et
 * le copier-coller interne ; rangée par zone, voyage dans le lien ; suit ses
 * colonnes dans un atelier reçu.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { formatShown } from '../cell-format';
import { mergeInto } from '../merge';
import { decodeAtelier, encodeAtelier } from '../url';
import type { AtelierState } from '../persistence';
import type { CellValue } from '../formula';

const A = 0;
const B = 1;
const C = 2;

const number = (value: number, shown = String(value)): CellValue => ({
	kind: 'number',
	value,
	node: { type: 'number', value: String(value) },
	exact: true,
	shown
});

describe('§1 poser une mise en forme sur une zone', () => {
	it('gras, alignement, couleurs, format : sur chaque case de la zone', () => {
		const a = new Atelier();

		a.applyStyle({ left: A, right: B, top: 1, bottom: 3 }, { bold: true, align: 'center' });
		a.applyStyle({ left: B, right: B, top: 2, bottom: 2 }, { fill: 'jaune', bold: false });

		expect(a.styleAt(A, 1)).toEqual({ bold: true, align: 'center' });
		expect(a.styleAt(B, 2)).toEqual({ align: 'center', fill: 'jaune' });
		expect(a.styleAt(C, 1)).toEqual({});
	});

	it('une case vide se met en forme d’avance ; vider la case garde sa mise en forme', () => {
		const a = new Atelier();
		a.applyStyle(
			{ left: A, right: A, top: 1, bottom: 1 },
			{ number: { kind: 'currency', decimals: 2 } }
		);

		a.editCells([{ column: A, row: 1, text: '12,5' }]);
		a.editCells([{ column: A, row: 1, text: '' }]);

		expect(a.styleAt(A, 1)).toEqual({ number: { kind: 'currency', decimals: 2 } });
	});

	it('Effacer la mise en forme', () => {
		const a = new Atelier();
		a.applyStyle({ left: A, right: B, top: 1, bottom: 2 }, { italic: true, color: 'rouge' });

		a.clearStyle({ left: A, right: A, top: 1, bottom: 2 });

		expect(a.styleAt(A, 1)).toEqual({});
		expect(a.styleAt(B, 1)).toEqual({ italic: true, color: 'rouge' });
	});

	it('la valeur ne change pas : une formule cite le nombre, pas son affichage', () => {
		const a = new Atelier();
		a.editCells([
			{ column: A, row: 1, text: '12,5' },
			{ column: B, row: 1, text: '=A1*2' }
		]);

		a.applyStyle(
			{ left: A, right: A, top: 1, bottom: 1 },
			{ number: { kind: 'currency', decimals: 2 } }
		);

		const v = a.cellValue(B, 1);
		expect(v.kind === 'number' && v.value).toBe(25);
	});

	it('refus : décimales hors de 0 à 6', () => {
		const a = new Atelier();

		expect(
			a.applyStyle(
				{ left: A, right: A, top: 1, bottom: 1 },
				{ number: { kind: 'decimals', decimals: 9 } }
			)
		).toEqual({ ok: false, message: 'Le nombre de décimales va de 0 à 6.' });
	});
});

describe('§1 les formats de nombre (Q-MF-1)', () => {
	const cases: [CellValue, Parameters<typeof formatShown>[1], string][] = [
		[number(1 / 3, '1/3'), { number: { kind: 'decimals', decimals: 2 } }, '0,33'],
		[number(2), { number: { kind: 'decimals', decimals: 2 } }, '2,00'],
		[number(2.5), { number: { kind: 'decimals', decimals: 0 } }, '3'],
		[number(-2.5), { number: { kind: 'decimals', decimals: 0 } }, '-3'],
		[number(1234.5), { number: { kind: 'decimals', decimals: 1 } }, '1 234,5'],
		[number(0.125), { number: { kind: 'percent', decimals: 1 } }, '12,5 %'],
		[number(0.5), { number: { kind: 'percent', decimals: 0 } }, '50 %'],
		[number(12.5), { number: { kind: 'currency', decimals: 2 } }, '12,50 €'],
		[number(-3), { number: { kind: 'currency', decimals: 2 } }, '-3,00 €']
	];
	for (const [value, style, expected] of cases) {
		it(`${value.kind === 'number' ? value.value : ''} → ${expected}`, () => {
			// Les espaces fines et insécables du français, ramenées à l'espace pour comparer
			expect(formatShown(value, style)?.replace(/[\u00a0\u202f]/g, ' ')).toBe(expected);
		});
	}

	it('sans format, un mot ou une erreur : rien à réécrire', () => {
		expect(formatShown(number(2), {})).toBeNull();
		expect(
			formatShown({ kind: 'word', text: 'fille' }, { number: { kind: 'percent', decimals: 0 } })
		).toBeNull();
	});
});

describe('§3 annuler, recopier, copier-coller (T6, Q-MF-4)', () => {
	it('Ctrl+Z défait une mise en forme, Ctrl+Y la refait', () => {
		const a = new Atelier();
		a.applyStyle({ left: A, right: A, top: 1, bottom: 1 }, { bold: true });

		a.undoGrid();
		expect(a.styleAt(A, 1)).toEqual({});
		a.redoGrid();
		expect(a.styleAt(A, 1)).toEqual({ bold: true });
	});

	it('la recopie emporte la mise en forme de la première ligne', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '1' }]);
		a.applyStyle({ left: A, right: A, top: 1, bottom: 1 }, { bold: true, color: 'bleu' });

		a.fillDown({ left: A, right: A, top: 1, bottom: 4 });

		expect(a.styleAt(A, 4)).toEqual({ bold: true, color: 'bleu' });
	});

	it('le copier-coller interne emporte la mise en forme ; un collage d’ailleurs, non', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '7' }]);
		a.applyStyle({ left: A, right: A, top: 1, bottom: 1 }, { italic: true });

		a.pasteTable(C, 5, [['7']], { column: A, row: 1 }, [[{ italic: true }]]);
		a.pasteTable(C, 9, [['7']]);

		expect(a.styleAt(C, 5)).toEqual({ italic: true });
		expect(a.styleAt(C, 9)).toEqual({});
	});
});

describe('§4 sauvegarde, lien, atelier reçu (Q-MF-5)', () => {
	it('rangée par zone, relue à l’identique', () => {
		const a = new Atelier();
		a.applyStyle(
			{ left: A, right: A, top: 1, bottom: 200 },
			{ number: { kind: 'percent', decimals: 1 } }
		);

		const state = a.serialize();
		expect(state.grid?.formats?.length).toBe(1);

		const b = new Atelier();
		b.restore(JSON.parse(JSON.stringify(state)));
		expect(b.styleAt(A, 150)).toEqual({ number: { kind: 'percent', decimals: 1 } });
	});

	it('une grille sans mise en forme ne range rien', () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '1' }]);

		expect(a.serialize().grid?.formats).toBeUndefined();
	});

	it('voyage dans le lien', async () => {
		const a = new Atelier();
		a.editCells([{ column: A, row: 1, text: '1' }]);
		a.applyStyle({ left: A, right: B, top: 1, bottom: 3 }, { bold: true, fill: 'vert' });

		const decoded = await decodeAtelier((await encodeAtelier(a.serialize())).payload);

		expect(decoded.ok).toBe(true);
		if (!decoded.ok) return;
		const b = new Atelier();
		b.restore(decoded.state);
		expect(b.styleAt(B, 3)).toEqual({ bold: true, fill: 'vert' });
	});

	it('une mise en forme illisible (lien forgé) est écartée, la grille reste', async () => {
		const { salvageGrid } = await import('../persistence');

		const { grid, dropped } = salvageGrid({
			cells: { A1: '1' },
			formats: [
				{ zone: 'A1:A2', bold: true },
				{ zone: 'A1:ZZ9', bold: true },
				{ zone: 'B1', color: 'fuchsia' }
			]
		});

		expect(grid.cells).toEqual({ A1: '1' });
		expect(grid.formats).toEqual([{ zone: 'A1:A2', bold: true }]);
		expect(dropped).toBe(2);
	});

	it('un atelier reçu : ses zones suivent leurs colonnes (T7)', () => {
		const personal = new Atelier();
		personal.editCells([{ column: A, row: 1, text: 'à moi' }]);
		const received: AtelierState = {
			version: 2,
			objects: [],
			grid: { cells: { A1: '3', B1: '4' }, formats: [{ zone: 'A1:B2', bold: true }] }
		};

		mergeInto(personal, received);

		expect(personal.styleAt(A, 1)).toEqual({});
		expect(personal.styleAt(B, 1)).toEqual({ bold: true });
		expect(personal.styleAt(C, 2)).toEqual({ bold: true });
	});

	it('une colonne reçue qui n’a qu’une mise en forme arrive aussi', () => {
		const personal = new Atelier();
		personal.editCells([{ column: A, row: 1, text: 'à moi' }]);
		const received: AtelierState = {
			version: 2,
			objects: [],
			grid: { formats: [{ zone: 'A1:A50', number: { kind: 'currency', decimals: 2 } }] }
		};

		mergeInto(personal, received);

		expect(personal.styleAt(B, 10)).toEqual({ number: { kind: 'currency', decimals: 2 } });
	});
});

// Revue de la PR 1 : la mise en forme s'empilait (500 zones vite atteintes,
// « Effacer » refusé au plafond, lien trop long après un collage)
describe('revue : une mise en forme rangée sous forme canonique', () => {
	const grid20 = () => Array.from({ length: 20 }, () => Array.from({ length: 20 }, () => '0'));

	it('mille gestes sur une case : une zone ; Effacer toute la grille : aucune', () => {
		const a = new Atelier();
		for (let i = 0; i < 1000; i++) {
			a.applyStyle({ left: A, right: A, top: 1, bottom: 1 }, { bold: i % 2 === 0 });
			a.applyStyle({ left: A, right: A, top: 1, bottom: 1 }, { color: 'rouge' });
		}
		expect(a.formats.length).toBe(1);

		expect(a.clearStyle({ left: 0, right: 25, top: 1, bottom: 200 })).toEqual({ ok: true });
		expect(a.formats.length).toBe(0);
	});

	it('un bloc 20×20 collé avec sa mise en forme reste un rectangle, et le lien part', async () => {
		const a = new Atelier();
		a.applyStyle({ left: 0, right: 19, top: 1, bottom: 20 }, { bold: true });
		const styles = Array.from({ length: 20 }, () =>
			Array.from({ length: 20 }, () => ({ bold: true }))
		);

		a.pasteTable(0, 30, grid20(), { column: 0, row: 1 }, styles);

		expect(a.formats.length).toBeLessThanOrEqual(2);
		expect((await encodeAtelier(a.serialize())).withinLimit).toBe(true);
	});

	it('effacer une zone jamais mise en forme ne note aucun geste', () => {
		const a = new Atelier();
		const before = a.gridHistory.undo;

		a.clearStyle({ left: A, right: B, top: 1, bottom: 5 });

		expect(a.gridHistory.undo).toBe(before);
	});

	it('au plafond, un collage est refusé ENTIER : aucune case écrite', () => {
		const a = new Atelier();
		// Un damier en gras sur 5 colonnes : 500 cases qu'aucun rectangle ne réunit
		for (let column = 0; column < 5; column++) {
			for (let row = 1 + (column % 2); row <= 200; row += 2) {
				a.applyStyle({ left: column, right: column, top: row, bottom: row }, { bold: true });
			}
		}
		expect(a.formats.length).toBe(500);

		const pasted = a.pasteTable(7, 1, [['9']], { column: 0, row: 1 }, [[{ italic: true }]]);

		expect(pasted.ok).toBe(false);
		expect(a.cell(7, 1)).toBe('');
	});

	it('un lien forgé de 15 000 zones : bornées à la relecture', async () => {
		const { salvageGrid } = await import('../persistence');
		const formats = Array.from({ length: 15000 }, () => ({ zone: 'A1:Z200', bold: true }));

		const { grid, dropped } = salvageGrid({ cells: { A1: '1' }, formats });

		expect((grid.formats ?? []).length).toBeLessThanOrEqual(500);
		expect(dropped).toBeGreaterThanOrEqual(14500);
	});

	it('fusion : une ligne d’en-tête en gras sur 26 colonnes ne fait pas tout refuser', async () => {
		const { mergeRefusal } = await import('../merge');
		const personal = new Atelier();
		personal.editCells([{ column: A, row: 1, text: 'à moi' }]);
		const received: AtelierState = {
			version: 2,
			objects: [],
			grid: { cells: { A1: '1', B1: '2' }, formats: [{ zone: 'A1:Z1', bold: true }] }
		};

		expect(mergeRefusal(personal, received)).toBeNull();
		mergeInto(personal, received);
		expect(personal.styleAt(B, 1)).toEqual({ bold: true });
	});

	it('fusion : un seul Ctrl+Z retire cases et mise en forme', () => {
		const personal = new Atelier();
		const received: AtelierState = {
			version: 2,
			objects: [],
			grid: { cells: { A1: '1' }, formats: [{ zone: 'A1:A1', bold: true }] }
		};
		mergeInto(personal, received);

		personal.undoGrid();

		expect(personal.cell(A, 1)).toBe('');
		expect(personal.styleAt(A, 1)).toEqual({});
	});

	it('-0,001 à 2 décimales : 0,00, pas -0,00', () => {
		expect(formatShown(number(-0.001), { number: { kind: 'decimals', decimals: 2 } })).toBe('0,00');
	});
});

describe('contre-revue', () => {
	it('fusion : les colonnes gardent leur ordre, décoratives comprises', () => {
		const personal = new Atelier();
		const received: AtelierState = {
			version: 2,
			objects: [],
			grid: { cells: { A1: '1', C1: '3' }, formats: [{ zone: 'B1:B5', fill: 'jaune' }] }
		};

		mergeInto(personal, received);

		expect(personal.cell(A, 1)).toBe('1');
		expect(personal.styleAt(B, 1)).toEqual({ fill: 'jaune' });
		expect(personal.cell(C, 1)).toBe('3');
	});

	it('relecture : au-delà du plafond, la plus longue partie qui tient, et le rapport le dit', () => {
		const formats: { zone: string; bold?: boolean; italic?: boolean }[] = [
			{ zone: 'A1:Z200', bold: true }
		];
		for (let i = 0; formats.length < 500; i++) {
			const column = String.fromCharCode(65 + (i % 26));
			const row = 1 + 2 * Math.floor(i / 26) + (i % 2);
			formats.push({ zone: `${column}${row}:${column}${row}`, italic: true });
		}
		const a = new Atelier();

		const report = a.restore({ version: 2, objects: [], grid: { cells: { A1: '1' }, formats } });

		expect(a.formats.length).toBeGreaterThan(0);
		expect(a.formats.length).toBeLessThanOrEqual(500);
		expect(a.styleAt(Z_COLUMN, 200)).toEqual({ bold: true });
		expect(report.skipped.map((s) => s.name)).toContain('une partie de la mise en forme');
	});

	it('gras puis italique = italique puis gras : reposer le même style ne note rien', () => {
		const a = new Atelier();
		a.applyStyle({ left: A, right: A, top: 1, bottom: 1 }, { italic: true });
		a.applyStyle({ left: A, right: A, top: 1, bottom: 1 }, { bold: true });
		const before = a.gridHistory.undo;

		a.applyStyle({ left: A, right: A, top: 1, bottom: 1 }, { bold: true, italic: true });

		expect(a.gridHistory.undo).toBe(before);
	});

	it('Effacer passe toujours, même au plafond', () => {
		const a = new Atelier();
		// 499 cases en damier, puis la colonne G : 500 zones, le plafond
		for (let column = 0; column < 5; column++) {
			for (let row = 1 + (column % 2); row <= 200; row += 2) {
				if (column === 4 && row === 199) continue;
				a.applyStyle({ left: column, right: column, top: row, bottom: row }, { bold: true });
			}
		}
		expect(a.applyStyle({ left: 6, right: 6, top: 1, bottom: 200 }, { italic: true })).toEqual({
			ok: true
		});
		expect(a.formats.length).toBe(500);

		expect(a.clearStyle({ left: 6, right: 6, top: 100, bottom: 100 })).toEqual({ ok: true });
		expect(a.styleAt(6, 100)).toEqual({});
	});
});

const Z_COLUMN = 25;
