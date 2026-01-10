/**
 * Tests for Squeeze Theorem
 *
 * Tests cover:
 * - Bounded function detection
 * - Squeeze theorem application
 * - Bounds construction
 */

import { describe, it, expect } from 'vitest';
import { trySqueeze, getBoundedFunctionInfo, constructSqueezeBounds } from '../squeeze';
import { createStepRecorder } from '../step-recorder';
import { evaluateLimit } from '../evaluate';
import { number, variable, divide, func, multiply } from '../../factory';
import { isNumber } from '../../guards';

describe('Squeeze Theorem', () => {
	describe('bounded function detection', () => {
		it('identifies sin as bounded', () => {
			const sinExpr = func('sin', [variable('x')]);
			const info = getBoundedFunctionInfo(sinExpr);

			expect(info.bounded).toBe(true);
			expect(info.lower).toBe(-1);
			expect(info.upper).toBe(1);
			expect(info.functionName).toBe('sin');
		});

		it('identifies cos as bounded', () => {
			const cosExpr = func('cos', [variable('x')]);
			const info = getBoundedFunctionInfo(cosExpr);

			expect(info.bounded).toBe(true);
			expect(info.lower).toBe(-1);
			expect(info.upper).toBe(1);
		});

		it('identifies arctan as bounded', () => {
			const arctanExpr = func('arctan', [variable('x')]);
			const info = getBoundedFunctionInfo(arctanExpr);

			expect(info.bounded).toBe(true);
			expect(info.lower).toBe(-Math.PI / 2);
			expect(info.upper).toBe(Math.PI / 2);
		});

		it('identifies tanh as bounded', () => {
			const tanhExpr = func('tanh', [variable('x')]);
			const info = getBoundedFunctionInfo(tanhExpr);

			expect(info.bounded).toBe(true);
			expect(info.lower).toBe(-1);
			expect(info.upper).toBe(1);
		});

		it('returns not bounded for exp', () => {
			const expExpr = func('exp', [variable('x')]);
			const info = getBoundedFunctionInfo(expExpr);

			expect(info.bounded).toBe(false);
		});

		it('returns not bounded for non-function', () => {
			const info = getBoundedFunctionInfo(variable('x'));
			expect(info.bounded).toBe(false);
		});
	});

	describe('squeeze theorem application', () => {
		it('applies squeeze to x * sin(1/x) as x → 0', () => {
			// x * sin(1/x) is bounded by -|x| and |x|, both → 0
			const expr = multiply(
				variable('x'),
				func('sin', [divide(number('1'), variable('x'), 'fraction')]),
				'implicit'
			);
			const recorder = createStepRecorder();
			const result = trySqueeze(expr, 'x', number('0'), 'both', recorder);

			expect(result.applicable).toBe(true);
			expect(result.value).toBeDefined();
			if (result.value && isNumber(result.value)) {
				expect(result.value.value).toBe('0');
			}
		});

		it('applies squeeze to x * cos(1/x) as x → 0', () => {
			const expr = multiply(
				variable('x'),
				func('cos', [divide(number('1'), variable('x'), 'fraction')]),
				'implicit'
			);
			const recorder = createStepRecorder();
			const result = trySqueeze(expr, 'x', number('0'), 'both', recorder);

			expect(result.applicable).toBe(true);
			if (result.value && isNumber(result.value)) {
				expect(result.value.value).toBe('0');
			}
		});

		it('returns not applicable for non-squeeze patterns', () => {
			// x + sin(x) at x → 0 is not a squeeze pattern
			const expr = {
				type: 'addition',
				left: variable('x'),
				right: func('sin', [variable('x')])
			} as const;
			const recorder = createStepRecorder();
			const result = trySqueeze(expr, 'x', number('0'), 'both', recorder);

			expect(result.applicable).toBe(false);
		});

		it('returns not applicable at non-zero approach', () => {
			const expr = multiply(
				variable('x'),
				func('sin', [divide(number('1'), variable('x'), 'fraction')]),
				'implicit'
			);
			const recorder = createStepRecorder();
			const result = trySqueeze(expr, 'x', number('1'), 'both', recorder);

			expect(result.applicable).toBe(false);
		});
	});

	describe('bounds construction', () => {
		it('constructs bounds for x * sin(1/x)', () => {
			const expr = multiply(
				variable('x'),
				func('sin', [divide(number('1'), variable('x'), 'fraction')]),
				'implicit'
			);
			const bounds = constructSqueezeBounds(expr, 'x');

			expect(bounds).not.toBeNull();
			if (bounds) {
				// Lower bound should be -|x|, upper should be |x|
				expect(bounds.lower.type).toBe('opposite');
				expect(bounds.upper.type).toBe('function');
			}
		});

		it('returns null for non-squeeze expressions', () => {
			const expr = variable('x');
			const bounds = constructSqueezeBounds(expr, 'x');

			expect(bounds).toBeNull();
		});
	});

	describe('integration with evaluateLimit', () => {
		it('evaluates x * sin(1/x) as x → 0 using squeeze', () => {
			const expr = multiply(
				variable('x'),
				func('sin', [divide(number('1'), variable('x'), 'fraction')]),
				'implicit'
			);
			const result = evaluateLimit(expr, 'x', number('0'));

			expect(result.status).toBe('exact');
			expect(result.technique).toBe('squeeze');
			if (result.value && isNumber(result.value)) {
				expect(result.value.value).toBe('0');
			}
		});
	});
});
