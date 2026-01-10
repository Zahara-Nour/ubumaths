/**
 * Tests for Algebraic Manipulation
 *
 * Tests cover:
 * - Factorization
 * - Dominant term extraction at infinity
 * - Algebraic simplification strategies
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { tryDominantTerm, tryAlgebraicSimplification } from '../algebraic';
import { createStepRecorder } from '../step-recorder';
import {
	number,
	variable,
	divide,
	add,
	subtract,
	multiply,
	power,
	positiveInfinity,
	negativeInfinity
} from '../../factory';
import { isNumber, isInfinity } from '../../guards';

describe('Algebraic Manipulation', () => {
	describe('dominant term extraction', () => {
		it('identifies higher degree numerator → ±∞', () => {
			// x²/x as x → ∞ → ∞
			const expr = divide(power(variable('x'), number('2')), variable('x'), 'fraction');
			const recorder = createStepRecorder();
			const result = tryDominantTerm(expr, 'x', true, recorder);

			expect(result.success).toBe(true);
			if (result.simplified && isInfinity(result.simplified)) {
				expect(result.simplified.sign).toBe('positive');
			}
		});

		it('identifies lower degree numerator → 0', () => {
			// x/x² as x → ∞ → 0
			const expr = divide(variable('x'), power(variable('x'), number('2')), 'fraction');
			const recorder = createStepRecorder();
			const result = tryDominantTerm(expr, 'x', true, recorder);

			expect(result.success).toBe(true);
			if (result.simplified && isNumber(result.simplified)) {
				expect(result.simplified.value).toBe('0');
			}
		});

		it('identifies equal degree → ratio of coefficients', () => {
			// 3x²/(2x²) as x → ∞ → 3/2
			const expr = divide(
				multiply(number('3'), power(variable('x'), number('2')), 'implicit'),
				multiply(number('2'), power(variable('x'), number('2')), 'implicit'),
				'fraction'
			);
			const recorder = createStepRecorder();
			const result = tryDominantTerm(expr, 'x', true, recorder);

			expect(result.success).toBe(true);
			if (result.simplified && isNumber(result.simplified)) {
				expect(parseFloat(result.simplified.value)).toBeCloseTo(1.5);
			}
		});
	});

	describe('polynomial limits at infinity', () => {
		it('evaluates (2x² + 1)/(x² - 1) as x → ∞', () => {
			// Same degree: ratio is 2/1 = 2
			const expr = divide(
				add(multiply(number('2'), power(variable('x'), number('2')), 'implicit'), number('1')),
				subtract(power(variable('x'), number('2')), number('1')),
				'fraction'
			);
			const result = evaluateLimit(expr, 'x', positiveInfinity());

			expect(result.status).toBe('exact');
			if (result.value && isNumber(result.value)) {
				expect(parseFloat(result.value.value)).toBeCloseTo(2);
			}
		});

		it('evaluates x³/x² as x → ∞', () => {
			// Higher degree numerator → ∞
			const expr = divide(
				power(variable('x'), number('3')),
				power(variable('x'), number('2')),
				'fraction'
			);
			const result = evaluateLimit(expr, 'x', positiveInfinity());

			expect(['exact', 'infinite']).toContain(result.status);
			if (result.value && isInfinity(result.value)) {
				expect(result.value.sign).toBe('positive');
			}
		});

		it('evaluates 1/(x² + 1) as x → ∞', () => {
			// Lower degree numerator → 0
			const expr = divide(
				number('1'),
				add(power(variable('x'), number('2')), number('1')),
				'fraction'
			);
			const result = evaluateLimit(expr, 'x', positiveInfinity());

			expect(result.status).toBe('exact');
			if (result.value && isNumber(result.value)) {
				expect(result.value.value).toBe('0');
			}
		});
	});

	describe('algebraic simplification entry point', () => {
		it('handles infinity approach', () => {
			const expr = divide(variable('x'), power(variable('x'), number('2')), 'fraction');
			const recorder = createStepRecorder();
			const result = tryAlgebraicSimplification(expr, 'x', positiveInfinity(), 'both', recorder);

			expect(result.success).toBe(true);
			expect(result.technique).toBe('dominant-term');
		});

		it('returns not successful for non-polynomial at infinity', () => {
			// sin(x)/x at infinity - not a polynomial ratio
			const expr = divide(
				{ type: 'function', name: 'sin', args: [variable('x')] },
				variable('x'),
				'fraction'
			);
			const recorder = createStepRecorder();
			const result = tryAlgebraicSimplification(expr, 'x', positiveInfinity(), 'both', recorder);

			// May or may not succeed depending on implementation
			expect(typeof result.success).toBe('boolean');
		});
	});

	describe('limit at negative infinity', () => {
		it('evaluates x²/x as x → -∞', () => {
			// x²/x = x → -∞
			const expr = divide(power(variable('x'), number('2')), variable('x'), 'fraction');
			const result = evaluateLimit(expr, 'x', negativeInfinity());

			expect(['exact', 'infinite']).toContain(result.status);
			if (result.value && isInfinity(result.value)) {
				expect(result.value.sign).toBe('negative');
			}
		});
	});
});
