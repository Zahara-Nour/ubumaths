/**
 * Bloc ```courbe — graduations en multiples de π (décision de David du 2026-10-02)
 *
 * Un pas de grille multiple rationnel de π (`grille: pi/2 ; 1`) gradue l'axe en
 * « −π, −π/2, π/2, π… » au lieu de « −3,14159265359 ». Les autres pas ne changent pas.
 */
import { describe, it, expect } from 'vitest';
import { parseCourbeContent } from '../../parser/courbe-parser';
import { buildCourbeScene } from '../../utils/courbe-scene';
import { generateCourbeTypst } from '../../generators/courbe-typst';

const labels = (source: string, axis: 'x' | 'y' = 'x') => {
	const node = parseCourbeContent(source);
	expect(node.errors).toEqual([]);
	return buildCourbeScene(node.spec!).ticks[axis].map((t) => t.label);
};

describe('graduations en π', () => {
	it('pas π/2 : −π, −π/2, π/2, π, 3π/2, 2π (origine sans étiquette)', () => {
		expect(labels('x: -pi ; 2*pi\ny: -2 ; 2\ngrille: pi/2 ; 1\nf(x) = sin(x)')).toEqual([
			'−π',
			'−π/2',
			'π/2',
			'π',
			'3π/2',
			'2π'
		]);
	});

	it('pas π/3 : fractions réduites (2π/3, π, 4π/3)', () => {
		expect(labels('x: 0 ; 2*pi\ny: -2 ; 2\ngrille: pi/3 ; 1\nf(x) = cos(x)')).toEqual([
			'π/3',
			'2π/3',
			'π',
			'4π/3',
			'5π/3',
			'2π'
		]);
	});

	it('pas π : −2π, −π, π, 2π', () => {
		expect(labels('x: -2*pi ; 2*pi\ny: -2 ; 2\ngrille: pi ; 1\nf(x) = sin(x)')).toEqual([
			'−2π',
			'−π',
			'π',
			'2π'
		]);
	});

	it('axe des ordonnées au pas 1 : inchangé', () => {
		expect(labels('x: -pi ; 2*pi\ny: -2 ; 2\ngrille: pi/2 ; 1\nf(x) = sin(x)', 'y')).toEqual([
			'−2',
			'−1',
			'1',
			'2'
		]);
	});

	it('pas qui n’est pas un multiple de π : graduations décimales comme avant', () => {
		expect(labels('x: 0 ; 2\ny: -1 ; 1\ngrille: 0.5 ; 0.5\nf(x) = x')).toEqual([
			'0,5',
			'1',
			'1,5',
			'2'
		]);
	});

	it('le PDF porte les mêmes étiquettes', () => {
		const typst = generateCourbeTypst(
			parseCourbeContent('x: -pi ; 2*pi\ny: -2 ; 2\ngrille: pi/2 ; 1\nf(x) = sin(x)')
		);
		for (const label of ['−π/2', '3π/2', '2π']) expect(typst).toContain(`[${label}]`);
		expect(typst).not.toContain('1,57079');
	});
});
