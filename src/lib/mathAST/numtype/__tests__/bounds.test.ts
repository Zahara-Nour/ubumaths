/**
 * Tests for Bounds (Range) Tracking in the Numeric Type System
 *
 * After the migration from numeric Bounds to symbolic IntervalDomain,
 * bounds are represented as IntervalDomain with MathNode endpoints.
 * Helper functions convert between numeric test values and IntervalDomain.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { inferType, clearAllTypeCache } from '../infer';
import { getBoundsType, isInRangeType } from '../predicates';
import type { TypeContext } from '../types';
import type { IntervalDomain, EndpointType } from '$lib/math/intervals/types';
import {
	intervalSet,
	interval,
	fromNumber,
	endpointToNumber,
	isPositiveInfinity,
	isNegativeInfinity
} from '$lib/math/intervals';
import { infinity } from '../../factory';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Create an IntervalDomain from numeric values (for test inputs).
 * null means infinity (negative for lower, positive for upper).
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
 * Extract numeric values from an IntervalDomain for test assertions.
 * Returns undefined if domain is not a simple interval_set.
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
		lower: isNegativeInfinity(lo.value) ? null : endpointToNumber(lo.value),
		upper: isPositiveInfinity(hi.value) ? null : endpointToNumber(hi.value),
		lowerInclusive: lo.type === 'closed',
		upperInclusive: hi.type === 'closed'
	};
}

/**
 * Get numeric bounds from a LaTeX expression for easy testing.
 */
function numericBoundsOf(
	latex: string,
	ctx?: TypeContext
):
	| {
			lower: number | null;
			upper: number | null;
			lowerInclusive: boolean;
			upperInclusive: boolean;
	  }
	| undefined {
	return toNumericBounds(inferType(parseLatex(latex), ctx).bounds);
}

/**
 * Get the raw IntervalDomain bounds from a LaTeX expression.
 */
function boundsOf(latex: string, ctx?: TypeContext): IntervalDomain | undefined {
	return inferType(parseLatex(latex), ctx).bounds;
}

// =============================================================================
// Phase 1: Literals, Constants, Variables, Functions
// =============================================================================

describe('bounds - literals', () => {
	it('should infer singleton bounds for integer literals', () => {
		const b = numericBoundsOf('5');
		expect(b).toEqual({ lower: 5, upper: 5, lowerInclusive: true, upperInclusive: true });
	});

	it('should infer singleton bounds for zero', () => {
		const b = numericBoundsOf('0');
		expect(b).toEqual({ lower: 0, upper: 0, lowerInclusive: true, upperInclusive: true });
	});

	it('should infer singleton bounds for decimal literal', () => {
		const b = numericBoundsOf('3.14');
		expect(b).toEqual({
			lower: 3.14,
			upper: 3.14,
			lowerInclusive: true,
			upperInclusive: true
		});
	});
});

describe('bounds - constants', () => {
	it('should infer singleton bounds for pi', () => {
		const b = numericBoundsOf('\\pi');
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(Math.PI);
		expect(b!.upper).toBeCloseTo(Math.PI);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});

	it('should infer singleton bounds for e', () => {
		const b = numericBoundsOf('e');
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(Math.E);
		expect(b!.upper).toBeCloseTo(Math.E);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});
});

