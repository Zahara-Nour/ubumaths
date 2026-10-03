/**
 * Bloc ```figure → Typst (cetz 0.3.0) — comportement 15
 *
 * Chaque élément visible à l'écran a son équivalent exporté : l'écran
 * (`figureToSvg`) et le PDF (`exportToTypst`, repères `// element <id>`)
 * dessinent EXACTEMENT les mêmes objets. La compilation en conditions de
 * production est prouvée hors test (typst.ts 0.6.1-rc5 + cetz téléchargé) :
 * voir `docs/wip/bloc-figure-progress.md`.
 */
import { describe, it, expect } from 'vitest';
import { parseFigureContent } from '../../parser/figure-parser';
import { buildFigureScene } from '../../utils/figure-scene';
import { figureToSvg } from '../../utils/figure-svg';
import { generateFigureTypst } from '../../generators/figure-typst';
import { parseMarkdown, generateTypst } from '$lib/ubumark';
import '$lib/ubumark/generators/figure-typst-setup';

const SOURCE = `fenetre: -1 ; 8 ; -1 ; 6
taille: moyenne
---
A = point(0, 0)
B = point(5, 0)
C = point(0, 4)
AB = point(2, 2)
p = polygone(A, B, C)
angle(B, A, C, marque="carre")
angle(A, B, C)
m = marque_segment(A, B, traits=2)
v = vecteur(B, C)
c = cercle(A, rayon=1)
c2 = cercle(A, B, C)
a = arc(B, A, C)
d = droite(A, C)
r = demidroite(B, C)
I = milieu(A, B)
texte(2, 3, "hypoténuse *1* $")`;

function ids(typst: string): Set<string> {
	return new Set([...typst.matchAll(/\/\/ element (\S+)/g)].map((m) => m[1]));
}

describe('figure → Typst', () => {
	it('mêmes objets à l’écran et au PDF (comportement 15)', () => {
		const node = parseFigureContent(SOURCE);
		const scene = buildFigureScene(node).scene!;
		const screen = new Set(figureToSvg(scene, 'moyenne').shapes.map((s) => s.elementId));
		const typst = generateFigureTypst(node);
		expect(screen.size).toBe(scene.elements.length);
		expect(ids(typst)).toEqual(screen);
	});

	it('cetz 0.3.0, centré, repère isotrope à la largeur de la taille', () => {
		const typst = generateFigureTypst(parseFigureContent(SOURCE));
		expect(typst).toContain('#import "@preview/cetz:0.3.0"');
		expect(typst).toContain('#align(center)[');
		// moyenne : 6,5 cm pour 9 unités
		expect(typst).toContain(`scale(x: ${Math.round((6.5 / 9) * 1e4) / 1e4}`);
		expect(typst).toContain('rect((-1, -1), (8, 6), stroke: none)');
	});

	it('aucun nom ni texte d’auteur en mode math ou en markup', () => {
		const typst = generateFigureTypst(parseFigureContent(SOURCE));
		expect(typst).not.toMatch(/\$AB\$|\[\$/);
		expect(typst).toContain('"AB"');
		expect(typst).toContain('"hypoténuse *1* $"');
	});

	it('bloc en erreur → « Figure indisponible », sans cetz', () => {
		const typst = generateFigureTypst(
			parseFigureContent('fenetre: 0 ; 4 ; 0 ; 3\n---\nc = cercle(A, 2)')
		);
		expect(typst).toContain('Figure indisponible');
		expect(typst).not.toContain('cetz');
	});

	it('branché dans `generateTypst`, au premier niveau et dans une liste', () => {
		const block = ['```figure', ...SOURCE.split('\n'), '```'];
		const md = [
			'Énoncé.',
			'',
			...block,
			'',
			'1. Question :',
			'',
			...block.map((l) => `   ${l}`)
		].join('\n');
		const typst = generateTypst(parseMarkdown(md), { includeSetup: false });
		// Une toile par figure (la toile découpée à la fenêtre est imbriquée : `#cetz`)
		expect(typst.match(/#cetz\.canvas/g)).toHaveLength(2);
	});
});
