import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { geoToNumber } from '../../compute/to-number';
import { numeric } from '../../types/geo-value';
import { DslRuntimeError } from '../errors';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

function getPos(
	figure: ReturnType<typeof run>['figure'],
	symbols: ReturnType<typeof run>['symbols'],
	name: string
) {
	const entry = symbols.get(name);
	if (!entry?.figureId) return null;
	return figure.getPosition(entry.figureId);
}

// ─── Intersection droite-cercle (LC) ────────────────────────────────────────

describe('intersection droite-cercle', () => {
	it('secant: returns 2 distinct points (index 1 and 2)', () => {
		// Line y=0 through circle centered at origin with radius 2
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'c = cercle(O, rayon=2)',
				'P = intersection(d, c, 1)',
				'Q = intersection(d, c, 2)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		const posQ = getPos(figure, symbols, 'Q');
		expect(posP).not.toBeNull();
		expect(posQ).not.toBeNull();

		const px = geoToNumber(posP!.x);
		const qx = geoToNumber(posQ!.x);
		// Both on y=0, at x=-2 and x=2 (or vice versa)
		expect(geoToNumber(posP!.y)).toBeCloseTo(0);
		expect(geoToNumber(posQ!.y)).toBeCloseTo(0);
		expect(Math.abs(px)).toBeCloseTo(2);
		expect(Math.abs(qx)).toBeCloseTo(2);
		expect(px).not.toBeCloseTo(qx);
	});

	it('tangent: index 1 works, index 2 has null position', () => {
		// Line y=2 tangent to circle centered at origin with radius 2
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'A = point(-5, 2)',
				'B = point(5, 2)',
				'd = droite(A, B)',
				'c = cercle(O, rayon=2)',
				'P = intersection(d, c, 1)',
				'Q = intersection(d, c, 2)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
		expect(geoToNumber(posP!.x)).toBeCloseTo(0);
		expect(geoToNumber(posP!.y)).toBeCloseTo(2);

		const posQ = getPos(figure, symbols, 'Q');
		expect(posQ).toBeNull();
	});

	it('no intersection: both indices give null position', () => {
		// Line y=5 above circle centered at origin with radius 2
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'A = point(-5, 5)',
				'B = point(5, 5)',
				'd = droite(A, B)',
				'c = cercle(O, rayon=2)',
				'P = intersection(d, c, 1)',
				'Q = intersection(d, c, 2)'
			].join('\n')
		);

		expect(getPos(figure, symbols, 'P')).toBeNull();
		expect(getPos(figure, symbols, 'Q')).toBeNull();
	});

	it('works with segment (not just droite)', () => {
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'A = point(-5, 0)',
				'B = point(5, 0)',
				's = segment(A, B)',
				'c = cercle(O, rayon=2)',
				'P = intersection(s, c, 1)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
		expect(geoToNumber(posP!.y)).toBeCloseTo(0);
		expect(Math.abs(geoToNumber(posP!.x))).toBeCloseTo(2);
	});

	it('swap order: intersection(cercle, droite) works', () => {
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'c = cercle(O, rayon=2)',
				'P = intersection(c, d, 1)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
		expect(Math.abs(geoToNumber(posP!.x))).toBeCloseTo(2);
	});

	it('default index is 1 when omitted', () => {
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'c = cercle(O, rayon=2)',
				'P = intersection(d, c)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
	});

	it('invalid index throws error', () => {
		expect(() =>
			run(
				[
					'O = point(0, 0)',
					'A = point(-5, 0)',
					'B = point(5, 0)',
					'd = droite(A, B)',
					'c = cercle(O, rayon=2)',
					'P = intersection(d, c, 3)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});
});

// ─── Intersection cercle-cercle (CC) ────────────────────────────────────────

describe('intersection cercle-cercle', () => {
	it('secant: returns 2 distinct points', () => {
		// Two circles of radius 2, centered at (-1, 0) and (1, 0)
		const { figure, symbols } = run(
			[
				'O1 = point(-1, 0)',
				'O2 = point(1, 0)',
				'c1 = cercle(O1, rayon=2)',
				'c2 = cercle(O2, rayon=2)',
				'P = intersection(c1, c2, 1)',
				'Q = intersection(c1, c2, 2)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		const posQ = getPos(figure, symbols, 'Q');
		expect(posP).not.toBeNull();
		expect(posQ).not.toBeNull();

		// Both points should be on x=0 (radical axis), at y = ±√3
		expect(geoToNumber(posP!.x)).toBeCloseTo(0);
		expect(geoToNumber(posQ!.x)).toBeCloseTo(0);
		expect(Math.abs(geoToNumber(posP!.y))).toBeCloseTo(Math.sqrt(3));
		expect(Math.abs(geoToNumber(posQ!.y))).toBeCloseTo(Math.sqrt(3));
		expect(geoToNumber(posP!.y)).not.toBeCloseTo(geoToNumber(posQ!.y));
	});

	it('external tangency: index 1 works, index 2 is null', () => {
		// Two circles of radius 1, centered at (0,0) and (2,0)
		const { figure, symbols } = run(
			[
				'O1 = point(0, 0)',
				'O2 = point(2, 0)',
				'c1 = cercle(O1, rayon=1)',
				'c2 = cercle(O2, rayon=1)',
				'P = intersection(c1, c2, 1)',
				'Q = intersection(c1, c2, 2)'
			].join('\n')
		);

		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
		expect(geoToNumber(posP!.x)).toBeCloseTo(1);
		expect(geoToNumber(posP!.y)).toBeCloseTo(0);

		expect(getPos(figure, symbols, 'Q')).toBeNull();
	});

	it('disjoint: both indices give null', () => {
		const { figure, symbols } = run(
			[
				'O1 = point(0, 0)',
				'O2 = point(10, 0)',
				'c1 = cercle(O1, rayon=1)',
				'c2 = cercle(O2, rayon=1)',
				'P = intersection(c1, c2, 1)',
				'Q = intersection(c1, c2, 2)'
			].join('\n')
		);

		expect(getPos(figure, symbols, 'P')).toBeNull();
		expect(getPos(figure, symbols, 'Q')).toBeNull();
	});

	it('concentric: both indices give null', () => {
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'c1 = cercle(O, rayon=1)',
				'c2 = cercle(O, rayon=2)',
				'P = intersection(c1, c2, 1)'
			].join('\n')
		);

		expect(getPos(figure, symbols, 'P')).toBeNull();
	});

	it('equilateral triangle by 2 circle intersections', () => {
		// Classic compass construction: equilateral triangle
		const { figure, symbols } = run(
			[
				'A = point(0, 0)',
				'B = point(2, 0)',
				'c1 = cercle(A, passant=B)',
				'c2 = cercle(B, passant=A)',
				'C = intersection(c1, c2, 1)'
			].join('\n')
		);

		const posC = getPos(figure, symbols, 'C');
		expect(posC).not.toBeNull();
		// C should be at (1, √3) or (1, -√3)
		expect(geoToNumber(posC!.x)).toBeCloseTo(1);
		expect(Math.abs(geoToNumber(posC!.y))).toBeCloseTo(Math.sqrt(3));
	});
});

// ─── Reactivity ─────────────────────────────────────────────────────────────

describe('intersection LC/CC reactivity', () => {
	it('LC intersection updates when parent point moves', () => {
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'c = cercle(O, rayon=2)',
				'P = intersection(d, c, 1)'
			].join('\n')
		);

		const posP1 = getPos(figure, symbols, 'P');
		expect(posP1).not.toBeNull();

		// Move circle center up by 1
		const oId = symbols.get('O')!.figureId!;
		figure.movePoint(oId, numeric(0), numeric(1));
		figure.recompute();

		const posP2 = getPos(figure, symbols, 'P');
		expect(posP2).not.toBeNull();
		// Now intersection of y=0 with circle centered at (0,1) radius 2
		// Should be at y=0, x = ±√(4-1) = ±√3
		expect(geoToNumber(posP2!.y)).toBeCloseTo(0);
		expect(Math.abs(geoToNumber(posP2!.x))).toBeCloseTo(Math.sqrt(3));
	});
});

// ─── Error cases ────────────────────────────────────────────────────────────

describe('intersection error cases', () => {
	it('intersection(point, cercle) throws', () => {
		expect(() =>
			run(
				[
					'O = point(0, 0)',
					'A = point(1, 1)',
					'c = cercle(O, rayon=2)',
					'P = intersection(A, c)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('intersection with too many arguments throws', () => {
		expect(() =>
			run(
				[
					'O = point(0, 0)',
					'A = point(-5, 0)',
					'B = point(5, 0)',
					'd = droite(A, B)',
					'c = cercle(O, rayon=2)',
					'P = intersection(d, c, 1, 2)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});
});