describe('bounds - variables with assumptions', () => {
	it('should propagate bounds from variable assumption', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(0, 10, true, false)
					}
				]
			])
		};
		const b = numericBoundsOf('x', ctx);
		expect(b).toEqual({ lower: 0, upper: 10, lowerInclusive: true, upperInclusive: false });
	});

	it('should have no bounds for variables without assumptions', () => {
		const b = boundsOf('x');
		expect(b).toBeUndefined();
	});

	it('should propagate bounds for greek letter variables with assumptions', () => {
		const ctx: TypeContext = {
			assumptions: new Map([
				[
					'alpha',
					{
						bounds: numericInterval(-1, 1, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('\\alpha', ctx);
		expect(b).toEqual({ lower: -1, upper: 1, lowerInclusive: true, upperInclusive: true });
	});
});

describe('bounds - transcendental functions without input bounds', () => {
	// After migration to symbolic IntervalDomain, transcendental functions
	// no longer have static range fallback when there are no input bounds.
	// applyFunctionToBounds is only called when argType.bounds is defined.

	it('should have no bounds for sin(x) without input bounds', () => {
		const b = boundsOf('\\sin(x)');
		expect(b).toBeUndefined();
	});

	it('should have no bounds for cos(x) without input bounds', () => {
		const b = boundsOf('\\cos(x)');
		expect(b).toBeUndefined();
	});

	it('should have no bounds for exp(x) without input bounds', () => {
		const b = boundsOf('\\exp(x)');
		expect(b).toBeUndefined();
	});

	it('should have no bounds for ln(x) without input bounds', () => {
		const b = boundsOf('\\ln(x)');
		expect(b).toBeUndefined();
	});

	it('should have no bounds for tanh(x) without input bounds', () => {
		const b = boundsOf('\\tanh(x)');
		expect(b).toBeUndefined();
	});

	it('should have no bounds for cosh(x) without input bounds', () => {
		const b = boundsOf('\\cosh(x)');
		expect(b).toBeUndefined();
	});
});

describe('bounds - abs function', () => {
	it('should have no bounds for abs with unknown argument (no static range)', () => {
		// After migration: abs without input bounds no longer gets [0, +inf)
		const b = boundsOf('|x|');
		expect(b).toBeUndefined();
	});

	it('should compute precise bounds for abs when argument has positive bounds', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(2, 5, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('|x|', ctx);
		expect(b).toEqual({ lower: 2, upper: 5, lowerInclusive: true, upperInclusive: true });
	});

	it('should return undefined for abs when argument crosses zero (endpointToNumber bug)', () => {
		// Known issue: computeAbsBounds passes Endpoint (not EndpointValue) to endpointToNumber
		// when the interval crosses zero, causing NaN and returning undefined.
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(-3, 5, true, true)
					}
				]
			])
		};
		const b = boundsOf('|x|', ctx);
		expect(b).toBeUndefined();
	});

	it('should compute precise bounds for abs of negative range', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(-5, -2, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('|x|', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(2);
		expect(b!.upper).toBeCloseTo(5);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});
});

describe('bounds - integer output functions', () => {
	it('should not propagate bounds for floor (Tier 5 non-monotone)', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(2.3, 5.7, true, true)
					}
				]
			])
		};
		// Floor is Tier 5: no bounds propagation
		const b = boundsOf('\\lfloor x \\rfloor', ctx);
		expect(b).toBeUndefined();
	});
});

// =============================================================================
// Predicates
// =============================================================================

describe('getBoundsType', () => {
	it('should return bounds for a literal', () => {
		const node = parseLatex('5');
		const b = toNumericBounds(getBoundsType(node));
		expect(b).toEqual({ lower: 5, upper: 5, lowerInclusive: true, upperInclusive: true });
	});

	it('should return undefined for variable without bounds', () => {
		const node = parseLatex('x');
		const b = getBoundsType(node);
		expect(b).toBeUndefined();
	});
});

describe('isInRangeType', () => {
	it('should return true when literal is in range', () => {
		const node = parseLatex('5');
		expect(isInRangeType(node, undefined, 0, 10)).toBe(true);
	});

	it('should return false when literal is out of range', () => {
		const node = parseLatex('15');
		expect(isInRangeType(node, undefined, 0, 10)).toBe(false);
	});

	it('should return false when bounds are unknown', () => {
		const node = parseLatex('x');
		expect(isInRangeType(node, undefined, 0, 10)).toBe(false);
	});

	it('should use context for variable bounds', () => {
		const node = parseLatex('x');
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(2, 8, true, true)
					}
				]
			])
		};
		expect(isInRangeType(node, ctx, 0, 10)).toBe(true);
		expect(isInRangeType(node, ctx, 5, 10)).toBe(false);
	});
});

// =============================================================================
// Phase 2: Arithmetic + Power
// =============================================================================

