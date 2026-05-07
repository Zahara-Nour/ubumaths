/**
 * Tests for decimal-mantissa support in `multiplyScientific` and
 * `addScientificSamePower` (Track D).
 *
 * Strategy: a single internal representation `{ digits: bigint, decimalPos:
 * number }` with separate sign. All arithmetic is bigint-based — zero float
 * drift. Renormalisation handles overflow (mantissa ≥ 10) and underflow
 * (0 < mantissa < 1) in multiple passes if needed.
 *
 * Coverage:
 *   - Decimal × decimal product (basic + renormalize up + renormalize down)
 *   - Deep underflow (multiple passes of renormalization down)
 *   - Decimal + decimal at same power (basic + renormalize)
 *   - No float drift (exact bigint arithmetic)
 *   - Regression: existing integer-mantissa cases unchanged
 */

import { describe, expect, it } from 'vitest';
import { multiply, number, opposite, superscript } from '../../factory';
import { applyRule } from '../../pattern/rule';
import { toLatex } from '../../latex-generator';
import {
	addScientificSamePower,
	multiplyScientific
} from '../pedagogical-rules/scientific-notation';

/** Helper: build `a × 10ⁿ` factory shape. */
function sci(aLiteral: string, n: bigint, aSign: 1 | -1 = 1) {
	const aNode = aSign === -1 ? opposite(number(aLiteral)) : number(aLiteral);
	const exponent = n < 0n ? opposite(number((-n).toString())) : number(n.toString());
	return multiply(aNode, superscript(number('10'), exponent), 'cross');
}

