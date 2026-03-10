/**
 * Number Line Input - Snap Logic Tests
 * =====================================
 *
 * Tests for the snap-to-graduation and bounds clamping logic
 * used in the NumberLineInput component.
 */

import { describe, it, expect } from 'vitest';

// Extract the pure functions for testing
// (These mirror the logic in NumberLineInput.svelte)

function snapToStep(val: number, startN: number, stepN: number): number {
	const steps = Math.round((val - startN) / stepN);
	return startN + steps * stepN;
}

function cleanNumericString(val: number): string {
	const rounded = Math.round(val * 1e10) / 1e10;
	return String(rounded);
}

function clampToBounds(val: number, startN: number, endN: number): number {
	return Math.max(startN, Math.min(endN, val));
}

// ============================================================================
// SNAP TESTS
// ============================================================================

describe('snapToStep', () => {
	it('snaps 2.3 to 2.5 with step 0.5', () => {
		expect(snapToStep(2.3, 0, 0.5)).toBe(2.5);
	});

	it('snaps 2.2 to 2.0 with step 0.5', () => {
		expect(snapToStep(2.2, 0, 0.5)).toBe(2.0);
	});

	it('snaps 2.25 to 2.5 with step 0.5 (midpoint rounds up)', () => {
		expect(snapToStep(2.25, 0, 0.5)).toBe(2.5);
	});

	it('snaps correctly with non-zero start', () => {
		// start=1, step=0.5, value=2.3 → should snap to 2.5
		expect(snapToStep(2.3, 1, 0.5)).toBe(2.5);
	});

	it('snaps correctly with negative start', () => {
		// start=-3, step=1, value=-1.3 → should snap to -1
		expect(snapToStep(-1.3, -3, 1)).toBe(-1);
	});

	it('snaps to start value when close', () => {
		expect(snapToStep(0.1, 0, 1)).toBe(0);
	});

	it('handles fractional steps', () => {
		// step=1/3 ≈ 0.333..., value=0.5 → snaps to 0.333... or 0.666...
		const result = snapToStep(0.5, 0, 1 / 3);
		expect(Math.abs(result - 1 / 3) < 0.01 || Math.abs(result - 2 / 3) < 0.01).toBe(true);
	});
});

// ============================================================================
// BOUNDS TESTS
// ============================================================================

describe('clampToBounds', () => {
	it('clamps value below start', () => {
		expect(clampToBounds(-5, 0, 10)).toBe(0);
	});

	it('clamps value above end', () => {
		expect(clampToBounds(15, 0, 10)).toBe(10);
	});

	it('keeps value within bounds', () => {
		expect(clampToBounds(5, 0, 10)).toBe(5);
	});

	it('keeps value at start', () => {
		expect(clampToBounds(0, 0, 10)).toBe(0);
	});

	it('keeps value at end', () => {
		expect(clampToBounds(10, 0, 10)).toBe(10);
	});
});

// ============================================================================
// SERIALIZATION TESTS
// ============================================================================

describe('cleanNumericString', () => {
	it('serializes integer', () => {
		expect(cleanNumericString(5)).toBe('5');
	});

	it('serializes decimal', () => {
		expect(cleanNumericString(2.5)).toBe('2.5');
	});

	it('cleans floating point artifacts', () => {
		// 0.1 + 0.2 = 0.30000000000000004
		expect(cleanNumericString(0.1 + 0.2)).toBe('0.3');
	});

	it('handles negative values', () => {
		expect(cleanNumericString(-3.5)).toBe('-3.5');
	});

	it('handles zero', () => {
		expect(cleanNumericString(0)).toBe('0');
	});
});