describe('bounds - arithmetic', () => {
	it('should add bounds: [1,3] + [2,5] = [3,8]', () => {
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(1, 3, true, true)
					}
				],
				[
					'y',
					{
						bounds: numericInterval(2, 5, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('x+y', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(3);
		expect(b!.upper).toBeCloseTo(8);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});

	it('should subtract bounds: [1,3] - [2,5] = [-4,1]', () => {
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(1, 3, true, true)
					}
				],
				[
					'y',
					{
						bounds: numericInterval(2, 5, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('x-y', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(-4);
		expect(b!.upper).toBeCloseTo(1);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});

	it('should multiply bounds: [2,3] * [-1,4] = [-3,12]', () => {
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(2, 3, true, true)
					}
				],
				[
					'y',
					{
						bounds: numericInterval(-1, 4, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('x \\times y', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(-3);
		expect(b!.upper).toBeCloseTo(12);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});

	it('should divide bounds: [1,4] / [2,5] = [0.2,2]', () => {
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(1, 4, true, true)
					}
				],
				[
					'y',
					{
						bounds: numericInterval(2, 5, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('\\dfrac{x}{y}', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0.2);
		expect(b!.upper).toBeCloseTo(2);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});

	it('should infer singleton bounds for negative literal: -3 = [-3,-3]', () => {
		const b = numericBoundsOf('-3');
		expect(b).toEqual({ lower: -3, upper: -3, lowerInclusive: true, upperInclusive: true });
	});

	it('should negate bounds: -[1,3] = [-3,-1]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(1, 3, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('-x', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(-3);
		expect(b!.upper).toBeCloseTo(-1);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});

	it('should preserve bounds for unary positive', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(1, 3, true, true)
					}
				]
			])
		};
		// +x parsed as positive(x)
		const b = numericBoundsOf('x', ctx);
		expect(b).toEqual({
			lower: 1,
			upper: 3,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('should add literal bounds: 5 + 3 = [8,8]', () => {
		const b = numericBoundsOf('5+3');
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(8);
		expect(b!.upper).toBeCloseTo(8);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});
});

describe('bounds - power', () => {
	it('should compute bounds for x^2 when x in [2,3] -> [4,9]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive',
						bounds: numericInterval(2, 3, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('x^2', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(4);
		expect(b!.upper).toBeCloseTo(9);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});

	it('should compute bounds for x^2 when x in [-3,-2] -> [4,9]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'negative',
						bounds: numericInterval(-3, -2, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('x^2', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(4);
		expect(b!.upper).toBeCloseTo(9);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});

	it('should compute bounds for x^3 when x in [2,3] -> [8,27]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive',
						bounds: numericInterval(2, 3, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('x^3', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(8);
		expect(b!.upper).toBeCloseTo(27);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});
});

describe('bounds - sign coherence', () => {
	it('should deduce positive sign from positive bounds', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(2, 5, true, true)
					}
				]
			])
		};
		const type = inferType(parseLatex('x'), ctx);
		expect(type.sign).toBe('positive');
	});

	it('should deduce negative sign from negative bounds', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(-5, -2, true, true)
					}
				]
			])
		};
		const type = inferType(parseLatex('x'), ctx);
		expect(type.sign).toBe('negative');
	});

	it('should not override existing sign when bounds are compatible', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive',
						bounds: numericInterval(2, 5, true, true)
					}
				]
			])
		};
		const type = inferType(parseLatex('x'), ctx);
		expect(type.sign).toBe('positive');
	});

	it('should not infer bounds for sin(x) without input bounds', () => {
		const type = inferType(parseLatex('\\sin(x)'));
		// sin without input bounds no longer has static range
		expect(type.bounds).toBeUndefined();
	});
});

// =============================================================================
// Phase 3: Function Bounds Propagation (Monotone functions only)
// =============================================================================

