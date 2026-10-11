/**
 * Bloc ```courbe → Typst (cetz 0.3.0) : la MÊME scène que l'écran
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent } from '../../parser/courbe-parser';
import { buildCourbeScene } from '../../utils/courbe-scene';
import { generateCourbeTypst } from '../../generators/courbe-typst';
import { generateTypst } from '../../generators/typst-generator';
import { parseMarkdown } from '$lib/ubumark';

const SOURCE = `x: -4 ; 6
y: -8 ; 12
grille: 1 ; 2
f(x) = 1/(x-2) + 1   bleu   nom=\\mathcal{C}_f
g(x) = x/2 sur ]0 ; 4]   rouge pointillé
h(x) = x^2/4   vert   nom=C_{fg}
points: A(-1 ; 0), M(3 ; f(3)), AB(1 ; 1)
asymptotes: x=2 ; y=1
aire: g ; 1 ; 3`;

const count = (text: string, re: RegExp) => (text.match(re) ?? []).length;

describe('courbe → Typst', () => {
	const node = parseCourbeContent(SOURCE);
	const scene = buildCourbeScene(node.spec!);
	const typst = generateCourbeTypst(node);

	it('cetz 0.3.0, comme les autres figures', () => {
		expect(typst).toContain('#import "@preview/cetz:0.3.0"');
		expect(typst).toContain('cetz.canvas(');
	});

	it('même nombre de polylignes, de points, de bornes que la scène (comportement 10)', () => {
		const polylines = scene.curves.reduce((n, c) => n + c.polylines.length, 0);
		expect(polylines).toBeGreaterThanOrEqual(4);
		expect(count(typst, /^\s*\/\/ trace /gm)).toBe(polylines);
		expect(count(typst, /^\s*\/\/ point /gm)).toBe(scene.points.length);
		expect(count(typst, /^\s*\/\/ borne$/gm)).toBe(scene.endpoints.length);
		expect(count(typst, /^\s*\/\/ asymptote/gm)).toBe(2);
		expect(count(typst, /^\s*\/\/ aire/gm)).toBe(1);
	});

	it('borne ouverte = disque blanc, fermée = disque plein', () => {
		const bornes = typst.split('\n').filter((l, i, all) => i > 0 && /\/\/ borne/.test(all[i - 1]));
		expect(bornes.some((l) => /fill: white/.test(l))).toBe(true);
		expect(bornes.some((l) => /fill: rgb\("#dc2626"\)/.test(l))).toBe(true);
	});

	it('pointillé, graduations à la française, noms sûrs pour Typst', () => {
		expect(typst).toMatch(/dash: "dashed"/);
		expect(typst).toContain('[−2]');
		// Un nom de point de plusieurs lettres n'est JAMAIS mis en mode math (variable inconnue)
		expect(typst).not.toContain('$AB$');
		expect(typst).toContain('[AB]');
		expect(typst).toContain('$cal(C)_(f)$');
		expect(typst).toContain('$C_("fg")$');
	});

	it('anglais : point décimal', () => {
		const n = parseCourbeContent('x: -1 ; 1\ny: -1 ; 1\ngrille: 0.5 ; 0.5\nf(x) = x');
		expect(generateCourbeTypst(n, { language: 'en' })).toContain('[0.5]');
		expect(generateCourbeTypst(n)).toContain('[0,5]');
	});

	// Ce test prouve seulement le TEXTE produit (cadre neutre, aucun appel cetz).
	// La compilation typst.ts 0.6.1-rc5 n'est PAS exécutée ici : elle télécharge
	// cetz par le réseau (`scripts/fiches/compile-prod.mjs`), elle a été faite à
	// la main sur une fiche contenant ce cas (voir docs/archive/wip/bloc-courbe-progress.md).
	it('bloc en erreur : cadre neutre en texte, aucun appel cetz', () => {
		const out = generateCourbeTypst(parseCourbeContent('x: 6 ; -4\ny: -1 ; 1'));
		expect(out).toContain('Figure indisponible');
		expect(out).not.toContain('cetz');
	});

	it('branché dans generateTypst, y compris dans un item de liste', () => {
		const md = [
			'1. Lire :',
			'',
			'   ```courbe',
			...SOURCE.split('\n').map((l) => `   ${l}`),
			'   ```'
		].join('\n');
		const out = generateTypst(parseMarkdown(md));
		expect(out).toContain('cetz.canvas(');
		expect(count(out, /^\s*\/\/ trace /gm)).toBe(
			scene.curves.reduce((n, c) => n + c.polylines.length, 0)
		);
	});
});
