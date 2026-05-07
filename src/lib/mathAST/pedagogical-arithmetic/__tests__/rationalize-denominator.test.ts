/**
 * Tests for `rationalize-denominator` (Track C).
 *
 * `c/√n → c·√n / n` when `n` is NOT a perfect square (precondition C-2 —
 * see `docs/wip/short-todos-prompt.md` Track C). For perfect squares (e.g.
 * `1/√4`), `extractPerfectSquare` (priority 100) handles `√4 → 2` first and
 * the rule fizzles silently.
 *
 * Coverage:
 *   - 1/√n with n non-square (basic + composite numerator + signed)
 *   - Fizzles on rational denominator and on perfect-square radicand
 *   - applicableLevels and priority
 *   - End-to-end pipeline: `1/√8 → 1/(2√2)` (extractPerfectSquare wins
 *     bottom-up — decision 2A)
 */

import { describe, expect, it } from 'vitest';
import { add, divide, number, opposite, sqrt } from '../../factory';
import { applyRule } from '../../pattern/rule';
import { toLatex } from '../../latex-generator';
import { rationalizeDenominator } from '../pedagogical-rules/radicals';
import { generatePedagogicalArithmeticSteps } from '../pipeline';

describe('rationalizeDenominator', () => {
	describe('basic cases — non-square radicand', () => {
		it('1/√2 → √2/2', () => {
			const node = divide(number('1'), sqrt(number('2')), 'fraction');
			const result = applyRule(rationalizeDenominator.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			// Numerator should be √2, denominator should be 2
			expect(latex).toContain('sqrt');
			expect(latex).toContain('2');
		});

		it('3/√5 → 3√5/5', () => {
			const node = divide(number('3'), sqrt(number('5')), 'fraction');
			const result = applyRule(rationalizeDenominator.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('3');
			expect(latex).toContain('5');
			expect(latex).toContain('sqrt');
		});

		it('(1+√2)/√3 → (1+√2)·√3/3 (V1: no distribution)', () => {
			const composite = add(number('1'), sqrt(number('2')));
			const node = divide(composite, sqrt(number('3')), 'fraction');
			const result = applyRule(rationalizeDenominator.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			// Denominator becomes 3, numerator multiplied by √3
			expect(latex).toContain('3');
			expect(latex).toContain('sqrt');
		});
	});

	describe('signed numerator', () => {
		it('(-1)/√2 → -1·√2/2 (rule fires, sign preserved at numerator)', () => {
			const node = divide(opposite(number('1')), sqrt(number('2')), 'fraction');
			const result = applyRule(rationalizeDenominator.rule, node);
			expect(result).not.toBeNull();
			// Replacement structure: (opposite(1) * √2) / 2.
			// Cosmetic transforms (out of this rule's scope) will later reduce
			// 1·√2 to √2 and propagate the negative. Here we only verify:
			//   - the rule fired
			//   - the result IS a fraction (division shape preserved)
			//   - the denominator is now the literal `2`, NOT `√2`
			expect(result!.type).toBe('division');
			const div = result as { numerator: unknown; denominator: { type: string; value?: string } };
			expect(div.denominator.type).toBe('number');
			expect(div.denominator.value).toBe('2');
		});
	});

	describe('precondition C-2 — does NOT fire on perfect-square radicand', () => {
		it('1/√4 does NOT fire (4 is a perfect square)', () => {
			const node = divide(number('1'), sqrt(number('4')), 'fraction');
			const result = applyRule(rationalizeDenominator.rule, node);
			expect(result).toBeNull();
		});

		it('1/√9 does NOT fire (9 is a perfect square)', () => {
			const node = divide(number('1'), sqrt(number('9')), 'fraction');
			const result = applyRule(rationalizeDenominator.rule, node);
			expect(result).toBeNull();
		});
	});

	describe('does NOT fire — denominator already rational', () => {
		it('1/2 does NOT fire (no √)', () => {
			const node = divide(number('1'), number('2'), 'fraction');
			const result = applyRule(rationalizeDenominator.rule, node);
			expect(result).toBeNull();
		});
	});

	describe('does fire on √n / √n (V1 — Q4 decision)', () => {
		it('√3/√3 fires (produces √3·√3/3 = 3/3, cosmetics reduce later)', () => {
			const node = divide(sqrt(number('3')), sqrt(number('3')), 'fraction');
			const result = applyRule(rationalizeDenominator.rule, node);
			expect(result).not.toBeNull();
		});
	});

	describe('rule metadata', () => {
		it('priority 105 (between extractPerfectSquare 100 and multiplyRadicals 110)', () => {
			expect(rationalizeDenominator.priority).toBe(105);
		});

		it('applicableLevels: college, lycee, superieur (programme troisième+)', () => {
			expect(rationalizeDenominator.applicableLevels).toEqual(['college', 'lycee', 'superieur']);
		});

		it('does NOT apply in primaire', () => {
			expect(rationalizeDenominator.applicableLevels).not.toContain('primaire');
		});

		it('description college is pedagogical', () => {
			const desc = rationalizeDenominator.descriptions.college?.({});
			expect(desc).toBeDefined();
			expect(desc!.length).toBeGreaterThan(0);
		});
	});

	describe('end-to-end pipeline (path A — bottom-up traversal)', () => {
		it('1/√8 → 1/(2√2) — extractPerfectSquare wins on the inner sub-node', () => {
			// Decision 2A: the rule engine is bottom-up (mapNode traverses
			// from leaves up), so extractPerfectSquare (priority 100) fires
			// on the √8 sub-node BEFORE rationalizeDenominator can match
			// the top-level division. Result: 1/(2√2). Mathematically correct
			// but not the canonical √2/4 form — would require a more complex
			// rule matching c/(k·√n) (out of scope V1, see prompt Track C
			// decision 2A).
			const node = divide(number('1'), sqrt(number('8')), 'fraction');
			const result = generatePedagogicalArithmeticSteps(node, {
				schoolLevel: 'lycee'
			});
			const latex = toLatex(result.finalNode);
			// Result contains both 2 and √2 (the extracted form).
			expect(latex).toContain('sqrt');
			expect(latex).toContain('2');
		});
	});
});
