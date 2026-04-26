import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';

describe('transforme() — bound vector', () => {
	it('rotates a bound vector', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(3, 0)',
				'v = vecteur(A, B)',
				'r = rotation(angle=90, centre=O)',
				'v2 = transforme(r, v)'
			].join('\n')
		);
		expect(symbols.get('v2')!.type).toBe('vecteur');
		const el = figure.getElementById(symbols.get('v2')!.figureId!);
		expect(el!.type).toBe('vectorByPoints');
		if (el!.type === 'vectorByPoints') {
			const start = figure.getPosition(el.startId)!;
			const end = figure.getPosition(el.endId)!;
			// (1,0)→(0,1), (3,0)→(0,3)
			expect(geoToNumber(start.x)).toBeCloseTo(0);
			expect(geoToNumber(start.y)).toBeCloseTo(1);
			expect(geoToNumber(end.x)).toBeCloseTo(0);
			expect(geoToNumber(end.y)).toBeCloseTo(3);
		}
	});
});

describe('transforme() — free vector', () => {
	it('rotates a free vector', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'v = vecteur(2, 0)',
				'r = rotation(angle=90, centre=O)',
				'v2 = transforme(r, v)'
			].join('\n')
		);
		expect(symbols.get('v2')!.type).toBe('vecteur');
		const comp = figure.getVectorComponents(symbols.get('v2')!.figureId!);
		expect(comp).toBeDefined();
		expect(geoToNumber(comp!.dx)).toBeCloseTo(0);
		expect(geoToNumber(comp!.dy)).toBeCloseTo(2);
	});

	it('translation leaves free vector invariant', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(5, 5)',
				'v = vecteur(2, 3)',
				't = translation(vecteur=(A, B))',
				'v2 = transforme(t, v)'
			].join('\n')
		);
		const comp = figure.getVectorComponents(symbols.get('v2')!.figureId!);
		expect(geoToNumber(comp!.dx)).toBeCloseTo(2);
		expect(geoToNumber(comp!.dy)).toBeCloseTo(3);
	});

	it('homothety scales free vector', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'v = vecteur(1, 2)',
				'h = homothetie(rapport=3, centre=O)',
				'v2 = transforme(h, v)'
			].join('\n')
		);
		const comp = figure.getVectorComponents(symbols.get('v2')!.figureId!);
		expect(geoToNumber(comp!.dx)).toBeCloseTo(3);
		expect(geoToNumber(comp!.dy)).toBeCloseTo(6);
	});

	it('central symmetry negates free vector', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'v = vecteur(2, 3)',
				's = symetrie(centre=O)',
				'v2 = transforme(s, v)'
			].join('\n')
		);
		const comp = figure.getVectorComponents(symbols.get('v2')!.figureId!);
		expect(geoToNumber(comp!.dx)).toBeCloseTo(-2);
		expect(geoToNumber(comp!.dy)).toBeCloseTo(-3);
	});

	it('axial symmetry reflects free vector over axis', () => {
		const { figure, symbols } = runDsl(
			[
				'P1 = point(0, 0)',
				'P2 = point(1, 0)',
				'v = vecteur(1, 2)',
				's = symetrie(axe=(P1, P2))',
				'v2 = transforme(s, v)'
			].join('\n')
		);
		const comp = figure.getVectorComponents(symbols.get('v2')!.figureId!);
		// Reflect (1,2) over x-axis → (1,-2)
		expect(geoToNumber(comp!.dx)).toBeCloseTo(1);
		expect(geoToNumber(comp!.dy)).toBeCloseTo(-2);
	});
});

describe('transforme() — derived vector (sum)', () => {
	it('rotates a vector sum', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'u = vecteur(1, 0)',
				'v = vecteur(0, 1)',
				'w = u + v',
				'r = rotation(angle=90, centre=O)',
				'w2 = transforme(r, w)'
			].join('\n')
		);
		const comp = figure.getVectorComponents(symbols.get('w2')!.figureId!);
		// w = (1,1), rotated 90° → (-1,1)
		expect(geoToNumber(comp!.dx)).toBeCloseTo(-1);
		expect(geoToNumber(comp!.dy)).toBeCloseTo(1);
	});
});
