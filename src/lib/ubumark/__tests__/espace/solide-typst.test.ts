/**
 * Bloc ```solide → Typst (texte produit) — chantier `solides`, lot 3
 */
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import { generateEspaceTypst } from '$lib/ubumark/generators/espace-typst';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import { ESPACE_UNAVAILABLE } from '$lib/ubumark/types/espace';
import { buildSolideScene } from '$lib/ubumark/utils/espace-solides';
import type { SolideSpec } from '$lib/ubumark/types/espace';

const typst = (...lines: string[]) =>
	generateEspaceTypst(parseEspaceContent(lines.join('\n'), 'solide'));
const count = (text: string, part: string) => text.split(part).length - 1;

describe('bloc ```solide au PDF', () => {
	it('un trait par ligne de la scène, les cachés en tirets', () => {
		const out = typst('forme: pave 4 2 3');
		expect(count(out, 'curve(')).toBe(12);
		expect(count(out, 'dash:')).toBe(3);
	});

	it('même scène que l’écran : mêmes traits, mêmes étiquettes', () => {
		const lines = ['forme: cone 2 4', 'sommets: S O', 'cotes: cm'];
		const node = parseEspaceContent(lines.join('\n'), 'solide');
		const scene = buildSolideScene(node.spec as SolideSpec);
		const out = generateEspaceTypst(node);
		expect(count(out, 'curve(')).toBe(scene.lines.length);
		for (const label of scene.labels) expect(out).toContain(JSON.stringify(label.text));
	});

	it('face marquée : un polygone gris ; sommet marqué : un disque', () => {
		const out = typst(
			'forme: cube 2',
			'sommets: A B C D E F G H',
			'marquer: face dessus, sommet G'
		);
		expect(count(out, 'polygon(')).toBe(1);
		expect(count(out, 'circle(')).toBe(1);
	});

	it('cotes à la française', () => {
		expect(typst('forme: pave 4,5 2 3', 'cotes: cm')).toContain('"4,5 cm"');
	});

	it("un nom avec prime reste « O' » (chaîne Typst, pas d’apostrophe typographique)", () => {
		expect(typst('forme: cylindre 2 5', "sommets: O O'")).toContain(`"O'"`);
	});

	it('bloc en erreur : cadre neutre, jamais une erreur de compilation', () => {
		expect(typst('forme: sphere 3')).toContain(ESPACE_UNAVAILABLE);
	});

	it('branché dans le générateur de document', () => {
		const out = generateTypst(parseMarkdown('```solide\nforme: boule 3\n```\n'));
		expect(out).toContain('curve(');
	});
});
