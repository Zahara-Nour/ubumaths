import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';
import type { GeoElement } from '../../types/elements';
import { serialize } from '../serializer';

describe('Projection orthogonale', () => {
	it('projection(axe=d) creates a projection transformation object', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'd = droite(A, B)', 'proj = projection(axe=d)'].join(
				'\n'
			)
		);
		const entry = symbols.get('proj');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('transformation');
		const el = figure.getElementById(entry!.figureId!) as GeoElement;
		expect(el.type).toBe('projection');
		expect(el.visible).toBe(false);
	});

	it('projection(axe=(A, B)) creates projection with tuple', () => {
		const { symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'proj = projection(axe=(A, B))'].join('\n')
		);
		expect(symbols.get('proj')).toBeDefined();
		expect(symbols.get('proj')!.type).toBe('transformation');
	});

	it('projects a point onto horizontal line', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(2, 5)',
				'proj = projection(axe=(A, B))',
				'H = transforme(proj, P)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('H')!.figureId!);
		expect(pos).toBeDefined();
		expect(geoToNumber(pos!.x)).toBeCloseTo(2);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('point already on line projects to itself', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(3, 0)',
				'H = transforme(projection(axe=(A, B)), P)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('H')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('projects onto vertical line', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(0, 5)',
				'P = point(3, 2)',
				'H = transforme(projection(axe=(A, B)), P)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('H')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(0);
		expect(geoToNumber(pos!.y)).toBeCloseTo(2);
	});

	it('projects onto oblique line', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(1, 1)',
				'P = point(2, 0)',
				'H = transforme(projection(axe=(A, B)), P)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('H')!.figureId!);
		// Projection of (2,0) on y=x is (1,1)
		expect(geoToNumber(pos!.x)).toBeCloseTo(1);
		expect(geoToNumber(pos!.y)).toBeCloseTo(1);
	});

	it('direct application: projection(P, axe=d)', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(2, 5)',
				'd = droite(A, B)',
				'H = projection(P, axe=d)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('H')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(2);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('projects a segment', () => {
		const { symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(1, 3)',
				'D = point(3, 5)',
				's = segment(C, D)',
				'proj = projection(axe=(A, B))',
				's2 = transforme(proj, s)'
			].join('\n')
		);
		expect(symbols.get('s2')).toBeDefined();
		expect(symbols.get('s2')!.type).toBe('segment');
	});

	it('projects a polygone', () => {
		const { symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(1, 3)',
				'D = point(3, 5)',
				'E = point(2, 4)',
				'p = polygone(C, D, E)',
				'proj = projection(axe=(A, B))',
				'p2 = transforme(proj, p)'
			].join('\n')
		);
		expect(symbols.get('p2')).toBeDefined();
		expect(symbols.get('p2')!.type).toBe('polygone');
	});

	it('throws on cercle', () => {
		expect(() =>
			runDsl(
				[
					'A = point(0, 0)',
					'B = point(4, 0)',
					'C = point(1, 1)',
					'c = cercle(C, rayon=2)',
					'proj = projection(axe=(A, B))',
					'c2 = transforme(proj, c)'
				].join('\n')
			)
		).toThrow();
	});

	it('serialization roundtrip', () => {
		const dsl = ['A = point(0, 0)', 'B = point(4, 0)', 'proj = projection(axe=(A, B))'].join('\n');
		const { figure, symbols } = runDsl(dsl);
		const output = serialize(figure, symbols);
		expect(output).toContain('projection(');
		const { symbols: s2 } = runDsl(output);
		expect(s2.get('proj')).toBeDefined();
		expect(s2.get('proj')!.type).toBe('transformation');
	});
});
