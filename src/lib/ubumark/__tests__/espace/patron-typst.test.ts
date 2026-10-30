/**
 * Bloc ```patron → Typst (texte produit) — chantier `solides`, lot 4
 */
import { describe, expect, it } from 'vitest';
import { parseMarkdown } from '$lib/ubumark';
import { generateTypst } from '$lib/ubumark/generators/typst-generator';
import { generateEspaceTypst } from '$lib/ubumark/generators/espace-typst';
import { parseEspaceContent } from '$lib/ubumark/parser/espace-parser';
import { ESPACE_UNAVAILABLE, type PatronSpec } from '$lib/ubumark/types/espace';
import { buildPatronScene } from '$lib/ubumark/utils/espace-patrons';

const typst = (...lines: string[]) =>
	generateEspaceTypst(parseEspaceContent(lines.join('\n'), 'patron'));
const count = (text: string, part: string) => text.split(part).length - 1;

describe('bloc ```patron au PDF', () => {
	it('même scène que l’écran : un trait par ligne, mêmes étiquettes', () => {
		const lines = ['solide: pave 4 2 3', 'sommets: A B C D E F G H', 'cotes: cm'];
		const node = parseEspaceContent(lines.join('\n'), 'patron');
		const scene = buildPatronScene(node.spec as PatronSpec);
		const out = generateEspaceTypst(node);
		expect(count(out, 'curve(')).toBe(scene.lines.length);
		for (const label of scene.labels) expect(out).toContain(JSON.stringify(label.text));
	});

	it('plis en trait fin, contour en trait courant', () => {
		const out = typst('solide: cube');
		expect(count(out, 'thickness: 0.015cm')).toBe(5);
		expect(count(out, 'thickness: 0.03cm')).toBe(14);
	});

	it('face marquée : un polygone gris ; rayon du cylindre en tirets', () => {
		expect(count(typst('solide: cube', 'marquer: face 2'), 'polygon(')).toBe(1);
		expect(count(typst('solide: cylindre 1 3', 'cotes: cm'), 'dash:')).toBe(1);
	});

	it('bloc en erreur : cadre neutre, jamais une erreur de compilation', () => {
		expect(typst('solide: cone 2 3')).toContain(ESPACE_UNAVAILABLE);
	});

	it('designer: le patron seul ; corrigé : les faces attendues en gris', () => {
		const lines = ['solide: cube', 'marquer: face 1', 'designer: voisines'];
		expect(count(typst(...lines), 'polygon(')).toBe(1);
		const solved = generateEspaceTypst(parseEspaceContent(lines.join('\n'), 'patron'), {
			solved: true
		});
		expect(count(solved, 'polygon(')).toBe(1 + 4);
	});

	it('completer: faces données pleines, autres cases en pointillés ; corrigé : la face retirée', () => {
		// Croix sans sa face 5 : cadre 6 × 5 = 30 cases, 5 faces données
		const out = typst('solide: cube', 'completer: 5');
		expect(count(out, 'fill: luma(255)')).toBe(5);
		expect(count(out, 'dash:')).toBe(25);
		const solved = generateEspaceTypst(parseEspaceContent('solide: cube\ncompleter: 5', 'patron'), {
			solved: true
		});
		expect(count(solved, 'fill: luma(150)')).toBe(1);
		expect(count(solved, 'dash:')).toBe(24);
	});

	it('branché dans le générateur de document', () => {
		expect(generateTypst(parseMarkdown('```patron\nsolide: cube\n```\n'))).toContain('curve(');
	});
});
