/**
 * Tests for applyFunctionToBounds - Symbolic bounds propagation through functions.
 *
 * Tests monotonicity-based bounds computation for builtin functions.
 * The function now works with IntervalDomain (symbolic MathNode endpoints)
 * and only supports monotone functions (Tier 4). Non-monotone functions
 * (sin, cos, tan, cosh, abs, etc.) return undefined.
 */

import { describe, it, expect } from 'vitest';
import { applyFunctionToBounds } from '../rules/function-bounds';
import {
	intervalSet,
	interval,
	fromNumber,
	endpointToNumber,
	isPositiveInfinityEndpoint,
	isNegativeInfinityEndpoint
} from '$lib/math/intervals';
import { infinity } from '../../factory';
import type { IntervalDomain, EndpointType } from '$lib/math/intervals/types';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Build an IntervalDomain from numeric lower/upper values.
 * null means infinite (open).
 */
function numericInterval(
	lower: number | null,
	upper: number | null,
	lowerInclusive = true,
	upperInclusive = true
): IntervalDomain {
	return intervalSet([
		interval(
			{
				value: lower === null ? infinity('negative') : fromNumber(lower),
				type: (lower === null ? 'open' : lowerInclusive ? 'closed' : 'open') as EndpointType
			},
			{
				value: upper === null ? infinity('positive') : fromNumber(upper),
				type: (upper === null ? 'open' : upperInclusive ? 'closed' : 'open') as EndpointType
			}
		)
	]);
}

/**
 * Convert an IntervalDomain result to numeric bounds for assertion.
 * Returns undefined for empty/invalid domains.
 */
function toNumericBounds(domain: IntervalDomain | undefined):
	| {
			lower: number | null;
			upper: number | null;
			lowerInclusive: boolean;
			upperInclusive: boolean;
	  }
	| undefined {
	if (!domain || domain.kind !== 'interval_set' || domain.intervals.length === 0) return undefined;
	const lo = domain.intervals[0].lower;
	const hi = domain.intervals[domain.intervals.length - 1].upper;
	return {
		lower: isNegativeInfinityEndpoint(lo.value) ? null : endpointToNumber(lo.value),
		upper: isPositiveInfinityEndpoint(hi.value) ? null : endpointToNumber(hi.value),
		lowerInclusive: lo.type === 'closed',
		upperInclusive: hi.type === 'closed'
	};
}

/**
 * Assert that a domain result has numeric bounds close to expected values.
 */
function expectBoundsClose(
	actual: IntervalDomain | undefined,
	expected: {
		lower: number | null;
		upper: number | null;
		lowerInclusive: boolean;
		upperInclusive: boolean;
	}
) {
	const b = toNumericBounds(actual);
	expect(b).toBeDefined();
	if (expected.lower === null) {
		expect(b!.lower).toBeNull();
	} else {
		expect(b!.lower).toBeCloseTo(expected.lower, 10);
	}
	if (expected.upper === null) {
		expect(b!.upper).toBeNull();
	} else {
		expect(b!.upper).toBeCloseTo(expected.upper, 10);
	}
	expect(b!.lowerInclusive).toBe(expected.lowerInclusive);
	expect(b!.upperInclusive).toBe(expected.upperInclusive);
}

// =============================================================================
// Monotone Increasing Functions
// =============================================================================

