/**
 * Bloc ```collection au PDF (texte Typst produit ; compilation réelle :
 * `collection-typst-compilation.test.ts`)
 */

import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import { generateCollectionTypst } from '$lib/ubumark/generators/collection-typst';
import { parseCollectionContent } from '$lib/ubumark/parser/collection-parser';
import { buildCollectionScene, COLLECTION_VIEW } from '$lib/ubumark/utils/collection-scene';
import { COLLECTION_UNAVAILABLE } from '$lib/ubumark/types/collection';

const node = (...lines: string[]) => parseCollectionContent(lines.join('\n'));
const typst = (...lines: string[]) => generateCollectionTypst(node(...lines));
const count = (text: string, pattern: RegExp) => (text.match(pattern) ?? []).length;
const FRAME = /#box\(width: [\d.]+cm, height: [\d.]+cm, stroke:/g;

describe('bloc ```collection au PDF', () => {
	it('une collection dans son cadre, à l’échelle de 6 cm pleine largeur (décision 9)', () => {
		const n = node('dizaines: 10');
		const scene = buildCollectionScene(n.spec!, 0);
		const width = Number(((scene.width * 6) / COLLECTION_VIEW.fullWidth).toFixed(4));
		const out = generateCollectionTypst(n);
		expect(count(out, FRAME)).toBe(1);
		expect(out).toContain(`#box(width: ${width}cm`);
		expect(out).not.toContain(COLLECTION_UNAVAILABLE);
	});

	it('la taille demandée change l’échelle', () => {
		const n = node('dizaines: 10', 'taille: 3cm');
		const scene = buildCollectionScene(n.spec!, 0);
		const width = Number(((scene.width * 3) / COLLECTION_VIEW.fullWidth).toFixed(4));
		expect(generateCollectionTypst(n)).toContain(`#box(width: ${width}cm`);
	});

	it('un objet dessiné par objet de la scène', () => {
		expect(count(typst('unités: 23', 'dessin: paquets'), /circle\(/g)).toBe(23);
		// 4 paquets de 10 jetons + 7 jetons
		expect(count(typst('dizaines: 4', 'unités: 7', 'dessin: paquets'), /circle\(/g)).toBe(47);
		// 3 barres (9 séparations chacune) + 5 cubes
		const barres = typst('dizaines: 3', 'unités: 5');
		expect(count(barres, /line\(/g)).toBe(27);
	});

	it('plusieurs collections, légendes d’office ou données, en chaînes littérales', () => {
		const out = typst('unités: 3 ; 4 ; 5');
		expect(count(out, FRAME)).toBe(3);
		for (const caption of ['"A"', '"B"', '"C"']) expect(out).toContain(caption);
		const named = typst('unités: 3 ; 4', 'légendes: "Léa" ; #x [y]');
		expect(named).toContain('"\\"Léa\\""');
		expect(named).toContain('"#x [y]"');
	});

	it('une seule collection : pas de légende d’office', () => {
		expect(typst('unités: 3')).not.toContain('"A"');
	});

	it('bloc en erreur : cadre neutre, jamais une erreur de compilation', () => {
		const out = typst('unités: 101');
		expect(out).toContain(COLLECTION_UNAVAILABLE);
		expect(count(out, FRAME)).toBe(0);
	});

	it('branché dans generateTypst, au premier niveau et en liste', () => {
		const out = generateTypst(
			parseMarkdown(
				[
					'```collection',
					'unités: 9',
					'```',
					'',
					'1. Et :',
					'',
					'   ```collection',
					'   dizaines: 3',
					'   ```'
				].join('\n')
			)
		);
		expect(count(out, FRAME)).toBe(2);
	});
});
