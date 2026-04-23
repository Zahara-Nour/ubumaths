import { describe, it, expect } from 'vitest';
import { radians, radiansToDegrees, type Radians, type Vec2, type Box } from '../primitives';
import type { GeoValue } from '../geo-value';

describe('Radians branded type', () => {
	it('radians(180) returns exactly Math.PI', () => {
		expect(radians(180)).toBe(Math.PI);
	});

	it('radians(0) returns 0', () => {
		expect(radians(0)).toBe(0);
	});

	it('radians(90) returns exactly pi/2', () => {
		expect(radians(90)).toBe(Math.PI / 2);
	});

	it('radians(360) returns exactly 2*pi', () => {
		expect(radians(360)).toBe(2 * Math.PI);
	});

	it('radians handles negative degrees', () => {
		expect(radians(-90)).toBe(-Math.PI / 2);
		expect(radians(-180)).toBe(-Math.PI);
	});

	it('radians handles large angles (> 360)', () => {
		expect(radians(720)).toBe(4 * Math.PI);
	});

	it('radians handles very small angles', () => {
		expect(radians(0.001)).toBe((0.001 * Math.PI) / 180);
	});
});

describe('radiansToDegrees', () => {
	it('radiansToDegrees(Math.PI) returns exactly 180', () => {
		expect(radiansToDegrees(Math.PI as Radians)).toBe(180);
	});

	it('radiansToDegrees(0) returns 0', () => {
		expect(radiansToDegrees(0 as Radians)).toBe(0);
	});

	it('round-trip is exact for multiples of 90', () => {
		for (const deg of [0, 90, 180, 270, 360, -90, -180, -270, -360]) {
			expect(radiansToDegrees(radians(deg))).toBe(deg);
		}
	});

	it('round-trip has negligible float error for other angles', () => {
		for (const deg of [1, 15, 30, 45, 60, 120, 150, -30, -45, -60, 359]) {
			const roundTrip = radiansToDegrees(radians(deg));
			expect(Math.abs(roundTrip - deg)).toBeLessThan(1e-13);
		}
	});
});

describe('Vec2', () => {
	it('Vec2<number> represents a numeric 2D point', () => {
		const p: Vec2<number> = { x: 3, y: 4 };
		expect(p.x).toBe(3);
		expect(p.y).toBe(4);
	});

	it('Vec2 defaults to number', () => {
		const p: Vec2 = { x: 1.5, y: -2.5 };
		expect(p.x).toBe(1.5);
	});

	it('Vec2<GeoValue> can hold mixed exact/numeric', () => {
		// Just a type-level check — compiles if correct
		const _p: Vec2<GeoValue> = {
			x: { kind: 'exact', node: { type: 'number', value: '1' } as never },
			y: { kind: 'numeric', value: 2 }
		};
		expect(_p.x.kind).toBe('exact');
		expect(_p.y.kind).toBe('numeric');
	});
});

describe('Box', () => {
	it('Box has the expected shape', () => {
		const box: Box = { xMin: -10, xMax: 10, yMin: -5, yMax: 5 };
		expect(box.xMin).toBe(-10);
		expect(box.xMax).toBe(10);
		expect(box.yMin).toBe(-5);
		expect(box.yMax).toBe(5);
	});

	it('Box can represent a zero-area point', () => {
		const box: Box = { xMin: 5, xMax: 5, yMin: 3, yMax: 3 };
		expect(box.xMax - box.xMin).toBe(0);
	});

	it('Box can have negative coordinates', () => {
		const box: Box = { xMin: -100, xMax: -50, yMin: -200, yMax: -100 };
		expect(box.xMax - box.xMin).toBe(50);
	});
});