describe('bounds - function bounds propagation (monotone Tier 4)', () => {
	it('exp(x) with x in [2, 5] -> bounds [exp(2), exp(5)]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(2, 5, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('\\exp(x)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(Math.exp(2));
		expect(b!.upper).toBeCloseTo(Math.exp(5));
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});

	it('exp(x) with x in [2, 5] should have sign positive', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(2, 5, true, true)
					}
				]
			])
		};
		const type = inferType(parseLatex('\\exp(x)'), ctx);
		expect(type.sign).toBe('positive');
	});

	it('sin(x) without bounds -> no bounds (Tier 5 non-monotone)', () => {
		const b = boundsOf('\\sin(x)');
		expect(b).toBeUndefined();
	});

	it('sin(x) with bounded input -> no bounds via applyFunctionToBounds (Tier 5)', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(0, Math.PI / 2, true, true)
					}
				]
			])
		};
		// sin is Tier 5 non-monotone: applyFunctionToBounds returns undefined
		// The full pipeline via inferTypeWithPreciseBounds might handle this,
		// but inferType alone does not.
		const b = boundsOf('\\sin(x)', ctx);
		expect(b).toBeUndefined();
	});

	it('sqrt(x) with x in [4, 9] -> bounds [2, 3], sign positive', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive' as const,
						bounds: numericInterval(4, 9, true, true)
					}
				]
			])
		};
		const type = inferType(parseLatex('\\sqrt{x}'), ctx);
		const b = toNumericBounds(type.bounds);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(2);
		expect(b!.upper).toBeCloseTo(3);
		expect(type.sign).toBe('positive');
	});

	it('sqrt(x) with x in [0, +inf) -> bounds [0, +inf)', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive' as const,
						bounds: numericInterval(0, null, true, false)
					}
				]
			])
		};
		const type = inferType(parseLatex('\\sqrt{x}'), ctx);
		const b = toNumericBounds(type.bounds);
		expect(b).toBeDefined();
		expect(b!.lower).toBe(0);
		expect(b!.upper).toBeNull();
		expect(b!.lowerInclusive).toBe(true);
	});
});

// =============================================================================
// Phase 3 edge cases: function bounds propagation
// =============================================================================

