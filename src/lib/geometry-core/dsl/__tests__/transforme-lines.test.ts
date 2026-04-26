import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';

describe('transforme() — segment', () => {
	it('rotates a segment by 90 degrees', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(3, 0)',
				's = segment(A, B)',
				'r = rotation(angle=90, centre=O)',
				's2 = transforme(r, s)'
			].join('\n')
		);
		expect(symbols.get('s2')!.type).toBe('segment');
		// The segment's endpoints should be rotated: (1,0)→(0,1), (3,0)→(0,3)
		const seg = figure.getElementById(symbols.get('s2')!.figureId!);
		expect(seg!.type).toBe('segment');
		if (seg!.type === 'segment') {
			const start = figure.getPosition(seg.startId)!;
			const end = figure.getPosition(seg.endId)!;
			expect(geoToNumber(start.x)).toBeCloseTo(0);
			expect(geoToNumber(start.y)).toBeCloseTo(1);
			expect(geoToNumber(end.x)).toBeCloseTo(0);
			expect(geoToNumber(end.y)).toBeCloseTo(3);
		}
	});

	it('translates a segment', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(2, 0)',
				's = segment(A, B)',
				'C = point(0, 0)',
				'D = point(1, 3)',
				't = translation(vecteur=(C, D))',
				's2 = transforme(t, s)'
			].join('\n')
		);
		expect(symbols.get('s2')!.type).toBe('segment');
		const seg = figure.getElementById(symbols.get('s2')!.figureId!);
		if (seg!.type === 'segment') {
			const start = figure.getPosition(seg.startId)!;
			const end = figure.getPosition(seg.endId)!;
			expect(geoToNumber(start.x)).toBeCloseTo(1);
			expect(geoToNumber(start.y)).toBeCloseTo(3);
			expect(geoToNumber(end.x)).toBeCloseTo(3);
			expect(geoToNumber(end.y)).toBeCloseTo(3);
		}
	});

	it('reflects a segment over x-axis', () => {
		const { figure, symbols } = runDsl(
			[
				'P1 = point(0, 0)',
				'P2 = point(4, 0)',
				'A = point(1, 2)',
				'B = point(3, 2)',
				's = segment(A, B)',
				'sym = symetrie(axe=(P1, P2))',
				's2 = transforme(sym, s)'
			].join('\n')
		);
		const seg = figure.getElementById(symbols.get('s2')!.figureId!);
		if (seg!.type === 'segment') {
			const start = figure.getPosition(seg.startId)!;
			const end = figure.getPosition(seg.endId)!;
			expect(geoToNumber(start.y)).toBeCloseTo(-2);
			expect(geoToNumber(end.y)).toBeCloseTo(-2);
		}
	});

	it('intermediate points are invisible', () => {
		const { figure } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(3, 0)',
				's = segment(A, B)',
				'r = rotation(angle=90, centre=O)',
				's2 = transforme(r, s)'
			].join('\n')
		);
		// The rotated segment's defining points should be invisible
		const allElements = figure.getAllElements();
		const rotatedPoints = allElements.filter((e) => e.type === 'rotatedPoint');
		// 2 invisible rotated points created for segment endpoints
		const invisibleRotated = rotatedPoints.filter((e) => !e.visible);
		expect(invisibleRotated.length).toBeGreaterThanOrEqual(2);
	});
});

