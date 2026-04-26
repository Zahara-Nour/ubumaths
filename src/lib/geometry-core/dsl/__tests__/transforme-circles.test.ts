import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';

describe('transforme() — circleByRadius', () => {
	it('rotates a circle (center moves, radius unchanged)', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'C = point(2, 0)',
				'circ = cercle(C, rayon=3)',
				'r = rotation(angle=90, centre=O)',
				'circ2 = transforme(r, circ)'
			].join('\n')
		);
		expect(symbols.get('circ2')!.type).toBe('cercle');
		const el = figure.getElementById(symbols.get('circ2')!.figureId!);
		expect(el!.type).toBe('circleByRadius');
		if (el!.type === 'circleByRadius') {
			const center = figure.getPosition(el.centerId)!;
			expect(geoToNumber(center.x)).toBeCloseTo(0);
			expect(geoToNumber(center.y)).toBeCloseTo(2);
			expect(geoToNumber(el.radius)).toBeCloseTo(3);
		}
	});

	it('translates a circle', () => {
		const { figure, symbols } = runDsl(
			[
				'C = point(1, 1)',
				'circ = cercle(C, rayon=2)',
				'A = point(0, 0)',
				'B = point(3, 4)',
				't = translation(vecteur=(A, B))',
				'circ2 = transforme(t, circ)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('circ2')!.figureId!);
		if (el!.type === 'circleByRadius') {
			const center = figure.getPosition(el.centerId)!;
			expect(geoToNumber(center.x)).toBeCloseTo(4);
			expect(geoToNumber(center.y)).toBeCloseTo(5);
			expect(geoToNumber(el.radius)).toBeCloseTo(2);
		}
	});

	it('homothety scales the radius', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'C = point(2, 0)',
				'circ = cercle(C, rayon=3)',
				'h = homothetie(rapport=2, centre=O)',
				'circ2 = transforme(h, circ)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('circ2')!.figureId!);
		if (el!.type === 'circleByRadius') {
			const center = figure.getPosition(el.centerId)!;
			expect(geoToNumber(center.x)).toBeCloseTo(4);
			expect(geoToNumber(el.radius)).toBeCloseTo(6);
		}
	});

	it('central symmetry of a circle', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'C = point(3, 0)',
				'circ = cercle(C, rayon=1)',
				's = symetrie(centre=O)',
				'circ2 = transforme(s, circ)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('circ2')!.figureId!);
		if (el!.type === 'circleByRadius') {
			const center = figure.getPosition(el.centerId)!;
			expect(geoToNumber(center.x)).toBeCloseTo(-3);
			expect(geoToNumber(el.radius)).toBeCloseTo(1);
		}
	});
});

describe('transforme() — circleByPoint', () => {
	it('rotates a circle defined by point', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'C = point(2, 0)',
				'P = point(3, 0)',
				'circ = cercle(C, passant=P)',
				'r = rotation(angle=90, centre=O)',
				'circ2 = transforme(r, circ)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('circ2')!.figureId!);
		expect(el!.type).toBe('circleByPoint');
		if (el!.type === 'circleByPoint') {
			const center = figure.getPosition(el.centerId)!;
			const edge = figure.getPosition(el.edgePointId)!;
			expect(geoToNumber(center.x)).toBeCloseTo(0);
			expect(geoToNumber(center.y)).toBeCloseTo(2);
			expect(geoToNumber(edge.x)).toBeCloseTo(0);
			expect(geoToNumber(edge.y)).toBeCloseTo(3);
		}
	});
});

describe('transforme() — arcByPoints', () => {
	it('rotates an arc defined by 3 points', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'C = point(0, 0)',
				'B = point(0, 1)',
				'a = arc(A, C, B)',
				'r = rotation(angle=90, centre=O)',
				'a2 = transforme(r, a)'
			].join('\n')
		);
		expect(symbols.get('a2')!.type).toBe('arc');
		const el = figure.getElementById(symbols.get('a2')!.figureId!);
		expect(el!.type).toBe('arcByPoints');
		if (el!.type === 'arcByPoints') {
			const start = figure.getPosition(el.startId)!;
			const center = figure.getPosition(el.centerId)!;
			const end = figure.getPosition(el.endId)!;
			expect(geoToNumber(start.x)).toBeCloseTo(0);
			expect(geoToNumber(start.y)).toBeCloseTo(1);
			expect(geoToNumber(center.x)).toBeCloseTo(0);
			expect(geoToNumber(center.y)).toBeCloseTo(0);
			expect(geoToNumber(end.x)).toBeCloseTo(-1);
			expect(geoToNumber(end.y)).toBeCloseTo(0);
		}
	});
});

describe('transforme() — arcByAngles', () => {
	it('rotates an arc by angles (angles offset)', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'C = point(2, 0)',
				'a = arc(C, rayon=1, debut=0, fin=90)',
				'r = rotation(angle=90, centre=O)',
				'a2 = transforme(r, a)'
			].join('\n')
		);
		expect(symbols.get('a2')!.type).toBe('arc');
		const el = figure.getElementById(symbols.get('a2')!.figureId!);
		if (el!.type === 'arcByAngles') {
			const center = figure.getPosition(el.centerId)!;
			expect(geoToNumber(center.x)).toBeCloseTo(0);
			expect(geoToNumber(center.y)).toBeCloseTo(2);
			// start angle was 0, now offset by 90° = pi/2
			expect(geoToNumber(el.startAngle)).toBeCloseTo(Math.PI / 2);
			// end angle was pi/2, now offset by pi/2 = pi
			expect(geoToNumber(el.endAngle)).toBeCloseTo(Math.PI);
			expect(geoToNumber(el.radius)).toBeCloseTo(1);
		}
	});

	it('homothety scales arc radius', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'C = point(1, 0)',
				'a = arc(C, rayon=2, debut=0, fin=90)',
				'h = homothetie(rapport=3, centre=O)',
				'a2 = transforme(h, a)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('a2')!.figureId!);
		if (el!.type === 'arcByAngles') {
			expect(geoToNumber(el.radius)).toBeCloseTo(6);
			const center = figure.getPosition(el.centerId)!;
			expect(geoToNumber(center.x)).toBeCloseTo(3);
		}
	});

	it('translation preserves arc angles and radius', () => {
		const { figure, symbols } = runDsl(
			[
				'C = point(0, 0)',
				'a = arc(C, rayon=2, debut=30, fin=120)',
				'A = point(0, 0)',
				'B = point(5, 5)',
				't = translation(vecteur=(A, B))',
				'a2 = transforme(t, a)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('a2')!.figureId!);
		if (el!.type === 'arcByAngles') {
			expect(geoToNumber(el.radius)).toBeCloseTo(2);
			expect(geoToNumber(el.startAngle)).toBeCloseTo((30 * Math.PI) / 180);
			expect(geoToNumber(el.endAngle)).toBeCloseTo((120 * Math.PI) / 180);
		}
	});
});

describe('Direct syntax — circles', () => {
	it('rotation(cercle, centre=O, angle=90) works', () => {
		const { symbols } = runDsl(
			[
				'O = point(0, 0)',
				'C = point(2, 0)',
				'circ = cercle(C, rayon=1)',
				'circ2 = rotation(circ, centre=O, angle=90)'
			].join('\n')
		);
		expect(symbols.get('circ2')!.type).toBe('cercle');
	});
});
