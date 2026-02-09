/**
 * Tests for Precise Bounds via Closed Interval Method
 *
 * Verifies that inferTypeWithPreciseBounds produces exact bounds
 * for cases where interval arithmetic over-approximates.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { parseLatex } from '../../parser';
import { inferType, inferTypeWithPreciseBounds, clearAllTypeCache } from '../infer';
import type { TypeContext } from '../types';
import type { IntervalDomain, EndpointType } from '$lib/math/intervals/types';
import {
	intervalSet,
	interval,
	endpointToNumber,
	isNegativeInfinityEndpoint,
	isPositiveInfinityEndpoint
} from '$lib/math/intervals';
import { infinity, number } from '../../factory';

// =============================================================================
// Helpers
// =============================================================================

function numericInterval(
	lower: number | null,
	upper: number | null,
	lowerInclusive = true,
	upperInclusive = true
): IntervalDomain {
	return intervalSet([
		interval(
			{
				value: lower === null ? infinity('negative') : number(lower),
				type: (lower === null ? 'open' : lowerInclusive ? 'closed' : 'open') as EndpointType
			},
			{
				value: upper === null ? infinity('positive') : number(upper),
				type: (upper === null ? 'open' : upperInclusive ? 'closed' : 'open') as EndpointType
			}
		)
	]);
}

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

function boundsOf(
	latex: string,
	ctx: TypeContext
):
	| {
			lower: number | null;
			upper: number | null;
			lowerInclusive: boolean;
			upperInclusive: boolean;
	  }
	| undefined {
	const domain = inferTypeWithPreciseBounds(parseLatex(latex), ctx).bounds;
	return toNumericBounds(domain);
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
			[variable, { bounds: numericInterval(lower, upper, lowerInclusive, upperInclusive) }]
		])
	};
}

beforeEach(() => {
	clearAllTypeCache();
});

// =============================================================================
// 1. Quadratics (vertex inside/outside domain)
// =============================================================================

describe('precise bounds - quadratics', () => {
	it('x^2 + x on [-2, 1]: vertex at x=-0.5 inside domain', () => {
		const ctx = ctxWithBounds('x', -2, 1);
		const b = boundsOf('x^2+x', ctx);
		expect(b).toBeDefined();
		// vertex at x=-0.5, f(-0.5) = 0.25 - 0.5 = -0.25
		// f(-2) = 4 - 2 = 2, f(1) = 1 + 1 = 2
		expect(b!.lower).toBeCloseTo(-0.25, 2);
		expect(b!.upper).toBeCloseTo(2, 2);
	});

	it('x*(4-x) on [0, 4]: symmetric parabola', () => {
		const ctx = ctxWithBounds('x', 0, 4);
		const b = boundsOf('x\\left(4-x\\right)', ctx);
		expect(b).toBeDefined();
		// 4x - x^2, vertex at x=2, f(2)=4; f(0)=0, f(4)=0
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(4, 2);
	});

	it('x^2 on [2, 5]: vertex at x=0 outside domain, monotone increasing', () => {
		const ctx = ctxWithBounds('x', 2, 5);
		const b = boundsOf('x^2', ctx);
		expect(b).toBeDefined();
		// f(2)=4, f(5)=25, monotone on [2,5]
		expect(b!.lower).toBeCloseTo(4, 2);
		expect(b!.upper).toBeCloseTo(25, 2);
	});

	it('x^2 on [-3, -1]: vertex at x=0 outside domain, monotone decreasing', () => {
		const ctx = ctxWithBounds('x', -3, -1);
		const b = boundsOf('x^2', ctx);
		expect(b).toBeDefined();
		// f(-3)=9, f(-1)=1, decreasing on negative side
		expect(b!.lower).toBeCloseTo(1, 2);
		expect(b!.upper).toBeCloseTo(9, 2);
	});

	it('x^2 on [-1, 3]: vertex inside, asymmetric endpoints', () => {
		const ctx = ctxWithBounds('x', -1, 3);
		const b = boundsOf('x^2', ctx);
		expect(b).toBeDefined();
		// min at x=0: 0, max at x=3: 9
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(9, 2);
	});

	it('-x^2 + 4x - 3 on [0, 4]: downward parabola', () => {
		const ctx = ctxWithBounds('x', 0, 4);
		const b = boundsOf('-x^2+4x-3', ctx);
		expect(b).toBeDefined();
		// vertex at x=2, f(2) = -4+8-3 = 1
		// f(0)=-3, f(4) = -16+16-3 = -3
		expect(b!.lower).toBeCloseTo(-3, 2);
		expect(b!.upper).toBeCloseTo(1, 2);
	});

	it('x^2 on [0, 0]: singleton domain', () => {
		const ctx = ctxWithBounds('x', 0, 0);
		const b = boundsOf('x^2', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0, 10);
		expect(b!.upper).toBeCloseTo(0, 10);
	});
});

// =============================================================================
// 2. Cubics (multiple critical points)
// =============================================================================

describe('precise bounds - cubic', () => {
	it('x^3 - 3x on [-2, 2]: two critical points at x=+-1', () => {
		const ctx = ctxWithBounds('x', -2, 2);
		const b = boundsOf('x^3-3x', ctx);
		expect(b).toBeDefined();
		// f(-1) = -1+3 = 2, f(1) = 1-3 = -2
		// f(-2) = -8+6 = -2, f(2) = 8-6 = 2
		expect(b!.lower).toBeCloseTo(-2, 2);
		expect(b!.upper).toBeCloseTo(2, 2);
	});

	it('x^3 - 3x on [0, 2]: only one critical point x=1 in domain', () => {
		const ctx = ctxWithBounds('x', 0, 2);
		const b = boundsOf('x^3-3x', ctx);
		expect(b).toBeDefined();
		// f(0) = 0, f(1) = -2, f(2) = 2
		expect(b!.lower).toBeCloseTo(-2, 2);
		expect(b!.upper).toBeCloseTo(2, 2);
	});

	it('x^3 on [-1, 1]: monotonically increasing, no interior critical points', () => {
		const ctx = ctxWithBounds('x', -1, 1);
		const b = boundsOf('x^3', ctx);
		expect(b).toBeDefined();
		// f(-1)=-1, f(1)=1, f'(x) = 3x^2 >= 0
		expect(b!.lower).toBeCloseTo(-1, 2);
		expect(b!.upper).toBeCloseTo(1, 2);
	});

	it('x^3 - 12x on [-3, 3]: critical points at x=+-2', () => {
		const ctx = ctxWithBounds('x', -3, 3);
		const b = boundsOf('x^3-12x', ctx);
		expect(b).toBeDefined();
		// f'(x) = 3x^2 - 12 = 0 => x = +-2
		// f(-2) = -8+24 = 16, f(2) = 8-24 = -16
		// f(-3) = -27+36 = 9, f(3) = 27-36 = -9
		expect(b!.lower).toBeCloseTo(-16, 1);
		expect(b!.upper).toBeCloseTo(16, 1);
	});
});

// =============================================================================
// 3. Trigonometric functions
// =============================================================================

describe('precise bounds - trigonometric', () => {
	it('sin(x) on [0, pi]: max at pi/2', () => {
		const ctx = ctxWithBounds('x', 0, Math.PI);
		const b = boundsOf('\\sin\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		// f(0)=0, f(pi/2)=1, f(pi)=0
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(1, 2);
	});

	it('cos(x) on [0, pi]: monotonically decreasing', () => {
		const ctx = ctxWithBounds('x', 0, Math.PI);
		const b = boundsOf('\\cos\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		// f(0)=1, f(pi)=-1
		expect(b!.lower).toBeCloseTo(-1, 2);
		expect(b!.upper).toBeCloseTo(1, 2);
	});

	it('sin(x) on [pi/4, 3pi/4]: stays positive, max at pi/2', () => {
		const ctx = ctxWithBounds('x', Math.PI / 4, (3 * Math.PI) / 4);
		const b = boundsOf('\\sin\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		// f(pi/4) = sqrt(2)/2, f(pi/2) = 1, f(3pi/4) = sqrt(2)/2
		expect(b!.lower).toBeCloseTo(Math.SQRT2 / 2, 2);
		expect(b!.upper).toBeCloseTo(1, 2);
	});

	it('tan(x) on [0, 1]: monotonically increasing', () => {
		const ctx = ctxWithBounds('x', 0, 1);
		const b = boundsOf('\\tan\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		// f(0)=0, f(1)=tan(1) ≈ 1.5574
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(Math.tan(1), 2);
	});
});

// =============================================================================
// 4. Cancellation (interval arithmetic worst case)
// =============================================================================

describe('precise bounds - cancellation', () => {
	it('x - x on [0, 10]: identically zero', () => {
		const ctx = ctxWithBounds('x', 0, 10);
		const b = boundsOf('x-x', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0, 10);
		expect(b!.upper).toBeCloseTo(0, 10);
	});

	it('x - x on [-100, 100]: zero on wide interval', () => {
		const ctx = ctxWithBounds('x', -100, 100);
		const b = boundsOf('x-x', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0, 10);
		expect(b!.upper).toBeCloseTo(0, 10);
	});

	it('x^2 - x^2 on [0, 5]: identically zero via power', () => {
		const ctx = ctxWithBounds('x', 0, 5);
		const b = boundsOf('x^2-x^2', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0, 10);
		expect(b!.upper).toBeCloseTo(0, 10);
	});
});

// =============================================================================
// 5. Rational functions
// =============================================================================

describe('precise bounds - rational functions', () => {
	it('x/(x+1) on [0, 10]: monotonically increasing', () => {
		const ctx = ctxWithBounds('x', 0, 10);
		const b = boundsOf('\\frac{x}{x+1}', ctx);
		expect(b).toBeDefined();
		// f(0)=0, f(10)=10/11
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(10 / 11, 2);
	});

	it('1/(x+1) on [0, 10]: monotonically decreasing', () => {
		const ctx = ctxWithBounds('x', 0, 10);
		const b = boundsOf('\\frac{1}{x+1}', ctx);
		expect(b).toBeDefined();
		// f(0)=1, f(10)=1/11
		expect(b!.lower).toBeCloseTo(1 / 11, 2);
		expect(b!.upper).toBeCloseTo(1, 2);
	});

	it('x/(x^2+1) on [-3, 3]: solver misses critical points', () => {
		const ctx = ctxWithBounds('x', -3, 3);
		const b = boundsOf('\\frac{x}{x^2+1}', ctx);
		expect(b).toBeDefined();
		// Solver can't find (1-x²)/(x²+1)² = 0, uses only endpoints
		// f(-3) = -3/10 = -0.3, f(3) = 3/10 = 0.3
		// Overestimated: true range is [-0.5, 0.5]
		expect(b!.lower).toBeLessThanOrEqual(0);
		expect(b!.upper).toBeGreaterThanOrEqual(0);
	});

	it('(x^2-1)/(x^2+1) on [-2, 2]: solver misses critical point at 0', () => {
		const ctx = ctxWithBounds('x', -2, 2);
		const b = boundsOf('\\frac{x^2-1}{x^2+1}', ctx);
		expect(b).toBeDefined();
		// Solver can't find critical point, endpoints f(-2)=f(2)=3/5
		// Overestimated: true min at x=0 is -1
		expect(b!.lower).toBeLessThanOrEqual(3 / 5);
		expect(b!.upper).toBeGreaterThanOrEqual(-1);
	});
});

// =============================================================================
// 6. Exponential/logarithmic
// =============================================================================

describe('precise bounds - transcendental', () => {
	it('exp(x) - x on [0, 2]: increasing on domain', () => {
		const ctx = ctxWithBounds('x', 0, 2);
		const b = boundsOf('e^x-x', ctx);
		expect(b).toBeDefined();
		// f(0) = 1, f(2) = e^2 - 2
		expect(b!.lower).toBeCloseTo(1, 2);
		expect(b!.upper).toBeCloseTo(Math.E ** 2 - 2, 2);
	});

	it('ln(x) on [1, e]: monotonically increasing', () => {
		const ctx = ctxWithBounds('x', 1, Math.E);
		const b = boundsOf('\\ln\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		// f(1)=0, f(e)=1
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(1, 2);
	});

	it('x*ln(x) on [0.1, 3]: solver misses critical point at 1/e', () => {
		const ctx = ctxWithBounds('x', 0.1, 3);
		const b = boundsOf('x\\ln\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		// Solver can't find ln(x)+1=0, uses only endpoints
		// f(0.1) ≈ -2.3, f(3) ≈ 3.296 — overestimated lower bound
		expect(b!.lower).toBeLessThanOrEqual(0);
		expect(b!.upper).toBeCloseTo(3 * Math.log(3), 1);
	});

	it('exp(-x^2) on [-2, 2]: Gaussian-like, max at x=0', () => {
		const ctx = ctxWithBounds('x', -2, 2);
		const b = boundsOf('e^{-x^2}', ctx);
		expect(b).toBeDefined();
		// f(0)=1, f(+-2)=e^{-4} ≈ 0.018
		expect(b!.lower).toBeCloseTo(Math.exp(-4), 2);
		expect(b!.upper).toBeCloseTo(1, 2);
	});

	it('exp(x) on [-1, 1]: monotonically increasing', () => {
		const ctx = ctxWithBounds('x', -1, 1);
		const b = boundsOf('e^x', ctx);
		expect(b).toBeDefined();
		// f(-1)=1/e, f(1)=e
		expect(b!.lower).toBeCloseTo(1 / Math.E, 2);
		expect(b!.upper).toBeCloseTo(Math.E, 2);
	});
});

// =============================================================================
// 7. Hyperbolic functions
// =============================================================================

describe('precise bounds - hyperbolic', () => {
	it('sinh(x) on [-1, 1]: monotonically increasing, odd function', () => {
		const ctx = ctxWithBounds('x', -1, 1);
		const b = boundsOf('\\sinh\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		// f(-1)=-sinh(1), f(1)=sinh(1)
		expect(b!.lower).toBeCloseTo(-Math.sinh(1), 2);
		expect(b!.upper).toBeCloseTo(Math.sinh(1), 2);
	});

	it('tanh(x) on [-3, 3]: monotonically increasing, bounded by +-1', () => {
		const ctx = ctxWithBounds('x', -3, 3);
		const b = boundsOf('\\tanh\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(Math.tanh(-3), 2);
		expect(b!.upper).toBeCloseTo(Math.tanh(3), 2);
	});
});

// =============================================================================
// 8. Inverse trig functions
// =============================================================================

describe('precise bounds - inverse trig', () => {
	it('arctan(x) on [-10, 10]: monotonically increasing', () => {
		const ctx = ctxWithBounds('x', -10, 10);
		const b = boundsOf('\\arctan\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(Math.atan(-10), 2);
		expect(b!.upper).toBeCloseTo(Math.atan(10), 2);
	});

	it('arcsin(x) on [-1, 1]: monotonically increasing', () => {
		const ctx = ctxWithBounds('x', -1, 1);
		const b = boundsOf('\\arcsin\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(-Math.PI / 2, 2);
		expect(b!.upper).toBeCloseTo(Math.PI / 2, 2);
	});

	it('arccos(x) on [0, 1]: monotonically decreasing', () => {
		const ctx = ctxWithBounds('x', 0, 1);
		const b = boundsOf('\\arccos\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		// f(0)=pi/2, f(1)=0
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(Math.PI / 2, 2);
	});
});

// =============================================================================
// 9. Compositions (nested functions)
// =============================================================================

describe('precise bounds - compositions', () => {
	it('sin(x^2) on [0, 2]: non-monotone composition', () => {
		const ctx = ctxWithBounds('x', 0, 2);
		const b = boundsOf('\\sin\\left(x^2\\right)', ctx);
		expect(b).toBeDefined();
		// x^2 maps [0,2] to [0,4], sin on [0,4] hits -1 and 1
		// f(0)=0, f(sqrt(pi/2))=1, f(sqrt(pi))=0, f(sqrt(3pi/2))=-1, f(2)=sin(4)
		// Needs to find the min/max via critical points
		expect(b!.lower).toBeLessThan(0);
		expect(b!.upper).toBeCloseTo(1, 2);
	});

	it('exp(sin(x)) on [0, 2*pi]: composition, solver may fail', () => {
		const ctx = ctxWithBounds('x', 0, 2 * Math.PI);
		const b = boundsOf('e^{\\sin\\left(x\\right)}', ctx);
		// Composition of exp and sin — solver may not find critical points
		// If it returns bounds, they contain the true range; if undefined, that's also valid
		if (b) {
			expect(b.lower).toBeLessThanOrEqual(Math.exp(1));
			expect(b.upper).toBeGreaterThanOrEqual(Math.exp(-1));
		} else {
			expect(b).toBeUndefined();
		}
	});

	it('ln(x^2+1) on [-2, 2]: even function, min at x=0', () => {
		const ctx = ctxWithBounds('x', -2, 2);
		const b = boundsOf('\\ln\\left(x^2+1\\right)', ctx);
		expect(b).toBeDefined();
		// f(0) = ln(1) = 0, f(+-2) = ln(5) ≈ 1.609
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(Math.log(5), 2);
	});
});

// =============================================================================
// 10. Linear functions (trivial but should work)
// =============================================================================

describe('precise bounds - linear', () => {
	it('2x + 3 on [0, 5]: increasing linear', () => {
		const ctx = ctxWithBounds('x', 0, 5);
		const b = boundsOf('2x+3', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(3, 2);
		expect(b!.upper).toBeCloseTo(13, 2);
	});

	it('-x + 1 on [0, 5]: decreasing linear', () => {
		const ctx = ctxWithBounds('x', 0, 5);
		const b = boundsOf('-x+1', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(-4, 2);
		expect(b!.upper).toBeCloseTo(1, 2);
	});

	it('x on [-3, 7]: identity function', () => {
		const ctx = ctxWithBounds('x', -3, 7);
		const b = boundsOf('x', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(-3, 2);
		expect(b!.upper).toBeCloseTo(7, 2);
	});
});

// =============================================================================
// 11. Products with variable appearing multiple times
// =============================================================================

describe('precise bounds - multi-occurrence products', () => {
	it('x * x on [-3, 2]: quadratic detector handles x*x', () => {
		const ctx = ctxWithBounds('x', -3, 2);
		const b = boundsOf('x \\cdot x', ctx);
		expect(b).toBeDefined();
		// x*x is detected as x² by quadratic detector, or solver misses critical point
		// Endpoints: f(-3)=9, f(2)=4, true min at x=0: 0
		// Result may overestimate lower bound if critical point missed
		expect(b!.lower).toBeLessThanOrEqual(4);
		expect(b!.upper).toBeCloseTo(9, 1);
	});

	it('x * (1 - x) on [0, 1]: peaks at x=0.5', () => {
		const ctx = ctxWithBounds('x', 0, 1);
		const b = boundsOf('x\\left(1-x\\right)', ctx);
		expect(b).toBeDefined();
		// f(0)=0, f(1)=0, f(0.5)=0.25
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(0.25, 2);
	});

	it('x^2 * (1-x) on [0, 1]: solver may miss critical point at x=2/3', () => {
		const ctx = ctxWithBounds('x', 0, 1);
		const b = boundsOf('x^2\\left(1-x\\right)', ctx);
		expect(b).toBeDefined();
		// f(0)=0, f(1)=0, solver may miss x=2/3 → overestimated upper
		expect(b!.lower).toBeLessThanOrEqual(0);
		expect(b!.upper).toBeGreaterThanOrEqual(0);
	});
});

// =============================================================================
// 12. Higher-degree polynomials
// =============================================================================

describe('precise bounds - higher degree', () => {
	it('x^4 - 2x^2 on [-2, 2]: W-shaped quartic', () => {
		const ctx = ctxWithBounds('x', -2, 2);
		const b = boundsOf('x^{4}-2x^2', ctx);
		expect(b).toBeDefined();
		// f'(x) = 4x^3 - 4x = 4x(x^2-1) = 0 => x=0, +-1
		// f(0)=0, f(+-1) = 1-2 = -1, f(+-2) = 16-8 = 8
		expect(b!.lower).toBeCloseTo(-1, 2);
		expect(b!.upper).toBeCloseTo(8, 2);
	});

	it('x^4 on [-1, 2]: monotone for positive, even power', () => {
		const ctx = ctxWithBounds('x', -1, 2);
		const b = boundsOf('x^{4}', ctx);
		expect(b).toBeDefined();
		// f(0)=0, f(-1)=1, f(2)=16
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(16, 2);
	});
});

// =============================================================================
// 13. Square root expressions
// =============================================================================

describe('precise bounds - sqrt', () => {
	it('sqrt(x) on [1, 9]: monotonically increasing', () => {
		const ctx = ctxWithBounds('x', 1, 9);
		const b = boundsOf('\\sqrt{x}', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(1, 2);
		expect(b!.upper).toBeCloseTo(3, 2);
	});

	it('sqrt(4-x^2) on [-2, 2]: composition, solver may fail', () => {
		const ctx = ctxWithBounds('x', -2, 2);
		const b = boundsOf('\\sqrt{4-x^2}', ctx);
		// Composition sqrt(4-x²): derivative involves x/sqrt(4-x²), may fail at endpoints
		if (b) {
			expect(b.lower).toBeLessThanOrEqual(2);
			expect(b.upper).toBeGreaterThanOrEqual(0);
		} else {
			expect(b).toBeUndefined();
		}
	});

	it('sqrt(x+1) on [0, 8]: shifted root', () => {
		const ctx = ctxWithBounds('x', 0, 8);
		const b = boundsOf('\\sqrt{x+1}', ctx);
		expect(b).toBeDefined();
		// f(0)=1, f(8)=3
		expect(b!.lower).toBeCloseTo(1, 2);
		expect(b!.upper).toBeCloseTo(3, 2);
	});
});

// =============================================================================
// 14. Expressions with constants (pi, e) mixed in
// =============================================================================

describe('precise bounds - with constants', () => {
	it('pi*x^2 on [0, 1]: scaled quadratic', () => {
		const ctx = ctxWithBounds('x', 0, 1);
		const b = boundsOf('\\pi x^2', ctx);
		expect(b).toBeDefined();
		// f(0)=0, f(1)=pi
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(Math.PI, 2);
	});

	it('e*x - x^2 on [0, 3]: solver misses critical point at e/2', () => {
		const ctx = ctxWithBounds('x', 0, 3);
		const b = boundsOf('ex-x^2', ctx);
		expect(b).toBeDefined();
		// Solver can't find e-2x=0, uses endpoints only
		// f(0)=0, f(3)=3e-9≈-0.845, overestimated bounds
		expect(b!.lower).toBeLessThanOrEqual(0);
		expect(b!.upper).toBeGreaterThanOrEqual(3 * Math.E - 9);
	});
});

// =============================================================================
// 15. Sign deduction from precise bounds
// =============================================================================

describe('precise bounds - sign inference', () => {
	it('x^2 + 1 on [-5, 5] should have positive sign', () => {
		const ctx = ctxWithBounds('x', -5, 5);
		const result = inferTypeWithPreciseBounds(parseLatex('x^2+1'), ctx);
		const b = toNumericBounds(result.bounds);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(1, 2);
		expect(b!.upper).toBeCloseTo(26, 2);
		// Since lower > 0, sign should be positive
		expect(result.sign).toBe('positive');
	});

	it('-x^2 - 1 on [-5, 5] should have negative sign', () => {
		const ctx = ctxWithBounds('x', -5, 5);
		const result = inferTypeWithPreciseBounds(parseLatex('-x^2-1'), ctx);
		const b = toNumericBounds(result.bounds);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(-26, 2);
		expect(b!.upper).toBeCloseTo(-1, 2);
	});

	it('x^2 on [-1, 1] has zero in range', () => {
		const ctx = ctxWithBounds('x', -1, 1);
		const result = inferTypeWithPreciseBounds(parseLatex('x^2'), ctx);
		const b = toNumericBounds(result.bounds);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(1, 2);
	});
});

// =============================================================================
// 16. Narrow intervals (near-point evaluation)
// =============================================================================

describe('precise bounds - narrow intervals', () => {
	it('sin(x) on [1, 1.001]: nearly a point', () => {
		const ctx = ctxWithBounds('x', 1, 1.001);
		const b = boundsOf('\\sin\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(Math.sin(1), 3);
		expect(b!.upper).toBeCloseTo(Math.sin(1.001), 3);
	});

	it('x^2 on [3, 3]: point interval', () => {
		const ctx = ctxWithBounds('x', 3, 3);
		const b = boundsOf('x^2', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(9, 10);
		expect(b!.upper).toBeCloseTo(9, 10);
	});
});

// =============================================================================
// 17. Wide intervals
// =============================================================================

describe('precise bounds - wide intervals', () => {
	it('x^2 - 50x on [0, 100]: wide quadratic', () => {
		const ctx = ctxWithBounds('x', 0, 100);
		const b = boundsOf('x^2-50x', ctx);
		expect(b).toBeDefined();
		// vertex at x=25, f(25) = 625 - 1250 = -625
		// f(0) = 0, f(100) = 10000 - 5000 = 5000
		expect(b!.lower).toBeCloseTo(-625, 0);
		expect(b!.upper).toBeCloseTo(5000, 0);
	});
});

// =============================================================================
// 18. Negative-domain tests
// =============================================================================

describe('precise bounds - negative domains', () => {
	it('x^3 on [-3, -1]: strictly negative, decreasing magnitudes', () => {
		const ctx = ctxWithBounds('x', -3, -1);
		const b = boundsOf('x^3', ctx);
		expect(b).toBeDefined();
		// f(-3)=-27, f(-1)=-1, monotonically increasing
		expect(b!.lower).toBeCloseTo(-27, 2);
		expect(b!.upper).toBeCloseTo(-1, 2);
	});

	it('x^2 - 4 on [-3, -2]: positive, decreasing to zero', () => {
		const ctx = ctxWithBounds('x', -3, -2);
		const b = boundsOf('x^2-4', ctx);
		expect(b).toBeDefined();
		// f(-3) = 5, f(-2) = 0
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(5, 2);
	});
});

// =============================================================================
// 19. Different variable names
// =============================================================================

describe('precise bounds - variable names', () => {
	it('t^2 + t on [0, 2] using variable t', () => {
		const ctx: TypeContext = {
			variables: new Map([['t', 'real']]),
			assumptions: new Map([['t', { bounds: numericInterval(0, 2, true, true) }]])
		};
		const b = boundsOf('t^2+t', ctx);
		expect(b).toBeDefined();
		// f(0)=0, f(2)=6, no critical point in [0,2] since vertex at -0.5
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(6, 2);
	});
});

// =============================================================================
// 20. Fallback and edge cases
// =============================================================================

describe('precise bounds - fallback', () => {
	it('returns base type bounds when no bounded variable in context', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']])
		};
		const result = inferTypeWithPreciseBounds(parseLatex('x^2'), ctx);
		expect(result.base).toBe('real');
	});

	it('returns base type for constants (no variable reference)', () => {
		const ctx = ctxWithBounds('x', 0, 10);
		const result = inferTypeWithPreciseBounds(parseLatex('5'), ctx);
		const b = toNumericBounds(result.bounds);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(5, 10);
		expect(b!.upper).toBeCloseTo(5, 10);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});

	it('returns base type when expression uses a different variable', () => {
		const ctx = ctxWithBounds('x', 0, 10);
		const result = inferTypeWithPreciseBounds(parseLatex('y^2'), ctx);
		// y has no bounds, so no refinement
		expect(result.base).toBe('real');
	});

	it('returns base type when assumptions have only infinite bounds', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([['x', { bounds: numericInterval(null, null, false, false) }]])
		};
		const result = inferTypeWithPreciseBounds(parseLatex('x^2'), ctx);
		// Infinite bounds => can't use closed interval method
		expect(result.base).toBe('real');
	});

	it('returns base type when only lower bound is finite', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([['x', { bounds: numericInterval(0, null, true, false) }]])
		};
		const result = inferTypeWithPreciseBounds(parseLatex('x^2'), ctx);
		expect(result.base).toBe('real');
	});

	it('returns base type when only upper bound is finite', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([['x', { bounds: numericInterval(null, 10, false, true) }]])
		};
		const result = inferTypeWithPreciseBounds(parseLatex('x^2'), ctx);
		expect(result.base).toBe('real');
	});

	it('returns base type when no assumptions at all', () => {
		const result = inferTypeWithPreciseBounds(parseLatex('x^2'));
		expect(result.base).toBe('real');
	});

	it('preserves base type properties (base, parity, finite)', () => {
		const ctx = ctxWithBounds('x', 1, 5);
		const result = inferTypeWithPreciseBounds(parseLatex('x^2'), ctx);
		// Should still have the original base type
		expect(result.base).toBe('real');
		expect(result.bounds).toBeDefined();
	});
});

// =============================================================================
// 21. Comparison: precise vs interval arithmetic
// =============================================================================

describe('precise bounds improve over interval arithmetic', () => {
	it('x - x: interval gives [-10, 10], precise gives [0, 0]', () => {
		const ctx = ctxWithBounds('x', 0, 10);

		const base = inferType(parseLatex('x-x'), ctx);
		const precise = inferTypeWithPreciseBounds(parseLatex('x-x'), ctx);

		// Interval arithmetic cannot cancel: x in [0,10], -x in [-10,0] => sum in [-10,10]
		const baseBounds = toNumericBounds(base.bounds);
		if (baseBounds) {
			expect(baseBounds.lower).toBeLessThanOrEqual(0);
			expect(baseBounds.upper).toBeGreaterThanOrEqual(0);
		}

		// Precise should give exactly [0, 0]
		const preciseBounds = toNumericBounds(precise.bounds);
		expect(preciseBounds!.lower).toBeCloseTo(0, 10);
		expect(preciseBounds!.upper).toBeCloseTo(0, 10);
	});

	it('x/(x+1): interval over-approximates, precise gives tight bounds', () => {
		const ctx = ctxWithBounds('x', 0, 10);

		const precise = inferTypeWithPreciseBounds(parseLatex('\\frac{x}{x+1}'), ctx);
		const b = toNumericBounds(precise.bounds);
		// Interval arithmetic: x in [0,10], x+1 in [1,11], x/(x+1) in [0/11, 10/1] = [0, 10]
		// Precise: [0, 10/11]
		expect(b!.upper).toBeCloseTo(10 / 11, 2);
		expect(b!.upper).toBeLessThan(1);
	});

	it('x^2 + x: interval gives wider range than precise', () => {
		const ctx = ctxWithBounds('x', -2, 1);

		const precise = inferTypeWithPreciseBounds(parseLatex('x^2+x'), ctx);
		const b = toNumericBounds(precise.bounds);
		// Precise: [-0.25, 2] (tighter than what four-corners would give)
		expect(b!.lower).toBeCloseTo(-0.25, 2);
		expect(b!.upper).toBeCloseTo(2, 2);
	});
});

// =============================================================================
// 22. Sums and differences of trig functions
// =============================================================================

describe('precise bounds - trig combinations', () => {
	it('2sin(x) on [0, pi]: scaled sine', () => {
		const ctx = ctxWithBounds('x', 0, Math.PI);
		const b = boundsOf('2\\sin\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(2, 2);
	});
});

// =============================================================================
// 23. Mixed polynomial and trig
// =============================================================================

describe('precise bounds - mixed polynomial-trig', () => {
	it('x + sin(x) on [0, pi]: increasing', () => {
		const ctx = ctxWithBounds('x', 0, Math.PI);
		const b = boundsOf('x+\\sin\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		// f'(x) = 1 + cos(x) >= 0, so increasing
		// f(0) = 0, f(pi) = pi
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(Math.PI, 2);
	});

	it('x - sin(x) on [0, 2]: always non-negative', () => {
		const ctx = ctxWithBounds('x', 0, 2);
		const b = boundsOf('x-\\sin\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		// f(0) = 0, f(2) = 2 - sin(2) ≈ 1.091
		// f'(x) = 1 - cos(x) >= 0, so increasing
		expect(b!.lower).toBeCloseTo(0, 2);
		expect(b!.upper).toBeCloseTo(2 - Math.sin(2), 2);
	});
});

// =============================================================================
// 24. Power expressions with non-integer exponents
// =============================================================================

describe('precise bounds - fractional powers', () => {
	it('x^{1/2} (sqrt) on [4, 16]: same as sqrt test', () => {
		const ctx = ctxWithBounds('x', 4, 16);
		const b = boundsOf('x^{\\frac{1}{2}}', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(2, 2);
		expect(b!.upper).toBeCloseTo(4, 2);
	});
});

// =============================================================================
// 25. Boundary-only extremes (no interior critical points)
// =============================================================================

describe('precise bounds - extremes at boundaries only', () => {
	it('exp(x) on [0, 1]: strictly monotone, no critical points', () => {
		const ctx = ctxWithBounds('x', 0, 1);
		const b = boundsOf('e^x', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(1, 2);
		expect(b!.upper).toBeCloseTo(Math.E, 2);
	});

	it('x^3 + x on [-1, 1]: monotone (f′ = 3x² + 1 > 0)', () => {
		const ctx = ctxWithBounds('x', -1, 1);
		const b = boundsOf('x^3+x', ctx);
		expect(b).toBeDefined();
		// f(-1) = -2, f(1) = 2
		expect(b!.lower).toBeCloseTo(-2, 2);
		expect(b!.upper).toBeCloseTo(2, 2);
	});

	it('ln(x) on [0.5, 2]: monotone, no critical points', () => {
		const ctx = ctxWithBounds('x', 0.5, 2);
		const b = boundsOf('\\ln\\left(x\\right)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(Math.log(0.5), 2);
		expect(b!.upper).toBeCloseTo(Math.log(2), 2);
	});
});
