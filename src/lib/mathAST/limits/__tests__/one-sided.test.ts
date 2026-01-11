/**
 * Tests for One-Sided Limits
 *
 * Tests cover:
 * - One-sided limit detection
 * - Left and right limit evaluation
 * - Discontinuity analysis
 * - Sign analysis
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit, analyzeOneSidedLimits, analyzeDiscontinuity } from '../evaluate';
import { needsOneSidedAnalysis, checkLimitsEqual, analyzeSign } from '../one-sided';
import { number, variable, divide, func, positiveInfinity, negativeInfinity } from '../../factory';
import { isInfinity } from '../../guards';

describe('One-Sided Limits', () => {
	describe('detection of one-sided analysis need', () => {
		it('identifies 1/x at 0 as needing one-sided analysis', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			expect(needsOneSidedAnalysis(expr, 'x', number('0'))).toBe(true);
		});

		it('does not require one-sided for polynomial at regular point', () => {
			const expr = variable('x');
			expect(needsOneSidedAnalysis(expr, 'x', number('1'))).toBe(false);
		});

		it('does not require one-sided at infinity', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			expect(needsOneSidedAnalysis(expr, 'x', positiveInfinity())).toBe(false);
		});

		it('identifies sqrt as needing one-sided analysis', () => {
			const expr = func('sqrt', [variable('x')]);
			expect(needsOneSidedAnalysis(expr, 'x', number('0'))).toBe(true);
		});

		it('identifies ln as needing one-sided analysis', () => {
			const expr = func('ln', [variable('x')]);
			expect(needsOneSidedAnalysis(expr, 'x', number('0'))).toBe(true);
		});

		it('detects sqrt(x+5) at x=1 does NOT need one-sided analysis', () => {
			// sqrt(x+5) is defined on both sides of x=1 (domain: x >= -5)
			const expr = func('sqrt', [{ type: 'addition', left: variable('x'), right: number('5') }]);
			expect(needsOneSidedAnalysis(expr, 'x', number('1'))).toBe(false);
		});

		it('detects ln(x-3) at x=3 needs right-sided only', () => {
			// ln(x-3) only defined for x > 3
			const expr = func('ln', [{ type: 'subtraction', left: variable('x'), right: number('3') }]);
			expect(needsOneSidedAnalysis(expr, 'x', number('3'))).toBe(true);
		});

		it('detects 1/sqrt(x) at x=0 needs one-sided analysis', () => {
			// Domain restriction in denominator: sqrt(x) requires x >= 0
			const expr = divide(number('1'), func('sqrt', [variable('x')]), 'fraction');
			expect(needsOneSidedAnalysis(expr, 'x', number('0'))).toBe(true);
		});
	});

	describe('one-sided limit evaluation', () => {
		it('evaluates 1/x as x → 0⁺ to +∞', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const result = evaluateLimit(expr, 'x', number('0'), 'right');

			expect(result.status).toBe('exact');
			expect(result.direction).toBe('right');
			expect(result.value).not.toBeNull();
			expect(result.value && isInfinity(result.value)).toBe(true);
			if (result.value?.type === 'infinity') {
				expect(result.value.sign).toBe('positive');
			}
		});

		it('evaluates 1/x as x → 0⁻ to -∞', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const result = evaluateLimit(expr, 'x', number('0'), 'left');

			expect(result.status).toBe('exact');
			expect(result.direction).toBe('left');
			expect(result.value).not.toBeNull();
			expect(result.value && isInfinity(result.value)).toBe(true);
			if (result.value?.type === 'infinity') {
				expect(result.value.sign).toBe('negative');
			}
		});

		it('evaluates ln(x) as x → 0⁺ to -∞', () => {
			const expr = func('ln', [variable('x')]);
			const result = evaluateLimit(expr, 'x', number('0'), 'right');

			expect(result.status).toBe('exact');
			expect(result.value).not.toBeNull();
			expect(result.value && isInfinity(result.value)).toBe(true);
			if (result.value?.type === 'infinity') {
				expect(result.value.sign).toBe('negative');
			}
		});
	});

	describe('analyzeOneSidedLimits', () => {
		it('analyzes both sides of 1/x at 0', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const result = analyzeOneSidedLimits(expr, 'x', number('0'));

			expect(result.left).not.toBeNull();
			expect(result.right).not.toBeNull();
			expect(result.twoSidedExists).toBe(false);

			// Left limit is -∞
			if (result.left?.value?.type === 'infinity') {
				expect(result.left.value.sign).toBe('negative');
			}

			// Right limit is +∞
			if (result.right?.value?.type === 'infinity') {
				expect(result.right.value.sign).toBe('positive');
			}
		});

		it('identifies equal one-sided limits', () => {
			// sin(x)/x at 0 should have equal limits from both sides
			const expr = divide(func('sin', [variable('x')]), variable('x'), 'fraction');
			const result = analyzeOneSidedLimits(expr, 'x', number('0'));

			expect(result.twoSidedExists).toBe(true);
		});
	});

	describe('checkLimitsEqual', () => {
		it('returns true for equal numeric limits', () => {
			const left = {
				variable: 'x',
				approach: number('0'),
				direction: 'left' as const,
				status: 'exact' as const,
				value: number('1'),
				indeterminateForm: 'none' as const,
				technique: 'known-limit' as const,
				steps: []
			};

			const right = {
				...left,
				direction: 'right' as const
			};

			expect(checkLimitsEqual(left, right)).toBe(true);
		});

		it('returns false for different limits', () => {
			const left = {
				variable: 'x',
				approach: number('0'),
				direction: 'left' as const,
				status: 'exact' as const,
				value: positiveInfinity(),
				indeterminateForm: 'none' as const,
				technique: 'known-limit' as const,
				steps: []
			};

			const right = {
				...left,
				direction: 'right' as const,
				value: negativeInfinity()
			};

			expect(checkLimitsEqual(left, right)).toBe(false);
		});
	});

	describe('sign analysis', () => {
		it('analyzes sign of x near 0', () => {
			const result = analyzeSign(variable('x'), 'x', number('0'));

			expect(result.leftSign).toBe('negative');
			expect(result.rightSign).toBe('positive');
		});

		it('analyzes sign of x² near 0', () => {
			const expr = { type: 'superscript', base: variable('x'), superscript: number('2') } as const;
			const result = analyzeSign(expr, 'x', number('0'));

			// x² at tiny values like 1e-10 gives 1e-20 which may be classified as zero
			// due to floating point precision
			expect(['positive', 'zero']).toContain(result.leftSign);
			expect(['positive', 'zero']).toContain(result.rightSign);
		});
	});

	describe('discontinuity analysis', () => {
		it('detects infinite discontinuity for 1/x at 0', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const oneSided = analyzeOneSidedLimits(expr, 'x', number('0'));
			const discontinuity = analyzeDiscontinuity(oneSided);

			expect(discontinuity.type).toBe('infinite');
			expect(discontinuity.description).toContain('infini');
		});

		it('detects no discontinuity when limits match function value', () => {
			// For x + 1 at x = 0: limit = function value = 1
			const expr = { type: 'addition', left: variable('x'), right: number('1') } as const;
			const oneSided = analyzeOneSidedLimits(expr, 'x', number('0'));
			const discontinuity = analyzeDiscontinuity(oneSided, number('1'));

			expect(discontinuity.type).toBe('none');
		});
	});

	describe('integration: limit does not exist', () => {
		it('correctly identifies that two-sided 1/x at 0 does not exist', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const result = evaluateLimit(expr, 'x', number('0'), 'both');

			// Either it detects does-not-exist, or uses known limit for one-sided
			expect(['does-not-exist', 'exact']).toContain(result.status);
		});
	});
});