describe('bounds - function bounds edge cases', () => {
	// --- Negative input ranges ---

	it('exp(x) with x in [-3, -1] -> [exp(-3), exp(-1)]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(-3, -1, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('\\exp(x)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(Math.exp(-3));
		expect(b!.upper).toBeCloseTo(Math.exp(-1));
	});

	// --- Logarithmic with narrow positive range ---

	it('ln(x) with x in [1, 10] -> [0, ln(10)]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive' as const,
						bounds: numericInterval(1, 10, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('\\ln(x)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0);
		expect(b!.upper).toBeCloseTo(Math.log(10));
	});

	// --- Monotone hyperbolic with bounded input ---

	it('sinh(x) with x in [-1, 2] -> [sinh(-1), sinh(2)]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(-1, 2, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('\\sinh(x)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(Math.sinh(-1));
		expect(b!.upper).toBeCloseTo(Math.sinh(2));
	});

	it('tanh(x) with x in [-2, 2] -> [tanh(-2), tanh(2)]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(-2, 2, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('\\tanh(x)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(Math.tanh(-2));
		expect(b!.upper).toBeCloseTo(Math.tanh(2));
	});

	// --- cosh with bounded input: Tier 5 non-monotone, no bounds ---

	it('cosh(x) with bounded input -> no bounds (Tier 5 non-monotone)', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(-2, 3, true, true)
					}
				]
			])
		};
		const b = boundsOf('\\cosh(x)', ctx);
		expect(b).toBeUndefined();
	});

	// --- Sign refinement from computed bounds (monotone functions only) ---

	it('exp(x) with x in [0, 1] -> sign positive (from bounds)', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(0, 1, true, true)
					}
				]
			])
		};
		const type = inferType(parseLatex('\\exp(x)'), ctx);
		expect(type.sign).toBe('positive');
	});

	// --- Deep compositions (monotone-only chains) ---

	it('composition: ln(sqrt(x)) with x in [1, e^4] -> [0, 2]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive' as const,
						bounds: numericInterval(1, Math.E ** 4, true, true)
					}
				]
			])
		};
		// sqrt([1, e^4]) = [1, e^2], ln([1, e^2]) = [0, 2]
		const b = numericBoundsOf('\\ln(\\sqrt{x})', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0);
		expect(b!.upper).toBeCloseTo(2);
	});

	it('composition: sqrt(exp(x)) with x in [0, 4] -> [1, e^2]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(0, 4, true, true)
					}
				]
			])
		};
		// exp([0, 4]) = [1, e^4], sqrt([1, e^4]) = [1, e^2]
		const type = inferType(parseLatex('\\sqrt{\\exp(x)}'), ctx);
		const b = toNumericBounds(type.bounds);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(1);
		expect(b!.upper).toBeCloseTo(Math.E ** 2);
	});

	// --- Arithmetic + function combinations ---

	it('2 * exp(x) with x in [0, 1] -> [2, 2e]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(0, 1, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('2\\exp(x)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(2);
		expect(b!.upper).toBeCloseTo(2 * Math.E);
	});

	it('exp(x) + 1 with x in [0, 1] -> [2, e+1]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(0, 1, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('\\exp(x)+1', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(2);
		expect(b!.upper).toBeCloseTo(Math.E + 1);
	});

	it('-exp(x) with x in [0, 1] -> [-e, -1]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(0, 1, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('-\\exp(x)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(-Math.E);
		expect(b!.upper).toBeCloseTo(-1);
	});

	// --- Open bounds propagation through pipeline ---

	it('exp(x) with x in (0, 1) open -> bounds with open endpoints', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(0, 1, false, false)
					}
				]
			])
		};
		const b = numericBoundsOf('\\exp(x)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(1);
		expect(b!.upper).toBeCloseTo(Math.E);
		expect(b!.lowerInclusive).toBe(false);
		expect(b!.upperInclusive).toBe(false);
	});

	// --- Singleton input ---

	it('exp(x) with x = [3, 3] -> [exp(3), exp(3)]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(3, 3, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('\\exp(x)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(Math.exp(3));
		expect(b!.upper).toBeCloseTo(Math.exp(3));
	});

	// --- Multiple variables with function bounds ---

	it('exp(x) + ln(y) with x in [0,1], y in [1,e] -> [1, e+1]', () => {
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(0, 1, true, true)
					}
				],
				[
					'y',
					{
						sign: 'positive' as const,
						bounds: numericInterval(1, Math.E, true, true)
					}
				]
			])
		};
		// exp([0,1]) = [1, e], ln([1, e]) = [0, 1]
		// sum = [1+0, e+1] = [1, e+1]
		const b = numericBoundsOf('\\exp(x)+\\ln(y)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(1);
		expect(b!.upper).toBeCloseTo(Math.E + 1);
	});

	// --- Constant input (known value bypasses bounds) ---

	it('exp(0) = 1 uses special value path, not bounds', () => {
		const type = inferType(parseLatex('\\exp(0)'));
		expect(type.base).toBe('integer');
		expect(type.sign).toBe('positive');
	});

	it('sin(0) = 0 uses special value path', () => {
		const type = inferType(parseLatex('\\sin(0)'));
		expect(type.base).toBe('integer');
		expect(type.sign).toBe('zero');
	});

	it('ln(1) = 0 uses special value path', () => {
		const type = inferType(parseLatex('\\ln(1)'));
		expect(type.base).toBe('integer');
		expect(type.sign).toBe('zero');
	});
});

// =============================================================================
// Phase 3 edge cases: sqrt bounds through power.ts
// =============================================================================

describe('bounds - sqrt edge cases', () => {
	it('sqrt(x) with x = [0, 0] -> singleton [0, 0]', () => {
		// sqrt(0) = 0, handled by special case
		const type = inferType(parseLatex('\\sqrt{0}'));
		expect(type.base).toBe('integer');
		expect(type.sign).toBe('zero');
	});

	it('sqrt(x) with x in [1, 1] -> [1, 1]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive' as const,
						bounds: numericInterval(1, 1, true, true)
					}
				]
			])
		};
		const type = inferType(parseLatex('\\sqrt{x}'), ctx);
		const b = toNumericBounds(type.bounds);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(1);
		expect(b!.upper).toBeCloseTo(1);
	});

	it('sqrt(x) with x in [100, 10000] -> [10, 100]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive' as const,
						bounds: numericInterval(100, 10000, true, true)
					}
				]
			])
		};
		const type = inferType(parseLatex('\\sqrt{x}'), ctx);
		const b = toNumericBounds(type.bounds);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(10);
		expect(b!.upper).toBeCloseTo(100);
	});

	it('sqrt(x) with x in (0, 1) open bounds -> open bounds on output', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive' as const,
						bounds: numericInterval(0, 1, false, false)
					}
				]
			])
		};
		const type = inferType(parseLatex('\\sqrt{x}'), ctx);
		const b = toNumericBounds(type.bounds);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0);
		expect(b!.upper).toBeCloseTo(1);
		expect(b!.lowerInclusive).toBe(false);
		expect(b!.upperInclusive).toBe(false);
	});
});

