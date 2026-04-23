import { describe, it, expect } from 'vitest';
import { translate, rotate, reflectPoint, reflectOverLine, dilate } from '../transformations';
import { exact, numeric, isExact, isNumeric } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { geoEqual } from '../../compute/compare';
import { geoFromNumber, geoFromFraction } from '../../compute/geo-arithmetic';
import { number, divide, multiply, piConstant, opposite } from '$lib/mathAST';
import type { GeoPoint } from '../../types/primitives';

function pt(x: number, y: number): GeoPoint {
	return { x: exact(number(x)), y: exact(number(y)) };
}

function numPt(x: number, y: number): GeoPoint {
	return { x: numeric(x), y: numeric(y) };
}

function piOver(n: number) {
	return exact(divide(piConstant(), number(n), 'fraction'));
}

// =============================================================================
// translate
// =============================================================================

describe('translate', () => {
	it('translates by a vector', () => {
		const result = translate(pt(1, 2), pt(3, 4));
		expect(geoToNumber(result.x)).toBe(4);
		expect(geoToNumber(result.y)).toBe(6);
	});

	it('translates by zero vector', () => {
		const result = translate(pt(5, 7), pt(0, 0));
		expect(geoToNumber(result.x)).toBe(5);
		expect(geoToNumber(result.y)).toBe(7);
	});

	it('translates by negative vector', () => {
		const result = translate(pt(5, 7), pt(-3, -2));
		expect(geoToNumber(result.x)).toBe(2);
		expect(geoToNumber(result.y)).toBe(5);
	});

	it('result is exact when inputs are exact', () => {
		const result = translate(pt(1, 2), pt(3, 4));
		expect(isExact(result.x)).toBe(true);
		expect(isExact(result.y)).toBe(true);
	});

	it('result is numeric when vector is numeric', () => {
		const result = translate(pt(1, 2), numPt(3, 4));
		expect(isNumeric(result.x)).toBe(true);
	});

	it('translates origin by itself stays at origin', () => {
		const result = translate(pt(0, 0), pt(0, 0));
		expect(geoToNumber(result.x)).toBe(0);
		expect(geoToNumber(result.y)).toBe(0);
	});

	it('translate then translate back = identity', () => {
		const p = pt(7, 3);
		const v = pt(5, -2);
		const vBack = pt(-5, 2);
		const result = translate(translate(p, v), vBack);
		expect(geoEqual(result.x, p.x)).toBe(true);
		expect(geoEqual(result.y, p.y)).toBe(true);
	});

	it('translates with fractional vector (exact)', () => {
		const p = pt(0, 0);
		const v: GeoPoint = { x: geoFromFraction(1, 3), y: geoFromFraction(2, 7) };
		const result = translate(p, v);
		expect(isExact(result.x)).toBe(true);
		expect(geoEqual(result.x, geoFromFraction(1, 3))).toBe(true);
	});

	it('translates negative coordinates', () => {
		const result = translate(pt(-10, -20), pt(-5, -5));
		expect(geoToNumber(result.x)).toBe(-15);
		expect(geoToNumber(result.y)).toBe(-25);
	});
});

// =============================================================================
// rotate
// =============================================================================

