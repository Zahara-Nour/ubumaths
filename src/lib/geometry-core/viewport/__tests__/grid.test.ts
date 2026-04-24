import { describe, it, expect } from 'vitest';
import { computeGridStep } from '../grid';

describe('computeGridStep', () => {
	// ─── 1-2-5 sequence ───────────────────────────────────────────

	it('returns a major step from the 1-2-5 sequence', () => {
		const validSteps = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
		for (const ppu of [5, 10, 20, 40, 60, 100, 150, 200]) {
			const { major } = computeGridStep(ppu);
			expect(validSteps).toContain(major);
		}
	});

	it('minor is always major / 5', () => {
		for (const ppu of [5, 10, 20, 40, 80, 120, 200]) {
			const { major, minor } = computeGridStep(ppu);
			expect(minor).toBeCloseTo(major / 5, 10);
		}
	});

	// ─── Visual spacing constraint ────────────────────────────────

	it('major grid spacing in pixels is between 40 and 200', () => {
		for (const ppu of [5, 8, 10, 15, 20, 30, 40, 60, 80, 100, 120, 150, 200]) {
			const { major } = computeGridStep(ppu);
			const spacingPx = major * ppu;
			expect(spacingPx).toBeGreaterThanOrEqual(40);
			expect(spacingPx).toBeLessThanOrEqual(200);
		}
	});

	// ─── Specific zoom levels ─────────────────────────────────────

	it('default zoom (40 ppu) gives step = 2', () => {
		const { major } = computeGridStep(40);
		expect(major).toBe(2);
	});

	it('zoomed in (100 ppu) gives step <= 1', () => {
		const { major } = computeGridStep(100);
		expect(major).toBeLessThanOrEqual(1);
	});

	it('zoomed out (10 ppu) gives step >= 2', () => {
		const { major } = computeGridStep(10);
		expect(major).toBeGreaterThanOrEqual(2);
	});

	it('extreme zoom in (200 ppu) still gives valid spacing', () => {
		const { major } = computeGridStep(200);
		const spacingPx = major * 200;
		expect(spacingPx).toBeGreaterThanOrEqual(40);
		expect(spacingPx).toBeLessThanOrEqual(200);
	});

	it('extreme zoom out (5 ppu) still gives valid spacing', () => {
		const { major } = computeGridStep(5);
		const spacingPx = major * 5;
		expect(spacingPx).toBeGreaterThanOrEqual(40);
		expect(spacingPx).toBeLessThanOrEqual(200);
	});

	// ─── Monotonicity ─────────────────────────────────────────────

	it('major step decreases or stays as pixelsPerUnit increases', () => {
		let prev = computeGridStep(5).major;
		for (const ppu of [10, 20, 40, 80, 120, 200]) {
			const { major } = computeGridStep(ppu);
			expect(major).toBeLessThanOrEqual(prev);
			prev = major;
		}
	});

	// ─── Edge cases ───────────────────────────────────────────────

	it('handles fractional pixelsPerUnit', () => {
		const { major } = computeGridStep(7.5);
		expect(major).toBeGreaterThan(0);
		const spacingPx = major * 7.5;
		expect(spacingPx).toBeGreaterThanOrEqual(40);
		expect(spacingPx).toBeLessThanOrEqual(200);
	});

	it('handles very small pixelsPerUnit (1)', () => {
		const { major } = computeGridStep(1);
		expect(major).toBeGreaterThan(0);
		const spacingPx = major * 1;
		expect(spacingPx).toBeGreaterThanOrEqual(40);
		expect(spacingPx).toBeLessThanOrEqual(200);
	});

	it('handles very large pixelsPerUnit (500)', () => {
		const { major } = computeGridStep(500);
		expect(major).toBeGreaterThan(0);
		const spacingPx = major * 500;
		expect(spacingPx).toBeGreaterThanOrEqual(40);
		expect(spacingPx).toBeLessThanOrEqual(200);
	});
});
