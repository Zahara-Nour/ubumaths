import { describe, it, expect } from 'vitest';
import { translate, rotate, reflectPoint, reflectOverLine, dilate } from '../transformations';
import { exact, isExact } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { geoEqual } from '../../compute/compare';
import { geoFromNumber, geoFromFraction } from '../../compute/geo-arithmetic';
import { number, divide, multiply, piConstant } from '$lib/mathAST';
import type { GeoPoint } from '../../types/primitives';

function pt(x: number, y: number): GeoPoint {
	return { x: exact(number(x)), y: exact(number(y)) };
}

// Exact angle: pi/n as MathNode
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
});

// =============================================================================
// rotate
// =============================================================================

describe('rotate', () => {
	it('rotation of 90° (pi/2): (1,0) around origin -> (0,1)', () => {
		const result = rotate(pt(1, 0), pt(0, 0), piOver(2));
		expect(geoToNumber(result.x)).toBeCloseTo(0, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(1, 8);
	});

	it('rotation of 180° (pi): (1,0) around origin -> (-1,0)', () => {
		const result = rotate(pt(1, 0), pt(0, 0), exact(piConstant()));
		expect(geoToNumber(result.x)).toBeCloseTo(-1, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(0, 8);
	});

	it('rotation of 60° (pi/3): (1,0) around origin -> (1/2, sqrt(3)/2)', () => {
		const result = rotate(pt(1, 0), pt(0, 0), piOver(3));
		expect(geoToNumber(result.x)).toBeCloseTo(0.5, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(Math.sqrt(3) / 2, 8);
	});

	it('rotation of 0: point unchanged', () => {
		const result = rotate(pt(3, 4), pt(0, 0), exact(number(0)));
		expect(geoToNumber(result.x)).toBeCloseTo(3, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(4, 8);
	});

	it('rotation around non-origin center', () => {
		// Rotate (3, 0) by 90° around (1, 0) -> (1, 2)
		const result = rotate(pt(3, 0), pt(1, 0), piOver(2));
		expect(geoToNumber(result.x)).toBeCloseTo(1, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(2, 8);
	});

	it('rotation of 360° (2*pi): point unchanged', () => {
		const twoPi = exact(multiply(number(2), piConstant(), 'implicit'));
		const result = rotate(pt(3, 4), pt(0, 0), twoPi);
		expect(geoToNumber(result.x)).toBeCloseTo(3, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(4, 8);
	});

	it('result is exact for remarkable angles', () => {
		const result = rotate(pt(1, 0), pt(0, 0), piOver(2));
		expect(isExact(result.x)).toBe(true);
		expect(isExact(result.y)).toBe(true);
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
		// (3, 4) reflected through (1, 1) -> (2*1-3, 2*1-4) = (-1, -2)
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
	});

	it('double reflection returns to original', () => {
		const p = pt(7, 3);
		const center = pt(2, 5);
		const reflected = reflectPoint(p, center);
		const back = reflectPoint(reflected, center);
		expect(geoEqual(back.x, p.x)).toBe(true);
		expect(geoEqual(back.y, p.y)).toBe(true);
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
		// (3, 1) reflected over y=x -> (1, 3)
		const result = reflectOverLine(pt(3, 1), pt(0, 0), pt(1, 1));
		expect(geoToNumber(result.x)).toBeCloseTo(1, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(3, 8);
	});

	it('point on the line stays on the line', () => {
		const result = reflectOverLine(pt(2, 2), pt(0, 0), pt(1, 1));
		expect(geoToNumber(result.x)).toBeCloseTo(2, 8);
		expect(geoToNumber(result.y)).toBeCloseTo(2, 8);
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

	it('dilates from non-origin center', () => {
		// (4, 0) dilated from (2, 0) with factor 3 -> 2 + 3*(4-2) = 8
		const result = dilate(pt(4, 0), pt(2, 0), geoFromNumber(3));
		expect(geoToNumber(result.x)).toBe(8);
		expect(geoToNumber(result.y)).toBe(0);
	});

	it('factor 1 leaves point unchanged', () => {
		const result = dilate(pt(3, 4), pt(1, 1), geoFromNumber(1));
		expect(geoToNumber(result.x)).toBe(3);
		expect(geoToNumber(result.y)).toBe(4);
	});

	it('result is exact', () => {
		const result = dilate(pt(3, 4), pt(0, 0), geoFromNumber(2));
		expect(isExact(result.x)).toBe(true);
		expect(isExact(result.y)).toBe(true);
	});

	it('factor 0 collapses to center', () => {
		const result = dilate(pt(3, 4), pt(1, 2), geoFromNumber(0));
		expect(geoToNumber(result.x)).toBe(1);
		expect(geoToNumber(result.y)).toBe(2);
	});
});