describe('rotate', () => {
	it('rotation of 90° (pi/2): (1,0) -> (0,1)', () => {
		const result = rotate(pt(1, 0), pt(0, 0), piOver(2));
		expect(geoToNumber(result.x)).toBeCloseTo(0, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(1, 8);
	});

	it('rotation of 180° (pi): (1,0) -> (-1,0)', () => {
		const result = rotate(pt(1, 0), pt(0, 0), exact(piConstant()));
		expect(geoToNumber(result.x)).toBeCloseTo(-1, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(0, 8);
	});

	it('rotation of 270° (3*pi/2): (1,0) -> (0,-1)', () => {
		const angle = exact(
			multiply(divide(number(3), number(2), 'fraction'), piConstant(), 'implicit')
		);
		const result = rotate(pt(1, 0), pt(0, 0), angle);
		expect(geoToNumber(result.x)).toBeCloseTo(0, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(-1, 8);
	});

	it('rotation of 60° (pi/3): (1,0) -> (1/2, sqrt(3)/2)', () => {
		const result = rotate(pt(1, 0), pt(0, 0), piOver(3));
		expect(geoToNumber(result.x)).toBeCloseTo(0.5, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(Math.sqrt(3) / 2, 8);
	});

	it('rotation of 45° (pi/4): (1,0) -> (sqrt(2)/2, sqrt(2)/2)', () => {
		const result = rotate(pt(1, 0), pt(0, 0), piOver(4));
		expect(geoToNumber(result.x)).toBeCloseTo(Math.SQRT2 / 2, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(Math.SQRT2 / 2, 8);
	});

	it('rotation of 30° (pi/6): (1,0) -> (sqrt(3)/2, 1/2)', () => {
		const result = rotate(pt(1, 0), pt(0, 0), piOver(6));
		expect(geoToNumber(result.x)).toBeCloseTo(Math.sqrt(3) / 2, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(0.5, 8);
	});

	it('rotation of 0: point unchanged', () => {
		const result = rotate(pt(3, 4), pt(0, 0), exact(number(0)));
		expect(geoToNumber(result.x)).toBeCloseTo(3, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(4, 8);
	});

	it('rotation of 360° (2*pi): point unchanged', () => {
		const twoPi = exact(multiply(number(2), piConstant(), 'implicit'));
		const result = rotate(pt(3, 4), pt(0, 0), twoPi);
		expect(geoToNumber(result.x)).toBeCloseTo(3, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(4, 8);
	});

	it('rotation around non-origin center', () => {
		// Rotate (3, 0) by 90° around (1, 0) -> (1, 2)
		const result = rotate(pt(3, 0), pt(1, 0), piOver(2));
		expect(geoToNumber(result.x)).toBeCloseTo(1, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(2, 8);
	});

	it('rotating the center itself gives the center', () => {
		const result = rotate(pt(5, 5), pt(5, 5), piOver(3));
		expect(geoToNumber(result.x)).toBeCloseTo(5, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(5, 8);
	});

	it('negative angle rotates clockwise', () => {
		// -90° rotation of (1,0) -> (0,-1)
		const negPiOver2 = exact(opposite(divide(piConstant(), number(2), 'fraction')));
		const result = rotate(pt(1, 0), pt(0, 0), negPiOver2);
		expect(geoToNumber(result.x)).toBeCloseTo(0, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(-1, 8);
	});

	it('four 90° rotations return to original', () => {
		const p = pt(3, 7);
		const center = pt(1, 2);
		let current = p;
		for (let i = 0; i < 4; i++) {
			current = rotate(current, center, piOver(2));
		}
		expect(geoToNumber(current.x)).toBeCloseTo(3, 6);
		expect(geoToNumber(current.y)).toBeCloseTo(7, 6);
	});

	it('rotation preserves distance from center', () => {
		// Distance from (0,0) to (3,4) = 5
		// After rotation, distance should still be 5
		const result = rotate(pt(3, 4), pt(0, 0), piOver(3));
		const dist2 = geoToNumber(result.x) ** 2 + geoToNumber(result.y) ** 2;
		expect(dist2).toBeCloseTo(25, 6);
	});

	it('result is exact for remarkable angles', () => {
		const result = rotate(pt(1, 0), pt(0, 0), piOver(2));
		expect(isExact(result.x)).toBe(true);
		expect(isExact(result.y)).toBe(true);
	});

	it('result is numeric when point is numeric', () => {
		const result = rotate(numPt(1, 0), pt(0, 0), piOver(2));
		expect(isNumeric(result.x)).toBe(true);
	});
});

// =============================================================================
// reflectPoint (central symmetry)
// =============================================================================

describe('reflectPoint', () => {
	it('reflects through origin', () => {
		const result = reflectPoint(pt(3, 4), pt(0, 0));
		expect(geoToNumber(result.x)).toBe(-3);
		expect(geoToNumber(result.y)).toBe(-4);
	});

	it('reflects through non-origin center', () => {
		const result = reflectPoint(pt(3, 4), pt(1, 1));
		expect(geoToNumber(result.x)).toBe(-1);
		expect(geoToNumber(result.y)).toBe(-2);
	});

	it('reflecting a point through itself gives the same point', () => {
		const result = reflectPoint(pt(5, 5), pt(5, 5));
		expect(geoToNumber(result.x)).toBe(5);
		expect(geoToNumber(result.y)).toBe(5);
	});

	it('result is exact', () => {
		const result = reflectPoint(pt(3, 4), pt(0, 0));
		expect(isExact(result.x)).toBe(true);
		expect(isExact(result.y)).toBe(true);
	});

	it('double reflection returns to original', () => {
		const p = pt(7, 3);
		const center = pt(2, 5);
		const reflected = reflectPoint(p, center);
		const back = reflectPoint(reflected, center);
		expect(geoEqual(back.x, p.x)).toBe(true);
		expect(geoEqual(back.y, p.y)).toBe(true);
	});

	it('midpoint of point and its reflection is the center', () => {
		const p = pt(8, 6);
		const center = pt(3, 1);
		const reflected = reflectPoint(p, center);
		const midX = (geoToNumber(p.x) + geoToNumber(reflected.x)) / 2;
		const midY = (geoToNumber(p.y) + geoToNumber(reflected.y)) / 2;
		expect(midX).toBe(3);
		expect(midY).toBe(1);
	});

	it('reflects origin through a center', () => {
		const result = reflectPoint(pt(0, 0), pt(3, 4));
		expect(geoToNumber(result.x)).toBe(6);
		expect(geoToNumber(result.y)).toBe(8);
	});

	it('reflects negative coordinates', () => {
		const result = reflectPoint(pt(-3, -4), pt(0, 0));
		expect(geoToNumber(result.x)).toBe(3);
		expect(geoToNumber(result.y)).toBe(4);
	});

	it('central symmetry = rotation of 180°', () => {
		const p = pt(5, 2);
		const center = pt(1, 1);
		const reflected = reflectPoint(p, center);
		const rotated = rotate(p, center, exact(piConstant()));
		expect(geoToNumber(reflected.x)).toBeCloseTo(geoToNumber(rotated.x), 8);
		expect(geoToNumber(reflected.y)).toBeCloseTo(geoToNumber(rotated.y), 8);
	});

	it('central symmetry = dilate with factor -1', () => {
		const p = pt(5, 2);
		const center = pt(1, 1);
		const reflected = reflectPoint(p, center);
		const dilated = dilate(p, center, geoFromNumber(-1));
		expect(geoEqual(reflected.x, dilated.x)).toBe(true);
		expect(geoEqual(reflected.y, dilated.y)).toBe(true);
	});
});

// =============================================================================
// reflectOverLine (axial symmetry)
// =============================================================================

describe('reflectOverLine', () => {
	it('reflects over horizontal axis (y=0)', () => {
		const result = reflectOverLine(pt(3, 4), pt(0, 0), pt(1, 0));
		expect(geoToNumber(result.x)).toBe(3);
		expect(geoToNumber(result.y)).toBe(-4);
	});

	it('reflects over vertical axis (x=0)', () => {
		const result = reflectOverLine(pt(3, 4), pt(0, 0), pt(0, 1));
		expect(geoToNumber(result.x)).toBe(-3);
		expect(geoToNumber(result.y)).toBe(4);
	});

	it('reflects over y=x diagonal', () => {
		const result = reflectOverLine(pt(3, 1), pt(0, 0), pt(1, 1));
		expect(geoToNumber(result.x)).toBeCloseTo(1, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(3, 8);
	});

	it('reflects over y=-x diagonal', () => {
		// (3, 1) reflected over y=-x -> (-1, -3)
		const result = reflectOverLine(pt(3, 1), pt(0, 0), pt(1, -1));
		expect(geoToNumber(result.x)).toBeCloseTo(-1, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(-3, 8);
	});

	it('point on the line stays on the line', () => {
		const result = reflectOverLine(pt(2, 2), pt(0, 0), pt(1, 1));
		expect(geoToNumber(result.x)).toBeCloseTo(2, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(2, 8);
	});

	it('point on a non-trivial line stays', () => {
		// Point (2, 3) on line through (0, 1) and (2, 3)
		const result = reflectOverLine(pt(2, 3), pt(0, 1), pt(2, 3));
		expect(geoToNumber(result.x)).toBeCloseTo(2, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(3, 8);
	});

	it('result is exact', () => {
		const result = reflectOverLine(pt(3, 4), pt(0, 0), pt(1, 0));
		expect(isExact(result.x)).toBe(true);
		expect(isExact(result.y)).toBe(true);
	});

	it('double reflection returns to original', () => {
		const p = pt(7, 3);
		const l1 = pt(1, 0);
		const l2 = pt(2, 3);
		const reflected = reflectOverLine(p, l1, l2);
		const back = reflectOverLine(reflected, l1, l2);
		expect(geoToNumber(back.x)).toBeCloseTo(7, 8);
		expect(geoToNumber(back.y)).toBeCloseTo(3, 8);
	});

	it('distance to line is preserved', () => {
		// Point and its reflection are equidistant from the line
		const p = pt(4, 5);
		const l1 = pt(0, 0);
		const l2 = pt(1, 0);
		const reflected = reflectOverLine(p, l1, l2);
		// Line is y=0, so distances are |y| values
		expect(Math.abs(geoToNumber(reflected.y))).toBeCloseTo(Math.abs(geoToNumber(p.y)), 8);
	});

	it('reflection over line not through origin', () => {
		// Reflect (0, 0) over line y=2 (through (0,2) and (1,2))
		// Result should be (0, 4)
		const result = reflectOverLine(pt(0, 0), pt(0, 2), pt(1, 2));
		expect(geoToNumber(result.x)).toBeCloseTo(0, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(4, 8);
	});

	it('reflection over vertical line not at origin', () => {
		// Reflect (0, 0) over line x=3 (through (3,0) and (3,1))
		// Result should be (6, 0)
		const result = reflectOverLine(pt(0, 0), pt(3, 0), pt(3, 1));
		expect(geoToNumber(result.x)).toBeCloseTo(6, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(0, 8);
	});

	it('midpoint of point and reflection lies on the line', () => {
		const p = pt(5, 7);
		const l1 = pt(1, 1);
		const l2 = pt(3, 2);
		const reflected = reflectOverLine(p, l1, l2);
		// Midpoint
		const mx = (geoToNumber(p.x) + geoToNumber(reflected.x)) / 2;
		const my = (geoToNumber(p.y) + geoToNumber(reflected.y)) / 2;
		// Check midpoint is on the line: (m - l1) x (l2 - l1) = 0
		const cross =
			(mx - geoToNumber(l1.x)) * (geoToNumber(l2.y) - geoToNumber(l1.y)) -
			(my - geoToNumber(l1.y)) * (geoToNumber(l2.x) - geoToNumber(l1.x));
		expect(cross).toBeCloseTo(0, 8);
	});
});

// =============================================================================
// dilate (homothety)
// =============================================================================

describe('dilate', () => {
	it('dilates from origin with factor 2', () => {
		const result = dilate(pt(3, 4), pt(0, 0), geoFromNumber(2));
		expect(geoToNumber(result.x)).toBe(6);
		expect(geoToNumber(result.y)).toBe(8);
	});

	it('dilates with factor 1/2', () => {
		const result = dilate(pt(6, 8), pt(0, 0), geoFromFraction(1, 2));
		expect(geoToNumber(result.x)).toBeCloseTo(3, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(4, 8);
	});

	it('dilates with factor -1 (same as central symmetry)', () => {
		const result = dilate(pt(3, 4), pt(0, 0), geoFromNumber(-1));
		expect(geoToNumber(result.x)).toBe(-3);
		expect(geoToNumber(result.y)).toBe(-4);
	});

	it('dilates with factor -2 (reflect + scale)', () => {
		const result = dilate(pt(1, 0), pt(0, 0), geoFromNumber(-2));
		expect(geoToNumber(result.x)).toBe(-2);
		expect(geoToNumber(result.y)).toBe(0);
	});

	it('dilates from non-origin center', () => {
		const result = dilate(pt(4, 0), pt(2, 0), geoFromNumber(3));
		expect(geoToNumber(result.x)).toBe(8);
		expect(geoToNumber(result.y)).toBe(0);
	});

	it('factor 1 leaves point unchanged', () => {
		const result = dilate(pt(3, 4), pt(1, 1), geoFromNumber(1));
		expect(geoToNumber(result.x)).toBe(3);
		expect(geoToNumber(result.y)).toBe(4);
	});

	it('factor 0 collapses to center', () => {
		const result = dilate(pt(3, 4), pt(1, 2), geoFromNumber(0));
		expect(geoToNumber(result.x)).toBe(1);
		expect(geoToNumber(result.y)).toBe(2);
	});

	it('result is exact', () => {
		const result = dilate(pt(3, 4), pt(0, 0), geoFromNumber(2));
		expect(isExact(result.x)).toBe(true);
		expect(isExact(result.y)).toBe(true);
	});

	it('dilate with exact fraction factor', () => {
		const result = dilate(pt(9, 6), pt(0, 0), geoFromFraction(1, 3));
		expect(isExact(result.x)).toBe(true);
		expect(geoEqual(result.x, geoFromNumber(3))).toBe(true);
		expect(geoEqual(result.y, geoFromNumber(2))).toBe(true);
	});

	it('dilate center point gives center', () => {
		const center = pt(5, 5);
		const result = dilate(center, center, geoFromNumber(100));
		expect(geoToNumber(result.x)).toBe(5);
		expect(geoToNumber(result.y)).toBe(5);
	});

	it('dilate preserves alignment (collinearity)', () => {
		// Points (0,0), (1,1), (2,2) are collinear
		// After dilation factor 3 from origin, still collinear: (0,0), (3,3), (6,6)
		const center = pt(0, 0);
		const factor = geoFromNumber(3);
		const a = dilate(pt(0, 0), center, factor);
		const b = dilate(pt(1, 1), center, factor);
		const c = dilate(pt(2, 2), center, factor);
		// Cross product (b-a) x (c-a) should be 0
		const cross =
			(geoToNumber(b.x) - geoToNumber(a.x)) * (geoToNumber(c.y) - geoToNumber(a.y)) -
			(geoToNumber(b.y) - geoToNumber(a.y)) * (geoToNumber(c.x) - geoToNumber(a.x));
		expect(cross).toBeCloseTo(0, 8);
	});

	it('two successive dilations = single dilation with product factor', () => {
		const p = pt(6, 8);
		const center = pt(1, 1);
		const d1 = dilate(p, center, geoFromNumber(2));
		const d2 = dilate(d1, center, geoFromNumber(3));
		const d6 = dilate(p, center, geoFromNumber(6));
		expect(geoToNumber(d2.x)).toBeCloseTo(geoToNumber(d6.x), 8);
		expect(geoToNumber(d2.y)).toBeCloseTo(geoToNumber(d6.y), 8);
	});
});

// =============================================================================
// Cross-transformation properties
// =============================================================================

describe('cross-transformation properties', () => {
	it('translation commutes: T(v1) then T(v2) = T(v2) then T(v1)', () => {
		const p = pt(1, 1);
		const v1 = pt(3, 0);
		const v2 = pt(0, 4);
		const r1 = translate(translate(p, v1), v2);
		const r2 = translate(translate(p, v2), v1);
		expect(geoEqual(r1.x, r2.x)).toBe(true);
		expect(geoEqual(r1.y, r2.y)).toBe(true);
	});

	it('reflection over x-axis then y-axis = rotation 180°', () => {
		const p = pt(3, 4);
		const xAxis1 = pt(0, 0);
		const xAxis2 = pt(1, 0);
		const yAxis1 = pt(0, 0);
		const yAxis2 = pt(0, 1);
		const r1 = reflectOverLine(reflectOverLine(p, xAxis1, xAxis2), yAxis1, yAxis2);
		const r2 = rotate(p, pt(0, 0), exact(piConstant()));
		expect(geoToNumber(r1.x)).toBeCloseTo(geoToNumber(r2.x), 8);
		expect(geoToNumber(r1.y)).toBeCloseTo(geoToNumber(r2.y), 8);
	});

	it('dilate factor 1 = identity, factor -1 = central symmetry', () => {
		const p = pt(4, 7);
		const center = pt(2, 3);
		const id = dilate(p, center, geoFromNumber(1));
		const sym = dilate(p, center, geoFromNumber(-1));
		const ref = reflectPoint(p, center);
		expect(geoEqual(id.x, p.x)).toBe(true);
		expect(geoEqual(id.y, p.y)).toBe(true);
		expect(geoEqual(sym.x, ref.x)).toBe(true);
		expect(geoEqual(sym.y, ref.y)).toBe(true);
	});
});
