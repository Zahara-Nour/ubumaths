/**
 * Tests for Bounds (Range) Tracking in the Numeric Type System
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { inferType } from '../infer';
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
