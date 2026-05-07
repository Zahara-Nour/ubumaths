/**
 * Tests for `simplify-square-root-of-square` (Track C, opt-in via flag).
 *
 * `√(x²) → |x|`. **Off by default** (decision C-1). Activable via
 * `enableSquareRootOfSquare: true` in `PedagogicalArithmeticOptions`.
 *
 * Coverage:
 *   - With flag: `√(x²) → |x|`, `√((x-1)²) → |x-1|`, `√(0²) → |0|`
 *   - Numeric square `√(4²)`: extractPerfectSquare (priority 100) wins over
 *     simplify-square-root-of-square (priority 90). No double-fire.
 *   - Without flag: rule is NOT loaded (`√(x²)` stays unchanged)
 *   - Pattern is sqrt(superscript(x, 2)) only — `√(x³)` does not match.
 *   - applicableLevels and priority
 */

import { describe, expect, it } from 'vitest';
import { number, sqrt, subtract, superscript, variable } from '../../factory';
import { applyRule } from '../../pattern/rule';
import { toLatex } from '../../latex-generator';
import { simplifyRootOfSquare } from '../pedagogical-rules/radicals';
import { loadPedagogicalRules } from '../pedagogical-rules';
import { generatePedagogicalArithmeticSteps } from '../pipeline';

describe('simplifyRootOfSquare', () => {
	describe('with enableSquareRootOfSquare flag', () => {
		it('√(x²) → |x|', () => {
			const x = variable('x');
			const node = sqrt(superscript(x, number('2')));
			const result = applyRule(simplifyRootOfSquare.rule, node);
			expect(result).not.toBeNull();
			expect(toLatex(result!)).toContain('left|');
			expect(toLatex(result!)).toContain('right|');
			expect(toLatex(result!)).toContain('x');
		});

		it('√((x-1)²) → |x-1|', () => {
			const inner = subtract(variable('x'), number('1'));
			const node = sqrt(superscript(inner, number('2')));
			const result = applyRule(simplifyRootOfSquare.rule, node);
			expect(result).not.toBeNull();
			const latex = toLatex(result!);
			expect(latex).toContain('left|');
			expect(latex).toContain('right|');
			expect(latex).toContain('x');
			expect(latex).toContain('1');
		});

		it('√(0²) does NOT fire — numeric base skipped (decision 3A)', () => {
			// Decision 3A: skip ALL numeric bases (including 0) for consistency.
			// The rule targets symbolic expressions; numeric squares are handled
			// by extractPerfectSquare and the standard numeric simplifier.
			const node = sqrt(superscript(number('0'), number('2')));
			const result = applyRule(simplifyRootOfSquare.rule, node);
			expect(result).toBeNull();
		});
	});

	describe('does NOT fire when exponent is not 2', () => {
		it('√(x³) does NOT fire', () => {
			const node = sqrt(superscript(variable('x'), number('3')));
			const result = applyRule(simplifyRootOfSquare.rule, node);
			expect(result).toBeNull();
		});

		it('√(x) (no superscript at all) does NOT fire', () => {
			const node = sqrt(variable('x'));
			const result = applyRule(simplifyRootOfSquare.rule, node);
			expect(result).toBeNull();
		});
	});

	describe('opt-in via flag (decision C-1)', () => {
		it('rule is NOT loaded when enableSquareRootOfSquare is unset (default)', () => {
			const rules = loadPedagogicalRules({ schoolLevel: 'lycee' });
			expect(rules).not.toContain(simplifyRootOfSquare);
		});

		it('rule is NOT loaded when enableSquareRootOfSquare is false', () => {
			const rules = loadPedagogicalRules({
				schoolLevel: 'lycee',
				enableSquareRootOfSquare: false
			});
			expect(rules).not.toContain(simplifyRootOfSquare);
		});

		it('rule IS loaded when enableSquareRootOfSquare is true (lycée)', () => {
			const rules = loadPedagogicalRules({
				schoolLevel: 'lycee',
				enableSquareRootOfSquare: true
			});
			expect(rules).toContain(simplifyRootOfSquare);
		});

		it('rule is NOT loaded at college even with flag (applicableLevels)', () => {
			const rules = loadPedagogicalRules({
				schoolLevel: 'college',
				enableSquareRootOfSquare: true
			});
			expect(rules).not.toContain(simplifyRootOfSquare);
		});

		it('end-to-end: √(x²) stays √(x²) without flag', () => {
			const node = sqrt(superscript(variable('x'), number('2')));
			const result = generatePedagogicalArithmeticSteps(node, {
				schoolLevel: 'lycee'
			});
			const latex = toLatex(result.finalNode);
			expect(latex).not.toContain('left|');
		});
	});

	describe('non-overlap with extractPerfectSquare on numeric squares', () => {
		it('√(4²) does NOT trigger simplifyRootOfSquare even with flag (extract wins)', () => {
			// √(4²) = √16. extractPerfectSquare (priority 100) > simplifyRootOfSquare
			// (priority 90), so extract handles it first. We only check that
			// simplifyRootOfSquare correctly STOPS at numeric squared literals
			// to avoid producing |4| (cosmetically wrong — should be just 4).
			//
			// V1 rule of thumb: simplifyRootOfSquare matches superscript(x, 2)
			// where x is a non-numeric expression. For numeric x, extract handles it.
			const node = sqrt(superscript(number('4'), number('2')));
			const result = applyRule(simplifyRootOfSquare.rule, node);
			// Either fizzle (preferred — let extractPerfectSquare handle) OR
			// fire and produce |4|. We require fizzle to avoid double-coverage.
			expect(result).toBeNull();
		});
	});

	describe('rule metadata', () => {
		it('priority 90 (strictly less than extractPerfectSquare 100)', () => {
			expect(simplifyRootOfSquare.priority).toBe(90);
		});

		it('applicableLevels: lycee, superieur only (notion of |.| introduced en seconde)', () => {
			expect(simplifyRootOfSquare.applicableLevels).toEqual(['lycee', 'superieur']);
		});

		it('description lycee is pedagogical', () => {
			const desc = simplifyRootOfSquare.descriptions.lycee?.({});
			expect(desc).toBeDefined();
			expect(desc!.length).toBeGreaterThan(0);
		});
	});
});
