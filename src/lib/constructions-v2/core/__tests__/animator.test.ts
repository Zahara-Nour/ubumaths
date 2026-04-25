import { describe, it, expect } from 'vitest';
import {
	partialSegment,
	partialCircle,
	partialArc,
	interpolate,
	easeWithFixedRamp
} from '../animator';

describe('animator — partialSegment', () => {
	const p1 = { x: 0, y: 0 };
	const p2 = { x: 10, y: 6 };

	it('progress=0 returns p1', () => {
		const result = partialSegment(p1, p2, 0);
		expect(result.x).toBeCloseTo(0);
		expect(result.y).toBeCloseTo(0);
	});

	it('progress=1 returns p2', () => {
		const result = partialSegment(p1, p2, 1);
		expect(result.x).toBeCloseTo(10);
		expect(result.y).toBeCloseTo(6);
	});

	it('progress=0.5 returns midpoint', () => {
		const result = partialSegment(p1, p2, 0.5);
		expect(result.x).toBeCloseTo(5);
		expect(result.y).toBeCloseTo(3);
	});

	it('progress=0.25 returns quarter point', () => {
		const result = partialSegment(p1, p2, 0.25);
		expect(result.x).toBeCloseTo(2.5);
		expect(result.y).toBeCloseTo(1.5);
	});

	it('clamps progress below 0', () => {
		const result = partialSegment(p1, p2, -0.5);
		expect(result.x).toBeCloseTo(0);
		expect(result.y).toBeCloseTo(0);
	});

	it('clamps progress above 1', () => {
		const result = partialSegment(p1, p2, 1.5);
		expect(result.x).toBeCloseTo(10);
		expect(result.y).toBeCloseTo(6);
	});
});

describe('animator — partialCircle', () => {
	it('progress=0 returns 0 degrees', () => {
		expect(partialCircle(0)).toBe(0);
	});

	it('progress=0.5 returns 180 degrees', () => {
		expect(partialCircle(0.5)).toBeCloseTo(180);
	});

	it('progress=1 returns 360 degrees', () => {
		expect(partialCircle(1)).toBeCloseTo(360);
	});

	it('clamps below 0', () => {
		expect(partialCircle(-0.1)).toBe(0);
	});

	it('clamps above 1', () => {
		expect(partialCircle(1.5)).toBeCloseTo(360);
	});
});

describe('animator — partialArc', () => {
	it('progress=0 returns 0', () => {
		expect(partialArc(90, 0)).toBe(0);
	});

	it('progress=1 returns full sweep', () => {
		expect(partialArc(90, 1)).toBeCloseTo(90);
	});

	it('progress=0.5 returns half sweep', () => {
		expect(partialArc(120, 0.5)).toBeCloseTo(60);
	});

	it('works with negative sweep angles', () => {
		expect(partialArc(-90, 0.5)).toBeCloseTo(-45);
	});
});

describe('animator — interpolate', () => {
	it('progress=0 returns start', () => {
		expect(interpolate(10, 50, 0)).toBe(10);
	});

	it('progress=1 returns end', () => {
		expect(interpolate(10, 50, 1)).toBe(50);
	});

	it('progress=0.5 returns midpoint', () => {
		expect(interpolate(10, 50, 0.5)).toBeCloseTo(30);
	});
});

describe('animator — easeWithFixedRamp', () => {
	it('returns 0 at t=0', () => {
		expect(easeWithFixedRamp(0, 0.2)).toBeCloseTo(0);
	});

	it('returns 1 at t=1', () => {
		expect(easeWithFixedRamp(1, 0.2)).toBeCloseTo(1);
	});

	it('is monotonically increasing', () => {
		const rampRatio = 0.15;
		let prev = 0;
		for (let t = 0.01; t <= 1; t += 0.01) {
			const val = easeWithFixedRamp(t, rampRatio);
			expect(val).toBeGreaterThanOrEqual(prev);
			prev = val;
		}
	});

	it('falls back to easeInOut when rampRatio >= 0.5', () => {
		for (let t = 0; t <= 1; t += 0.1) {
			expect(easeWithFixedRamp(t, 0.5)).toBeCloseTo(t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
		}
	});

	it('has linear cruise phase in the middle', () => {
		const rampRatio = 0.1;
		// In cruise phase (between 0.1 and 0.9), should be linear
		const v1 = easeWithFixedRamp(0.3, rampRatio);
		const v2 = easeWithFixedRamp(0.5, rampRatio);
		const v3 = easeWithFixedRamp(0.7, rampRatio);
		// Equal spacing in t should give equal spacing in output
		expect(v3 - v2).toBeCloseTo(v2 - v1, 5);
	});
});
