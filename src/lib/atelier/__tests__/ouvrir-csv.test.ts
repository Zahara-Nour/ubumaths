/**
 * Ouvrir un fichier CSV dans la grille (repris de `/spreadsheet`, V4) : la
 * lecture du fichier — taille, encodage, séparateur, guillemets — puis la pose
 * comme un collage.
 *
 * Phase 0 `docs/wip/atelier-tableur-reste-et-ou-csv-phase0.md` §3, Q-RE-4 et
 * Q-RE-5 (validées le 2026-10-18).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { MAX_CSV_BYTES, csvText, exportText, readCsvFile } from '../grid';

const utf8 = (text: string) => new TextEncoder().encode(text);

/** Un texte en Windows-1252, comme l'enregistre Excel sous Windows (accents sur un octet). */
function windows1252(text: string): Uint8Array {
	return Uint8Array.from(Array.from(text), (char) => {
		const code = char.charCodeAt(0);
		if (code > 0xff) throw new Error(`hors de Windows-1252 : ${char}`);
		return code;
	});
}

function table(bytes: Uint8Array): string[][] {
	const read = readCsvFile(bytes);
	if (!read.ok) throw new Error(read.message);
	return read.table;
}

function refusal(bytes: Uint8Array): string {
	const read = readCsvFile(bytes);
	return read.ok ? 'lu' : read.message;
}

describe('§3 lire un fichier CSV', () => {
	it('« ; » et virgule décimale, comme Excel et LibreOffice en français', () => {
		expect(table(utf8('Prénom;Taille\r\nÉlodie;1,52\r\nNoé;1,48\r\n'))).toEqual([
			['Prénom', 'Taille'],
			['Élodie', '1,52'],
			['Noé', '1,48']
		]);
	});

	it('une seule ligne avec « ; » est coupée aussi', () => {
		expect(table(utf8('12;15;9'))).toEqual([['12', '15', '9']]);
	});

	it('la tabulation', () => {
		expect(table(utf8('a\tb\n1\t2'))).toEqual([
			['a', 'b'],
			['1', '2']
		]);
	});

	it('le BOM d’UTF-8 est retiré', () => {
		expect(table(utf8('﻿Taille;Masse\n1;2'))[0][0]).toBe('Taille');
	});

	it('un fichier d’Excel sous Windows (Windows-1252) garde ses accents', () => {
		expect(table(windows1252('Élève;Âge\r\nZoé;12\r\n'))).toEqual([
			['Élève', 'Âge'],
			['Zoé', '12']
		]);
	});

	it('guillemets : un « ; » et un guillemet dans une case', () => {
		expect(table(utf8('"Le Cid; acte 1";"il dit ""non"""\n1;2'))).toEqual([
			['Le Cid; acte 1', 'il dit "non"'],
			['1', '2']
		]);
	});

	it('un guillemet jamais fermé ne mange pas le reste du fichier', () => {
		expect(table(utf8('"Le Cid;2\n3;4'))).toEqual([
			['"Le Cid', '2'],
			['3', '4']
		]);
	});

	it('lignes vides au début et à la fin ignorées, cases sans espaces autour', () => {
		expect(table(utf8('\n\n 1 ; 2 \n\n'))).toEqual([['1', '2']]);
	});

	it('l’apostrophe de protection de notre téléchargement est retirée (-, +, @)', () => {
		expect(table(utf8("'-a;'+b;'@c\n1;2;3"))[0]).toEqual(['-a', '+b', '@c']);
	});
});

describe('Q-RE-5 : la virgule', () => {
	it('une colonne de décimaux à la française n’est jamais coupée', () => {
		expect(table(utf8('1,5\n2,5\n3'))).toEqual([['1,5'], ['2,5'], ['3']]);
		expect(table(utf8('1,2\n3,4'))).toEqual([['1,2'], ['3,4']]);
	});

	it('un CSV à l’anglaise (virgules, décimaux à point) est coupé aux virgules', () => {
		expect(table(utf8('height,mass\n1.52,45.5\n1.48,40'))).toEqual([
			['height', 'mass'],
			['1.52', '45.5'],
			['1.48', '40']
		]);
	});

	it('des mots séparés par des virgules aussi', () => {
		expect(table(utf8('name,age\nAlice,12\n"Smith, Bob",13'))).toEqual([
			['name', 'age'],
			['Alice', '12'],
			['Smith, Bob', '13']
		]);
	});

	it('avec un « ; », la virgule reste décimale', () => {
		expect(table(utf8('a;b\n1,5;2,5'))).toEqual([
			['a', 'b'],
			['1,5', '2,5']
		]);
	});
});

describe('§3 refus', () => {
	it('un fichier vide', () => {
		expect(refusal(utf8(''))).toBe('Ce fichier est vide.');
		expect(refusal(utf8(' \r\n\n '))).toBe('Ce fichier est vide.');
	});

	it('un fichier trop gros, refusé avant d’être lu', () => {
		expect(refusal(new Uint8Array(MAX_CSV_BYTES + 1))).toBe(
			'Ce fichier est trop gros pour la grille (1 Mo au plus).'
		);
		expect(MAX_CSV_BYTES).toBe(1_000_000);
	});

	it('un fichier qui n’est pas du texte (une image, un .xlsx)', () => {
		expect(refusal(Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x08]))).toBe(
			'Ce fichier n’est pas un tableau CSV : enregistre ton tableau au format CSV.'
		);
	});
});

describe('§3 poser le fichier comme un collage (Q-RE-4)', () => {
	it('notre propre téléchargement se rouvre à l’identique', () => {
		const source = new Atelier();
		const texts = [
			['12', '1,5', 'fille'],
			// (un « ; » dans une case la répartirait vers le bas, P2 : pas de mot avec « ; »)
			['7', '0,25', 'Le Cid, acte 1'],
			['-3', '2', 'il dit "non"'],
			['4', '5', '-a']
		];
		source.editCells(
			texts.flatMap((line, row) => line.map((text, column) => ({ column, row: row + 1, text })))
		);
		const file = csvText(['Note', 'Coef', 'Remarque'], texts);

		const opened = new Atelier();
		const pasted = opened.pasteTable(0, 1, table(utf8('﻿' + file)));

		expect(pasted.ok).toBe(true);
		expect(opened.titleOf(0)).toBe('Note');
		expect(opened.titleOf(2)).toBe('Remarque');
		for (const [row, line] of texts.entries()) {
			for (const [column, text] of line.entries()) {
				expect(exportText(opened.cell(column, row + 1))).toBe(exportText(text));
			}
		}
	});

	it('trop grand pour la grille : refusé ENTIER, rien n’est posé (Q3)', () => {
		const lines = Array.from({ length: 201 }, (_, i) => String(i + 1)).join('\n');
		const opened = new Atelier();
		const pasted = opened.pasteTable(0, 1, table(utf8(lines)));
		expect(pasted.ok).toBe(false);
		expect(opened.cell(0, 1)).toBe('');
	});

	it('un seul geste : Ctrl+Z le défait', () => {
		const opened = new Atelier();
		opened.pasteTable(0, 1, table(utf8('Taille;Masse\n1,5;40\n1,6;45')));
		expect(opened.cell(1, 2)).toBe('45');
		opened.undoGrid();
		expect(opened.cell(1, 2)).toBe('');
		expect(opened.titleOf(0)).toBe('');
	});
});
