/**
 * Tests for applyFunctionToBounds - Bounds propagation through functions.
 *
 * Tests monotonicity-based bounds computation for builtin functions.
 */

import { describe, it, expect } from 'vitest';
import { applyFunctionToBounds } from '../rules/function-bounds';
import type { Bounds } from '$lib/math/intervals/algebra';

// =============================================================================
// Helpers
// =============================================================================

/** Assert bounds approximately equal (for floating-point results). */
function expectBoundsClose(
	actual: Bounds | undefined,
	expected: {
		lower: number | null;
		upper: number | null;
		lowerInclusive: boolean;
		upperInclusive: boolean;
	}
) {
	expect(actual).toBeDefined();
	const b = actual!;
	if (expected.lower === null) {
		expect(b.lower).toBeNull();
	} else {
		expect(b.lower).toBeCloseTo(expected.lower, 10);
	}
	if (expected.upper === null) {
		expect(b.upper).toBeNull();
	} else {
		expect(b.upper).toBeCloseTo(expected.upper, 10);
	}
	expect(b.lowerInclusive).toBe(expected.lowerInclusive);
	expect(b.upperInclusive).toBe(expected.upperInclusive);
}

// =============================================================================
// Monotone Increasing Functions
// =============================================================================

describe('applyFunctionToBounds - monotone increasing', () => {
	it('exp([2, 5]) -> [exp(2), exp(5)]', () => {
		const input: Bounds = { lower: 2, upper: 5, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('exp', input), {
			lower: Math.exp(2),
			upper: Math.exp(5),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('ln([1, e]) -> [0, 1]', () => {
		const input: Bounds = {
			lower: 1,
			upper: Math.E,
			lowerInclusive: true,
			upperInclusive: true
		};
		expectBoundsClose(applyFunctionToBounds('ln', input), {
			lower: 0,
			upper: 1,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('sqrt([4, 9]) -> [2, 3]', () => {
		const input: Bounds = { lower: 4, upper: 9, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('sqrt', input), {
			lower: 2,
			upper: 3,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('sinh([-1, 2]) -> [sinh(-1), sinh(2)]', () => {
		const input: Bounds = { lower: -1, upper: 2, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('sinh', input), {
			lower: Math.sinh(-1),
			upper: Math.sinh(2),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('atan([-1, 1]) -> [atan(-1), atan(1)]', () => {
		const input: Bounds = { lower: -1, upper: 1, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('atan', input), {
			lower: Math.atan(-1),
			upper: Math.atan(1),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('asin([-1, 1]) -> [-pi/2, pi/2]', () => {
		const input: Bounds = { lower: -1, upper: 1, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('asin', input), {
			lower: -Math.PI / 2,
			upper: Math.PI / 2,
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

// =============================================================================
// Monotone Decreasing Functions
// =============================================================================

describe('applyFunctionToBounds - monotone decreasing', () => {
	it('acos([0, 1]) -> [0, pi/2]', () => {
		const input: Bounds = { lower: 0, upper: 1, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('acos', input), {
			lower: 0,
			upper: Math.PI / 2,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('acot([1, 10]) -> [acot(10), acot(1)]', () => {
		const input: Bounds = { lower: 1, upper: 10, lowerInclusive: true, upperInclusive: true };
		const result = applyFunctionToBounds('acot', input);
		expect(result).toBeDefined();
		// acot is decreasing: acot(10) < acot(1)
		expect(result!.lower).toBeCloseTo(Math.atan(1 / 10), 10);
		expect(result!.upper).toBeCloseTo(Math.PI / 4, 10);
	});
});

// =============================================================================
// Infinite Bounds (one-sided)
// =============================================================================

describe('applyFunctionToBounds - infinite bounds', () => {
	it('exp([2, +inf)) -> [exp(2), +inf)', () => {
		const input: Bounds = { lower: 2, upper: null, lowerInclusive: true, upperInclusive: false };
		expectBoundsClose(applyFunctionToBounds('exp', input), {
			lower: Math.exp(2),
			upper: null,
			lowerInclusive: true,
			upperInclusive: false
		});
	});

	it('ln((0, +inf)) -> (-inf, +inf) = undefined (fully infinite)', () => {
		const input: Bounds = {
			lower: 0,
			upper: null,
			lowerInclusive: false,
			upperInclusive: false
		};
		// ln is increasing, ln(0+) → -∞, ln(+∞) → +∞
		// Both sides infinite → return undefined (fall back to static range)
		expect(applyFunctionToBounds('ln', input)).toBeUndefined();
	});

	it('sqrt([0, +inf)) -> [0, +inf)', () => {
		const input: Bounds = {
			lower: 0,
			upper: null,
			lowerInclusive: true,
			upperInclusive: false
		};
		expectBoundsClose(applyFunctionToBounds('sqrt', input), {
			lower: 0,
			upper: null,
			lowerInclusive: true,
			upperInclusive: false
		});
	});
});

// =============================================================================
// Piecewise Monotonic - Single Piece
// =============================================================================

describe('applyFunctionToBounds - piecewise, single piece', () => {
	it('sin([0, pi/2]) -> [0, 1] (increasing piece)', () => {
		const input: Bounds = {
			lower: 0,
			upper: Math.PI / 2,
			lowerInclusive: true,
			upperInclusive: true
		};
		expectBoundsClose(applyFunctionToBounds('sin', input), {
			lower: 0,
			upper: 1,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('cos([0, pi]) -> [-1, 1] (decreasing piece)', () => {
		const input: Bounds = {
			lower: 0,
			upper: Math.PI,
			lowerInclusive: true,
			upperInclusive: true
		};
		expectBoundsClose(applyFunctionToBounds('cos', input), {
			lower: -1,
			upper: 1,
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

// =============================================================================
// Piecewise Monotonic - Spanning Multiple Pieces (Sampling)
// =============================================================================

describe('applyFunctionToBounds - piecewise, spanning (sampling)', () => {
	it('sin([0, pi]) -> [0, 1] via sampling', () => {
		const input: Bounds = {
			lower: 0,
			upper: Math.PI,
			lowerInclusive: true,
			upperInclusive: true
		};
		const result = applyFunctionToBounds('sin', input);
		expect(result).toBeDefined();
		// sin(0) = 0, sin(pi) ≈ 0, but sin(pi/2) = 1
		// sampling should capture: min ≈ 0, max = 1
		expect(result!.lower).toBeCloseTo(0, 5);
		expect(result!.upper).toBeCloseTo(1, 5);
	});

	it('cosh([-2, 3]) -> [1, cosh(3)] (minimum at 0)', () => {
		const input: Bounds = { lower: -2, upper: 3, lowerInclusive: true, upperInclusive: true };
		const result = applyFunctionToBounds('cosh', input);
		expect(result).toBeDefined();
		// cosh has minimum at 0 (cosh(0) = 1), and max at endpoints
		expect(result!.lower).toBeCloseTo(1, 5);
		expect(result!.upper).toBeCloseTo(Math.cosh(3), 5);
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('applyFunctionToBounds - edge cases', () => {
	it('unknown function -> undefined', () => {
		const input: Bounds = { lower: 0, upper: 1, lowerInclusive: true, upperInclusive: true };
		expect(applyFunctionToBounds('foo', input)).toBeUndefined();
	});

	it('completely infinite bounds (-inf, +inf) -> undefined', () => {
		const input: Bounds = {
			lower: null,
			upper: null,
			lowerInclusive: false,
			upperInclusive: false
		};
		expect(applyFunctionToBounds('exp', input)).toBeUndefined();
	});

	it('preserves open/closed endpoint types', () => {
		const input: Bounds = {
			lower: 2,
			upper: 5,
			lowerInclusive: false,
			upperInclusive: true
		};
		const result = applyFunctionToBounds('exp', input);
		expect(result).toBeDefined();
		expect(result!.lowerInclusive).toBe(false);
		expect(result!.upperInclusive).toBe(true);
	});

	it('tanh([-2, 2]) within single monotonic piece', () => {
		// tanh is globally increasing
		const input: Bounds = { lower: -2, upper: 2, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('tanh', input), {
			lower: Math.tanh(-2),
			upper: Math.tanh(2),
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});
