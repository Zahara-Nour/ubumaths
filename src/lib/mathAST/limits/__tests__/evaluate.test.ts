/**
 * Tests for Limit Evaluation
 *
 * Tests cover:
 * - Direct substitution evaluation
 * - Known limits evaluation
 * - LimitNode evaluation
 * - Step recording
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit, evaluateLimitNode, findKnownLimit } from '../evaluate';
import { LimitError } from '../types';
import {
	number,
	variable,
	divide,
	func,
	add,
	subtract,
	power,
	limit,
	positiveInfinity
} from '../../factory';
import { isNumber, isInfinity } from '../../guards';

describe('evaluateLimit', () => {
	describe('direct substitution', () => {
		it('evaluates constant expression', () => {
			const expr = number('5');
			const result = evaluateLimit(expr, 'x', number('0'));
			expect(result.status).toBe('exact');
			expect(result.value).not.toBeNull();
			expect(result.value && isNumber(result.value)).toBe(true);
			if (result.value && isNumber(result.value)) {
				expect(result.value.value).toBe('5');
			}
		});

		it('evaluates polynomial at finite point', () => {
			// x + 1 as x → 2 = 3
			const expr = add(variable('x'), number('1'));
			const result = evaluateLimit(expr, 'x', number('2'));
			expect(result.status).toBe('exact');
			expect(result.value).not.toBeNull();
			expect(result.value && isNumber(result.value)).toBe(true);
			if (result.value && isNumber(result.value)) {
				expect(result.value.value).toBe('3');
			}
		});

		it('evaluates fraction at finite point', () => {
			// (x + 1) / 2 as x → 3 = 2
			const expr = divide(add(variable('x'), number('1')), number('2'), 'fraction');
			const result = evaluateLimit(expr, 'x', number('3'));
			expect(result.status).toBe('exact');
			expect(result.value).not.toBeNull();
			expect(result.value && isNumber(result.value)).toBe(true);
			if (result.value && isNumber(result.value)) {
				expect(result.value.value).toBe('2');
			}
		});

		it('evaluates sin(0) = 0', () => {
			const expr = func('sin', [variable('x')]);
			const result = evaluateLimit(expr, 'x', number('0'));
			expect(result.status).toBe('exact');
			expect(result.value).not.toBeNull();
			expect(result.value && isNumber(result.value)).toBe(true);
			if (result.value && isNumber(result.value)) {
				expect(parseFloat(result.value.value)).toBeCloseTo(0);
			}
		});

		it('evaluates cos(0) = 1', () => {
			const expr = func('cos', [variable('x')]);
			const result = evaluateLimit(expr, 'x', number('0'));
			expect(result.status).toBe('exact');
			expect(result.value).not.toBeNull();
			expect(result.value && isNumber(result.value)).toBe(true);
			if (result.value && isNumber(result.value)) {
				expect(parseFloat(result.value.value)).toBeCloseTo(1);
			}
		});

		it('evaluates exp(0) = 1', () => {
			const expr = func('exp', [variable('x')]);
			const result = evaluateLimit(expr, 'x', number('0'));
			expect(result.status).toBe('exact');
			expect(result.value).not.toBeNull();
			expect(result.value && isNumber(result.value)).toBe(true);
			if (result.value && isNumber(result.value)) {
				expect(parseFloat(result.value.value)).toBeCloseTo(1);
			}
		});
	});

	describe('known limits', () => {
		it('evaluates sin(x)/x as x → 0', () => {
			const expr = divide(func('sin', [variable('x')]), variable('x'), 'fraction');
			const result = evaluateLimit(expr, 'x', number('0'));
			expect(result.status).toBe('exact');
			expect(result.technique).toBe('known-limit');
			expect(result.value).not.toBeNull();
			expect(result.value && isNumber(result.value)).toBe(true);
			if (result.value && isNumber(result.value)) {
				expect(result.value.value).toBe('1');
			}
		});

		it('evaluates tan(x)/x as x → 0', () => {
			const expr = divide(func('tan', [variable('x')]), variable('x'), 'fraction');
			const result = evaluateLimit(expr, 'x', number('0'));
			expect(result.status).toBe('exact');
			expect(result.technique).toBe('known-limit');
			expect(result.value).not.toBeNull();
			expect(result.value && isNumber(result.value)).toBe(true);
			if (result.value && isNumber(result.value)) {
				expect(result.value.value).toBe('1');
			}
		});

		it('evaluates (e^x - 1)/x as x → 0', () => {
			const expr = divide(
				subtract(func('exp', [variable('x')]), number('1')),
				variable('x'),
				'fraction'
			);
			const result = evaluateLimit(expr, 'x', number('0'));
			expect(result.status).toBe('exact');
			expect(result.technique).toBe('known-limit');
			expect(result.value).not.toBeNull();
			expect(result.value && isNumber(result.value)).toBe(true);
			if (result.value && isNumber(result.value)) {
				expect(result.value.value).toBe('1');
			}
		});

		it('evaluates 1/x as x → +∞', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const result = evaluateLimit(expr, 'x', positiveInfinity());
			expect(result.status).toBe('exact');
			expect(result.technique).toBe('known-limit');
			expect(result.value).not.toBeNull();
			expect(result.value && isNumber(result.value)).toBe(true);
			if (result.value && isNumber(result.value)) {
				expect(result.value.value).toBe('0');
			}
		});

		it('evaluates 1/x as x → 0⁺ (right limit)', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const result = evaluateLimit(expr, 'x', number('0'), 'right');
			expect(result.status).toBe('exact');
			expect(result.technique).toBe('known-limit');
			expect(result.value).not.toBeNull();
			expect(result.value && isInfinity(result.value)).toBe(true);
			if (result.value?.type === 'infinity') {
				expect(result.value.sign).toBe('positive');
			}
		});

		it('evaluates 1/x as x → 0⁻ (left limit)', () => {
			const expr = divide(number('1'), variable('x'), 'fraction');
			const result = evaluateLimit(expr, 'x', number('0'), 'left');
			expect(result.status).toBe('exact');
			expect(result.technique).toBe('known-limit');
			expect(result.value).not.toBeNull();
			expect(result.value && isInfinity(result.value)).toBe(true);
			if (result.value?.type === 'infinity') {
				expect(result.value.sign).toBe('negative');
			}
		});
	});

	describe('LimitNode evaluation', () => {
		it('evaluates LimitNode directly', () => {
			const limitNode = limit(
				divide(func('sin', [variable('x')]), variable('x'), 'fraction'),
				'x',
				number('0')
			);
			const result = evaluateLimit(limitNode);
			expect(result.status).toBe('exact');
			expect(result.value).not.toBeNull();
			expect(result.value && isNumber(result.value)).toBe(true);
			if (result.value && isNumber(result.value)) {
				expect(result.value.value).toBe('1');
			}
		});

		it('evaluates LimitNode with evaluateLimitNode helper', () => {
			const limitNode = limit(add(variable('x'), number('1')), 'x', number('5'));
			const result = evaluateLimitNode(limitNode);
			expect(result.status).toBe('exact');
			expect(result.value).not.toBeNull();
			expect(result.value && isNumber(result.value)).toBe(true);
			if (result.value && isNumber(result.value)) {
				expect(result.value.value).toBe('6');
			}
		});

		it('respects direction in LimitNode', () => {
			const limitNode = limit(
				divide(number('1'), variable('x'), 'fraction'),
				'x',
				number('0'),
				'right'
			);
			const result = evaluateLimit(limitNode);
			expect(result.direction).toBe('right');
			expect(result.value).not.toBeNull();
			expect(result.value && isInfinity(result.value)).toBe(true);
		});
	});

	describe('step recording', () => {
		it('records steps for known limits', () => {
			const expr = divide(func('sin', [variable('x')]), variable('x'), 'fraction');
			const result = evaluateLimit(expr, 'x', number('0'), 'both', { verbosity: 'detailed' });
			expect(result.steps.length).toBeGreaterThan(0);
			expect(result.steps[0].rule).toBe('known-limit');
		});

		it('records steps for direct substitution', () => {
			const expr = add(variable('x'), number('1'));
			const result = evaluateLimit(expr, 'x', number('2'), 'both', { verbosity: 'detailed' });
			expect(result.steps.length).toBeGreaterThan(0);
			expect(result.steps[0].rule).toBe('direct-substitution');
		});

		it('filters steps by verbosity level', () => {
			const expr = divide(func('sin', [variable('x')]), variable('x'), 'fraction');
			const detailed = evaluateLimit(expr, 'x', number('0'), 'both', { verbosity: 'detailed' });
			const result = evaluateLimit(expr, 'x', number('0'), 'both', { verbosity: 'result' });
			expect(result.steps.length).toBeLessThanOrEqual(detailed.steps.length);
		});
	});

	describe('error handling', () => {
		it('throws error when variable and approach not provided', () => {
			const expr = add(variable('x'), number('1'));
			expect(() => evaluateLimit(expr)).toThrow(LimitError);
		});

		it('returns unsupported for complex expressions', () => {
			// Expression that can't be evaluated with current techniques
			const expr = divide(
				func('sin', [power(variable('x'), number('2'))]),
				variable('x'),
				'fraction'
			);
			const result = evaluateLimit(expr, 'x', number('0'));
			// Either it evaluates or returns unsupported
			expect(['exact', 'unsupported']).toContain(result.status);
		});
	});

	describe('domain validation', () => {
		it('allows ln(x) at x=0 with direction=right', () => {
			// ln(x) is defined for x > 0, so right-sided limit exists
			const expr = func('ln', [variable('x')]);
			const result = evaluateLimit(expr, 'x', number('0'), 'right');
			// Should not return domain error since right side is defined
			expect(result.status).not.toBe('does-not-exist');
		});

		it('returns pedagogical error for ln(x) at x=0 with direction=left', () => {
			// ln(x) is not defined for x <= 0, left-sided limit does not exist
			const expr = func('ln', [variable('x')]);
			const result = evaluateLimit(expr, 'x', number('0'), 'left');
			expect(result.status).toBe('does-not-exist');
			expect(result.error).toContain('gauche');
		});

		it('returns pedagogical error for sqrt(x) at x=-1', () => {
			// sqrt(x) is not defined for x < 0 (neither side accessible)
			const expr = func('sqrt', [variable('x')]);
			const result = evaluateLimit(expr, 'x', number('-1'), 'both');
			expect(result.status).toBe('does-not-exist');
			expect(result.error).toContain('definie');
		});

		it('returns pedagogical error for ln(x) at x=-1', () => {
			// ln(x) is not defined for x <= 0 (neither side accessible)
			const expr = func('ln', [variable('x')]);
			const result = evaluateLimit(expr, 'x', number('-1'), 'both');
			expect(result.status).toBe('does-not-exist');
			expect(result.error).toContain('definie');
		});
	});

	describe('findKnownLimit', () => {
		it('finds known limit entry', () => {
			const expr = divide(func('sin', [variable('x')]), variable('x'), 'fraction');
			const entry = findKnownLimit(expr, 'x', number('0'));
			expect(entry).not.toBeNull();
			expect(entry?.id).toBe('sin-x-over-x');
		});

		it('returns null for unknown expression', () => {
			const expr = add(variable('x'), number('1'));
			const entry = findKnownLimit(expr, 'x', number('0'));
			expect(entry).toBeNull();
		});
	});
});
