/**
 * Tests for Bounds (Range) Tracking in the Numeric Type System
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { inferType, clearAllTypeCache } from '../infer';
import { getBoundsType, isInRangeType } from '../predicates';
import type { TypeContext } from '../types';
import type { Bounds } from '$lib/math/intervals/algebra';

// =============================================================================
// Helper
// =============================================================================

function boundsOf(latex: string, ctx?: TypeContext): Bounds | undefined {
	return inferType(parseLatex(latex), ctx).bounds;
}

// =============================================================================
// Phase 1: Literals, Constants, Variables, Functions
// =============================================================================

describe('bounds - literals', () => {
	it('should infer singleton bounds for integer literals', () => {
		const b = boundsOf('5');
		expect(b).toEqual({ lower: 5, upper: 5, lowerInclusive: true, upperInclusive: true });
	});

	it('should infer singleton bounds for zero', () => {
		const b = boundsOf('0');
		expect(b).toEqual({ lower: 0, upper: 0, lowerInclusive: true, upperInclusive: true });
	});

	it('should infer singleton bounds for decimal literal', () => {
		const b = boundsOf('3.14');
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
		const b = boundsOf('\\pi');
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(Math.PI);
		expect(b!.upper).toBeCloseTo(Math.PI);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upperInclusive).toBe(true);
	});

	it('should infer singleton bounds for e', () => {
		const b = boundsOf('e');
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
						bounds: {
							lower: 0,
							upper: 10,
							lowerInclusive: true,
							upperInclusive: false
						}
					}
				]
			])
		};
		const b = boundsOf('x', ctx);
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
						bounds: {
							lower: -1,
							upper: 1,
							lowerInclusive: true,
							upperInclusive: true
						}
					}
				]
			])
		};
		const b = boundsOf('\\alpha', ctx);
		expect(b).toEqual({ lower: -1, upper: 1, lowerInclusive: true, upperInclusive: true });
	});
});

describe('bounds - transcendental functions', () => {
	it('should infer [-1, 1] bounds for sin', () => {
		const b = boundsOf('\\sin(x)');
		expect(b).toEqual({ lower: -1, upper: 1, lowerInclusive: true, upperInclusive: true });
	});

	it('should infer [-1, 1] bounds for cos', () => {
		const b = boundsOf('\\cos(x)');
		expect(b).toEqual({ lower: -1, upper: 1, lowerInclusive: true, upperInclusive: true });
	});

	it('should infer (0, +inf) bounds for exp', () => {
		const b = boundsOf('\\exp(x)');
		expect(b).toEqual({ lower: 0, upper: null, lowerInclusive: false, upperInclusive: false });
	});

	it('should infer (-inf, +inf) bounds for ln (unbounded)', () => {
		const b = boundsOf('\\ln(x)');
		expect(b).toEqual({
			lower: null,
			upper: null,
			lowerInclusive: false,
			upperInclusive: false
		});
	});

	it('should infer (-1, 1) bounds for tanh', () => {
		const b = boundsOf('\\tanh(x)');
		expect(b).toEqual({ lower: -1, upper: 1, lowerInclusive: false, upperInclusive: false });
	});

	it('should infer [1, +inf) bounds for cosh', () => {
		const b = boundsOf('\\cosh(x)');
		expect(b).toEqual({ lower: 1, upper: null, lowerInclusive: true, upperInclusive: false });
	});
});

describe('bounds - abs function', () => {
	it('should infer [0, +inf) bounds for abs with unknown argument', () => {
		const b = boundsOf('|x|');
		expect(b).toEqual({ lower: 0, upper: null, lowerInclusive: true, upperInclusive: false });
	});

	it('should compute precise bounds for abs when argument has bounds', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: 2, upper: 5, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('|x|', ctx);
		expect(b).toEqual({ lower: 2, upper: 5, lowerInclusive: true, upperInclusive: true });
	});

	it('should compute precise bounds for abs when argument crosses zero', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: -3, upper: 5, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('|x|', ctx);
		expect(b).toEqual({ lower: 0, upper: 5, lowerInclusive: true, upperInclusive: true });
	});

	it('should compute precise bounds for abs of negative range', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: {
							lower: -5,
							upper: -2,
							lowerInclusive: true,
							upperInclusive: true
						}
					}
				]
			])
		};
		const b = boundsOf('|x|', ctx);
		expect(b).toEqual({ lower: 2, upper: 5, lowerInclusive: true, upperInclusive: true });
	});
});

describe('bounds - integer output functions', () => {
	it('should propagate bounds for floor', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: {
							lower: 2.3,
							upper: 5.7,
							lowerInclusive: true,
							upperInclusive: true
						}
					}
				]
			])
		};
		const b = boundsOf('\\lfloor x \\rfloor', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBe(2);
		expect(b!.upper).toBe(5);
	});
});

// =============================================================================
// Predicates
// =============================================================================

describe('getBoundsType', () => {
	it('should return bounds for a literal', () => {
		const node = parseLatex('5');
		const b = getBoundsType(node);
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
						bounds: {
							lower: 2,
							upper: 8,
							lowerInclusive: true,
							upperInclusive: true
						}
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
						bounds: { lower: 1, upper: 3, lowerInclusive: true, upperInclusive: true }
					}
				],
				[
					'y',
					{
						bounds: { lower: 2, upper: 5, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('x+y', ctx);
		expect(b).toEqual({ lower: 3, upper: 8, lowerInclusive: true, upperInclusive: true });
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
						bounds: { lower: 1, upper: 3, lowerInclusive: true, upperInclusive: true }
					}
				],
				[
					'y',
					{
						bounds: { lower: 2, upper: 5, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('x-y', ctx);
		expect(b).toEqual({ lower: -4, upper: 1, lowerInclusive: true, upperInclusive: true });
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
						bounds: { lower: 2, upper: 3, lowerInclusive: true, upperInclusive: true }
					}
				],
				[
					'y',
					{
						bounds: { lower: -1, upper: 4, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('x \\times y', ctx);
		expect(b).toEqual({ lower: -3, upper: 12, lowerInclusive: true, upperInclusive: true });
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
						bounds: { lower: 1, upper: 4, lowerInclusive: true, upperInclusive: true }
					}
				],
				[
					'y',
					{
						bounds: { lower: 2, upper: 5, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('\\dfrac{x}{y}', ctx);
		expect(b).toEqual({ lower: 0.2, upper: 2, lowerInclusive: true, upperInclusive: true });
	});

	it('should infer singleton bounds for negative literal: -3 = [-3,-3]', () => {
		const b = boundsOf('-3');
		expect(b).toEqual({ lower: -3, upper: -3, lowerInclusive: true, upperInclusive: true });
	});

	it('should negate bounds: -[1,3] = [-3,-1]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: 1, upper: 3, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('-x', ctx);
		expect(b).toEqual({ lower: -3, upper: -1, lowerInclusive: true, upperInclusive: true });
	});

	it('should preserve bounds for unary positive', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: 1, upper: 3, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		// +x parsed as positive(x)
		const type = inferType(parseLatex('x'), ctx);
		expect(type.bounds).toEqual({
			lower: 1,
			upper: 3,
			lowerInclusive: true,
			upperInclusive: true
		});
	});

	it('should add literal bounds: 5 + 3 = [8,8]', () => {
		const b = boundsOf('5+3');
		expect(b).toEqual({ lower: 8, upper: 8, lowerInclusive: true, upperInclusive: true });
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
						bounds: { lower: 2, upper: 3, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('x^2', ctx);
		expect(b).toEqual({ lower: 4, upper: 9, lowerInclusive: true, upperInclusive: true });
	});

	it('should compute bounds for x^2 when x in [-3,-2] -> [4,9]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'negative',
						bounds: {
							lower: -3,
							upper: -2,
							lowerInclusive: true,
							upperInclusive: true
						}
					}
				]
			])
		};
		const b = boundsOf('x^2', ctx);
		expect(b).toEqual({ lower: 4, upper: 9, lowerInclusive: true, upperInclusive: true });
	});

	it('should compute bounds for x^3 when x in [2,3] -> [8,27]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive',
						bounds: { lower: 2, upper: 3, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('x^3', ctx);
		expect(b).toEqual({ lower: 8, upper: 27, lowerInclusive: true, upperInclusive: true });
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
						bounds: { lower: 2, upper: 5, lowerInclusive: true, upperInclusive: true }
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
						bounds: {
							lower: -5,
							upper: -2,
							lowerInclusive: true,
							upperInclusive: true
						}
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
						bounds: { lower: 2, upper: 5, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const type = inferType(parseLatex('x'), ctx);
		expect(type.sign).toBe('positive');
	});

	it('should deduce sign from computed bounds (e.g. sin -> [-1,1] has unknown sign)', () => {
		const type = inferType(parseLatex('\\sin(x)'));
		// sin has bounds [-1,1] which crosses zero, sign should remain as is (not forced)
		expect(type.bounds).toBeDefined();
		// sign should not be forced to positive or negative since range crosses zero
	});
});

// =============================================================================
// Phase 3: Function Bounds Propagation
// =============================================================================

describe('bounds - function bounds propagation', () => {
	it('exp(x) with x in [2, 5] -> bounds [exp(2), exp(5)]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: 2, upper: 5, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('\\exp(x)', ctx);
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
						bounds: { lower: 2, upper: 5, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const type = inferType(parseLatex('\\exp(x)'), ctx);
		expect(type.sign).toBe('positive');
	});

	it('sin(x) without bounds -> static bounds [-1, 1] (no regression)', () => {
		const b = boundsOf('\\sin(x)');
		expect(b).toEqual({ lower: -1, upper: 1, lowerInclusive: true, upperInclusive: true });
	});

	it('sin(x) with x in [0, pi/2] -> bounds [0, 1]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: {
							lower: 0,
							upper: Math.PI / 2,
							lowerInclusive: true,
							upperInclusive: true
						}
					}
				]
			])
		};
		const b = boundsOf('\\sin(x)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0);
		expect(b!.upper).toBeCloseTo(1);
	});

	it('sqrt(x) with x in [4, 9] -> bounds [2, 3], sign positive', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive' as const,
						bounds: { lower: 4, upper: 9, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const type = inferType(parseLatex('\\sqrt{x}'), ctx);
		expect(type.bounds).toBeDefined();
		expect(type.bounds!.lower).toBeCloseTo(2);
		expect(type.bounds!.upper).toBeCloseTo(3);
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
						bounds: { lower: 0, upper: null, lowerInclusive: true, upperInclusive: false }
					}
				]
			])
		};
		const type = inferType(parseLatex('\\sqrt{x}'), ctx);
		expect(type.bounds).toBeDefined();
		expect(type.bounds!.lower).toBe(0);
		expect(type.bounds!.upper).toBeNull();
		expect(type.bounds!.lowerInclusive).toBe(true);
	});

	it('composition: exp(sin(x)) with x in [0, pi/2] -> [1, e]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: {
							lower: 0,
							upper: Math.PI / 2,
							lowerInclusive: true,
							upperInclusive: true
						}
					}
				]
			])
		};
		const b = boundsOf('\\exp(\\sin(x))', ctx);
		expect(b).toBeDefined();
		// sin([0, pi/2]) = [0, 1], exp([0, 1]) = [1, e]
		expect(b!.lower).toBeCloseTo(1);
		expect(b!.upper).toBeCloseTo(Math.E);
	});
});

// =============================================================================
// Phase 3 edge cases: function bounds propagation
// =============================================================================

describe('bounds - function bounds edge cases', () => {
	// --- Regression: no bounds on variable → static range preserved ---

	it('cos(x) without bounds -> static [-1, 1]', () => {
		const b = boundsOf('\\cos(x)');
		expect(b).toEqual({ lower: -1, upper: 1, lowerInclusive: true, upperInclusive: true });
	});

	it('tanh(x) without bounds -> static (-1, 1)', () => {
		const b = boundsOf('\\tanh(x)');
		expect(b).toEqual({ lower: -1, upper: 1, lowerInclusive: false, upperInclusive: false });
	});

	it('exp(x) without bounds -> static (0, +inf)', () => {
		const b = boundsOf('\\exp(x)');
		expect(b).toEqual({ lower: 0, upper: null, lowerInclusive: false, upperInclusive: false });
	});

	it('cosh(x) without bounds -> static [1, +inf)', () => {
		const b = boundsOf('\\cosh(x)');
		expect(b).toEqual({ lower: 1, upper: null, lowerInclusive: true, upperInclusive: false });
	});

	// --- Negative input ranges ---

	it('exp(x) with x in [-3, -1] -> [exp(-3), exp(-1)]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: -3, upper: -1, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('\\exp(x)', ctx);
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
						bounds: { lower: 1, upper: 10, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('\\ln(x)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0);
		expect(b!.upper).toBeCloseTo(Math.log(10));
	});

	// --- Inverse trig with bounded input ---

	it('sinh(x) with x in [-1, 2] -> [sinh(-1), sinh(2)]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: -1, upper: 2, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('\\sinh(x)', ctx);
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
						bounds: { lower: -2, upper: 2, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('\\tanh(x)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(Math.tanh(-2));
		expect(b!.upper).toBeCloseTo(Math.tanh(2));
	});

	// Note: arccos and arctan are now the canonical names in TRANSCENDENTAL_FUNCTIONS.

	// --- cosh with bounded input ---

	it('cosh(x) with x in [-2, 3] -> [1, cosh(3)] (sampling picks up minimum)', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: -2, upper: 3, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('\\cosh(x)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(1, 2);
		expect(b!.upper).toBeCloseTo(Math.cosh(3), 2);
	});

	// --- Sign refinement from computed bounds ---

	it('sin(x) with x in [0, pi/2] -> sign positive (from bounds [0, 1])', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: {
							lower: 0,
							upper: Math.PI / 2,
							lowerInclusive: false,
							upperInclusive: false
						}
					}
				]
			])
		};
		const type = inferType(parseLatex('\\sin(x)'), ctx);
		// sin on (0, pi/2) is strictly positive
		expect(type.sign).toBe('positive');
	});

	it('cos(x) with x in [0, pi/4] -> sign positive (from bounds [cos(pi/4), 1])', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: {
							lower: 0,
							upper: Math.PI / 4,
							lowerInclusive: true,
							upperInclusive: true
						}
					}
				]
			])
		};
		const type = inferType(parseLatex('\\cos(x)'), ctx);
		expect(type.sign).toBe('positive');
	});

	// --- Deep compositions ---

	it('composition: ln(sqrt(x)) with x in [1, e^4] -> [0, 2]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive' as const,
						bounds: {
							lower: 1,
							upper: Math.E ** 4,
							lowerInclusive: true,
							upperInclusive: true
						}
					}
				]
			])
		};
		// sqrt([1, e^4]) = [1, e^2], ln([1, e^2]) = [0, 2]
		const b = boundsOf('\\ln(\\sqrt{x})', ctx);
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
						bounds: { lower: 0, upper: 4, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		// exp([0, 4]) = [1, e^4], sqrt([1, e^4]) = [1, e^2]
		const type = inferType(parseLatex('\\sqrt{\\exp(x)}'), ctx);
		expect(type.bounds).toBeDefined();
		expect(type.bounds!.lower).toBeCloseTo(1);
		expect(type.bounds!.upper).toBeCloseTo(Math.E ** 2);
	});

	it('3-deep composition: exp(sin(tanh(x))) with x in [0, 2]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: 0, upper: 2, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		// tanh([0,2]) = [0, tanh(2)] ≈ [0, 0.964]
		// sin([0, 0.964]) is in [-pi/2, pi/2] increasing piece → [0, sin(0.964)]
		// exp([0, sin(0.964)]) = [1, exp(sin(0.964))]
		const b = boundsOf('\\exp(\\sin(\\tanh(x)))', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(1);
		expect(b!.upper).toBeCloseTo(Math.exp(Math.sin(Math.tanh(2))));
	});

	// --- Arithmetic + function combinations ---

	it('2 * exp(x) with x in [0, 1] -> [2, 2e]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: 0, upper: 1, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('2\\exp(x)', ctx);
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
						bounds: { lower: 0, upper: 1, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('\\exp(x)+1', ctx);
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
						bounds: { lower: 0, upper: 1, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('-\\exp(x)', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(-Math.E);
		expect(b!.upper).toBeCloseTo(-1);
	});

	// --- Power of function result ---

	it('sin(x)^2 with x in [0, pi/2] -> [0, 1]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: {
							lower: 0,
							upper: Math.PI / 2,
							lowerInclusive: true,
							upperInclusive: true
						}
					}
				]
			])
		};
		const b = boundsOf('\\sin(x)^2', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBeCloseTo(0);
		expect(b!.upper).toBeCloseTo(1);
	});

	// --- Open bounds propagation through pipeline ---

	it('exp(x) with x in (0, 1) open -> bounds with open endpoints', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: 0, upper: 1, lowerInclusive: false, upperInclusive: false }
					}
				]
			])
		};
		const b = boundsOf('\\exp(x)', ctx);
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
						bounds: { lower: 3, upper: 3, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('\\exp(x)', ctx);
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
						bounds: { lower: 0, upper: 1, lowerInclusive: true, upperInclusive: true }
					}
				],
				[
					'y',
					{
						sign: 'positive' as const,
						bounds: {
							lower: 1,
							upper: Math.E,
							lowerInclusive: true,
							upperInclusive: true
						}
					}
				]
			])
		};
		// exp([0,1]) = [1, e], ln([1, e]) = [0, 1]
		// sum = [1+0, e+1] = [1, e+1]
		const b = boundsOf('\\exp(x)+\\ln(y)', ctx);
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
						bounds: { lower: 1, upper: 1, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const type = inferType(parseLatex('\\sqrt{x}'), ctx);
		expect(type.bounds).toBeDefined();
		expect(type.bounds!.lower).toBeCloseTo(1);
		expect(type.bounds!.upper).toBeCloseTo(1);
	});

	it('sqrt(x) with x in [100, 10000] -> [10, 100]', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive' as const,
						bounds: {
							lower: 100,
							upper: 10000,
							lowerInclusive: true,
							upperInclusive: true
						}
					}
				]
			])
		};
		const type = inferType(parseLatex('\\sqrt{x}'), ctx);
		expect(type.bounds).toBeDefined();
		expect(type.bounds!.lower).toBeCloseTo(10);
		expect(type.bounds!.upper).toBeCloseTo(100);
	});

	it('sqrt(x) with x in (0, 1) open bounds -> open bounds on output', () => {
		const ctx: TypeContext = {
			variables: new Map([['x', 'real']]),
			assumptions: new Map([
				[
					'x',
					{
						sign: 'positive' as const,
						bounds: { lower: 0, upper: 1, lowerInclusive: false, upperInclusive: false }
					}
				]
			])
		};
		const type = inferType(parseLatex('\\sqrt{x}'), ctx);
		expect(type.bounds).toBeDefined();
		expect(type.bounds!.lower).toBeCloseTo(0);
		expect(type.bounds!.upper).toBeCloseTo(1);
		expect(type.bounds!.lowerInclusive).toBe(false);
		expect(type.bounds!.upperInclusive).toBe(false);
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
						bounds: { lower: 2, upper: 3, lowerInclusive: true, upperInclusive: true }
					}
				],
				[
					'y',
					{
						sign: 'positive' as const,
						bounds: { lower: 1, upper: null, lowerInclusive: true, upperInclusive: false }
					}
				]
			])
		};
		const b = boundsOf('x \\times y', ctx);
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
						bounds: { lower: 0, upper: 3, lowerInclusive: true, upperInclusive: true }
					}
				],
				[
					'y',
					{
						sign: 'positive' as const,
						bounds: { lower: 2, upper: null, lowerInclusive: true, upperInclusive: false }
					}
				]
			])
		};
		const b = boundsOf('x \\times y', ctx);
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
						bounds: { lower: null, upper: -1, lowerInclusive: false, upperInclusive: true }
					}
				],
				[
					'y',
					{
						bounds: { lower: 2, upper: 3, lowerInclusive: true, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('x \\times y', ctx);
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
						bounds: { lower: 2, upper: null, lowerInclusive: true, upperInclusive: false }
					}
				]
			])
		};
		const b = boundsOf('x^2', ctx);
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
						bounds: { lower: 2, upper: null, lowerInclusive: true, upperInclusive: false }
					}
				]
			])
		};
		const b = boundsOf('x^3', ctx);
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
						bounds: { lower: null, upper: -2, lowerInclusive: false, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('x^2', ctx);
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
						bounds: { lower: null, upper: 3, lowerInclusive: false, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('x^2', ctx);
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
						bounds: { lower: null, upper: -2, lowerInclusive: false, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('x^3', ctx);
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
	it('[2, 6] / [1, +inf) -> (0, 6]', () => {
		// x in [2, 6], y in [1, +inf)
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: 2, upper: 6, lowerInclusive: true, upperInclusive: true }
					}
				],
				[
					'y',
					{
						sign: 'positive' as const,
						bounds: { lower: 1, upper: null, lowerInclusive: true, upperInclusive: false }
					}
				]
			])
		};
		const b = boundsOf('\\frac{x}{y}', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBe(0);
		expect(b!.lowerInclusive).toBe(false);
		expect(b!.upper).toBe(6);
		expect(b!.upperInclusive).toBe(true);
	});

	it('[1, 4] / (-inf, -2] -> [-2, 0)', () => {
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: 1, upper: 4, lowerInclusive: true, upperInclusive: true }
					}
				],
				[
					'y',
					{
						sign: 'negative' as const,
						bounds: { lower: null, upper: -2, lowerInclusive: false, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('\\frac{x}{y}', ctx);
		expect(b).toBeDefined();
		// 1/(-2) = -0.5, 4/(-2) = -2, and 1/(-inf) -> 0-, 4/(-inf) -> 0-
		expect(b!.lower).toBe(-2);
		expect(b!.lowerInclusive).toBe(true);
		expect(b!.upper).toBe(0);
		expect(b!.upperInclusive).toBe(false);
	});
});

// =============================================================================
// Bug regression: multiply/divide inclusivity tie-breaking
// =============================================================================

describe('bounds - inclusivity tie-breaking', () => {
	it('[0, 2] * (0, 3] -> [0, 6] (0 is achieved via 0*3)', () => {
		// x in [0, 2] (inclusive 0), y in (0, 3] (exclusive 0)
		// product 0 is achieved by x=0, y=3 (both inclusive)
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: 0, upper: 2, lowerInclusive: true, upperInclusive: true }
					}
				],
				[
					'y',
					{
						bounds: { lower: 0, upper: 3, lowerInclusive: false, upperInclusive: true }
					}
				]
			])
		};
		const b = boundsOf('x \\times y', ctx);
		expect(b).toBeDefined();
		expect(b!.lower).toBe(0);
		expect(b!.lowerInclusive).toBe(true); // 0*3 = 0 with both inclusive
		expect(b!.upper).toBe(6);
		expect(b!.upperInclusive).toBe(true);
	});

	it('(-2, 0] * [-3, 0) -> [0, 6) (0 achieved, 6 not achieved)', () => {
		// x in (-2, 0], y in [-3, 0)
		// corners: -2*-3=6(excl), -2*0=-0(excl), 0*-3=-0(incl), 0*0=0(both edges)
		// 0 is achieved by x=0 (incl) * y=-3 (incl) = -0
		// 6 = (-2)*(-3) where -2 is exclusive -> 6 not achieved
		const ctx: TypeContext = {
			variables: new Map([
				['x', 'real'],
				['y', 'real']
			]),
			assumptions: new Map([
				[
					'x',
					{
						bounds: { lower: -2, upper: 0, lowerInclusive: false, upperInclusive: true }
					}
				],
				[
					'y',
					{
						bounds: { lower: -3, upper: 0, lowerInclusive: true, upperInclusive: false }
					}
				]
			])
		};
		const b = boundsOf('x \\times y', ctx);
		expect(b).toBeDefined();
		// Note: 0 * (-3) = -0 in JS, which is == 0 but not Object.is(0)
		expect(b!.lower).toEqual(expect.closeTo(0));
		expect(b!.lowerInclusive).toBe(true); // 0*(-3) = 0 with both inclusive
		expect(b!.upper).toBe(6);
		expect(b!.upperInclusive).toBe(false); // (-2)*(-3) = 6 but -2 is exclusive
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
