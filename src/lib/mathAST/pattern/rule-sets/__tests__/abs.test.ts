/**
 * Tests for absolute value simplification rules
 */

import { describe, it, expect } from 'vitest';
import { absRules } from '../abs';
import { applyRules } from '../../rule';
import { variable, number, abs, opposite, implicitMultiply, fraction } from '../../../factory';
import { toLatex } from '../../../latex-generator';
import type { TypeContext } from '../../../numtype/types';

// =============================================================================
// Helpers
// =============================================================================

function simplifyAbs(input: ReturnType<typeof abs>, ctx?: TypeContext): string {
	const result = applyRules(absRules, input, 100, ctx);
	return toLatex(result);
}

// =============================================================================
// Tests
// =============================================================================

describe('abs rules', () => {
	describe('unconditional rules', () => {
		it('|-x| -> |x| (absorb negation)', () => {
			const input = abs(opposite(variable('x')));
			const result = simplifyAbs(input);
			expect(result).toBe(toLatex(abs(variable('x'))));
		});

		it('||x|| -> |x| (idempotent)', () => {
			const input = abs(abs(variable('x')));
			const result = simplifyAbs(input);
			expect(result).toBe(toLatex(abs(variable('x'))));
		});

		it('|x * y| -> |x| * |y| (product distribution)', () => {
			const input = abs(implicitMultiply(variable('x'), variable('y')));
			const result = simplifyAbs(input);
			// Instantiate creates implicit multiplication
			expect(result).toBe(toLatex(implicitMultiply(abs(variable('x')), abs(variable('y')))));
		});

		it('|x / y| -> |x| / |y| (quotient distribution)', () => {
			const input = abs(fraction(variable('x'), variable('y')));
			const result = simplifyAbs(input);
			// Instantiate creates fraction division
			expect(result).toBe(toLatex(fraction(abs(variable('x')), abs(variable('y')))));
		});

		it('|5| stays |5| (no sign constraint without ctx)', () => {
			// Without ctx, 5 is a positive literal so abs-positive matches
			const input = abs(number('5'));
			const result = applyRules(absRules, input, 100);
			// 5 is a literal positive number, so it should simplify to 5
			expect(toLatex(result)).toBe('5');
		});
	});

	describe('conditional rules (with TypeContext)', () => {
		it('|x| -> x when x is positive', () => {
			const ctx: TypeContext = {
				assumptions: new Map([['x', { sign: 'positive' }]])
			};
			const input = abs(variable('x'));
			const result = applyRules(absRules, input, 100, ctx);
			expect(toLatex(result)).toBe('x');
		});

		it('|x| -> -x when x is negative', () => {
			const ctx: TypeContext = {
				assumptions: new Map([['x', { sign: 'negative' }]])
			};
			const input = abs(variable('x'));
			const result = applyRules(absRules, input, 100, ctx);
			expect(toLatex(result)).toBe('-x');
		});

		it('|x| stays |x| without assumptions', () => {
			const input = abs(variable('x'));
			const result = applyRules(absRules, input, 100);
			expect(toLatex(result)).toBe(toLatex(abs(variable('x'))));
		});
	});
});
