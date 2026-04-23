import { describe, it, expect } from 'vitest';
import { Figure } from '../figure';
import { exact, numeric, isExact } from '../../types/geo-value';
import { geoToNumber } from '../../compute/to-number';
import { geoFromNumber, geoFromFraction } from '../../compute/geo-arithmetic';
import { number, divide, piConstant } from '$lib/mathAST';
import type { GeoPoint } from '../../types/primitives';

function pt(x: number, y: number): GeoPoint {
	return { x: exact(number(x)), y: exact(number(y)) };
}

function piOver(n: number) {
	return exact(divide(piConstant(), number(n), 'fraction'));
}

// =============================================================================
// createRotatedPoint
// =============================================================================

describe('createRotatedPoint', () => {
	it('rotates a point 90° around origin', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(1, 0));
		const center = f.createFreePoint(pt(0, 0));
		const rotated = f.createRotatedPoint(p, center, piOver(2));

		const pos = f.getPosition(rotated)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(0, 8);
		expect(geoToNumber(pos.y)).toBeCloseTo(1, 8);
	});

	it('exact for remarkable angles', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(1, 0));
		const center = f.createFreePoint(pt(0, 0));
		const rotated = f.createRotatedPoint(p, center, piOver(2));

		expect(isExact(f.getPosition(rotated)!.x)).toBe(true);
	});

	it('follows when source is dragged', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(1, 0));
		const center = f.createFreePoint(pt(0, 0));
		const rotated = f.createRotatedPoint(p, center, piOver(2));

		f.movePoint(p, numeric(2), numeric(0));
		f.recompute();

		const pos = f.getPosition(rotated)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(0, 8);
		expect(geoToNumber(pos.y)).toBeCloseTo(2, 8);
	});

	it('follows when center is dragged', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 0));
		const center = f.createFreePoint(pt(1, 0));
		const rotated = f.createRotatedPoint(p, center, piOver(2));

		// (3,0) rotated 90° around (1,0) -> (1, 2)
		expect(geoToNumber(f.getPosition(rotated)!.x)).toBeCloseTo(1, 8);
		expect(geoToNumber(f.getPosition(rotated)!.y)).toBeCloseTo(2, 8);

		f.movePoint(center, numeric(0), numeric(0));
		f.recompute();
		// (3,0) rotated 90° around (0,0) -> (0, 3)
		expect(geoToNumber(f.getPosition(rotated)!.x)).toBeCloseTo(0, 8);
		expect(geoToNumber(f.getPosition(rotated)!.y)).toBeCloseTo(3, 8);
	});

	it('validates point-like inputs', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const seg = f.createSegment(a, b);
		expect(() => f.createRotatedPoint(seg, a, piOver(2))).toThrow('not a point');
	});

	it('cascade: removing source removes rotated point', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(1, 0));
		const center = f.createFreePoint(pt(0, 0));
		const rotated = f.createRotatedPoint(p, center, piOver(2));

		f.remove(p);
		expect(f.getElementById(rotated)).toBeUndefined();
	});
});

// =============================================================================
// createTranslatedPoint
// =============================================================================

describe('createTranslatedPoint', () => {
	it('translates a point by a vector', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(1, 1));
		const vs = f.createFreePoint(pt(0, 0));
		const ve = f.createFreePoint(pt(3, 4));
		const translated = f.createTranslatedPoint(p, vs, ve);

		// vector = (3,4), so (1,1) + (3,4) = (4, 5)
		const pos = f.getPosition(translated)!;
		expect(geoToNumber(pos.x)).toBe(4);
		expect(geoToNumber(pos.y)).toBe(5);
	});

	it('follows when source is dragged', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(0, 0));
		const vs = f.createFreePoint(pt(0, 0));
		const ve = f.createFreePoint(pt(2, 3));
		const translated = f.createTranslatedPoint(p, vs, ve);

		f.movePoint(p, numeric(5), numeric(5));
		f.recompute();

		const pos = f.getPosition(translated)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(7, 8);
		expect(geoToNumber(pos.y)).toBeCloseTo(8, 8);
	});

	it('follows when vector endpoint is dragged', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(1, 1));
		const vs = f.createFreePoint(pt(0, 0));
		const ve = f.createFreePoint(pt(3, 4));
		const translated = f.createTranslatedPoint(p, vs, ve);

		f.movePoint(ve, numeric(0), numeric(0));
		f.recompute();
		// vector = (0,0), so (1,1) + (0,0) = (1,1)
		expect(geoToNumber(f.getPosition(translated)!.x)).toBeCloseTo(1, 8);
	});

	it('validates point-like inputs', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const seg = f.createSegment(a, b);
		expect(() => f.createTranslatedPoint(seg, a, b)).toThrow('not a point');
	});

	it('throws for duplicate IDs', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		expect(() => f.createTranslatedPoint(a, a, b)).toThrow('distinct');
		expect(() => f.createTranslatedPoint(a, b, a)).toThrow('distinct');
		expect(() => f.createTranslatedPoint(a, b, b)).toThrow('distinct');
	});
});

// =============================================================================
// createDilatedPoint
// =============================================================================

