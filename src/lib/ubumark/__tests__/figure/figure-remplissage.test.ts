/**
 * Bloc ```figure — un remplissage s'affiche pareil à l'écran et au PDF.
 *
 * Avant : l'écran ignorait `opacite_fond` (toujours 25 %), le PDF remplissait
 * les polygones en OPAQUE et ne remplissait jamais les cercles.
 * Règle : sans `opacite_fond`, 25 % (on voit les traits dessous) ; sinon la
 * valeur de l'auteur ; cercles et polygones traités pareil.
 */
import { describe, it, expect } from 'vitest';
import { parseFigureContent } from '../../parser/figure-parser';
import { buildFigureScene } from '../../utils/figure-scene';
import { figureToSvg } from '../../utils/figure-svg';
import { generateFigureTypst } from '../../generators/figure-typst';

const content = (body: string) =>
	parseFigureContent(
		`fenetre: -1 ; 8 ; -1 ; 6\n---\nA = point(0, 0)\nB = point(4, 0)\nC = point(0, 3)\n${body}`
	);

/** Opacité de remplissage de la première forme remplie, à l'écran */
function screenOpacity(body: string): number | undefined {
	const result = buildFigureScene(content(body));
	expect(result.errors).toEqual([]);
	const shape = figureToSvg(result.scene!, 'moyenne').shapes.find((s) => 'fill' in s && s.fill) as
		| { fillOpacity?: number }
		| undefined;
	return shape?.fillOpacity;
}

/** Les lignes Typst qui portent un remplissage */
const filledLines = (body: string) =>
	generateFigureTypst(content(body))
		.split('\n')
		.filter((l) => /fill: rgb/.test(l));

describe('remplissage — écran', () => {
	it('sans opacite_fond : 25 %', () => {
		expect(screenOpacity('p = polygone(A, B, C, remplissage="vert")')).toBe(0.25);
	});

	it('avec opacite_fond : la valeur de l’auteur', () => {
		expect(screenOpacity('p = polygone(A, B, C, remplissage="vert", opacite_fond=0.6)')).toBe(0.6);
	});
});

describe('remplissage — PDF', () => {
	it('polygone sans opacite_fond : 25 %, comme à l’écran', () => {
		expect(filledLines('p = polygone(A, B, C, remplissage="vert")')[0]).toContain(
			'transparentize(75%)'
		);
	});

	it('polygone avec opacite_fond : la valeur de l’auteur', () => {
		expect(filledLines('p = polygone(A, B, C, remplissage="vert", opacite_fond=0.6)')[0]).toContain(
			'transparentize(40%)'
		);
	});

	it('un cercle rempli est rempli', () => {
		const lines = filledLines('c = cercle(A, rayon=2, remplissage="bleu")');
		expect(lines.some((l) => l.includes('circle('))).toBe(true);
	});
});
