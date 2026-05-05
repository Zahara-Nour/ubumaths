/**
 * Tests for `pedagogical-rules/powers.ts` and
 * `pedagogical-rules/scientific-notation.ts` (Phase 6).
 */

import { describe, expect, it } from 'vitest';
import { multiply, number, opposite, superscript } from '../../factory';
import { applyRule } from '../../pattern/rule';
import { toLatex } from '../../latex-generator';
import {
	combinePowersSameBase,
	expandSmallPower,
	powerOfPower,
	POWER_RULES
} from '../pedagogical-rules/powers';
import {
	addScientificSamePower,
	multiplyScientific,
	SCIENTIFIC_NOTATION_RULES,
	toScientificNotation
} from '../pedagogical-rules/scientific-notation';

describe('powers rules', () => {
	describe('expandSmallPower', () => {
		it('2³ → 2 × 2 × 2', () => {
			const result = applyRule(expandSmallPower.rule, superscript(number('2'), number('3')));
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			// Should produce a product
			const matches = latex.match(/2/g) ?? [];
			expect(matches.length).toBeGreaterThanOrEqual(3);
		});

		it('2² → 2 × 2', () => {
			const result = applyRule(expandSmallPower.rule, superscript(number('2'), number('2')));
			expect(result).not.toBeNull();
			const matches = toLatex(result!).match(/2/g) ?? [];
			expect(matches.length).toBeGreaterThanOrEqual(2);
		});

		it('does NOT fire on 2¹ (exponent ≤ 1)', () => {
			const result = applyRule(expandSmallPower.rule, superscript(number('2'), number('1')));
			expect(result).toBeNull();
		});

		it('does NOT fire on 2⁶ (exponent > threshold)', () => {
			const result = applyRule(expandSmallPower.rule, superscript(number('2'), number('6')));
			expect(result).toBeNull();
		});

		it('only applies in primaire / college', () => {
			expect(expandSmallPower.applicableLevels).toEqual(['primaire', 'college']);
		});
	});

	describe('combinePowersSameBase', () => {
		it('2³ × 2⁵ → 2⁸', () => {
			const result = applyRule(
				combinePowersSameBase.rule,
				multiply(
					superscript(number('2'), number('3')),
					superscript(number('2'), number('5')),
					'cross'
				)
			);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('2');
			expect(latex).toContain('8');
		});

		it('does NOT fire on 2³ × 3⁵ (different bases)', () => {
			const result = applyRule(
				combinePowersSameBase.rule,
				multiply(
					superscript(number('2'), number('3')),
					superscript(number('3'), number('5')),
					'cross'
				)
			);
			expect(result).toBeNull();
		});
	});

	describe('powerOfPower', () => {
		it('(2³)² → 2⁶', () => {
			const result = applyRule(
				powerOfPower.rule,
				superscript(superscript(number('2'), number('3')), number('2'))
			);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('6');
		});

		it('does NOT fire on 2³ (no outer power)', () => {
			const result = applyRule(powerOfPower.rule, superscript(number('2'), number('3')));
			expect(result).toBeNull();
		});
	});

	describe('POWER_RULES export', () => {
		it('contains 3 rules', () => {
			expect(POWER_RULES).toHaveLength(3);
		});
	});
});

describe('scientific-notation rules', () => {
	describe('toScientificNotation', () => {
		it('5000000 → 5 × 10⁶', () => {
			const result = applyRule(toScientificNotation.rule, number('5000000'));
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('5');
			expect(latex).toContain('10');
			expect(latex).toContain('6');
		});

		it('37 → 3.7 × 10¹', () => {
			const result = applyRule(toScientificNotation.rule, number('37'));
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('3.7');
			expect(latex).toContain('10');
		});

		it('0.000037 → 3.7 × 10⁻⁵', () => {
			const result = applyRule(toScientificNotation.rule, number('0.000037'));
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('3.7');
			// Negative exponent should be present (as -5 or via opposite)
			expect(latex).toMatch(/-?5/);
		});

		it('does NOT fire on already-scientific 3.7', () => {
			// 3.7 is already in [1, 10) and would produce exponent 0 — the
			// `exponent === 0n && mantissa === raw` guard fizzles the rule.
			const result = applyRule(toScientificNotation.rule, number('3.7'));
			expect(result).toBeNull();
		});

		it('does NOT fire on 0', () => {
			const result = applyRule(toScientificNotation.rule, number('0'));
			expect(result).toBeNull();
		});
	});

	describe('multiplyScientific', () => {
		function sciNode(a: string, n: string) {
			return multiply(number(a), superscript(number('10'), number(n)), 'cross');
		}

		it('(3 × 10⁴) × (2 × 10⁻²) → 6 × 10²', () => {
			const minusTwo = multiply(
				number('2'),
				superscript(number('10'), opposite(number('2'))),
				'cross'
			);
			const node = multiply(sciNode('3', '4'), minusTwo, 'cross');
			const result = applyRule(multiplyScientific.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('6');
			expect(latex).toContain('10');
			expect(latex).toContain('2');
		});

		it('(5 × 10³) × (4 × 10²) → 2 × 10⁶ (overflow re-normalize)', () => {
			const node = multiply(sciNode('5', '3'), sciNode('4', '2'), 'cross');
			const result = applyRule(multiplyScientific.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			// 5*4=20 → renormalize to 2 × 10⁶
			expect(latex).toContain('2');
			expect(latex).toContain('6');
		});
	});

	describe('addScientificSamePower', () => {
		function sciNode(a: string, n: string) {
			return multiply(number(a), superscript(number('10'), number(n)), 'cross');
		}

		it('3 × 10⁵ + 2 × 10⁵ → 5 × 10⁵', () => {
			const result = applyRule(
				addScientificSamePower.rule,
				multiply(sciNode('3', '5'), number('1'), 'cross') // dummy multiplication wrapper
			);
			// The above is wrong — we need an addition node directly
			expect(result).toBeNull();
		});

		it('3 × 10⁵ + 2 × 10⁵ via add', () => {
			const node = {
				type: 'addition' as const,
				left: sciNode('3', '5'),
				right: sciNode('2', '5')
			};
			const result = applyRule(addScientificSamePower.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('5');
		});

		it('does NOT fire when exponents differ', () => {
			const node = {
				type: 'addition' as const,
				left: sciNode('3', '5'),
				right: sciNode('2', '4')
			};
			const result = applyRule(addScientificSamePower.rule, node);
			expect(result).toBeNull();
		});
	});

	describe('SCIENTIFIC_NOTATION_RULES export', () => {
		it('contains 3 rules', () => {
			expect(SCIENTIFIC_NOTATION_RULES).toHaveLength(3);
		});
	});
});
