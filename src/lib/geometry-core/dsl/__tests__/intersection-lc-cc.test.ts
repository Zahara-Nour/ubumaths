import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { runDsl, serializeDsl } from '../index';
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

	it('works with demidroite', () => {
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'A = point(0, 0)',
				'B = point(5, 0)',
				'r = demidroite(A, B)',
				'c = cercle(O, rayon=3)',
				'P = intersection(r, c, 1)'
			].join('\n')
		);
		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
	});

	it('vertical line through circle', () => {
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'A = point(0, -5)',
				'B = point(0, 5)',
				'd = droite(A, B)',
				'c = cercle(O, rayon=3)',
				'P = intersection(d, c, 1)',
				'Q = intersection(d, c, 2)'
			].join('\n')
		);
		const posP = getPos(figure, symbols, 'P');
		const posQ = getPos(figure, symbols, 'Q');
		expect(posP).not.toBeNull();
		expect(posQ).not.toBeNull();
		expect(geoToNumber(posP!.x)).toBeCloseTo(0);
		expect(geoToNumber(posQ!.x)).toBeCloseTo(0);
		expect(Math.abs(geoToNumber(posP!.y))).toBeCloseTo(3);
		expect(Math.abs(geoToNumber(posQ!.y))).toBeCloseTo(3);
	});

	it('diagonal line through off-center circle', () => {
		// Line y=x through circle at (2,2) radius 1
		const { figure, symbols } = run(
			[
				'O = point(2, 2)',
				'A = point(0, 0)',
				'B = point(4, 4)',
				'd = droite(A, B)',
				'c = cercle(O, rayon=1)',
				'P = intersection(d, c, 1)',
				'Q = intersection(d, c, 2)'
			].join('\n')
		);
		const posP = getPos(figure, symbols, 'P');
		const posQ = getPos(figure, symbols, 'Q');
		expect(posP).not.toBeNull();
		expect(posQ).not.toBeNull();
		// Points on y=x, so px == py and qx == qy
		expect(geoToNumber(posP!.x)).toBeCloseTo(geoToNumber(posP!.y));
		expect(geoToNumber(posQ!.x)).toBeCloseTo(geoToNumber(posQ!.y));
		// Distance from center (2,2) should be 1
		const dp = Math.hypot(geoToNumber(posP!.x) - 2, geoToNumber(posP!.y) - 2);
		const dq = Math.hypot(geoToNumber(posQ!.x) - 2, geoToNumber(posQ!.y) - 2);
		expect(dp).toBeCloseTo(1);
		expect(dq).toBeCloseTo(1);
	});

	it('line through center of circle yields diametrically opposite points', () => {
		const { figure, symbols } = run(
			[
				'O = point(3, 4)',
				'A = point(3, 0)',
				'B = point(3, 10)',
				'd = droite(A, B)',
				'c = cercle(O, rayon=5)',
				'P = intersection(d, c, 1)',
				'Q = intersection(d, c, 2)'
			].join('\n')
		);
		const posP = getPos(figure, symbols, 'P');
		const posQ = getPos(figure, symbols, 'Q');
		expect(posP).not.toBeNull();
		expect(posQ).not.toBeNull();
		// Both on x=3, at y = 4±5 → y=-1 and y=9
		expect(geoToNumber(posP!.x)).toBeCloseTo(3);
		expect(geoToNumber(posQ!.x)).toBeCloseTo(3);
		const ys = [geoToNumber(posP!.y), geoToNumber(posQ!.y)].sort((a, b) => a - b);
		expect(ys[0]).toBeCloseTo(-1);
		expect(ys[1]).toBeCloseTo(9);
	});

	it('circleByPoint (passant=) works for LC intersection', () => {
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'E = point(3, 0)',
				'c = cercle(O, passant=E)',
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'P = intersection(d, c, 1)',
				'Q = intersection(d, c, 2)'
			].join('\n')
		);
		const posP = getPos(figure, symbols, 'P');
		const posQ = getPos(figure, symbols, 'Q');
		expect(posP).not.toBeNull();
		expect(posQ).not.toBeNull();
		const xs = [geoToNumber(posP!.x), geoToNumber(posQ!.x)].sort((a, b) => a - b);
		expect(xs[0]).toBeCloseTo(-3);
		expect(xs[1]).toBeCloseTo(3);
	});

	it('index 0 throws error (must be 1 or 2)', () => {
		expect(() =>
			run(
				[
					'O = point(0, 0)',
					'A = point(-5, 0)',
					'B = point(5, 0)',
					'd = droite(A, B)',
					'c = cercle(O, rayon=2)',
					'P = intersection(d, c, 0)'
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

	it('internal tangency: index 1 works, index 2 is null', () => {
		// Circle at (0,0) r=3 contains circle at (1,0) r=2, tangent at (3,0)
		const { figure, symbols } = run(
			[
				'O1 = point(0, 0)',
				'O2 = point(1, 0)',
				'c1 = cercle(O1, rayon=3)',
				'c2 = cercle(O2, rayon=2)',
				'P = intersection(c1, c2, 1)',
				'Q = intersection(c1, c2, 2)'
			].join('\n')
		);
		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
		expect(geoToNumber(posP!.x)).toBeCloseTo(3);
		expect(geoToNumber(posP!.y)).toBeCloseTo(0);
		expect(getPos(figure, symbols, 'Q')).toBeNull();
	});

	it('one circle inside another (no tangency): null', () => {
		const { figure, symbols } = run(
			[
				'O1 = point(0, 0)',
				'O2 = point(0.5, 0)',
				'c1 = cercle(O1, rayon=5)',
				'c2 = cercle(O2, rayon=1)',
				'P = intersection(c1, c2, 1)'
			].join('\n')
		);
		expect(getPos(figure, symbols, 'P')).toBeNull();
	});

	it('identical circles: null (degenerate)', () => {
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'c1 = cercle(O, rayon=2)',
				'c2 = cercle(O, rayon=2)',
				'P = intersection(c1, c2, 1)'
			].join('\n')
		);
		expect(getPos(figure, symbols, 'P')).toBeNull();
	});

	it('circleByPoint (passant=) works for CC intersection', () => {
		const { figure, symbols } = run(
			[
				'O1 = point(0, 0)',
				'O2 = point(2, 0)',
				'E1 = point(2, 0)',
				'E2 = point(0, 0)',
				'c1 = cercle(O1, passant=E1)',
				'c2 = cercle(O2, passant=E2)',
				'P = intersection(c1, c2, 1)',
				'Q = intersection(c1, c2, 2)'
			].join('\n')
		);
		const posP = getPos(figure, symbols, 'P');
		const posQ = getPos(figure, symbols, 'Q');
		expect(posP).not.toBeNull();
		expect(posQ).not.toBeNull();
		// Both circles have radius 2, centers at distance 2 → intersection at x=1, y=±√3
		expect(geoToNumber(posP!.x)).toBeCloseTo(1);
		expect(geoToNumber(posQ!.x)).toBeCloseTo(1);
	});

	it('circles with centers on y-axis', () => {
		const { figure, symbols } = run(
			[
				'O1 = point(0, -1)',
				'O2 = point(0, 1)',
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
		// Radical axis is horizontal (y=0), points at y=0, x=±√3
		expect(geoToNumber(posP!.y)).toBeCloseTo(0);
		expect(geoToNumber(posQ!.y)).toBeCloseTo(0);
		expect(Math.abs(geoToNumber(posP!.x))).toBeCloseTo(Math.sqrt(3));
	});

	it('circles with different radii', () => {
		// Circle at (0,0) r=3 and circle at (4,0) r=2
		// d=4, sum=5, diff=1, so they intersect
		const { figure, symbols } = run(
			[
				'O1 = point(0, 0)',
				'O2 = point(4, 0)',
				'c1 = cercle(O1, rayon=3)',
				'c2 = cercle(O2, rayon=2)',
				'P = intersection(c1, c2, 1)',
				'Q = intersection(c1, c2, 2)'
			].join('\n')
		);
		const posP = getPos(figure, symbols, 'P');
		const posQ = getPos(figure, symbols, 'Q');
		expect(posP).not.toBeNull();
		expect(posQ).not.toBeNull();
		// Verify points are on both circles
		const distP1 = Math.hypot(geoToNumber(posP!.x), geoToNumber(posP!.y));
		const distP2 = Math.hypot(geoToNumber(posP!.x) - 4, geoToNumber(posP!.y));
		expect(distP1).toBeCloseTo(3);
		expect(distP2).toBeCloseTo(2);
	});
});

// ─── Reactivity ─────────────────────────────────────────────────────────────

describe('intersection LC/CC reactivity', () => {
	it('LC intersection updates when circle center moves', () => {
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

	it('LC intersection updates when line endpoint moves', () => {
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

		// Move line to y=1 (still secant)
		const aId = symbols.get('A')!.figureId!;
		const bId = symbols.get('B')!.figureId!;
		figure.movePoint(aId, numeric(-5), numeric(1));
		figure.movePoint(bId, numeric(5), numeric(1));
		figure.recompute();

		const posP = getPos(figure, symbols, 'P');
		const posQ = getPos(figure, symbols, 'Q');
		expect(posP).not.toBeNull();
		expect(posQ).not.toBeNull();
		expect(geoToNumber(posP!.y)).toBeCloseTo(1);
		expect(geoToNumber(posQ!.y)).toBeCloseTo(1);
	});

	it('LC becomes non-intersecting after move → null', () => {
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
		expect(getPos(figure, symbols, 'P')).not.toBeNull();

		// Move line far away
		const aId = symbols.get('A')!.figureId!;
		const bId = symbols.get('B')!.figureId!;
		figure.movePoint(aId, numeric(-5), numeric(10));
		figure.movePoint(bId, numeric(5), numeric(10));
		figure.recompute();

		expect(getPos(figure, symbols, 'P')).toBeNull();
	});

	it('CC intersection updates when a center moves', () => {
		const { figure, symbols } = run(
			[
				'O1 = point(-1, 0)',
				'O2 = point(1, 0)',
				'c1 = cercle(O1, rayon=2)',
				'c2 = cercle(O2, rayon=2)',
				'P = intersection(c1, c2, 1)'
			].join('\n')
		);
		const posP1 = getPos(figure, symbols, 'P');
		expect(posP1).not.toBeNull();

		// Move O2 further away
		const o2Id = symbols.get('O2')!.figureId!;
		figure.movePoint(o2Id, numeric(2), numeric(0));
		figure.recompute();

		const posP2 = getPos(figure, symbols, 'P');
		expect(posP2).not.toBeNull();
		// New intersection of circles at (-1,0) r=2 and (2,0) r=2, distance=3
		// Radical axis at x = (d² + r1² - r2²) / (2d) - 1 = (9+4-4)/6 - 1 = 0.5
		expect(geoToNumber(posP2!.x)).toBeCloseTo(0.5);
	});

	it('CC becomes disjoint after move → null', () => {
		const { figure, symbols } = run(
			[
				'O1 = point(0, 0)',
				'O2 = point(2, 0)',
				'c1 = cercle(O1, rayon=2)',
				'c2 = cercle(O2, rayon=2)',
				'P = intersection(c1, c2, 1)'
			].join('\n')
		);
		expect(getPos(figure, symbols, 'P')).not.toBeNull();

		// Move O2 far away
		const o2Id = symbols.get('O2')!.figureId!;
		figure.movePoint(o2Id, numeric(100), numeric(0));
		figure.recompute();

		expect(getPos(figure, symbols, 'P')).toBeNull();
	});
});

// ─── Serialization roundtrip ────────────────────────────────────────────────

describe('intersection LC/CC serialization roundtrip', () => {
	it('LC roundtrip preserves element count and positions', () => {
		const script = [
			'O = point(0, 0)',
			'A = point(-5, 0)',
			'B = point(5, 0)',
			'd = droite(A, B)',
			'c = cercle(O, rayon=2)',
			'P = intersection(d, c, 1)',
			'Q = intersection(d, c, 2)'
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runDsl(script);
		const serialized = serializeDsl(fig1, sym1);
		const { figure: fig2, symbols: sym2 } = runDsl(serialized);

		expect(fig2.getAllElements().length).toBe(fig1.getAllElements().length);

		const posP1 = fig1.getPosition(sym1.get('P')!.figureId!);
		const posP2 = fig2.getPosition(sym2.get('P')!.figureId!);
		expect(posP1).not.toBeNull();
		expect(posP2).not.toBeNull();
		expect(geoToNumber(posP2!.x)).toBeCloseTo(geoToNumber(posP1!.x));
		expect(geoToNumber(posP2!.y)).toBeCloseTo(geoToNumber(posP1!.y));
	});

	it('CC roundtrip preserves element count and positions', () => {
		const script = [
			'A = point(0, 0)',
			'B = point(2, 0)',
			'c1 = cercle(A, passant=B)',
			'c2 = cercle(B, passant=A)',
			'P = intersection(c1, c2, 1)',
			'Q = intersection(c1, c2, 2)'
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runDsl(script);
		const serialized = serializeDsl(fig1, sym1);
		const { figure: fig2, symbols: sym2 } = runDsl(serialized);

		expect(fig2.getAllElements().length).toBe(fig1.getAllElements().length);

		const posP1 = fig1.getPosition(sym1.get('P')!.figureId!);
		const posP2 = fig2.getPosition(sym2.get('P')!.figureId!);
		expect(posP1).not.toBeNull();
		expect(posP2).not.toBeNull();
		expect(geoToNumber(posP2!.x)).toBeCloseTo(geoToNumber(posP1!.x));
		expect(geoToNumber(posP2!.y)).toBeCloseTo(geoToNumber(posP1!.y));
	});

	it('LC roundtrip with swapped argument order', () => {
		const script = [
			'O = point(0, 0)',
			'A = point(-5, 0)',
			'B = point(5, 0)',
			'd = droite(A, B)',
			'c = cercle(O, rayon=2)',
			'P = intersection(c, d, 1)'
		].join('\n');

		const { figure: fig1, symbols: sym1 } = runDsl(script);
		const serialized = serializeDsl(fig1, sym1);
		// Should re-parse without error
		const { figure: fig2, symbols: sym2 } = runDsl(serialized);
		const posP1 = fig1.getPosition(sym1.get('P')!.figureId!);
		const posP2 = fig2.getPosition(sym2.get('P')!.figureId!);
		expect(posP2).not.toBeNull();
		expect(geoToNumber(posP2!.x)).toBeCloseTo(geoToNumber(posP1!.x));
	});
});

// ─── Complex constructions ──────────────────────────────────────────────────

describe('intersection in complex constructions', () => {
	it('perpendicular bisector via compass construction', () => {
		// Classic ruler-and-compass: find midpoint via 2 circle intersections
		const { figure, symbols } = run(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'c1 = cercle(A, passant=B)',
				'c2 = cercle(B, passant=A)',
				'P = intersection(c1, c2, 1)',
				'Q = intersection(c1, c2, 2)',
				'd = droite(P, Q)'
			].join('\n')
		);
		// P and Q define the perpendicular bisector of AB
		const posP = getPos(figure, symbols, 'P');
		const posQ = getPos(figure, symbols, 'Q');
		expect(posP).not.toBeNull();
		expect(posQ).not.toBeNull();
		// Both on x=2 (midpoint x-coordinate)
		expect(geoToNumber(posP!.x)).toBeCloseTo(2);
		expect(geoToNumber(posQ!.x)).toBeCloseTo(2);
	});

	it('intersection point used as center for another circle', () => {
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'c1 = cercle(O, rayon=3)',
				'P = intersection(d, c1, 1)',
				'c2 = cercle(P, rayon=1)'
			].join('\n')
		);
		// c2 should exist and have its center at P
		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
		const c2El = figure
			.getAllElements()
			.find((e) => e.type === 'circleByRadius' && e.id !== symbols.get('c1')!.figureId);
		expect(c2El).toBeDefined();
	});

	it('chained intersections: LC result used in CC', () => {
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'A = point(-5, 0)',
				'B = point(5, 0)',
				'd = droite(A, B)',
				'c1 = cercle(O, rayon=3)',
				'P = intersection(d, c1, 1)',
				// Circle at P with radius 2
				'c2 = cercle(P, rayon=2)',
				// Intersect c1 and c2
				'Q = intersection(c1, c2, 1)'
			].join('\n')
		);
		const posQ = getPos(figure, symbols, 'Q');
		expect(posQ).not.toBeNull();
		// Q should be on both circles
		const qx = geoToNumber(posQ!.x);
		const qy = geoToNumber(posQ!.y);
		const distO = Math.hypot(qx, qy);
		expect(distO).toBeCloseTo(3); // on c1
	});

	it('hexagon construction via iterated circle intersections', () => {
		// Classic compass hexagon: 6 equally spaced points on a circle
		const { figure, symbols } = run(
			[
				'O = point(0, 0)',
				'A = point(2, 0)',
				'c = cercle(O, passant=A)',
				// First arc: circle at A with same radius → intersect with c
				'c1 = cercle(A, rayon=2)',
				'B = intersection(c, c1, 1)'
			].join('\n')
		);
		const posB = getPos(figure, symbols, 'B');
		expect(posB).not.toBeNull();
		// B should be on the main circle at distance 2 from O
		const dist = Math.hypot(geoToNumber(posB!.x), geoToNumber(posB!.y));
		expect(dist).toBeCloseTo(2);
		// And at distance 2 from A
		const distA = Math.hypot(geoToNumber(posB!.x) - 2, geoToNumber(posB!.y));
		expect(distA).toBeCloseTo(2);
	});

	it('LL intersection still works (non-regression)', () => {
		const { figure, symbols } = run(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(0, 3)',
				'D = point(4, 3)',
				'd1 = droite(A, D)',
				'd2 = droite(B, C)',
				'P = intersection(d1, d2)'
			].join('\n')
		);
		const posP = getPos(figure, symbols, 'P');
		expect(posP).not.toBeNull();
		expect(geoToNumber(posP!.x)).toBeCloseTo(2);
		expect(geoToNumber(posP!.y)).toBeCloseTo(1.5);
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

	it('intersection with single argument throws', () => {
		expect(() =>
			run(
				[
					'O = point(0, 0)',
					'A = point(-5, 0)',
					'B = point(5, 0)',
					'd = droite(A, B)',
					'P = intersection(d)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('intersection(point, point) throws', () => {
		expect(() =>
			run(['A = point(0, 0)', 'B = point(1, 1)', 'P = intersection(A, B)'].join('\n'))
		).toThrow(DslRuntimeError);
	});

	it('intersection(cercle, point) throws', () => {
		expect(() =>
			run(
				[
					'O = point(0, 0)',
					'A = point(1, 1)',
					'c = cercle(O, rayon=2)',
					'P = intersection(c, A)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('intersection(polygone, cercle) throws', () => {
		expect(() =>
			run(
				[
					'A = point(0, 0)',
					'B = point(2, 0)',
					'C = point(1, 2)',
					'p = polygone(A, B, C)',
					'O = point(0, 0)',
					'c = cercle(O, rayon=1)',
					'P = intersection(p, c)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});

	it('intersection(vecteur, cercle) throws', () => {
		expect(() =>
			run(
				[
					'A = point(0, 0)',
					'B = point(2, 0)',
					'v = vecteur(A, B)',
					'O = point(0, 0)',
					'c = cercle(O, rayon=1)',
					'P = intersection(v, c)'
				].join('\n')
			)
		).toThrow(DslRuntimeError);
	});
});
