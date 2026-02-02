/**
 * Tests for domain computation
 */

import { describe, it, expect } from 'vitest';
import { computeDomain } from '../compute';
import type { MathNode } from '../../types';
import {
	variable,
	number,
	add,
	subtract,
	multiply,
	fraction,
	power,
	sqrt,
	ln,
	func
} from '../../factory';
import { containsValue } from '../algebra';

describe('computeDomain()', () => {
	describe('simple expressions', () => {
		it('variable x has universal domain', () => {
			const expr = variable('x');
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('universal');
		});

		it('number has universal domain', () => {
			const expr = number('5');
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('universal');
		});

		it('sqrt(x) has domain [0, +inf[', () => {
			const expr = sqrt(variable('x'));
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('interval_set');
			expect(containsValue(result.domain, 0)).toBe(true);
			expect(containsValue(result.domain, 4)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(false);
		});

		it('ln(x) has domain ]0, +inf[', () => {
			const expr = ln(variable('x'));
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('interval_set');
			expect(containsValue(result.domain, 0)).toBe(false);
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(false);
		});

		it('1/x has domain R \\ {0}', () => {
			const expr = fraction(number('1'), variable('x'));
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('interval_set');
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(true);
			expect(containsValue(result.domain, 0)).toBe(false);
		});

		it('arcsin(x) has domain [-1, 1]', () => {
			const expr = func('asin', [variable('x')]);
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('interval_set');
			expect(containsValue(result.domain, 0)).toBe(true);
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(true);
			expect(containsValue(result.domain, 2)).toBe(false);
		});
	});

	describe('addition and multiplication (intersection)', () => {
		it('sqrt(x) + ln(x) has domain ]0, +inf[', () => {
			const expr = add(sqrt(variable('x')), ln(variable('x')));
			const result = computeDomain(expr, 'x');
			// sqrt needs x >= 0, ln needs x > 0
			// intersection is ]0, +inf[
			expect(containsValue(result.domain, 0)).toBe(false);
			expect(containsValue(result.domain, 0.5)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(false);
		});

		it('sqrt(x) * arcsin(x) has domain [0, 1]', () => {
			const expr = multiply(sqrt(variable('x')), func('asin', [variable('x')]), 'dot');
			const result = computeDomain(expr, 'x');
			// sqrt needs x >= 0, arcsin needs -1 <= x <= 1
			// intersection is [0, 1]
			expect(containsValue(result.domain, 0)).toBe(true);
			expect(containsValue(result.domain, 0.5)).toBe(true);
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, -0.5)).toBe(false);
			expect(containsValue(result.domain, 2)).toBe(false);
		});
	});

	describe('division (exclude zeros)', () => {
		it('1/(x-1) has domain R \\ {1}', () => {
			const expr = fraction(number('1'), subtract(variable('x'), number('1')));
			const result = computeDomain(expr, 'x');
			expect(containsValue(result.domain, 0)).toBe(true);
			expect(containsValue(result.domain, 2)).toBe(true);
			expect(containsValue(result.domain, 1)).toBe(false);
		});

		it('sqrt(x)/(x-2) has domain [0, +inf[ \\ {2}', () => {
			const expr = fraction(sqrt(variable('x')), subtract(variable('x'), number('2')));
			const result = computeDomain(expr, 'x');
			// sqrt needs x >= 0, denominator can't be 0 (x != 2)
			expect(containsValue(result.domain, 0)).toBe(true);
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, 3)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(false);
			expect(containsValue(result.domain, 2)).toBe(false);
		});
	});

	describe('composition with preimage resolution', () => {
		it('sqrt(x-2) has domain [2, +inf[', () => {
			// sqrt requires its argument >= 0
			// So x-2 >= 0, which means x >= 2
			const expr = sqrt(subtract(variable('x'), number('2')));
			const result = computeDomain(expr, 'x');
			expect(containsValue(result.domain, 2)).toBe(true);
			expect(containsValue(result.domain, 3)).toBe(true);
			expect(containsValue(result.domain, 1)).toBe(false);
			expect(containsValue(result.domain, 1.999)).toBe(false);
		});

		it('ln(1-x) has domain ]-inf, 1[', () => {
			// ln requires its argument > 0
			// So 1-x > 0, which means x < 1
			const expr = ln(subtract(number('1'), variable('x')));
			const result = computeDomain(expr, 'x');
			expect(containsValue(result.domain, 0)).toBe(true);
			expect(containsValue(result.domain, -10)).toBe(true);
			expect(containsValue(result.domain, 1)).toBe(false);
			expect(containsValue(result.domain, 2)).toBe(false);
		});

		it('sqrt(4-x²) has domain [-2, 2]', () => {
			// sqrt requires 4-x² >= 0
			// x² <= 4, so -2 <= x <= 2
			const xSquared = power(variable('x'), number('2'));
			const expr = sqrt(subtract(number('4'), xSquared));
			const result = computeDomain(expr, 'x');
			expect(containsValue(result.domain, 0)).toBe(true);
			expect(containsValue(result.domain, 2)).toBe(true);
			expect(containsValue(result.domain, -2)).toBe(true);
			expect(containsValue(result.domain, 1.5)).toBe(true);
			expect(containsValue(result.domain, 3)).toBe(false);
			expect(containsValue(result.domain, -3)).toBe(false);
		});

		it('ln(x²) has domain R \\ {0}', () => {
			// ln requires x² > 0
			// x² > 0 for all x != 0
			const expr = ln(power(variable('x'), number('2')));
			const result = computeDomain(expr, 'x');
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(true);
			expect(containsValue(result.domain, 0)).toBe(false);
		});
	});

	describe('nested compositions', () => {
		it('ln(sqrt(x)) has domain ]0, +inf[', () => {
			// sqrt(x) requires x >= 0
			// ln(sqrt(x)) requires sqrt(x) > 0, so x > 0
			const expr = ln(sqrt(variable('x')));
			const result = computeDomain(expr, 'x');
			expect(containsValue(result.domain, 0)).toBe(false);
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, 0.01)).toBe(true);
		});

		it('sqrt(ln(x)) has domain [1, +inf[', () => {
			// ln(x) requires x > 0
			// sqrt(ln(x)) requires ln(x) >= 0, so x >= 1
			const expr = sqrt(ln(variable('x')));
			const result = computeDomain(expr, 'x');
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, 10)).toBe(true);
			expect(containsValue(result.domain, 0.5)).toBe(false);
			expect(containsValue(result.domain, 0)).toBe(false);
		});

		it('ln(x) + sqrt(1-x) has domain ]0, 1]', () => {
			// ln(x) requires x > 0
			// sqrt(1-x) requires 1-x >= 0, so x <= 1
			// Intersection: ]0, 1]
			const expr = add(ln(variable('x')), sqrt(subtract(number('1'), variable('x'))));
			const result = computeDomain(expr, 'x');
			expect(containsValue(result.domain, 0.5)).toBe(true);
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, 0)).toBe(false);
			expect(containsValue(result.domain, 2)).toBe(false);
		});
	});

	describe('quartic polynomial compositions', () => {
		it('sqrt(x^4 - 1) has domain x <= -1 or x >= 1', () => {
			// sqrt(x^4 - 1) requires x^4 - 1 >= 0, i.e., x^4 >= 1
			// x^4 >= 1 when |x| >= 1, i.e., x <= -1 or x >= 1
			const x4 = power(variable('x'), number('4'));
			const expr = sqrt(subtract(x4, number('1')));
			const result = computeDomain(expr, 'x');

			// Valid at x = 1, -1, 2, -2
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(true);
			expect(containsValue(result.domain, 2)).toBe(true);
			expect(containsValue(result.domain, -2)).toBe(true);

			// Invalid at x = 0, 0.5, -0.5
			expect(containsValue(result.domain, 0)).toBe(false);
			expect(containsValue(result.domain, 0.5)).toBe(false);
			expect(containsValue(result.domain, -0.5)).toBe(false);
		});

		it('sqrt(1 - x^4) has domain -1 <= x <= 1', () => {
			// sqrt(1 - x^4) requires 1 - x^4 >= 0, i.e., x^4 <= 1
			// x^4 <= 1 when |x| <= 1, i.e., -1 <= x <= 1
			const x4 = power(variable('x'), number('4'));
			const expr = sqrt(subtract(number('1'), x4));
			const result = computeDomain(expr, 'x');

			// Valid at x = 0, 0.5, -0.5, 1, -1
			expect(containsValue(result.domain, 0)).toBe(true);
			expect(containsValue(result.domain, 0.5)).toBe(true);
			expect(containsValue(result.domain, -0.5)).toBe(true);
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(true);

			// Invalid at x = 2, -2, 1.5
			expect(containsValue(result.domain, 2)).toBe(false);
			expect(containsValue(result.domain, -2)).toBe(false);
			expect(containsValue(result.domain, 1.5)).toBe(false);
		});

		it('sqrt(x^4 - 5x^2 + 4) factors to (x^2-1)(x^2-4)', () => {
			// x^4 - 5x^2 + 4 = (x^2-1)(x^2-4) = (x-1)(x+1)(x-2)(x+2)
			// >= 0 when: x <= -2 or -1 <= x <= 1 or x >= 2
			const x = variable('x');
			const x2 = power(x, number('2'));
			const x4 = power(x, number('4'));
			// x^4 - 5x^2 + 4
			const poly = add(subtract(x4, multiply(number('5'), x2)), number('4'));
			const expr = sqrt(poly);
			const result = computeDomain(expr, 'x');

			// Valid regions: x <= -2, -1 <= x <= 1, x >= 2
			expect(containsValue(result.domain, -3)).toBe(true);
			expect(containsValue(result.domain, -2)).toBe(true);
			expect(containsValue(result.domain, 0)).toBe(true);
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(true);
			expect(containsValue(result.domain, 2)).toBe(true);
			expect(containsValue(result.domain, 3)).toBe(true);

			// Invalid regions: -2 < x < -1, 1 < x < 2
			expect(containsValue(result.domain, -1.5)).toBe(false);
			expect(containsValue(result.domain, 1.5)).toBe(false);
		});
	});

	describe('power expressions', () => {
		it('x^(-1) has domain R \\ {0}', () => {
			const expr = power(variable('x'), number('-1'));
			const result = computeDomain(expr, 'x');
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(true);
			expect(containsValue(result.domain, 0)).toBe(false);
		});

		it('x^(1/2) has domain [0, +inf[', () => {
			const expr = power(variable('x'), fraction(number('1'), number('2')));
			const result = computeDomain(expr, 'x');
			expect(containsValue(result.domain, 0)).toBe(true);
			expect(containsValue(result.domain, 4)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(false);
		});

		it('(x-1)^(-2) has domain R \\ {1}', () => {
			const expr = power(subtract(variable('x'), number('1')), number('-2'));
			const result = computeDomain(expr, 'x');
			expect(containsValue(result.domain, 0)).toBe(true);
			expect(containsValue(result.domain, 2)).toBe(true);
			expect(containsValue(result.domain, 1)).toBe(false);
		});
	});

	describe('multi-interval preimage', () => {
		it('asec(x) has domain |x| >= 1', () => {
			// asec needs |x| >= 1, i.e., x <= -1 OR x >= 1
			const expr = func('asec', [variable('x')]);
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('interval_set');
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(true);
			expect(containsValue(result.domain, 2)).toBe(true);
			expect(containsValue(result.domain, -2)).toBe(true);
			expect(containsValue(result.domain, 0)).toBe(false);
			expect(containsValue(result.domain, 0.5)).toBe(false);
			expect(containsValue(result.domain, -0.5)).toBe(false);
		});

		it('asec(2x) has domain |2x| >= 1, i.e., |x| >= 0.5', () => {
			// asec needs 2x <= -1 OR 2x >= 1
			// So x <= -0.5 OR x >= 0.5
			const expr = func('asec', [multiply(number('2'), variable('x'), 'implicit')]);
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('interval_set');
			expect(containsValue(result.domain, 0.5)).toBe(true);
			expect(containsValue(result.domain, -0.5)).toBe(true);
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(true);
			expect(containsValue(result.domain, 0)).toBe(false);
			expect(containsValue(result.domain, 0.25)).toBe(false);
			expect(containsValue(result.domain, -0.25)).toBe(false);
		});

		it('acsc(x) has domain |x| >= 1', () => {
			const expr = func('acsc', [variable('x')]);
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('interval_set');
			expect(containsValue(result.domain, 1)).toBe(true);
			expect(containsValue(result.domain, -1)).toBe(true);
			expect(containsValue(result.domain, 0)).toBe(false);
		});
	});

	describe('options', () => {
		it('respects variable option', () => {
			// sqrt(y) with respect to x should be universal (no x in expression)
			const expr = sqrt(variable('y'));
			const resultX = computeDomain(expr, 'x');
			expect(resultX.domain.kind).toBe('universal');

			// sqrt(y) with respect to y should be [0, +inf[
			const resultY = computeDomain(expr, 'y');
			expect(containsValue(resultY.domain, 0)).toBe(true);
			expect(containsValue(resultY.domain, -1)).toBe(false);
		});

		it('returns the variable in the result', () => {
			const expr = sqrt(variable('t'));
			const result = computeDomain(expr, 't');
			expect(result.variable).toBe('t');
		});
	});

	describe('periodic exclusions (tan, cot, sec, csc)', () => {
		it('tan(x) returns periodic_exclusion domain', () => {
			const expr = func('tan', [variable('x')]);
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('periodic_exclusion');

			// Check excluded points: π/2 + kπ
			expect(containsValue(result.domain, 0)).toBe(true); // not excluded
			expect(containsValue(result.domain, Math.PI / 4)).toBe(true); // not excluded
			expect(containsValue(result.domain, Math.PI / 2)).toBe(false); // excluded
			expect(containsValue(result.domain, -Math.PI / 2)).toBe(false); // excluded
			expect(containsValue(result.domain, (3 * Math.PI) / 2)).toBe(false); // excluded
		});

		it('cot(x) returns periodic_exclusion domain', () => {
			const expr = func('cot', [variable('x')]);
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('periodic_exclusion');

			// Check excluded points: kπ
			expect(containsValue(result.domain, Math.PI / 2)).toBe(true); // not excluded
			expect(containsValue(result.domain, 0)).toBe(false); // excluded
			expect(containsValue(result.domain, Math.PI)).toBe(false); // excluded
			expect(containsValue(result.domain, -Math.PI)).toBe(false); // excluded
		});

		it('sec(x) returns periodic_exclusion domain (same as tan)', () => {
			const expr = func('sec', [variable('x')]);
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('periodic_exclusion');
			expect(containsValue(result.domain, Math.PI / 2)).toBe(false); // excluded
		});

		it('csc(x) returns periodic_exclusion domain (same as cot)', () => {
			const expr = func('csc', [variable('x')]);
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('periodic_exclusion');
			expect(containsValue(result.domain, 0)).toBe(false); // excluded
			expect(containsValue(result.domain, Math.PI)).toBe(false); // excluded
		});
	});

	describe('periodic exclusions with linear arguments (tan(ax+b))', () => {
		it('tan(2x) returns periodic_exclusion with adjusted period', () => {
			// tan(2x) is undefined when 2x = π/2 + kπ
			// → x = π/4 + kπ/2
			const expr = func('tan', [multiply(number('2'), variable('x'), 'implicit')]);
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('periodic_exclusion');

			// Excluded at x = π/4 + kπ/2
			expect(containsValue(result.domain, Math.PI / 4)).toBe(false); // excluded
			expect(containsValue(result.domain, (3 * Math.PI) / 4)).toBe(false); // excluded
			expect(containsValue(result.domain, -Math.PI / 4)).toBe(false); // excluded

			// Not excluded at x = 0, π/2, etc.
			expect(containsValue(result.domain, 0)).toBe(true);
			expect(containsValue(result.domain, Math.PI / 2)).toBe(true);
		});

		it('tan(x + π/4) returns periodic_exclusion with adjusted base point', () => {
			// tan(x + π/4) is undefined when x + π/4 = π/2 + kπ
			// → x = π/4 + kπ
			const piOver4 = fraction({ type: 'constant', constant: 'pi' } as MathNode, number('4'));
			const expr = func('tan', [add(variable('x'), piOver4)]);
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('periodic_exclusion');

			// Excluded at x = π/4 + kπ
			expect(containsValue(result.domain, Math.PI / 4)).toBe(false); // excluded
			expect(containsValue(result.domain, Math.PI / 4 + Math.PI)).toBe(false); // excluded
			expect(containsValue(result.domain, Math.PI / 4 - Math.PI)).toBe(false); // excluded

			// Not excluded at x = 0
			expect(containsValue(result.domain, 0)).toBe(true);
		});

		it('cot(3x) returns periodic_exclusion with adjusted period', () => {
			// cot(3x) is undefined when 3x = kπ
			// → x = kπ/3
			const expr = func('cot', [multiply(number('3'), variable('x'), 'implicit')]);
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('periodic_exclusion');

			// Excluded at x = 0, π/3, 2π/3, π, ...
			expect(containsValue(result.domain, 0)).toBe(false); // excluded
			expect(containsValue(result.domain, Math.PI / 3)).toBe(false); // excluded
			expect(containsValue(result.domain, (2 * Math.PI) / 3)).toBe(false); // excluded
			expect(containsValue(result.domain, -Math.PI / 3)).toBe(false); // excluded

			// Not excluded at x = π/6
			expect(containsValue(result.domain, Math.PI / 6)).toBe(true);
		});

		it('sec(2x - π/2) returns periodic_exclusion with adjusted base and period', () => {
			// sec(2x - π/2) is undefined when 2x - π/2 = π/2 + kπ
			// → 2x = π + kπ → x = π/2 + kπ/2
			const piOver2 = fraction({ type: 'constant', constant: 'pi' } as MathNode, number('2'));
			const twoX = multiply(number('2'), variable('x'), 'implicit');
			const expr = func('sec', [subtract(twoX, piOver2)]);
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('periodic_exclusion');

			// Excluded at x = π/2 + kπ/2
			expect(containsValue(result.domain, Math.PI / 2)).toBe(false); // excluded
			expect(containsValue(result.domain, Math.PI)).toBe(false); // excluded
			expect(containsValue(result.domain, 0)).toBe(false); // excluded

			// Not excluded at x = π/4
			expect(containsValue(result.domain, Math.PI / 4)).toBe(true);
		});

		it('tan(x²) returns null (non-linear argument)', () => {
			// tan(x²) has a non-linear argument, cannot compute periodic exclusion simply
			const xSquared = power(variable('x'), number('2'));
			const expr = func('tan', [xSquared]);
			const result = computeDomain(expr, 'x');

			// Should not return periodic_exclusion for non-linear
			// Will return universal or interval_set depending on implementation
			expect(result.domain.kind).not.toBe('periodic_exclusion');
		});

		it('csc(x/2) returns periodic_exclusion with doubled period', () => {
			// csc(x/2) is undefined when x/2 = kπ
			// → x = 2kπ (period = 2π)
			const expr = func('csc', [fraction(variable('x'), number('2'))]);
			const result = computeDomain(expr, 'x');
			expect(result.domain.kind).toBe('periodic_exclusion');

			// Excluded at x = 0, 2π, -2π, ...
			expect(containsValue(result.domain, 0)).toBe(false); // excluded
			expect(containsValue(result.domain, 2 * Math.PI)).toBe(false); // excluded
			expect(containsValue(result.domain, -2 * Math.PI)).toBe(false); // excluded

			// Not excluded at x = π
			expect(containsValue(result.domain, Math.PI)).toBe(true);
		});
	});
});
