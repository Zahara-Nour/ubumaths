/**
 * Tests for `pedagogical-rules/fractions.ts` (Phase 4).
 *
 * Each rule is exercised in isolation via `applyRule()`. Coverage :
 * - addSameDenominator : positive + negative + same-denominator-required guard
 * - toCommonDenominator : different denominators + LCM correctness
 * - multiplyFractions : positive + negative
 * - divideFractions : reciprocal + zero-numerator guard on the right
 * - reduceFraction : reduces / leaves alone / handles negatives
 * - applicableLevels matrix
 */

import { describe, expect, it } from 'vitest';
import { add, divide, multiply, number, opposite } from '../../factory';
import { applyRule } from '../../pattern/rule';
import { toLatex } from '../../latex-generator';
import {
	FRACTION_RULES,
	addSameDenominator,
	divideFractions,
	multiplyFractions,
	reduceFraction,
	toCommonDenominator
} from '../pedagogical-rules/fractions';

function frac(n: string, d: string) {
	return divide(number(n), number(d), 'fraction');
}

describe('fractions rules', () => {
	describe('addSameDenominator', () => {
		it('1/6 + 2/6 → 3/6 (no reduction)', () => {
			const node = add(frac('1', '6'), frac('2', '6'));
			const result = applyRule(addSameDenominator.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('3');
			expect(latex).toContain('6');
			// not 1/2 yet — reduction is a separate rule
			expect(latex).not.toMatch(/\\d?frac\{1\}\{2\}/);
		});

		it('does NOT fire when denominators differ (1/3 + 1/6)', () => {
			const node = add(frac('1', '3'), frac('1', '6'));
			const result = applyRule(addSameDenominator.rule, node);
			expect(result).toBeNull();
		});

		it('1/6 + (-2/6) → -1/6 (negative numerator)', () => {
			const node = add(frac('1', '6'), opposite(frac('2', '6')));
			const result = applyRule(addSameDenominator.rule, node);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toContain('1');
			expect(toLatex(result!)).toContain('6');
		});

		it('applicable in all 4 levels', () => {
			expect(addSameDenominator.applicableLevels).toEqual([
				'primaire',
				'college',
				'lycee',
				'superieur'
			]);
		});
	});

	describe('toCommonDenominator', () => {
		it('1/3 + 1/6 → 2/6 + 1/6 (LCM = 6)', () => {
			const node = add(frac('1', '3'), frac('1', '6'));
			const result = applyRule(toCommonDenominator.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('2'); // numerator after rewrite
			expect(latex).toContain('6'); // common denominator
		});

		it('1/4 + 1/6 → 3/12 + 2/12 (LCM = 12)', () => {
			const node = add(frac('1', '4'), frac('1', '6'));
			const result = applyRule(toCommonDenominator.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('12');
			expect(latex).toContain('3');
			expect(latex).toContain('2');
		});

		it('does NOT fire when denominators are equal (1/6 + 2/6)', () => {
			const node = add(frac('1', '6'), frac('2', '6'));
			const result = applyRule(toCommonDenominator.rule, node);
			expect(result).toBeNull();
		});

		it('does NOT apply in primaire', () => {
			expect(toCommonDenominator.applicableLevels).not.toContain('primaire');
		});

		it('description college mentions "même dénominateur"', () => {
			expect(toCommonDenominator.descriptions.college?.({})).toBe(
				'On met les fractions au même dénominateur'
			);
		});
	});

	describe('multiplyFractions', () => {
		it('2/3 × 5/7 → 10/21 (no reduction needed)', () => {
			const node = multiply(frac('2', '3'), frac('5', '7'), 'cross');
			const result = applyRule(multiplyFractions.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('10');
			expect(latex).toContain('21');
		});

		it('3/4 × 8/9 → 24/36 (un-reduced; reduceFraction handles it later)', () => {
			const node = multiply(frac('3', '4'), frac('8', '9'), 'cross');
			const result = applyRule(multiplyFractions.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			// Should contain 24/36 (un-reduced) — NOT 2/3 yet
			expect(latex).toContain('24');
			expect(latex).toContain('36');
		});

		it('does NOT apply in primaire', () => {
			expect(multiplyFractions.applicableLevels).not.toContain('primaire');
		});
	});

	describe('divideFractions', () => {
		it('(2/3) / (5/7) → (2/3) × (7/5)', () => {
			const node = divide(frac('2', '3'), frac('5', '7'), 'fraction');
			const result = applyRule(divideFractions.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('2');
			expect(latex).toContain('3');
			expect(latex).toContain('7');
			expect(latex).toContain('5');
		});

		it('does NOT fire when divisor numerator is 0 (avoid /0)', () => {
			const node = divide(frac('2', '3'), frac('0', '7'), 'fraction');
			const result = applyRule(divideFractions.rule, node);
			expect(result).toBeNull();
		});
	});

	describe('reduceFraction', () => {
		it('3/6 → 1/2', () => {
			const result = applyRule(reduceFraction.rule, frac('3', '6'));
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('1');
			expect(latex).toContain('2');
			expect(latex).not.toContain('3');
			expect(latex).not.toContain('6');
		});

		it('24/36 → 2/3 (PGCD = 12)', () => {
			const result = applyRule(reduceFraction.rule, frac('24', '36'));
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('2');
			expect(latex).toContain('3');
			expect(latex).not.toContain('24');
		});

		it('does NOT fire on already reduced fraction (1/2)', () => {
			const result = applyRule(reduceFraction.rule, frac('1', '2'));
			expect(result).toBeNull();
		});

		it('reduces 6/3 → 2 (denominator becomes 1)', () => {
			const result = applyRule(reduceFraction.rule, frac('6', '3'));
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toBe('2');
		});

		it('-6/9 → -2/3 (handles negative numerator)', () => {
			const result = applyRule(reduceFraction.rule, opposite(frac('6', '9')));
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('2');
			expect(latex).toContain('3');
		});

		it('description college is pedagogical', () => {
			expect(reduceFraction.descriptions.college?.({})).toBe('On simplifie la fraction');
		});

		it('priority 30 (runs after additions/multiplications)', () => {
			expect(reduceFraction.priority).toBe(30);
		});
	});

	describe('FRACTION_RULES export', () => {
		it('contains all 5 rules', () => {
			expect(FRACTION_RULES).toHaveLength(5);
		});

		it('addSameDenominator and multiplyFractions have priority 110', () => {
			expect(addSameDenominator.priority).toBe(110);
			expect(multiplyFractions.priority).toBe(110);
		});

		it('toCommonDenominator priority 130 (highest among fractions)', () => {
			expect(toCommonDenominator.priority).toBe(130);
		});
	});
});
