/**
 * Tests for Precise Bounds via Closed Interval Method
 *
 * Verifies that inferTypeWithPreciseBounds produces exact bounds
 * for cases where interval arithmetic over-approximates.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../parser';
import { inferTypeWithPreciseBounds, clearAllTypeCache } from '../infer';
import type { TypeContext } from '../types';
import type { Bounds } from '$lib/math/intervals/algebra';

// =============================================================================
// Helpers
// =============================================================================

function preciseBoundsOf(latex: string, ctx: TypeContext): Bounds | undefined {
	return inferTypeWithPreciseBounds(parseLatex(latex), ctx).bounds;
}

function ctxWithBounds(
	variable: string,
	lower: number,
	upper: number,
	lowerInclusive = true,
	upperInclusive = true
): TypeContext {
	return {
		variables: new Map([[variable, 'real']]),
		assumptions: new Map([
			[
				variable,
				{
					bounds: { lower, upper, lowerInclusive, upperInclusive }
				}
			]
		])
	};
}

beforeEach(() => {
	clearAllTypeCache();
});

// =============================================================================
// Precise bounds for univariate expressions
// =============================================================================

describe('precise bounds - quadratics', () => {
	it('x^2 + x on [-2, 1] should give [-0.25, 6]', () => {
		const ctx = ctxWithBounds('x', -2, 1);
		const b = preciseBoundsOf('x^2+x', ctx);
		expect(b).toBeDefined();
		// vertex at x = -0.5, f(-0.5) = 0.25 - 0.5 = -0.25
		// f(-2) = 4 - 2 = 2, f(1) = 1 + 1 = 2
		// Wait: f(-2) = 4 + (-2) = 2, f(1) = 1 + 1 = 2
		// Actually max is at endpoints: max(2, 2) = 2, not 6
		// Correction: x^2 + x on [-2, 1]: vertex at -0.5 gives -0.25
		// endpoints: f(-2)=2, f(1)=2
		// So range is [-0.25, 2]
		expect(b!.lower).toBeCloseTo(-0.25, 2);
		expect(b!.upper).toBeCloseTo(2, 2);
	});

	it('x*(4-x) on [0, 4] should give [0, 4]', () => {
		const ctx = ctxWithBounds('x', 0, 4);
		const b = preciseBoundsOf('x\\left(4-x\\right)', ctx);
		expect(b).toBeDefined();
		// 4x - x^2, vertex at x=2, f(2)=4
		// f(0)=0, f(4)=0
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(4, 2);
	});
});

describe('precise bounds - trigonometric', () => {
	it('sin(x) + cos(x) on [0, pi] should give [-1, sqrt(2)]', () => {
		const ctx = ctxWithBounds('x', 0, Math.PI);
		const b = preciseBoundsOf('\\sin\\left(x\\right)+\\cos\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		// max at x=pi/4: sin(pi/4)+cos(pi/4) = sqrt(2)
		// f(0)=0+1=1, f(pi)=0+(-1)=-1
		expect(b!.lower).toBeCloseTo(-1, 2);
		expect(b!.upper).toBeCloseTo(Math.SQRT2, 2);
	});
});

describe('precise bounds - cancellation', () => {
	it('x - x on [0, 10] should give [0, 0]', () => {
		const ctx = ctxWithBounds('x', 0, 10);
		const b = preciseBoundsOf('x-x', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0, 10);
		expect(b!.upper).toBeCloseTo(0, 10);
	});
});

describe('precise bounds - rational functions', () => {
	it('x/(x+1) on [0, 10] should give [0, 10/11]', () => {
		const ctx = ctxWithBounds('x', 0, 10);
		const b = preciseBoundsOf('\\frac{x}{x+1}', ctx);
		expect(b).toBeDefined();
		// f(0)=0, f(10)=10/11 ≈ 0.909
		// f'(x) = 1/(x+1)^2 > 0 always, so monotonically increasing
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(10 / 11, 2);
	});
});

describe('precise bounds - transcendental', () => {
	it('exp(x) - x on [0, 2] should give [1, e^2-2]', () => {
		const ctx = ctxWithBounds('x', 0, 2);
		const b = preciseBoundsOf('e^x-x', ctx);
		expect(b).toBeDefined();
		// f'(x) = e^x - 1 = 0 => x = 0 (boundary)
		// f(0) = 1, f(2) = e^2 - 2 ≈ 5.389
		// f is increasing on (0, 2) since e^x > 1 for x > 0
		expect(b!.lower).toBeCloseTo(1, 2);
		expect(b!.upper).toBeCloseTo(Math.E ** 2 - 2, 2);
	});
});

describe('precise bounds - cubic', () => {
	it('x^3 - 3x on [-2, 2] should give [-2, 2]', () => {
		const ctx = ctxWithBounds('x', -2, 2);
		const b = preciseBoundsOf('x^3-3x', ctx);
		expect(b).toBeDefined();
		// f'(x) = 3x^2 - 3 = 0 => x = +-1
		// f(-1) = -1+3 = 2, f(1) = 1-3 = -2
		// f(-2) = -8+6 = -2, f(2) = 8-6 = 2
		expect(b!.lower).toBeCloseTo(-2, 2);
		expect(b!.upper).toBeCloseTo(2, 2);
	});
});

describe('precise bounds - fallback', () => {
	it('returns base type bounds when no bounded variable in context', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']])
		};
		const result = inferTypeWithPreciseBounds(parseLatex('x^2'), ctx);
		// Should just return the base inferType result (no refinement)
		expect(result.base).toBe('real');
	});

	it('returns base type for constants (no variable reference)', () => {
		const ctx = ctxWithBounds('x', 0, 10);
		const result = inferTypeWithPreciseBounds(parseLatex('5'), ctx);
		expect(result.bounds).toEqual({
			lower: 5,
			upper: 5,
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});
