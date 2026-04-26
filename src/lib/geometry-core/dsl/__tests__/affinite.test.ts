import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';
import type { GeoElement } from '../../types/elements';
import { serialize } from '../serializer';

describe('Affinité orthogonale', () => {
	it('affinite(axe=(A,B), rapport=2) creates an affinity transformation object', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'aff = affinite(axe=(A, B), rapport=2)'].join('\n')
		);
		const entry = symbols.get('aff');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('transformation');
		const el = figure.getElementById(entry!.figureId!) as GeoElement;
		expect(el.type).toBe('affinity');
		expect(el.visible).toBe(false);
	});

	it('point with horizontal axis rapport=2', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(1, 3)',
				'Q = transforme(affinite(axe=(A, B), rapport=2), P)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('Q')!.figureId!);
		expect(pos).toBeDefined();
		// Projection of (1,3) on Ox is (1,0). P' = (1,0) + 2*((1,3)-(1,0)) = (1, 6)
		expect(geoToNumber(pos!.x)).toBeCloseTo(1);
		expect(geoToNumber(pos!.y)).toBeCloseTo(6);
	});

	it('point with oblique axis', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(1, 1)',
				'P = point(2, 0)',
				'Q = transforme(affinite(axe=(A, B), rapport=2), P)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('Q')!.figureId!);
		expect(pos).toBeDefined();
		// Projection of (2,0) on y=x is (1,1). P' = (1,1) + 2*((2,0)-(1,1)) = (1,1) + 2*(1,-1) = (3,-1)
		expect(geoToNumber(pos!.x)).toBeCloseTo(3);
		expect(geoToNumber(pos!.y)).toBeCloseTo(-1);
	});

	it('rapport=1 is identity', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(1, 3)',
				'Q = transforme(affinite(axe=(A, B), rapport=1), P)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('Q')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(1);
		expect(geoToNumber(pos!.y)).toBeCloseTo(3);
	});

	it('rapport=-1 is axial symmetry', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(1, 3)',
				'Q = transforme(affinite(axe=(A, B), rapport=-1), P)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('Q')!.figureId!);
		// rapport=-1: P' = H + (-1)*(P - H) = 2H - P → reflection over x-axis
		expect(geoToNumber(pos!.x)).toBeCloseTo(1);
		expect(geoToNumber(pos!.y)).toBeCloseTo(-3);
	});

	it('rapport=0 is projection', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'P = point(1, 3)',
				'Q = transforme(affinite(axe=(A, B), rapport=0), P)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('Q')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(1);
		expect(geoToNumber(pos!.y)).toBeCloseTo(0);
	});

	it('direct application: affinite(P, axe=d, rapport=2)', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'd = droite(A, B)',
				'P = point(1, 3)',
				'Q = affinite(P, axe=d, rapport=2)'
			].join('\n')
		);
		const pos = figure.getPosition(symbols.get('Q')!.figureId!);
		expect(geoToNumber(pos!.x)).toBeCloseTo(1);
		expect(geoToNumber(pos!.y)).toBeCloseTo(6);
	});

	it('transforms a segment', () => {
		const { symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(1, 1)',
				'D = point(3, 2)',
				's = segment(C, D)',
				'aff = affinite(axe=(A, B), rapport=2)',
				's2 = transforme(aff, s)'
			].join('\n')
		);
		expect(symbols.get('s2')).toBeDefined();
		expect(symbols.get('s2')!.type).toBe('segment');
	});

	it('transforms a circle into an ellipse (conic)', () => {
		const { symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(0, 3)',
				'c = cercle(C, rayon=1)',
				'aff = affinite(axe=(A, B), rapport=2)',
				'c2 = transforme(aff, c)'
			].join('\n')
		);
		// Circle under non-uniform scaling becomes a conic (rendered as courbe)
		expect(symbols.get('c2')).toBeDefined();
	});

	it('serialization roundtrip', () => {
		const dsl = [
			'A = point(0, 0)',
			'B = point(4, 0)',
			'aff = affinite(axe=(A, B), rapport=2)'
		].join('\n');
		const { figure, symbols } = runDsl(dsl);
		const output = serialize(figure, symbols);
		expect(output).toContain('affinite(');
		const { symbols: s2 } = runDsl(output);
		expect(s2.get('aff')).toBeDefined();
		expect(s2.get('aff')!.type).toBe('transformation');
	});

	it('composition with rotation works', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(4, 0)',
				'aff = affinite(axe=(O, A), rapport=2)',
				'r = rotation(angle=45, centre=O)',
				'comp = compose(aff, r)'
			].join('\n')
		);
		expect(symbols.get('comp')).toBeDefined();
		expect(symbols.get('comp')!.type).toBe('transformation');
	});
});
