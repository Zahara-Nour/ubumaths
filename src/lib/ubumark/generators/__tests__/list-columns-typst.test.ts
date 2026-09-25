/**
 * Listes en colonnes dans le PDF (Typst) et l'export LaTeX (2026-09-25)
 *
 * `columns()` de Typst ne se répartit pas dans une page déjà en deux colonnes
 * (mesuré avec le compilateur de prod) : la liste devient une GRILLE, lue en
 * lignes (a) b) / c) d)), chaque cellule étant un item d'un seul numéro portant
 * son propre numéro — la numérotation (style par profondeur, départ) est donc
 * celle de la liste normale. Depuis la lisibilité des PDF, la cellule est un
 * `ubu-item` (numéro dans la première ligne), comme un item hors colonnes.
 */
import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '../typst-generator';
import { generateLatex } from '../latex-generator';

/** Corps du document, après l'en-tête de lisibilité (qui définit `ubu-item-bloc` avec une grille). */
const typst = (md: string) =>
	generateTypst(parseMarkdown(md), { includeSetup: false }).split(
		'// ubumark: fin de l’en-tête'
	)[1];

/** Cellules `ubu-item(numbering("p", n))` de la grille, dans l'ordre. */
function cellules(code: string): { start: number; numbering: string }[] {
	return [...code.matchAll(/ ubu-item\(numbering\("([^"]+)", (\d+)\)\)/g)].map((m) => ({
		start: Number(m[2]),
		numbering: m[1]
	}));
}

describe('Typst — liste numérotée en colonnes', () => {
	it('grille de 2 colonnes, une cellule par item, numéros 1 à 3 dans l’ordre', () => {
		const code = typst(':colonnes 2\n1. ~cos(\\pi)~\n2. ~sin(\\pi)~\n3. ~cos(0)~');
		expect(code).toContain('grid(columns: (1fr, 1fr)');
		expect(cellules(code)).toEqual([
			{ start: 1, numbering: 'a)' },
			{ start: 2, numbering: 'a)' },
			{ start: 3, numbering: 'a)' }
		]);
		expect(code).not.toContain('colonnes');
	});

	it('écarts avec les noms de Typst (`column-gap` fait échouer tout le PDF)', () => {
		const code = typst(':colonnes 2\n1. a\n2. b');
		expect(code).toContain('column-gutter: 1em, row-gutter: 1.5em');
		expect(code).not.toMatch(/column-gap|row-gap/);
	});

	it('N colonnes → N fractions', () => {
		expect(typst(':colonnes 3\n1. a\n2. b')).toContain('grid(columns: (1fr, 1fr, 1fr)');
		expect(typst(':colonnes 4\n1. a\n2. b')).toContain('grid(columns: (1fr, 1fr, 1fr, 1fr)');
	});

	it('le numéro de départ est conservé', () => {
		expect(cellules(typst(':colonnes 2\n3. a\n4. b')).map((c) => c.start)).toEqual([3, 4]);
	});

	it('sous-liste en colonnes : style de sa profondeur (1)), liste principale normale', () => {
		const code = typst('1. Calculer :\n   :colonnes 3\n   a. x\n   b. y\n   c. z\n2. Fin.');
		expect(code).toContain('#ubu-item(numbering("a)", 1))[Calculer');
		expect(cellules(code)).toEqual([
			{ start: 1, numbering: '1)' },
			{ start: 2, numbering: '1)' },
			{ start: 3, numbering: '1)' }
		]);
	});

	it('`:colonnes 1` et sans marqueur : liste normale, pas de grille', () => {
		expect(typst(':colonnes 1\n1. a\n2. b')).not.toContain('grid(');
		expect(typst('1. a\n2. b')).not.toContain('grid(');
	});
});

describe('Typst — liste à puces en colonnes', () => {
	it('grille de cellules à puce `ubu-item([•])`', () => {
		const code = typst(':colonnes 2\n- a\n- b\n- c');
		expect(code).toContain('grid(columns: (1fr, 1fr)');
		expect(code.match(/ ubu-item\(\[•\], indent: 1em\)/g)).toHaveLength(3);
	});
});

describe('Export LaTeX : marqueur ignoré, liste normale', () => {
	it('même sortie qu’une liste sans marqueur', () => {
		expect(generateLatex(parseMarkdown(':colonnes 2\n1. a\n2. b'))).toBe(
			generateLatex(parseMarkdown('1. a\n2. b'))
		);
	});
});
