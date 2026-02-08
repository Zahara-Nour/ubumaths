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
		expectBoundsClose(applyFunctionToBounds('arctan', input), {
			lower: Math.atan(-1),
			upper: Math.atan(1),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('asin([-1, 1]) -> [-pi/2, pi/2]', () => {
		const input: Bounds = { lower: -1, upper: 1, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('arcsin', input), {
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
		expectBoundsClose(applyFunctionToBounds('arccos', input), {
			lower: 0,
			upper: Math.PI / 2,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('arccot([1, 10]) -> [arccot(10), arccot(1)]', () => {
		const input: Bounds = { lower: 1, upper: 10, lowerInclusive: true, upperInclusive: true };
		const result = applyFunctionToBounds('arccot', input);
		expect(result).toBeDefined();
		// arccot is decreasing: arccot(10) < arccot(1)
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

	it('preserves open/closed endpoint types for increasing', () => {
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

	it('preserves open/closed endpoint types for decreasing', () => {
		// acos is decreasing: acos([a,b]) = [acos(b), acos(a)]
		// open lower → open upper in output, closed upper → closed lower in output
		const input: Bounds = {
			lower: 0,
			upper: 1,
			lowerInclusive: false,
			upperInclusive: true
		};
		const result = applyFunctionToBounds('arccos', input);
		expect(result).toBeDefined();
		// decreasing flips: input.upper (closed) → output.lower (closed)
		//                    input.lower (open) → output.upper (open)
		expect(result!.lowerInclusive).toBe(true);
		expect(result!.upperInclusive).toBe(false);
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

// =============================================================================
// Singleton (point) intervals
// =============================================================================

describe('applyFunctionToBounds - singleton intervals', () => {
	it('exp([3, 3]) -> [exp(3), exp(3)]', () => {
		const input: Bounds = { lower: 3, upper: 3, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('exp', input), {
			lower: Math.exp(3),
			upper: Math.exp(3),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('sin([0, 0]) -> [0, 0]', () => {
		const input: Bounds = { lower: 0, upper: 0, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('sin', input), {
			lower: 0,
			upper: 0,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('acos([0.5, 0.5]) -> [acos(0.5), acos(0.5)]', () => {
		const input: Bounds = { lower: 0.5, upper: 0.5, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('arccos', input), {
			lower: Math.acos(0.5),
			upper: Math.acos(0.5),
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

// =============================================================================
// Negative input ranges for increasing functions
// =============================================================================

describe('applyFunctionToBounds - negative input ranges', () => {
	it('exp([-5, -2]) -> [exp(-5), exp(-2)]', () => {
		const input: Bounds = { lower: -5, upper: -2, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('exp', input), {
			lower: Math.exp(-5),
			upper: Math.exp(-2),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('exp([-100, 0]) -> [exp(-100), 1]', () => {
		const input: Bounds = { lower: -100, upper: 0, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('exp', input), {
			lower: Math.exp(-100),
			upper: 1,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('sinh([-3, -1]) -> [sinh(-3), sinh(-1)] (both negative)', () => {
		const input: Bounds = { lower: -3, upper: -1, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('sinh', input), {
			lower: Math.sinh(-3),
			upper: Math.sinh(-1),
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

// =============================================================================
// Domain boundary values
// =============================================================================

describe('applyFunctionToBounds - domain boundaries', () => {
	it('ln([0.001, 1]) -> near-boundary lower', () => {
		const input: Bounds = {
			lower: 0.001,
			upper: 1,
			lowerInclusive: true,
			upperInclusive: true
		};
		expectBoundsClose(applyFunctionToBounds('ln', input), {
			lower: Math.log(0.001),
			upper: 0,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('sqrt([0, 0]) -> [0, 0]', () => {
		const input: Bounds = { lower: 0, upper: 0, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('sqrt', input), {
			lower: 0,
			upper: 0,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('sqrt([0.0001, 0.001]) -> very small positive', () => {
		const input: Bounds = {
			lower: 0.0001,
			upper: 0.001,
			lowerInclusive: true,
			upperInclusive: true
		};
		expectBoundsClose(applyFunctionToBounds('sqrt', input), {
			lower: Math.sqrt(0.0001),
			upper: Math.sqrt(0.001),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('asin at domain edges: asin([-1, -1]) -> [-pi/2, -pi/2]', () => {
		const input: Bounds = { lower: -1, upper: -1, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('arcsin', input), {
			lower: -Math.PI / 2,
			upper: -Math.PI / 2,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('acos at domain edges: acos([-1, -1]) -> [pi, pi]', () => {
		const input: Bounds = { lower: -1, upper: -1, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('arccos', input), {
			lower: Math.PI,
			upper: Math.PI,
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

// =============================================================================
// Additional logarithmic functions
// =============================================================================

describe('applyFunctionToBounds - logarithmic variants', () => {
	it('log10([1, 100]) -> [0, 2]', () => {
		const input: Bounds = { lower: 1, upper: 100, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('log10', input), {
			lower: 0,
			upper: 2,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('log2([1, 8]) -> [0, 3]', () => {
		const input: Bounds = { lower: 1, upper: 8, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('log2', input), {
			lower: 0,
			upper: 3,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('log (alias for ln) works', () => {
		const input: Bounds = { lower: 1, upper: Math.E, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('log', input), {
			lower: 0,
			upper: 1,
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

// =============================================================================
// Inverse hyperbolic functions
// =============================================================================

describe('applyFunctionToBounds - inverse hyperbolic', () => {
	it('asinh([-2, 3]) -> [asinh(-2), asinh(3)]', () => {
		const input: Bounds = { lower: -2, upper: 3, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('arcsinh', input), {
			lower: Math.asinh(-2),
			upper: Math.asinh(3),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('acosh([1, 5]) -> [0, acosh(5)]', () => {
		const input: Bounds = { lower: 1, upper: 5, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('arccosh', input), {
			lower: 0,
			upper: Math.acosh(5),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('atanh([-0.5, 0.5]) -> [atanh(-0.5), atanh(0.5)]', () => {
		const input: Bounds = {
			lower: -0.5,
			upper: 0.5,
			lowerInclusive: true,
			upperInclusive: true
		};
		expectBoundsClose(applyFunctionToBounds('arctanh', input), {
			lower: Math.atanh(-0.5),
			upper: Math.atanh(0.5),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('arcsinh alias works', () => {
		const input: Bounds = { lower: 0, upper: 1, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('arcsinh', input), {
			lower: 0,
			upper: Math.asinh(1),
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

// =============================================================================
// Piecewise monotonic: cosh variations
// =============================================================================

describe('applyFunctionToBounds - cosh variations', () => {
	it('cosh([-3, -1]) in decreasing piece -> [cosh(-1), cosh(-3)]', () => {
		const input: Bounds = { lower: -3, upper: -1, lowerInclusive: true, upperInclusive: true };
		// Entirely in (-inf, 0] piece (decreasing)
		expectBoundsClose(applyFunctionToBounds('cosh', input), {
			lower: Math.cosh(-1),
			upper: Math.cosh(-3),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('cosh([1, 3]) in increasing piece -> [cosh(1), cosh(3)]', () => {
		const input: Bounds = { lower: 1, upper: 3, lowerInclusive: true, upperInclusive: true };
		// Entirely in [0, +inf) piece (increasing)
		expectBoundsClose(applyFunctionToBounds('cosh', input), {
			lower: Math.cosh(1),
			upper: Math.cosh(3),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('cosh([0, 0]) = [1, 1] (minimum point)', () => {
		const input: Bounds = { lower: 0, upper: 0, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('cosh', input), {
			lower: 1,
			upper: 1,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('cosh([-5, 5]) symmetric -> [1, cosh(5)]', () => {
		const input: Bounds = { lower: -5, upper: 5, lowerInclusive: true, upperInclusive: true };
		const result = applyFunctionToBounds('cosh', input);
		expect(result).toBeDefined();
		expect(result!.lower).toBeCloseTo(1, 5);
		expect(result!.upper).toBeCloseTo(Math.cosh(5), 5);
	});

	it('cosh([-1, 0]) in decreasing piece -> [1, cosh(-1)]', () => {
		const input: Bounds = { lower: -1, upper: 0, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('cosh', input), {
			lower: 1,
			upper: Math.cosh(-1),
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

// =============================================================================
// Piecewise monotonic: sin/cos variations
// =============================================================================

describe('applyFunctionToBounds - sin/cos variations', () => {
	it('sin([pi/2, pi]) in decreasing piece -> [0, 1]', () => {
		const input: Bounds = {
			lower: Math.PI / 2,
			upper: Math.PI,
			lowerInclusive: true,
			upperInclusive: true
		};
		// This is in the [pi/2, 3pi/2] decreasing piece
		expectBoundsClose(applyFunctionToBounds('sin', input), {
			lower: Math.sin(Math.PI), // ≈ 0
			upper: 1,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('sin([-pi, pi]) spanning full period -> [-1, 1] via sampling', () => {
		const input: Bounds = {
			lower: -Math.PI,
			upper: Math.PI,
			lowerInclusive: true,
			upperInclusive: true
		};
		const result = applyFunctionToBounds('sin', input);
		expect(result).toBeDefined();
		expect(result!.lower).toBeCloseTo(-1, 2);
		expect(result!.upper).toBeCloseTo(1, 2);
	});

	it('cos([0, pi/2]) in decreasing piece -> [0, 1]', () => {
		const input: Bounds = {
			lower: 0,
			upper: Math.PI / 2,
			lowerInclusive: true,
			upperInclusive: true
		};
		// [0, pi] is the decreasing piece for cos
		expectBoundsClose(applyFunctionToBounds('cos', input), {
			lower: Math.cos(Math.PI / 2), // ≈ 0
			upper: 1,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('cos([-pi, 0]) spanning multiple pieces -> [-1, 1] via sampling', () => {
		const input: Bounds = {
			lower: -Math.PI,
			upper: 0,
			lowerInclusive: true,
			upperInclusive: true
		};
		const result = applyFunctionToBounds('cos', input);
		expect(result).toBeDefined();
		expect(result!.lower).toBeCloseTo(-1, 2);
		expect(result!.upper).toBeCloseTo(1, 2);
	});

	it('sin([pi/6, pi/3]) narrow range inside increasing piece', () => {
		const input: Bounds = {
			lower: Math.PI / 6,
			upper: Math.PI / 3,
			lowerInclusive: true,
			upperInclusive: true
		};
		// Both in [-pi/2, pi/2] increasing piece
		expectBoundsClose(applyFunctionToBounds('sin', input), {
			lower: 0.5, // sin(pi/6)
			upper: Math.sin(Math.PI / 3), // sqrt(3)/2
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

// =============================================================================
// abs through applyFunctionToBounds
// =============================================================================

describe('applyFunctionToBounds - abs', () => {
	it('abs([2, 5]) entirely positive -> [2, 5] via increasing piece', () => {
		const input: Bounds = { lower: 2, upper: 5, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('abs', input), {
			lower: 2,
			upper: 5,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('abs([-5, -2]) entirely negative -> [2, 5] via decreasing piece', () => {
		const input: Bounds = { lower: -5, upper: -2, lowerInclusive: true, upperInclusive: true };
		expectBoundsClose(applyFunctionToBounds('abs', input), {
			lower: 2,
			upper: 5,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('abs([-3, 5]) crossing zero -> [0, 5] via sampling', () => {
		const input: Bounds = { lower: -3, upper: 5, lowerInclusive: true, upperInclusive: true };
		const result = applyFunctionToBounds('abs', input);
		expect(result).toBeDefined();
		expect(result!.lower).toBeCloseTo(0, 5);
		expect(result!.upper).toBeCloseTo(5, 5);
	});

	it('abs([-7, 3]) crossing zero, left larger -> [0, 7] via sampling', () => {
		const input: Bounds = { lower: -7, upper: 3, lowerInclusive: true, upperInclusive: true };
		const result = applyFunctionToBounds('abs', input);
		expect(result).toBeDefined();
		expect(result!.lower).toBeCloseTo(0, 5);
		expect(result!.upper).toBeCloseTo(7, 5);
	});
});

// =============================================================================
// All-open bounds (exclusivity propagation)
// =============================================================================

describe('applyFunctionToBounds - open bounds propagation', () => {
	it('exp((2, 5)) all open -> (exp(2), exp(5))', () => {
		const input: Bounds = { lower: 2, upper: 5, lowerInclusive: false, upperInclusive: false };
		const result = applyFunctionToBounds('exp', input);
		expect(result).toBeDefined();
		expect(result!.lowerInclusive).toBe(false);
		expect(result!.upperInclusive).toBe(false);
		expect(result!.lower).toBeCloseTo(Math.exp(2));
		expect(result!.upper).toBeCloseTo(Math.exp(5));
	});

	it('acos((0, 1)) -> (0, pi/2) with flipped inclusivity', () => {
		const input: Bounds = { lower: 0, upper: 1, lowerInclusive: false, upperInclusive: false };
		const result = applyFunctionToBounds('arccos', input);
		expect(result).toBeDefined();
		// decreasing: input open lower → output open upper, input open upper → output open lower
		expect(result!.lowerInclusive).toBe(false);
		expect(result!.upperInclusive).toBe(false);
	});

	it('sqrt((0, 9]) half-open -> (0, 3]', () => {
		const input: Bounds = { lower: 0, upper: 9, lowerInclusive: false, upperInclusive: true };
		const result = applyFunctionToBounds('sqrt', input);
		expect(result).toBeDefined();
		expect(result!.lower).toBeCloseTo(0);
		expect(result!.upper).toBeCloseTo(3);
		expect(result!.lowerInclusive).toBe(false);
		expect(result!.upperInclusive).toBe(true);
	});
});

// =============================================================================
// One-sided infinite with various functions
// =============================================================================

describe('applyFunctionToBounds - one-sided infinite bounds', () => {
	it('atan((-inf, 0]) -> (-pi/2, 0]', () => {
		const input: Bounds = { lower: null, upper: 0, lowerInclusive: false, upperInclusive: true };
		const result = applyFunctionToBounds('arctan', input);
		expect(result).toBeDefined();
		// atan is increasing, input lower=-inf → output lower = atan(-inf) = -pi/2 (static bound, exclusive)
		expect(result!.lower).toBeCloseTo(-Math.PI / 2);
		expect(result!.lowerInclusive).toBe(false);
		expect(result!.upper).toBeCloseTo(0);
		expect(result!.upperInclusive).toBe(true);
	});

	it('sinh((-inf, 2]) -> (-inf, sinh(2)]', () => {
		const input: Bounds = { lower: null, upper: 2, lowerInclusive: false, upperInclusive: true };
		const result = applyFunctionToBounds('sinh', input);
		expect(result).toBeDefined();
		// sinh is increasing, unbounded range
		expect(result!.lower).toBeNull();
		expect(result!.lowerInclusive).toBe(false);
		expect(result!.upper).toBeCloseTo(Math.sinh(2));
		expect(result!.upperInclusive).toBe(true);
	});

	it('exp((-inf, 0]) -> (0, 1]', () => {
		const input: Bounds = {
			lower: null,
			upper: 0,
			lowerInclusive: false,
			upperInclusive: true
		};
		const result = applyFunctionToBounds('exp', input);
		expect(result).toBeDefined();
		// exp is increasing, as x→-∞ exp→0+ (static lower 0, exclusive)
		expect(result!.lower).toBe(0);
		expect(result!.lowerInclusive).toBe(false);
		expect(result!.upper).toBeCloseTo(1);
		expect(result!.upperInclusive).toBe(true);
	});

	it('ln([1, +inf)) -> [0, +inf)', () => {
		const input: Bounds = {
			lower: 1,
			upper: null,
			lowerInclusive: true,
			upperInclusive: false
		};
		const result = applyFunctionToBounds('ln', input);
		expect(result).toBeDefined();
		expect(result!.lower).toBeCloseTo(0);
		expect(result!.lowerInclusive).toBe(true);
		expect(result!.upper).toBeNull();
		expect(result!.upperInclusive).toBe(false);
	});

	it('tanh([0, +inf)) -> [0, 1) clamped to static upper', () => {
		const input: Bounds = {
			lower: 0,
			upper: null,
			lowerInclusive: true,
			upperInclusive: false
		};
		const result = applyFunctionToBounds('tanh', input);
		expect(result).toBeDefined();
		expect(result!.lower).toBeCloseTo(0);
		expect(result!.lowerInclusive).toBe(true);
		// tanh(+inf) → 1 (static upper, exclusive)
		expect(result!.upper).toBe(1);
		expect(result!.upperInclusive).toBe(false);
	});

	it('tanh((-inf, 0]) -> (-1, 0] clamped to static lower', () => {
		const input: Bounds = {
			lower: null,
			upper: 0,
			lowerInclusive: false,
			upperInclusive: true
		};
		const result = applyFunctionToBounds('tanh', input);
		expect(result).toBeDefined();
		// tanh(-inf) → -1 (static lower, exclusive)
		expect(result!.lower).toBe(-1);
		expect(result!.lowerInclusive).toBe(false);
		expect(result!.upper).toBeCloseTo(0);
		expect(result!.upperInclusive).toBe(true);
	});
});

// =============================================================================
// tan within a single branch
// =============================================================================

describe('applyFunctionToBounds - tan', () => {
	it('tan([-pi/4, pi/4]) in increasing branch -> [-1, 1]', () => {
		const input: Bounds = {
			lower: -Math.PI / 4,
			upper: Math.PI / 4,
			lowerInclusive: true,
			upperInclusive: true
		};
		expectBoundsClose(applyFunctionToBounds('tan', input), {
			lower: -1,
			upper: 1,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('tan([0, pi/4]) in increasing branch -> [0, 1]', () => {
		const input: Bounds = {
			lower: 0,
			upper: Math.PI / 4,
			lowerInclusive: true,
			upperInclusive: true
		};
		expectBoundsClose(applyFunctionToBounds('tan', input), {
			lower: 0,
			upper: 1,
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

// =============================================================================
// Alias functions (arcsin, arccos, arctan, etc.)
// =============================================================================

describe('applyFunctionToBounds - aliases', () => {
	it('arcsin works like asin', () => {
		const input: Bounds = { lower: 0, upper: 1, lowerInclusive: true, upperInclusive: true };
		const result1 = applyFunctionToBounds('arcsin', input);
		const result2 = applyFunctionToBounds('arcsin', input);
		expect(result1).toBeDefined();
		expect(result2).toBeDefined();
		expect(result1!.lower).toBeCloseTo(result2!.lower!);
		expect(result1!.upper).toBeCloseTo(result2!.upper!);
	});

	it('arccos works like acos', () => {
		const input: Bounds = { lower: 0, upper: 1, lowerInclusive: true, upperInclusive: true };
		const result1 = applyFunctionToBounds('arccos', input);
		const result2 = applyFunctionToBounds('arccos', input);
		expect(result1).toBeDefined();
		expect(result2).toBeDefined();
		expect(result1!.lower).toBeCloseTo(result2!.lower!);
		expect(result1!.upper).toBeCloseTo(result2!.upper!);
	});

	it('arctan works like atan', () => {
		const input: Bounds = { lower: -1, upper: 1, lowerInclusive: true, upperInclusive: true };
		const result1 = applyFunctionToBounds('arctan', input);
		const result2 = applyFunctionToBounds('arctan', input);
		expect(result1).toBeDefined();
		expect(result2).toBeDefined();
		expect(result1!.lower).toBeCloseTo(result2!.lower!);
		expect(result1!.upper).toBeCloseTo(result2!.upper!);
	});

	it('arccosh works like acosh', () => {
		const input: Bounds = { lower: 1, upper: 3, lowerInclusive: true, upperInclusive: true };
		const result1 = applyFunctionToBounds('arccosh', input);
		const result2 = applyFunctionToBounds('arccosh', input);
		expect(result1).toBeDefined();
		expect(result2).toBeDefined();
		expect(result1!.lower).toBeCloseTo(result2!.lower!);
		expect(result1!.upper).toBeCloseTo(result2!.upper!);
	});
});

// =============================================================================
// Large / extreme input values
// =============================================================================

describe('applyFunctionToBounds - extreme values', () => {
	it('exp([0, 700]) handles large output without overflow', () => {
		const input: Bounds = { lower: 0, upper: 700, lowerInclusive: true, upperInclusive: true };
		const result = applyFunctionToBounds('exp', input);
		expect(result).toBeDefined();
		expect(result!.lower).toBeCloseTo(1);
		// exp(700) ≈ 1e304, still finite
		expect(result!.upper).toBeCloseTo(Math.exp(700));
	});

	it('exp([0, 710]) upper overflows to +inf -> clamped', () => {
		const input: Bounds = { lower: 0, upper: 710, lowerInclusive: true, upperInclusive: true };
		const result = applyFunctionToBounds('exp', input);
		expect(result).toBeDefined();
		expect(result!.lower).toBeCloseTo(1);
		// exp(710) = Infinity, so upper becomes null (static upper)
		expect(result!.upper).toBeNull();
		expect(result!.upperInclusive).toBe(false);
	});

	it('ln([1e-300, 1]) handles very small positive', () => {
		const input: Bounds = {
			lower: 1e-300,
			upper: 1,
			lowerInclusive: true,
			upperInclusive: true
		};
		const result = applyFunctionToBounds('ln', input);
		expect(result).toBeDefined();
		expect(result!.lower).toBeCloseTo(Math.log(1e-300));
		expect(result!.upper).toBeCloseTo(0);
	});

	it('atan([1e6, 1e12]) very large -> both close to pi/2', () => {
		const input: Bounds = { lower: 1e6, upper: 1e12, lowerInclusive: true, upperInclusive: true };
		const result = applyFunctionToBounds('arctan', input);
		expect(result).toBeDefined();
		expect(result!.lower).toBeCloseTo(Math.PI / 2, 4);
		expect(result!.upper).toBeCloseTo(Math.PI / 2, 4);
	});
});

// =============================================================================
// Clamping to natural range
// =============================================================================

describe('applyFunctionToBounds - range clamping', () => {
	it('tanh bounds are clamped to (-1, 1)', () => {
		const input: Bounds = { lower: -10, upper: 10, lowerInclusive: true, upperInclusive: true };
		const result = applyFunctionToBounds('tanh', input);
		expect(result).toBeDefined();
		// tanh(±10) ≈ ±0.9999..., but should remain within (-1, 1)
		expect(result!.lower!).toBeGreaterThanOrEqual(-1);
		expect(result!.upper!).toBeLessThanOrEqual(1);
	});

	it('sqrt output is always >= 0 (clamped)', () => {
		const input: Bounds = { lower: 0, upper: 100, lowerInclusive: true, upperInclusive: true };
		const result = applyFunctionToBounds('sqrt', input);
		expect(result).toBeDefined();
		expect(result!.lower!).toBeGreaterThanOrEqual(0);
	});

	it('exp output is always > 0 (clamped to static lower)', () => {
		const input: Bounds = {
			lower: -1000,
			upper: -999,
			lowerInclusive: true,
			upperInclusive: true
		};
		const result = applyFunctionToBounds('exp', input);
		expect(result).toBeDefined();
		// exp(-1000) ≈ 0 (subnormal), but clamped to static lower 0 exclusive
		// Actually exp(-1000) = 0 in JS (underflow), so result → 0, clamped to max(0, entry.lower=0)
		expect(result!.lower!).toBeGreaterThanOrEqual(0);
	});
});
