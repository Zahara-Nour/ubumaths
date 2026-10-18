/**
 * Nom masqué d'un point (`labelHidden`, DSL `etiquette="aucune"`) dans les
 * exports SVG et TikZ : le point reste dessiné, son nom n'est pas écrit — comme
 * à l'écran (`GeometryCanvas`) et en Typst. Les deux branches de TikZ comptent :
 * le nom posé en `node` du `\fill` (rond) et le `\node` à part de la croix.
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../dsl/parser';
import { interpret } from '../../dsl/interpreter';
import { exportToSVG } from '../export-svg';
import { exportToTikZ } from '../export-tikz';
import type { Viewport } from '../../viewport/types';

const viewport: Viewport = { xMin: -5, xMax: 5, yMin: -5, yMax: 5 };

function figureOf(script: string) {
	return interpret(parse(script)).figure;
}

const CASES = [
	['rond', 'A = point(1, 2, etiquette="aucune")'],
	['croix', 'A = point(1, 2, etiquette="aucune", forme="croix")']
] as const;

describe('point au nom masqué : SVG', () => {
	for (const [shape, script] of CASES) {
		it(`${shape} : dessiné, sans nom`, () => {
			const svg = exportToSVG(figureOf(script), viewport);
			expect(svg).toMatch(shape === 'rond' ? /<circle/ : /<line/);
			expect(svg).not.toMatch(/>A<\/text>/);
		});
	}

	it('témoin : sans etiquette="aucune", le nom est écrit', () => {
		expect(exportToSVG(figureOf('A = point(1, 2, forme="croix")'), viewport)).toMatch(/>A<\/text>/);
	});
});

describe('point au nom masqué : TikZ', () => {
	for (const [shape, script] of CASES) {
		it(`${shape} : dessiné, sans nom`, () => {
			const tikz = exportToTikZ(figureOf(script), viewport);
			expect(tikz).toContain(shape === 'rond' ? 'circle (2pt)' : 'cross out');
			expect(tikz).not.toContain('{$A$}');
		});
	}

	it('témoin : sans etiquette="aucune", le nom est écrit (croix comprise)', () => {
		expect(exportToTikZ(figureOf('A = point(1, 2, forme="croix")'), viewport)).toContain('{$A$}');
	});
});