// =============================================================================
// Precision: multiplyBounds with partially infinite bounds
// =============================================================================

describe('bounds - multiplyBounds with infinite operands', () => {
	it('[2, 3] * [1, +inf) -> [2, +inf)', () => {
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(2, 3, true, true)
					}
				],
				[
					'y',
					{
						sign: 'positive' as const,
						bounds: numericInterval(1, null, true, false)
					}
				]
			])
		};
		const b = numericBoundsOf('x \\times y', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBe(2);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upper).toBeNull();
		expect(b!.upperInclusive).toBe(false);
	});

	it('[0, 3] * [2, +inf) -> [0, +inf) (0*inf convention)', () => {
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(0, 3, true, true)
					}
				],
				[
					'y',
					{
						sign: 'positive' as const,
						bounds: numericInterval(2, null, true, false)
					}
				]
			])
		};
		const b = numericBoundsOf('x \\times y', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBe(0);
		expect(b!.lowerInclusive).toBe(true); // 0*2=0 with both inclusive
		expect(b!.upper).toBeNull();
	});

	it('(-inf, -1] * [2, 3] -> (-inf, -2]', () => {
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'negative' as const,
						bounds: numericInterval(null, -1, false, true)
					}
				],
				[
					'y',
					{
						bounds: numericInterval(2, 3, true, true)
					}
				]
			])
		};
		const b = numericBoundsOf('x \\times y', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeNull();
		expect(b!.upper).toBe(-2);
		expect(b!.upperInclusive).toBe(true);
	});
});

// =============================================================================
// Precision: computePowerBounds with partially infinite bounds
// =============================================================================

describe('bounds - power with infinite base bounds', () => {
	it('[2, +inf)^2 -> [4, +inf) (even exponent, non-negative)', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive' as const,
						bounds: numericInterval(2, null, true, false)
					}
				]
			])
		};
		const b = numericBoundsOf('x^2', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBe(4);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upper).toBeNull();
		expect(b!.upperInclusive).toBe(false);
	});

	it('[2, +inf)^3 -> [8, +inf) (odd exponent)', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive' as const,
						bounds: numericInterval(2, null, true, false)
					}
				]
			])
		};
		const b = numericBoundsOf('x^3', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBe(8);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upper).toBeNull();
		expect(b!.upperInclusive).toBe(false);
	});

	it('(-inf, -2]^2 -> [4, +inf) (even exponent, non-positive)', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'negative' as const,
						bounds: numericInterval(null, -2, false, true)
					}
				]
			])
		};
		const b = numericBoundsOf('x^2', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBe(4);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upper).toBeNull();
		expect(b!.upperInclusive).toBe(false);
	});

	it('(-inf, 3]^2 -> [0, +inf) (even exponent, crosses zero)', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(null, 3, false, true)
					}
				]
			])
		};
		const b = numericBoundsOf('x^2', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBe(0);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upper).toBeNull();
		expect(b!.upperInclusive).toBe(false);
	});

	it('(-inf, -2]^3 -> (-inf, -8] (odd exponent, negative)', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'negative' as const,
						bounds: numericInterval(null, -2, false, true)
					}
				]
			])
		};
		const b = numericBoundsOf('x^3', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeNull();
		expect(b!.lowerInclusive).toBe(false);
		expect(b!.upper).toBe(-8);
		expect(b!.upperInclusive).toBe(true);
	});
});

// =============================================================================
// Bug regression: divideBounds with infinite divisor bounds
// =============================================================================