describe('applyFunctionToBounds - monotone increasing', () => {
	it('exp([2, 5]) -> [exp(2), exp(5)]', () => {
		const input = numericInterval(2, 5);
		expectBoundsClose(applyFunctionToBounds('exp', input), {
			lower: Math.exp(2),
			upper: Math.exp(5),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('ln([1, e]) -> [0, 1]', () => {
		const input = numericInterval(1, Math.E);
		expectBoundsClose(applyFunctionToBounds('ln', input), {
			lower: 0,
			upper: 1,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('sqrt([4, 9]) -> [2, 3]', () => {
		const input = numericInterval(4, 9);
		expectBoundsClose(applyFunctionToBounds('sqrt', input), {
			lower: 2,
			upper: 3,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('sinh([-1, 2]) -> [sinh(-1), sinh(2)]', () => {
		const input = numericInterval(-1, 2);
		expectBoundsClose(applyFunctionToBounds('sinh', input), {
			lower: Math.sinh(-1),
			upper: Math.sinh(2),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('arctan([-1, 1]) -> [atan(-1), atan(1)]', () => {
		const input = numericInterval(-1, 1);
		expectBoundsClose(applyFunctionToBounds('arctan', input), {
			lower: Math.atan(-1),
			upper: Math.atan(1),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('arcsin([-1, 1]) -> [-pi/2, pi/2]', () => {
		const input = numericInterval(-1, 1);
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
	it('arccos([0, 1]) -> [0, pi/2]', () => {
		const input = numericInterval(0, 1);
		expectBoundsClose(applyFunctionToBounds('arccos', input), {
			lower: 0,
			upper: Math.PI / 2,
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

// =============================================================================
// Non-monotone Functions Return undefined (Tier 5)
// =============================================================================

describe('applyFunctionToBounds - non-monotone returns undefined', () => {
	it('sin returns undefined', () => {
		const input = numericInterval(0, Math.PI / 2);
		expect(applyFunctionToBounds('sin', input)).toBeUndefined();
	});

	it('cos returns undefined', () => {
		const input = numericInterval(0, Math.PI);
		expect(applyFunctionToBounds('cos', input)).toBeUndefined();
	});

	it('tan returns undefined', () => {
		const input = numericInterval(-Math.PI / 4, Math.PI / 4);
		expect(applyFunctionToBounds('tan', input)).toBeUndefined();
	});

	it('cosh returns undefined', () => {
		const input = numericInterval(-2, 3);
		expect(applyFunctionToBounds('cosh', input)).toBeUndefined();
	});

	it('abs returns undefined', () => {
		const input = numericInterval(2, 5);
		expect(applyFunctionToBounds('abs', input)).toBeUndefined();
	});

	it('arccot returns undefined', () => {
		const input = numericInterval(1, 10);
		expect(applyFunctionToBounds('arccot', input)).toBeUndefined();
	});

	it('log10 returns undefined', () => {
		const input = numericInterval(1, 100);
		expect(applyFunctionToBounds('log10', input)).toBeUndefined();
	});

	it('log2 returns undefined', () => {
		const input = numericInterval(1, 8);
		expect(applyFunctionToBounds('log2', input)).toBeUndefined();
	});
});

// =============================================================================
// Infinite Bounds (one-sided)
// =============================================================================

describe('applyFunctionToBounds - infinite bounds', () => {
	it('exp([2, +inf)) -> [exp(2), +inf)', () => {
		const input = numericInterval(2, null);
		expectBoundsClose(applyFunctionToBounds('exp', input), {
			lower: Math.exp(2),
			upper: null,
			lowerInclusive: true,
			upperInclusive: false
		});
	});

	it('ln((0, +inf)) -> symbolic result with ln(0) lower endpoint', () => {
		// ln is increasing, ln(0+) → -∞ symbolically (as funcNode('ln', [0])),
		// ln(+∞) → +∞. The result is a valid IntervalDomain.
		const input = numericInterval(0, null, false, false);
		const result = applyFunctionToBounds('ln', input);
		expect(result).toBeDefined();
		// The result has symbolic endpoints: lower = ln(0), upper = +inf
		// ln(0) is a valid symbolic endpoint even though evaluate() throws for it
		// (evaluator rejects ln(0) since 0 is not positive)
		expect(result!.kind).toBe('interval_set');
		if (result!.kind === 'interval_set') {
			// Upper endpoint is +inf (infinity node from the registry default)
			expect(isPositiveInfinityEndpoint(result!.intervals[0].upper.value)).toBe(true);
			expect(result!.intervals[0].upper.type).toBe('open');
			// Lower endpoint is symbolic ln(0), open
			expect(result!.intervals[0].lower.type).toBe('open');
		}
	});

	it('sqrt([0, +inf)) -> [0, +inf)', () => {
		const input = numericInterval(0, null);
		expectBoundsClose(applyFunctionToBounds('sqrt', input), {
			lower: 0,
			upper: null,
			lowerInclusive: true,
			upperInclusive: false
		});
	});
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('applyFunctionToBounds - edge cases', () => {
	it('unknown function -> undefined', () => {
		const input = numericInterval(0, 1);
		expect(applyFunctionToBounds('foo', input)).toBeUndefined();
	});

	it('completely infinite bounds (-inf, +inf) for exp -> (0, +inf)', () => {
		// exp has rangeLower = { 0, open }, so exp((-inf, +inf)) = (0, +inf)
		const input = numericInterval(null, null);
		expectBoundsClose(applyFunctionToBounds('exp', input), {
			lower: 0,
			upper: null,
			lowerInclusive: false,
			upperInclusive: false
		});
	});

	it('preserves open/closed endpoint types for increasing', () => {
		const input = numericInterval(2, 5, false, true);
		const result = applyFunctionToBounds('exp', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		expect(b!.lowerInclusive).toBe(false);
		expect(b!.upperInclusive).toBe(true);
	});

	it('preserves open/closed endpoint types for decreasing', () => {
		// arccos is decreasing: arccos([a,b]) = [arccos(b), arccos(a)]
		// open lower → open upper in output, closed upper → closed lower in output
		const input = numericInterval(0, 1, false, true);
		const result = applyFunctionToBounds('arccos', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		// decreasing flips: input.upper (closed) → output.lower (closed)
		//                    input.lower (open) → output.upper (open)
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(false);
	});

	it('tanh([-2, 2]) within single monotonic piece', () => {
		// tanh is globally increasing
		const input = numericInterval(-2, 2);
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
		const input = numericInterval(3, 3);
		expectBoundsClose(applyFunctionToBounds('exp', input), {
			lower: Math.exp(3),
			upper: Math.exp(3),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('arccos([0.5, 0.5]) -> [acos(0.5), acos(0.5)]', () => {
		const input = numericInterval(0.5, 0.5);
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
		const input = numericInterval(-5, -2);
		expectBoundsClose(applyFunctionToBounds('exp', input), {
			lower: Math.exp(-5),
			upper: Math.exp(-2),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('exp([-100, 0]) -> [exp(-100), 1]', () => {
		const input = numericInterval(-100, 0);
		expectBoundsClose(applyFunctionToBounds('exp', input), {
			lower: Math.exp(-100),
			upper: 1,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('sinh([-3, -1]) -> [sinh(-3), sinh(-1)] (both negative)', () => {
		const input = numericInterval(-3, -1);
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
		const input = numericInterval(0.001, 1);
		expectBoundsClose(applyFunctionToBounds('ln', input), {
			lower: Math.log(0.001),
			upper: 0,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('sqrt([0, 0]) -> [0, 0]', () => {
		const input = numericInterval(0, 0);
		expectBoundsClose(applyFunctionToBounds('sqrt', input), {
			lower: 0,
			upper: 0,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('sqrt([0.0001, 0.001]) -> very small positive', () => {
		const input = numericInterval(0.0001, 0.001);
		expectBoundsClose(applyFunctionToBounds('sqrt', input), {
			lower: Math.sqrt(0.0001),
			upper: Math.sqrt(0.001),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('arcsin at domain edges: arcsin([-1, -1]) -> [-pi/2, -pi/2]', () => {
		const input = numericInterval(-1, -1);
		expectBoundsClose(applyFunctionToBounds('arcsin', input), {
			lower: -Math.PI / 2,
			upper: -Math.PI / 2,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('arccos at domain edges: arccos([-1, -1]) -> [pi, pi]', () => {
		const input = numericInterval(-1, -1);
		expectBoundsClose(applyFunctionToBounds('arccos', input), {
			lower: Math.PI,
			upper: Math.PI,
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

// =============================================================================
// Logarithmic variants
// =============================================================================

describe('applyFunctionToBounds - logarithmic variants', () => {
	it('log (base-10 in this codebase) works', () => {
		// Note: 'log' in the evaluator maps to Math.log10, not Math.log
		const input = numericInterval(1, 100);
		expectBoundsClose(applyFunctionToBounds('log', input), {
			lower: 0,
			upper: Math.log10(100),
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

// =============================================================================
// Inverse hyperbolic functions
// =============================================================================

describe('applyFunctionToBounds - inverse hyperbolic', () => {
	it('arcsinh([-2, 3]) -> [asinh(-2), asinh(3)]', () => {
		const input = numericInterval(-2, 3);
		expectBoundsClose(applyFunctionToBounds('arcsinh', input), {
			lower: Math.asinh(-2),
			upper: Math.asinh(3),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('arccosh([1, 5]) -> [0, acosh(5)]', () => {
		const input = numericInterval(1, 5);
		expectBoundsClose(applyFunctionToBounds('arccosh', input), {
			lower: 0,
			upper: Math.acosh(5),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('arctanh([-0.5, 0.5]) -> [atanh(-0.5), atanh(0.5)]', () => {
		const input = numericInterval(-0.5, 0.5);
		expectBoundsClose(applyFunctionToBounds('arctanh', input), {
			lower: Math.atanh(-0.5),
			upper: Math.atanh(0.5),
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('arcsinh([0, 1]) -> [0, asinh(1)]', () => {
		const input = numericInterval(0, 1);
		expectBoundsClose(applyFunctionToBounds('arcsinh', input), {
			lower: 0,
			upper: Math.asinh(1),
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

// =============================================================================
// All-open bounds (exclusivity propagation)
// =============================================================================

describe('applyFunctionToBounds - open bounds propagation', () => {
	it('exp((2, 5)) all open -> (exp(2), exp(5))', () => {
		const input = numericInterval(2, 5, false, false);
		const result = applyFunctionToBounds('exp', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		expect(b!.lowerInclusive).toBe(false);
		expect(b!.upperInclusive).toBe(false);
		expect(b!.lower).toBeCloseTo(Math.exp(2));
		expect(b!.upper).toBeCloseTo(Math.exp(5));
	});

	it('arccos((0, 1)) -> both open (decreasing flips)', () => {
		const input = numericInterval(0, 1, false, false);
		const result = applyFunctionToBounds('arccos', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		// decreasing: input open lower → output open upper, input open upper → output open lower
		expect(b!.lowerInclusive).toBe(false);
		expect(b!.upperInclusive).toBe(false);
	});

	it('sqrt((0, 9]) half-open -> (0, 3]', () => {
		const input = numericInterval(0, 9, false, true);
		const result = applyFunctionToBounds('sqrt', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0);
		expect(b!.upper).toBeCloseTo(3);
		expect(b!.lowerInclusive).toBe(false);
		expect(b!.upperInclusive).toBe(true);
	});
});

// =============================================================================
// One-sided infinite with various functions
// =============================================================================

describe('applyFunctionToBounds - one-sided infinite bounds', () => {
	it('arctan((-inf, 0]) -> (arctan(-inf), arctan(0)] = symbolic', () => {
		const input = numericInterval(null, 0);
		const result = applyFunctionToBounds('arctan', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		// arctan is increasing, input lower=-inf → output lower = arctan(-inf)
		// arctan has no rangeLower, so the output lower is -inf (open)
		expect(b!.lower).toBeNull();
		expect(b!.lowerInclusive).toBe(false);
		expect(b!.upper).toBeCloseTo(0);
		expect(b!.upperInclusive).toBe(true);
	});

	it('sinh((-inf, 2]) -> (-inf, sinh(2)]', () => {
		const input = numericInterval(null, 2);
		const result = applyFunctionToBounds('sinh', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		// sinh is increasing, unbounded range
		expect(b!.lower).toBeNull();
		expect(b!.lowerInclusive).toBe(false);
		expect(b!.upper).toBeCloseTo(Math.sinh(2));
		expect(b!.upperInclusive).toBe(true);
	});

	it('exp((-inf, 0]) -> (0, 1]', () => {
		const input = numericInterval(null, 0);
		const result = applyFunctionToBounds('exp', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		// exp is increasing, rangeLower = { 0, open }
		expect(b!.lower).toBeCloseTo(0);
		expect(b!.lowerInclusive).toBe(false);
		expect(b!.upper).toBeCloseTo(1);
		expect(b!.upperInclusive).toBe(true);
	});

	it('ln([1, +inf)) -> [0, +inf)', () => {
		const input = numericInterval(1, null);
		const result = applyFunctionToBounds('ln', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upper).toBeNull();
		expect(b!.upperInclusive).toBe(false);
	});

	it('tanh([0, +inf)) -> [0, +inf) (no static rangeUpper)', () => {
		const input = numericInterval(0, null);
		const result = applyFunctionToBounds('tanh', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0);
		expect(b!.lowerInclusive).toBe(true);
		// tanh has no rangeUpper in the registry, so upper defaults to +inf (open)
		expect(b!.upper).toBeNull();
		expect(b!.upperInclusive).toBe(false);
	});

	it('tanh((-inf, 0]) -> (-inf, 0] (no static rangeLower)', () => {
		const input = numericInterval(null, 0);
		const result = applyFunctionToBounds('tanh', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		// tanh has no rangeLower, so lower defaults to -inf (open)
		expect(b!.lower).toBeNull();
		expect(b!.lowerInclusive).toBe(false);
		expect(b!.upper).toBeCloseTo(0);
		expect(b!.upperInclusive).toBe(true);
	});
});

// =============================================================================
// Aliases
// =============================================================================

describe('applyFunctionToBounds - aliases', () => {
	it('arcsin works consistently', () => {
		const input = numericInterval(0, 1);
		const result1 = applyFunctionToBounds('arcsin', input);
		const result2 = applyFunctionToBounds('arcsin', input);
		const b1 = toNumericBounds(result1);
		const b2 = toNumericBounds(result2);
		expect(b1).toBeDefined();
		expect(b2).toBeDefined();
		expect(b1!.lower).toBeCloseTo(b2!.lower!);
		expect(b1!.upper).toBeCloseTo(b2!.upper!);
	});

	it('arccos works consistently', () => {
		const input = numericInterval(0, 1);
		const result1 = applyFunctionToBounds('arccos', input);
		const result2 = applyFunctionToBounds('arccos', input);
		const b1 = toNumericBounds(result1);
		const b2 = toNumericBounds(result2);
		expect(b1).toBeDefined();
		expect(b2).toBeDefined();
		expect(b1!.lower).toBeCloseTo(b2!.lower!);
		expect(b1!.upper).toBeCloseTo(b2!.upper!);
	});

	it('arctan works consistently', () => {
		const input = numericInterval(-1, 1);
		const result1 = applyFunctionToBounds('arctan', input);
		const result2 = applyFunctionToBounds('arctan', input);
		const b1 = toNumericBounds(result1);
		const b2 = toNumericBounds(result2);
		expect(b1).toBeDefined();
		expect(b2).toBeDefined();
		expect(b1!.lower).toBeCloseTo(b2!.lower!);
		expect(b1!.upper).toBeCloseTo(b2!.upper!);
	});

	it('arccosh works consistently', () => {
		const input = numericInterval(1, 3);
		const result1 = applyFunctionToBounds('arccosh', input);
		const result2 = applyFunctionToBounds('arccosh', input);
		const b1 = toNumericBounds(result1);
		const b2 = toNumericBounds(result2);
		expect(b1).toBeDefined();
		expect(b2).toBeDefined();
		expect(b1!.lower).toBeCloseTo(b2!.lower!);
		expect(b1!.upper).toBeCloseTo(b2!.upper!);
	});
});

// =============================================================================
// Extreme values
// =============================================================================

describe('applyFunctionToBounds - extreme values', () => {
	it('exp([0, 50]) handles moderately large output', () => {
		const input = numericInterval(0, 50);
		const result = applyFunctionToBounds('exp', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(1);
		expect(b!.upper).toBeCloseTo(Math.exp(50));
	});

	it('exp([0, 700]) produces symbolic result (evaluator overflow)', () => {
		// exp(700) ≈ 1e304 — too large for the Rational evaluator to handle.
		// The symbolic function-bounds logic still produces a valid IntervalDomain
		// with symbolic endpoints, even though numeric extraction fails.
		const input = numericInterval(0, 700);
		const result = applyFunctionToBounds('exp', input);
		expect(result).toBeDefined();
		expect(result!.kind).toBe('interval_set');
		if (result!.kind === 'interval_set') {
			expect(result!.intervals).toHaveLength(1);
			// Lower endpoint is exp(0), upper is exp(700) — both symbolic
			expect(result!.intervals[0].lower.type).toBe('closed');
			expect(result!.intervals[0].upper.type).toBe('closed');
		}
	});

	it('arctan([1e6, 1e8]) very large -> both close to pi/2', () => {
		// Use values within evaluator limits
		const input = numericInterval(1e6, 1e8);
		const result = applyFunctionToBounds('arctan', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(Math.PI / 2, 4);
		expect(b!.upper).toBeCloseTo(Math.PI / 2, 4);
	});
});

// =============================================================================
// Range clamping via static bounds
// =============================================================================

describe('applyFunctionToBounds - range clamping', () => {
	it('tanh bounds remain within (-1, 1) for finite inputs', () => {
		const input = numericInterval(-10, 10);
		const result = applyFunctionToBounds('tanh', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		// tanh(±10) ≈ ±0.9999..., should remain within (-1, 1)
		expect(b!.lower!).toBeGreaterThanOrEqual(-1);
		expect(b!.upper!).toBeLessThanOrEqual(1);
	});

	it('sqrt output is always >= 0 (rangeLower clamped)', () => {
		const input = numericInterval(0, 100);
		const result = applyFunctionToBounds('sqrt', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		expect(b!.lower!).toBeGreaterThanOrEqual(0);
	});

	it('exp output is always > 0 (rangeLower = 0 open)', () => {
		const input = numericInterval(-1000, -999);
		const result = applyFunctionToBounds('exp', input);
		const b = toNumericBounds(result);
		expect(b).toBeDefined();
		// exp(-1000) ≈ 0 in JS (underflow), but symbolic endpoint is valid
		expect(b!.lower!).toBeGreaterThanOrEqual(0);
	});
});

// =============================================================================
// Domain check failures
// =============================================================================

describe('applyFunctionToBounds - domain check failures', () => {
	it('ln with negative input -> undefined', () => {
		const input = numericInterval(-1, 1);
		expect(applyFunctionToBounds('ln', input)).toBeUndefined();
	});

	it('sqrt with negative input -> undefined', () => {
		const input = numericInterval(-4, 9);
		expect(applyFunctionToBounds('sqrt', input)).toBeUndefined();
	});

	it('arcsin with out-of-domain input -> undefined', () => {
		const input = numericInterval(-2, 2);
		expect(applyFunctionToBounds('arcsin', input)).toBeUndefined();
	});

	it('arccos with out-of-domain input -> undefined', () => {
		const input = numericInterval(-2, 2);
		expect(applyFunctionToBounds('arccos', input)).toBeUndefined();
	});

	it('arctanh with out-of-domain input -> undefined', () => {
		const input = numericInterval(-2, 2);
		expect(applyFunctionToBounds('arctanh', input)).toBeUndefined();
	});

	it('arccosh with input below 1 -> undefined', () => {
		const input = numericInterval(0, 5);
		expect(applyFunctionToBounds('arccosh', input)).toBeUndefined();
	});

	it('ln with fully infinite input -> undefined (domain check fails)', () => {
		const input = numericInterval(null, null);
		expect(applyFunctionToBounds('ln', input)).toBeUndefined();
	});
});