describe('multiplyScientific — decimal mantissas (Track D)', () => {
	describe('basic decimal product', () => {
		it('(2.5 × 10⁴) × (3 × 10⁻²) → 7.5 × 10²', () => {
			const node = multiply(sci('2.5', 4n), sci('3', -2n), 'cross');
			const result = applyRule(multiplyScientific.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('7.5');
			expect(latex).toContain('10');
			// Exponent 2 (positive)
			expect(latex).toMatch(/\^\{?2\}?/);
		});

		it('(2.5 × 10⁴) × (4 × 10⁻²) → 1 × 10³ (renormalize up: 10 → 1×10¹)', () => {
			// 2.5 × 4 = 10, which is renormalized to 1 × 10^1. Combined exponent
			// becomes (4 + (-2)) + 1 = 3.
			const node = multiply(sci('2.5', 4n), sci('4', -2n), 'cross');
			const result = applyRule(multiplyScientific.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toMatch(/\^\{?3\}?/);
			// Mantissa is exactly 1 (no fractional part)
			expect(latex).toMatch(/1\s*\\times/);
		});

		it('(0.5 × 10²) × (5 × 10⁻³) → 2.5 × 10⁻¹ (renormalize down)', () => {
			// 0.5 × 5 = 2.5 (already in [1, 10)) — but 0.5 has decimalPos 1 so
			// the digits are 5 × 5 = 25, decimalPos 1+0 = 1 → '2.5'.
			// Wait — 0.5 needs first to be normalized. 0.5 = 5 × 10⁻¹, so the
			// input is technically not canonical (0.5 < 1). We test the rule's
			// handling: it accepts non-canonical input and renormalizes the
			// final result.
			const node = multiply(sci('0.5', 2n), sci('5', -3n), 'cross');
			const result = applyRule(multiplyScientific.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			// 0.5 × 5 = 2.5, exponents 2 + (-3) = -1
			expect(latex).toContain('2.5');
			expect(latex).toMatch(/-\s*1|\^{-1}/); // exponent -1
		});
	});

	describe('renormalization edge cases', () => {
		it('(0.25 × 10⁰) × (4 × 10⁰) → 1 × 10⁰', () => {
			// 0.25 × 4 = 1.00 → strip trailing zeros → '1', exponent = 0.
			const node = multiply(sci('0.25', 0n), sci('4', 0n), 'cross');
			const result = applyRule(multiplyScientific.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toMatch(/^1\s*\\times/);
			expect(latex).toMatch(/\^\{?0\}?/);
		});

		it('deep underflow: (0.001 × 10⁰) × (1 × 10⁰) → 1 × 10⁻³', () => {
			// 0.001 × 1 = 0.001 → after renormalize: 1 × 10⁻³.
			// Renormalisation requires multiple passes (mantissa goes from
			// 0.001 → 0.01 → 0.1 → 1, decrementing exponent each time).
			const node = multiply(sci('0.001', 0n), sci('1', 0n), 'cross');
			const result = applyRule(multiplyScientific.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toMatch(/^1\s*\\times/);
			expect(latex).toMatch(/\^\{?-3\}?/);
		});

		it('no float drift: (0.1 × 10¹) × (0.1 × 10¹) → 1 × 10⁰', () => {
			// 0.1 × 0.1 in floats produces 0.010000000000000002 — bigint avoids this.
			// digits 1 × 1 = 1, decimalPos 1 + 1 = 2 → '0.01' → renormalize to
			// '1 × 10⁻²'. Exponents 1+1 = 2, plus the renormalize -2 gives 0.
			// Wait: 0.01 means decimalPos 2, digits 1. Renormalize: 0.01 → 0.1 (exp +1) → 1 (exp +1). Combined: 2 + 0 - 2 = 0... let me redo.
			// (0.1 × 10¹) × (0.1 × 10¹) = 0.01 × 10² = 0.01 × 100 = 1. So exp 0.
			// Direct: digits 1 * 1 = 1, decimalPos 1+1 = 2. Mantissa = 0.01.
			// Combined exponent before renorm = 1 + 1 = 2.
			// Renormalise 0.01: too small (< 1), multiply by 10, exp goes from 2 to 1, mantissa 0.1.
			// Still too small, multiply by 10, exp from 1 to 0, mantissa 1.
			// Final: 1 × 10⁰.
			const node = multiply(sci('0.1', 1n), sci('0.1', 1n), 'cross');
			const result = applyRule(multiplyScientific.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toMatch(/^1\s*\\times/);
			expect(latex).toMatch(/\^\{?0\}?/);
			// Crucially: NO '0.10000000000000002' or similar drift artifact
			expect(latex).not.toContain('00000');
		});
	});

	describe('regression — integer mantissas unchanged', () => {
		it('(3 × 10⁴) × (2 × 10⁻²) → 6 × 10² (integer case still works)', () => {
			const node = multiply(sci('3', 4n), sci('2', -2n), 'cross');
			const result = applyRule(multiplyScientific.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toMatch(/^6\s*\\times/);
			expect(latex).toMatch(/\^\{?2\}?/);
		});

		it('(5 × 10²) × (4 × 10³) → 2 × 10⁶ (integer renormalize)', () => {
			const node = multiply(sci('5', 2n), sci('4', 3n), 'cross');
			const result = applyRule(multiplyScientific.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toMatch(/^2\s*\\times/);
			expect(latex).toMatch(/\^\{?6\}?/);
		});
	});

	describe('zero-mantissa guard', () => {
		it('(0 × 10³) × (2 × 10²) does NOT fire (rule fizzles)', () => {
			// Zero on either side: the rule short-circuits to null. The
			// broader pipeline handles `0 × anything → 0` via simplifyMulZero.
			const node = multiply(sci('0', 3n), sci('2', 2n), 'cross');
			const result = applyRule(multiplyScientific.rule, node);
			expect(result).toBeNull();
		});
	});

	describe('signed mantissas (decimal)', () => {
		it('(2.5 × 10⁴) × (-3 × 10⁻²) → -7.5 × 10² (sign propagation)', () => {
			const node = multiply(sci('2.5', 4n), sci('3', -2n, -1), 'cross');
			const result = applyRule(multiplyScientific.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('-');
			expect(latex).toContain('7.5');
		});
	});
});

describe('addScientificSamePower — decimal mantissas (Track D)', () => {
	describe('basic decimal addition', () => {
		it('2.5 × 10⁵ + 3.7 × 10⁵ → 6.2 × 10⁵', () => {
			const node = { type: 'addition', left: sci('2.5', 5n), right: sci('3.7', 5n) } as never;
			const result = applyRule(addScientificSamePower.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('6.2');
			expect(latex).toMatch(/\^\{?5\}?/);
		});

		it('2.5 × 10⁵ + 0.5 × 10⁵ → 3 × 10⁵ (clean integer result)', () => {
			const node = { type: 'addition', left: sci('2.5', 5n), right: sci('0.5', 5n) } as never;
			const result = applyRule(addScientificSamePower.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toMatch(/^3\s*\\times/);
			expect(latex).toMatch(/\^\{?5\}?/);
			// No trailing '.0'
			expect(latex).not.toMatch(/3\.0/);
		});
	});

	describe('renormalization on addition', () => {
		it('5.5 × 10² + 4.5 × 10² → 1 × 10³ (sum 10 → renormalize up)', () => {
			const node = { type: 'addition', left: sci('5.5', 2n), right: sci('4.5', 2n) } as never;
			const result = applyRule(addScientificSamePower.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toMatch(/^1\s*\\times/);
			expect(latex).toMatch(/\^\{?3\}?/);
		});
	});

	describe('regression — integer addition unchanged', () => {
		it('3 × 10⁴ + 4 × 10⁴ → 7 × 10⁴', () => {
			const node = { type: 'addition', left: sci('3', 4n), right: sci('4', 4n) } as never;
			const result = applyRule(addScientificSamePower.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toMatch(/^7\s*\\times/);
			expect(latex).toMatch(/\^\{?4\}?/);
		});
	});

	describe('opposite-sign addition (decimal)', () => {
		it('2.5 × 10³ + (-1.7) × 10³ → 0.8 × 10² (renormalize down)', () => {
			// Wait: 2.5 - 1.7 = 0.8. Renormalize: 0.8 × 10³ → 8 × 10². So exp 2.
			const node = {
				type: 'addition',
				left: sci('2.5', 3n),
				right: sci('1.7', 3n, -1)
			} as never;
			const result = applyRule(addScientificSamePower.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toMatch(/^8\s*\\times/);
			expect(latex).toMatch(/\^\{?2\}?/);
		});
	});
});