describe('transforme() — droite (line)', () => {
	it('rotates a line by 90 degrees', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(3, 0)',
				'd = droite(A, B)',
				'r = rotation(angle=90, centre=O)',
				'd2 = transforme(r, d)'
			].join('\n')
		);
		expect(symbols.get('d2')!.type).toBe('droite');
		const ln = figure.getElementById(symbols.get('d2')!.figureId!);
		if (ln!.type === 'line') {
			const p1 = figure.getPosition(ln.point1Id)!;
			const p2 = figure.getPosition(ln.point2Id)!;
			// Both points on y-axis after 90° rotation
			expect(geoToNumber(p1.x)).toBeCloseTo(0);
			expect(geoToNumber(p2.x)).toBeCloseTo(0);
		}
	});

	it('reflects a line centrally', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 1)',
				'B = point(2, 2)',
				'd = droite(A, B)',
				's = symetrie(centre=O)',
				'd2 = transforme(s, d)'
			].join('\n')
		);
		expect(symbols.get('d2')!.type).toBe('droite');
		const ln = figure.getElementById(symbols.get('d2')!.figureId!);
		if (ln!.type === 'line') {
			const p1 = figure.getPosition(ln.point1Id)!;
			const p2 = figure.getPosition(ln.point2Id)!;
			expect(geoToNumber(p1.x)).toBeCloseTo(-1);
			expect(geoToNumber(p1.y)).toBeCloseTo(-1);
			expect(geoToNumber(p2.x)).toBeCloseTo(-2);
			expect(geoToNumber(p2.y)).toBeCloseTo(-2);
		}
	});
});

describe('transforme() — demidroite (ray)', () => {
	it('rotates a ray by 90 degrees', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(3, 0)',
				'r_ray = demidroite(A, B)',
				'rot = rotation(angle=90, centre=O)',
				'r2 = transforme(rot, r_ray)'
			].join('\n')
		);
		expect(symbols.get('r2')!.type).toBe('demidroite');
		const ray = figure.getElementById(symbols.get('r2')!.figureId!);
		if (ray!.type === 'ray') {
			const origin = figure.getPosition(ray.originId)!;
			const through = figure.getPosition(ray.throughId)!;
			expect(geoToNumber(origin.x)).toBeCloseTo(0);
			expect(geoToNumber(origin.y)).toBeCloseTo(1);
			expect(geoToNumber(through.x)).toBeCloseTo(0);
			expect(geoToNumber(through.y)).toBeCloseTo(3);
		}
	});
});

describe('Direct syntax — non-point', () => {
	it('rotation(segment, centre=O, angle=90) works', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(3, 0)',
				's = segment(A, B)',
				's2 = rotation(s, centre=O, angle=90)'
			].join('\n')
		);
		expect(symbols.get('s2')!.type).toBe('segment');
	});

	it('symetrie(droite, centre=O) works', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 1)',
				'B = point(2, 2)',
				'd = droite(A, B)',
				'd2 = symetrie(d, centre=O)'
			].join('\n')
		);
		expect(symbols.get('d2')!.type).toBe('droite');
	});

	it('translation(segment, vecteur=v) works', () => {
		const { symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(2, 0)',
				's = segment(A, B)',
				'C = point(0, 0)',
				'D = point(1, 1)',
				'v = vecteur(C, D)',
				's2 = translation(s, vecteur=v)'
			].join('\n')
		);
		expect(symbols.get('s2')!.type).toBe('segment');
	});

	it('homothetie(segment, centre=O, rapport=2) scales segment', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(2, 0)',
				's = segment(A, B)',
				's2 = homothetie(s, centre=O, rapport=2)'
			].join('\n')
		);
		expect(symbols.get('s2')!.type).toBe('segment');
		const seg = figure.getElementById(symbols.get('s2')!.figureId!);
		if (seg!.type === 'segment') {
			const start = figure.getPosition(seg.startId)!;
			const end = figure.getPosition(seg.endId)!;
			expect(geoToNumber(start.x)).toBeCloseTo(2);
			expect(geoToNumber(end.x)).toBeCloseTo(4);
		}
	});
});

describe('Reactivity — segment transformation', () => {
	it('image segment follows when source endpoint moves', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(3, 0)',
				's = segment(A, B)',
				'r = rotation(angle=90, centre=O)',
				's2 = transforme(r, s)'
			].join('\n')
		);
		// Move A to (2, 0)
		const aId = symbols.get('A')!.figureId!;
		figure.movePoint(aId, { kind: 'numeric', value: 2 }, { kind: 'numeric', value: 0 });
		figure.recompute();

		const seg = figure.getElementById(symbols.get('s2')!.figureId!);
		if (seg!.type === 'segment') {
			const start = figure.getPosition(seg.startId)!;
			expect(geoToNumber(start.x)).toBeCloseTo(0);
			expect(geoToNumber(start.y)).toBeCloseTo(2);
		}
	});
});
