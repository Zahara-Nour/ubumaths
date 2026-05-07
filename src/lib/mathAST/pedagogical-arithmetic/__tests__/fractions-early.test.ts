/**
 * Tests for `toCommonDenominatorMultiply` (Track B — fractions early-college).
 *
 * Pattern: `a/b + c/d` (b ≠ d) → `(a·d)/(b·d) + (c·b)/(b·d)` (direct product,
 * NO PGCD/LCM). Pedagogically simpler for primaire and early-college (5e/4e)
 * where PGCD is not yet on the curriculum.
 *
 * Driven by `PedagogicalArithmeticOptions.collegeSubLevel === 'early'` for
 * collège, and is the default rule at `'primaire'` (since
 * `toCommonDenominator` LCM excludes primaire from its applicableLevels).
 *
 * Coverage:
 *   - Direct multiply for primaire and college early
 *   - LCM (default) for college late and lycée/sup
 *   - Loader gating (collegeSubLevel)
 *   - End-to-end pipeline (1/3 + 1/6, 1/4 + 1/6)
 */

import { describe, expect, it } from 'vitest';
import { add, divide, number, opposite } from '../../factory';
import { applyRule } from '../../pattern/rule';
import { toLatex } from '../../latex-generator';
import { toCommonDenominator, toCommonDenominatorMultiply } from '../pedagogical-rules/fractions';
import { loadPedagogicalRules } from '../pedagogical-rules';
import { generatePedagogicalArithmeticSteps } from '../pipeline';