describe('createDilatedPoint', () => {
	it('dilates a point from origin', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		const center = f.createFreePoint(pt(0, 0));
		const dilated = f.createDilatedPoint(p, center, geoFromNumber(2));

		const pos = f.getPosition(dilated)!;
		expect(geoToNumber(pos.x)).toBe(6);
		expect(geoToNumber(pos.y)).toBe(8);
	});

	it('follows when source is dragged', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		const center = f.createFreePoint(pt(0, 0));
		const dilated = f.createDilatedPoint(p, center, geoFromNumber(2));

		f.movePoint(p, numeric(1), numeric(1));
		f.recompute();
		expect(geoToNumber(f.getPosition(dilated)!.x)).toBeCloseTo(2, 8);
		expect(geoToNumber(f.getPosition(dilated)!.y)).toBeCloseTo(2, 8);
	});

	it('follows when center is dragged', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 0));
		const center = f.createFreePoint(pt(0, 0));
		const dilated = f.createDilatedPoint(p, center, geoFromNumber(2));

		expect(geoToNumber(f.getPosition(dilated)!.x)).toBe(6);

		f.movePoint(center, numeric(1), numeric(0));
		f.recompute();
		// center=(1,0), source=(3,0), factor=2 -> 1 + 2*(3-1) = 5
		expect(geoToNumber(f.getPosition(dilated)!.x)).toBeCloseTo(5, 8);
		expect(geoToNumber(f.getPosition(dilated)!.y)).toBeCloseTo(0, 8);
	});

	it('factor -1 = central symmetry', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		const center = f.createFreePoint(pt(0, 0));
		const dilated = f.createDilatedPoint(p, center, geoFromNumber(-1));

		const pos = f.getPosition(dilated)!;
		expect(geoToNumber(pos.x)).toBe(-3);
		expect(geoToNumber(pos.y)).toBe(-4);
	});

	it('factor 1/2', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(6, 8));
		const center = f.createFreePoint(pt(0, 0));
		const dilated = f.createDilatedPoint(p, center, geoFromFraction(1, 2));

		const pos = f.getPosition(dilated)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(3, 8);
		expect(geoToNumber(pos.y)).toBeCloseTo(4, 8);
	});

	it('validates point-like inputs', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const seg = f.createSegment(a, b);
		expect(() => f.createDilatedPoint(seg, a, geoFromNumber(2))).toThrow('not a point');
	});
});

// =============================================================================
// createReflectedOverLine
// =============================================================================

describe('createReflectedOverLine', () => {
	it('reflects over horizontal axis', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		const l1 = f.createFreePoint(pt(0, 0));
		const l2 = f.createFreePoint(pt(1, 0));
		const reflected = f.createReflectedOverLine(p, l1, l2);

		const pos = f.getPosition(reflected)!;
		expect(geoToNumber(pos.x)).toBe(3);
		expect(geoToNumber(pos.y)).toBe(-4);
	});

	it('reflects over y=x diagonal', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 1));
		const l1 = f.createFreePoint(pt(0, 0));
		const l2 = f.createFreePoint(pt(1, 1));
		const reflected = f.createReflectedOverLine(p, l1, l2);

		const pos = f.getPosition(reflected)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(1, 8);
		expect(geoToNumber(pos.y)).toBeCloseTo(3, 8);
	});

	it('follows when source is dragged', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		const l1 = f.createFreePoint(pt(0, 0));
		const l2 = f.createFreePoint(pt(1, 0));
		const reflected = f.createReflectedOverLine(p, l1, l2);

		f.movePoint(p, numeric(0), numeric(5));
		f.recompute();
		expect(geoToNumber(f.getPosition(reflected)!.y)).toBeCloseTo(-5, 8);
	});

	it('follows when line point is dragged', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(0, 4));
		const l1 = f.createFreePoint(pt(0, 0));
		const l2 = f.createFreePoint(pt(1, 0));
		const reflected = f.createReflectedOverLine(p, l1, l2);

		// Initially: (0, 4) reflected over y=0 -> (0, -4)
		expect(geoToNumber(f.getPosition(reflected)!.y)).toBe(-4);

		// Move l2 to make line y=x
		f.movePoint(l2, numeric(1), numeric(1));
		f.recompute();
		// (0, 4) reflected over y=x -> (4, 0)
		expect(geoToNumber(f.getPosition(reflected)!.x)).toBeCloseTo(4, 8);
		expect(geoToNumber(f.getPosition(reflected)!.y)).toBeCloseTo(0, 8);
	});

	it('throws for same point as both line endpoints', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		const l1 = f.createFreePoint(pt(1, 1));
		expect(() => f.createReflectedOverLine(p, l1, l1)).toThrow('distinct');
	});

	it('clears position when line becomes degenerate at runtime', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(3, 4));
		const l1 = f.createFreePoint(pt(0, 0));
		const l2 = f.createFreePoint(pt(1, 0));
		const reflected = f.createReflectedOverLine(p, l1, l2);

		expect(f.getPosition(reflected)).not.toBeNull();

		// Move l2 to coincide with l1 — line becomes degenerate
		f.movePoint(l2, numeric(0), numeric(0));
		f.recompute();
		expect(f.getPosition(reflected)).toBeNull();
	});

	it('validates point-like inputs', () => {
		const f = new Figure();
		const a = f.createFreePoint(pt(0, 0));
		const b = f.createFreePoint(pt(1, 0));
		const seg = f.createSegment(a, b);
		expect(() => f.createReflectedOverLine(seg, a, b)).toThrow('not a point');
	});

	it('double reflection = identity', () => {
		const f = new Figure();
		const p = f.createFreePoint(pt(5, 3));
		const l1 = f.createFreePoint(pt(1, 0));
		const l2 = f.createFreePoint(pt(2, 3));
		const r1 = f.createReflectedOverLine(p, l1, l2);
		const r2 = f.createReflectedOverLine(r1, l1, l2);

		const pos = f.getPosition(r2)!;
		expect(geoToNumber(pos.x)).toBeCloseTo(5, 6);
		expect(geoToNumber(pos.y)).toBeCloseTo(3, 6);
	});
});
