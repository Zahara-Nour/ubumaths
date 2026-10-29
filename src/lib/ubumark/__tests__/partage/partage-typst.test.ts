/**
 * Bloc ```partage au PDF (texte Typst produit ; compilation réelle :
 * `partage-typst-compilation.test.ts`)
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import { generatePartageTypst } from '$lib/ubumark/generators/partage-typst';
import { parsePartageContent } from '$lib/ubumark/parser/partage-parser';
import { PARTAGE_UNAVAILABLE } from '$lib/ubumark/types/partage';

const typst = (...lines: string[]) => generatePartageTypst(parsePartageContent(lines.join('\n')));
const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;

describe('bloc ```partage au PDF', () => {
	it('un polygone par part, les parts coloriées grisées', () => {
		const out = typst('forme: bande 8', 'gris: 3');
		expect(count(out, /polygon\(/g)).toBe(8);
		expect(count(out, /fill: luma\(/g)).toBe(3);
		expect(out).not.toContain(PARTAGE_UNAVAILABLE);
	});

	it('sans gris : aucune part grisée', () => {
		expect(count(typst('forme: disque 6'), /fill: luma\(/g)).toBe(0);
	});

	it('chaque forme se dessine avec son nombre de parts', () => {
		expect(count(typst('forme: grille 3×4'), /polygon\(/g)).toBe(12);
		expect(count(typst('forme: disque 5'), /polygon\(/g)).toBe(5);
		expect(count(typst('forme: carre-diagonales'), /polygon\(/g)).toBe(4);
		expect(count(typst('forme: grille 10×10', 'gris: 100'), /fill: luma\(/g)).toBe(100);
	});

	it('bloc en erreur : cadre neutre, jamais une erreur de compilation', () => {
		const out = typst('forme: bande 99');
		expect(out).toContain(PARTAGE_UNAVAILABLE);
		expect(out).not.toContain('polygon(');
	});

	it('branché dans generateTypst, au premier niveau et en liste', () => {
		const out = generateTypst(
			parseMarkdown(
				[
					'```partage',
					'forme: bande 4',
					'```',
					'',
					'1. Dans une liste :',
					'',
					'   ```partage',
					'   forme: disque 3',
					'   gris: 1',
					'   ```'
				].join('\n')
			)
		);
		expect(count(out, /polygon\(/g)).toBe(4 + 3);
	});
});