describe('toCommonDenominatorMultiply (Track B)', () => {
	describe('direct product (no LCM)', () => {
		it('1/3 + 1/6 → 6/18 + 3/18 (NOT 2/6 + 1/6)', () => {
			const node = add(
				divide(number('1'), number('3'), 'fraction'),
				divide(number('1'), number('6'), 'fraction')
			);
			const result = applyRule(toCommonDenominatorMultiply.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			// Common denominator must be 18 (3 × 6), NOT 6 (LCM).
			expect(latex).toContain('18');
			expect(latex).not.toMatch(/\\dfrac\{1\}\{6\}\s*\+/); // not the LCM path
		});

		it('1/4 + 1/6 → 6/24 + 4/24 (24, NOT 12 LCM)', () => {
			const node = add(
				divide(number('1'), number('4'), 'fraction'),
				divide(number('1'), number('6'), 'fraction')
			);
			const result = applyRule(toCommonDenominatorMultiply.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('24');
		});

		it('coprime denominators: same numeric outcome as LCM path', () => {
			// b=3, d=5 are coprime → product (15) == LCM(3,5) == 15.
			// The structure is identical between multiply and LCM paths.
			const node = add(
				divide(number('1'), number('3'), 'fraction'),
				divide(number('1'), number('5'), 'fraction')
			);
			const result = applyRule(toCommonDenominatorMultiply.rule, node);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toContain('15');
		});

		it('signed numerator (Q4): -1/3 + 1/6 → -6/18 + 3/18 (sign preserved)', () => {
			// Q4: numerator may be opposite(n). asIntegerFraction handles it
			// via { n: -inner.n, d: inner.d }. Cross-product preserves the
			// sign through the multiplication.
			const node = add(
				opposite(divide(number('1'), number('3'), 'fraction')),
				divide(number('1'), number('6'), 'fraction')
			);
			const result = applyRule(toCommonDenominatorMultiply.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			// Common denominator is 18; left numerator is -6 (preserves sign).
			expect(latex).toContain('18');
			expect(latex).toContain('6');
		});
	});

	describe('does NOT fire — same denominator', () => {
		it('1/3 + 1/3 does NOT fire (addSameDenominator handles it)', () => {
			const node = add(
				divide(number('1'), number('3'), 'fraction'),
				divide(number('1'), number('3'), 'fraction')
			);
			const result = applyRule(toCommonDenominatorMultiply.rule, node);
			expect(result).toBeNull();
		});
	});

	describe('rule metadata', () => {
		it('priority 130 (same as LCM toCommonDenominator)', () => {
			expect(toCommonDenominatorMultiply.priority).toBe(130);
		});

		it('applicableLevels: primaire + college only (lycee/sup use LCM)', () => {
			expect(toCommonDenominatorMultiply.applicableLevels).toEqual(['primaire', 'college']);
		});

		it('description college mentions multiplication directe', () => {
			const desc = toCommonDenominatorMultiply.descriptions.college?.({});
			expect(desc).toBeDefined();
			expect(desc!.length).toBeGreaterThan(0);
		});
	});

	describe('loader gating (collegeSubLevel)', () => {
		it('primaire: multiply IN, LCM OUT (LCM applicableLevels excludes primaire)', () => {
			const rules = loadPedagogicalRules({ schoolLevel: 'primaire' });
			expect(rules).toContain(toCommonDenominatorMultiply);
			expect(rules).not.toContain(toCommonDenominator);
		});

		it('college default (late): LCM IN, multiply OUT', () => {
			const rules = loadPedagogicalRules({ schoolLevel: 'college' });
			expect(rules).toContain(toCommonDenominator);
			expect(rules).not.toContain(toCommonDenominatorMultiply);
		});

		it('college late explicit: LCM IN, multiply OUT', () => {
			const rules = loadPedagogicalRules({
				schoolLevel: 'college',
				collegeSubLevel: 'late'
			});
			expect(rules).toContain(toCommonDenominator);
			expect(rules).not.toContain(toCommonDenominatorMultiply);
		});

		it('college early: multiply IN, LCM OUT', () => {
			const rules = loadPedagogicalRules({
				schoolLevel: 'college',
				collegeSubLevel: 'early'
			});
			expect(rules).toContain(toCommonDenominatorMultiply);
			expect(rules).not.toContain(toCommonDenominator);
		});

		it('lycee: LCM IN, multiply OUT (multiply not in lycee applicableLevels)', () => {
			const rules = loadPedagogicalRules({ schoolLevel: 'lycee' });
			expect(rules).toContain(toCommonDenominator);
			expect(rules).not.toContain(toCommonDenominatorMultiply);
		});

		it('superieur: LCM IN, multiply OUT', () => {
			const rules = loadPedagogicalRules({ schoolLevel: 'superieur' });
			expect(rules).toContain(toCommonDenominator);
			expect(rules).not.toContain(toCommonDenominatorMultiply);
		});

		it('lycee with collegeSubLevel: early has no effect (multiply still excluded)', () => {
			const rules = loadPedagogicalRules({
				schoolLevel: 'lycee',
				collegeSubLevel: 'early'
			});
			expect(rules).toContain(toCommonDenominator);
			expect(rules).not.toContain(toCommonDenominatorMultiply);
		});
	});

	describe('end-to-end pipeline', () => {
		it('1/3 + 1/6 in college early → fires multiply step (denominator 18)', () => {
			const node = add(
				divide(number('1'), number('3'), 'fraction'),
				divide(number('1'), number('6'), 'fraction')
			);
			const result = generatePedagogicalArithmeticSteps(node, {
				schoolLevel: 'college',
				collegeSubLevel: 'early'
			});
			const stepNames = result.steps.map((s) => s.rule);
			expect(stepNames).toContain('to-common-denominator-multiply');
			expect(stepNames).not.toContain('to-common-denominator');
		});

		it('1/3 + 1/6 in college late (default) → fires LCM step (denominator 6)', () => {
			const node = add(
				divide(number('1'), number('3'), 'fraction'),
				divide(number('1'), number('6'), 'fraction')
			);
			const result = generatePedagogicalArithmeticSteps(node, {
				schoolLevel: 'college'
				// no collegeSubLevel → default 'late'
			});
			const stepNames = result.steps.map((s) => s.rule);
			expect(stepNames).toContain('to-common-denominator');
			expect(stepNames).not.toContain('to-common-denominator-multiply');
		});

		it('1/3 + 1/6 in primaire → fires multiply step (no LCM available)', () => {
			const node = add(
				divide(number('1'), number('3'), 'fraction'),
				divide(number('1'), number('6'), 'fraction')
			);
			const result = generatePedagogicalArithmeticSteps(node, {
				schoolLevel: 'primaire'
			});
			const stepNames = result.steps.map((s) => s.rule);
			expect(stepNames).toContain('to-common-denominator-multiply');
		});
	});
});
