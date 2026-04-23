import { describe, it, expect } from 'vitest';
import { radians, radiansToDegrees, type Radians, type Vec2, type Box } from '../primitives';

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
	});
});

describe('radiansToDegrees', () => {
	it('radiansToDegrees(Math.PI) returns exactly 180', () => {
		expect(radiansToDegrees(Math.PI as Radians)).toBe(180);
	});

	it('round-trip is exact for multiples of 90', () => {
		for (const deg of [0, 90, 180, 270, 360, -90]) {
			expect(radiansToDegrees(radians(deg))).toBe(deg);
		}
	});

	it('round-trip has negligible float error for other angles', () => {
		for (const deg of [30, 45, 60, 120, -45]) {
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
});

describe('Box', () => {
	it('Box has the expected shape', () => {
		const box: Box = { xMin: -10, xMax: 10, yMin: -5, yMax: 5 };
		expect(box.xMin).toBe(-10);
		expect(box.xMax).toBe(10);
		expect(box.yMin).toBe(-5);
		expect(box.yMax).toBe(5);
	});
});
