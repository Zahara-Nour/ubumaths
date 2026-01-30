/**
 * Integration tests for infinity algebra in composition.ts
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { add, subtract, multiply, divide, variable, number, positiveInfinity } from '../../factory';
import { isInfinity, isNumber } from '../../guards';

/** Helper to check if status indicates a successful limit computation */
function isSuccessStatus(status: string): boolean {
	return status === 'exact' || status === 'infinite';
}

/** Helper to verify an infinite result */
function expectInfinity(
	result: ReturnType<typeof evaluateLimit>,
	expectedSign: 'positive' | 'negative'
) {
	expect(isSuccessStatus(result.status)).toBe(true);
	expect(result.value).not.toBeNull();
	if (result.value && isInfinity(result.value)) {
		expect(result.value.sign).toBe(expectedSign);
	} else {
		throw new Error(
			`Expected ${expectedSign === 'positive' ? '+∞' : '-∞'}, got ${JSON.stringify(result.value)}`
		);
	}
}

describe('Infinity Algebra Integration', () => {
	describe('Addition at infinity', () => {
		it('x + 1/x at x→+∞ is +∞', () => {
			// x → +∞, 1/x → 0, so x + 1/x → +∞
			const expr = add(variable('x'), divide(number('1'), variable('x'), 'fraction'));
			const result = evaluateLimit(expr, 'x', positiveInfinity());
			expectInfinity(result, 'positive');
		});

		it('x + 5 at x→+∞ is +∞', () => {
			const expr = add(variable('x'), number('5'));
			const result = evaluateLimit(expr, 'x', positiveInfinity());
			expectInfinity(result, 'positive');
		});

		it('x + x at x→+∞ is +∞', () => {
			const expr = add(variable('x'), variable('x'));
			const result = evaluateLimit(expr, 'x', positiveInfinity());
			expectInfinity(result, 'positive');
		});
	});

	describe('Subtraction at infinity', () => {
		it('x - 5 at x→+∞ is +∞', () => {
			const expr = subtract(variable('x'), number('5'));
			const result = evaluateLimit(expr, 'x', positiveInfinity());
			expectInfinity(result, 'positive');
		});

		it('5 - x at x→+∞ is -∞', () => {
			const expr = subtract(number('5'), variable('x'));
			const result = evaluateLimit(expr, 'x', positiveInfinity());
			expectInfinity(result, 'negative');
		});
	});

	describe('Multiplication at infinity', () => {
		it('2x at x→+∞ is +∞', () => {
			const expr = multiply(number('2'), variable('x'));
			const result = evaluateLimit(expr, 'x', positiveInfinity());
			expectInfinity(result, 'positive');
		});

		it('-3x at x→+∞ is -∞', () => {
			const expr = multiply(number('-3'), variable('x'));
			const result = evaluateLimit(expr, 'x', positiveInfinity());
			expectInfinity(result, 'negative');
		});
	});

	describe('Division at infinity', () => {
		it('1/x at x→+∞ equals 0', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const result = evaluateLimit(expr, 'x', positiveInfinity());

			expect(result.status).toBe('exact');
			if (result.value && isNumber(result.value)) {
				expect(parseFloat(result.value.value)).toBeCloseTo(0);
			}
		});

		it('x/2 at x→+∞ is +∞', () => {
			const expr = divide(variable('x'), number('2'), 'fraction');
			const result = evaluateLimit(expr, 'x', positiveInfinity());
			expectInfinity(result, 'positive');
		});
	});

	describe('Division by zero', () => {
		it('1/x at x→0⁺ is +∞', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const result = evaluateLimit(expr, 'x', number('0'), 'right');
			expectInfinity(result, 'positive');
		});

		it('1/x at x→0⁻ is -∞', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const result = evaluateLimit(expr, 'x', number('0'), 'left');
			expectInfinity(result, 'negative');
		});

		it('-5/x at x→0⁺ is -∞', () => {
			const expr = divide(number('-5'), variable('x'), 'fraction');
			const result = evaluateLimit(expr, 'x', number('0'), 'right');
			expectInfinity(result, 'negative');
		});
	});
});
