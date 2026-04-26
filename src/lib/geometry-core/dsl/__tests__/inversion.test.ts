import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';
import type { GeoElement } from '../../types/elements';
import { serialize } from '../serializer';

describe('Inversion circulaire', () => {
	it('inversion(centre=O, rayon=3) creates an inversion transformation object', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'inv = inversion(centre=O, rayon=3)'].join('\n')
		);
		const entry = symbols.get('inv');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('transformation');
		const el = figure.getElementById(entry!.figureId!) as GeoElement;
		expect(el.type).toBe('inversion');
		expect(el.visible).toBe(false);
	});

	it("inverts a point: M' = O + r²/OM² * (M-O)", () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(2, 0)',
				'inv = inversion(centre=O, rayon=4)',
				'B = transforme(inv, A)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(pos).toBeDefined();
		// OM=2, r=4 → r²/OM² = 16/4 = 4. M' = O + 4*(A-O) = (8, 0)
		expect(geoToNumber(pos!.x)).toBeCloseTo(8);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('auto-inverse: inv(inv(P)) = P', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(1, 1)',
				'A = point(3, 2)',
				'inv = inversion(centre=O, rayon=2)',
				'B = transforme(inv, A)',
				'C = transforme(inv, B)'
			].join('\n')
		);
		const posA = figure.getPosition(symbols.get('A')!.figureId!);
		const posC = figure.getPosition(symbols.get('C')!.figureId!);
		expect(posC).toBeDefined();
		expect(geoToNumber(posC!.x)).toBeCloseTo(geoToNumber(posA!.x));
		expect(geoToNumber(posC!.y)).toBeCloseTo(geoToNumber(posA!.y));
	});

	it('point at center produces NaN', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'inv = inversion(centre=O, rayon=2)', 'B = transforme(inv, O)'].join('\n')
		);
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		// Position should be NaN or null
		if (pos) {
			expect(Number.isNaN(geoToNumber(pos.x)) || Number.isNaN(geoToNumber(pos.y))).toBe(true);
		}
	});

	it('direct application: inversion(A, centre=O, rayon=3)', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'A = point(3, 0)', 'B = inversion(A, centre=O, rayon=3)'].join('\n')
		);
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(pos).toBeDefined();
		// OM=3, r=3 → r²/OM² = 9/9 = 1. Point on circle maps to itself.
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('line through O maps to itself (as conic)', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'd = droite(O, A)',
				'inv = inversion(centre=O, rayon=2)',
				'd2 = transforme(inv, d)'
			].join('\n')
		);
		// Result should be a conic (rendered as courbe)
		expect(symbols.get('d2')).toBeDefined();
		expect(symbols.get('d2')!.type).toBe('courbe');
	});

	it('line not through O maps to circle through O (as conic)', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(0, 1)',
				'B = point(1, 1)',
				'd = droite(A, B)',
				'inv = inversion(centre=O, rayon=2)',
				'd2 = transforme(inv, d)'
			].join('\n')
		);
		// Result should be a conic (circle through O)
		expect(symbols.get('d2')).toBeDefined();
		expect(symbols.get('d2')!.type).toBe('courbe');
	});

	it('circle through O maps to a line (as conic)', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'C = point(1, 0)',
				'c = cercle(C, rayon=1)',
				'inv = inversion(centre=O, rayon=2)',
				'c2 = transforme(inv, c)'
			].join('\n')
		);
		// Circle passes through O (center (1,0), radius 1 → passes through (0,0))
		// Result is a line (conic with A=B=C=0)
		expect(symbols.get('c2')).toBeDefined();
		expect(symbols.get('c2')!.type).toBe('courbe');
	});

	it('circle not through O maps to a circle (as conic)', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'C = point(3, 0)',
				'c = cercle(C, rayon=1)',
				'inv = inversion(centre=O, rayon=2)',
				'c2 = transforme(inv, c)'
			].join('\n')
		);
		// Circle center (3,0) radius 1 does not pass through O
		expect(symbols.get('c2')).toBeDefined();
		expect(symbols.get('c2')!.type).toBe('courbe');
	});

	it('throws on segment', () => {
		expect(() =>
			runDsl(
				[
					'O = point(0, 0)',
					'A = point(1, 1)',
					'B = point(2, 2)',
					's = segment(A, B)',
					'inv = inversion(centre=O, rayon=2)',
					's2 = transforme(inv, s)'
				].join('\n')
			)
		).toThrow();
	});

	it('throws on polygone', () => {
		expect(() =>
			runDsl(
				[
					'O = point(0, 0)',
					'A = point(1, 0)',
					'B = point(0, 1)',
					'C = point(1, 1)',
					'p = polygone(A, B, C)',
					'inv = inversion(centre=O, rayon=2)',
					'p2 = transforme(inv, p)'
				].join('\n')
			)
		).toThrow();
	});

	it('implicit curve via closure (auto-inverse)', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'f = courbe("y = x^2")',
				'inv = inversion(centre=O, rayon=2)',
				'f2 = transforme(inv, f)'
			].join('\n')
		);
		expect(symbols.get('f2')).toBeDefined();
		expect(symbols.get('f2')!.type).toBe('courbe');
	});

	it('composition with rotation works', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(2, 0)',
				'inv = inversion(centre=O, rayon=2)',
				'r = rotation(angle=45, centre=O)',
				'comp = compose(inv, r)',
				'B = transforme(comp, A)'
			].join('\n')
		);
		expect(symbols.get('B')).toBeDefined();
		expect(symbols.get('B')!.type).toBe('point');
		// B should have a computable position
		const pos = figure.getPosition(symbols.get('B')!.figureId!);
		expect(pos).toBeDefined();
	});

	it('serialization roundtrip', () => {
		const dsl = ['O = point(0, 0)', 'inv = inversion(centre=O, rayon=3)'].join('\n');
		const { figure, symbols } = runDsl(dsl);
		const output = serialize(figure, symbols);
		expect(output).toContain('inversion(');
		const { symbols: s2 } = runDsl(output);
		expect(s2.get('inv')).toBeDefined();
		expect(s2.get('inv')!.type).toBe('transformation');
	});
});