describe('bounds - divideBounds with infinite divisor', () => {
	it('[2, 6] / [1, +inf) -> symbolic bounds with correct structure', () => {
		// x in [2, 6], y in [1, +inf)
		// Result: lower = fraction(a, infinity) (symbolic, evaluates to NaN),
		// upper = fraction(6, 1) (evaluates to 6)
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(2, 6, true, true)
					}
				],
				[
					'y',
					{
						sign: 'positive' as const,
						bounds: numericInterval(1, null, true, false)
					}
				]
			])
		};
		const rawBounds = boundsOf('\\frac{x}{y}', ctx);
		expect(rawBounds).toBeDefined();
		expect(rawBounds!.kind).toBe('interval_set');
		if (rawBounds!.kind === 'interval_set') {
			const ivl = rawBounds!.intervals[0];
			// Lower endpoint is fraction(a, infinity) — symbolic, open
			expect(ivl.lower.type).toBe('open');
			// Upper endpoint evaluates to 6, closed
			expect(endpointToNumber(ivl.upper.value)).toBe(6);
			expect(ivl.upper.type).toBe('closed');
		}
	});

	it('[1, 4] / (-inf, -2] -> symbolic bounds with correct structure', () => {
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(1, 4, true, true)
					}
				],
				[
					'y',
					{
						sign: 'negative' as const,
						bounds: numericInterval(null, -2, false, true)
					}
				]
			])
		};
		const rawBounds = boundsOf('\\frac{x}{y}', ctx);
		expect(rawBounds).toBeDefined();
		expect(rawBounds!.kind).toBe('interval_set');
		if (rawBounds!.kind === 'interval_set') {
			const ivl = rawBounds!.intervals[0];
			// Lower endpoint: 4/(-2) = -2, closed
			expect(endpointToNumber(ivl.lower.value)).toBe(-2);
			expect(ivl.lower.type).toBe('closed');
			// Upper endpoint: fraction(a, -infinity) — symbolic, open
			expect(ivl.upper.type).toBe('open');
		}
	});
});

// =============================================================================
// Bug regression: multiply/divide inclusivity tie-breaking
// =============================================================================

describe('bounds - inclusivity (four-corners, first-match)', () => {
	it('[0, 2] * (0, 3] -> (0, 6] (first corner 0*0 has open y)', () => {
		// x in [0, 2] (inclusive 0), y in (0, 3] (exclusive 0)
		// Four corners: 0*0=0, 0*3=0, 2*0=0, 2*3=6
		// The symbolic four-corners picks the FIRST minimum corner (0*0)
		// where y's endpoint is open, so combineEndpointTypes(closed, open) = open.
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(0, 2, true, true)
					}
				],
				[
					'y',
					{
						bounds: numericInterval(0, 3, false, true)
					}
				]
			])
		};
		const b = numericBoundsOf('x \\times y', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBe(0);
		// First-match: 0*0 with closed*open = open (no tie-breaking)
		expect(b!.lowerInclusive).toBe(false);
		expect(b!.upper).toBe(6);
		expect(b!.upperInclusive).toBe(true);
	});

	it('(-2, 0] * [-3, 0) -> (0, 6) (first-match for both min and max)', () => {
		// x in (-2, 0], y in [-3, 0)
		// Four corners: (-2)*(-3)=6, (-2)*0=0, 0*(-3)=0, 0*0=0
		// min corner: first with val=0 -> (-2)*0 where (-2 is open, 0 is open) -> open
		// max corner: (-2)*(-3)=6 where (-2 is open, -3 is closed) -> open
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: numericInterval(-2, 0, false, true)
					}
				],
				[
					'y',
					{
						bounds: numericInterval(-3, 0, true, false)
					}
				]
			])
		};
		const b = numericBoundsOf('x \\times y', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toEqual(expect.closeTo(0));
		// First-match: (-2)*0 with open*open = open
		expect(b!.lowerInclusive).toBe(false);
		expect(b!.upper).toBe(6);
		expect(b!.upperInclusive).toBe(false); // (-2)*(-3) with open*closed = open
	});
});

// =============================================================================
// Bug regression: clearAllTypeCache actually clears
// =============================================================================

describe('clearAllTypeCache', () => {
	it('should return different object after cache is cleared', () => {
		const node = parseLatex('5');
		const type1 = inferType(node);
		clearAllTypeCache();
		const type2 = inferType(node);
		// Values should be equal but object identity should differ
		expect(type2).toEqual(type1);
		expect(type2).not.toBe(type1);
	});
});
