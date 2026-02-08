/**
 * Tests for the simplify pipeline
 */

import { describe, it, expect } from 'vitest';
import { simplify } from '../simplify';
import { computeCost } from '../cost';
import {
	variable,
	number,
	add,
	multiply,
	abs,
	func,
	positiveInfinity,
	opposite,
	ln
} from '../../factory';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import type { TypeContext } from '../../numtype/types';

// =============================================================================
// Helpers
// =============================================================================

function simplifyLatex(latex: string, ctx?: TypeContext): string {
	const node = parseLatex(latex);
	const result = simplify(node, { ctx });
	return toLatex(result.result);
}

// =============================================================================
// Tests
// =============================================================================

describe('simplify pipeline', () => {
	describe('basic arithmetic identities', () => {
		it('x + 0 -> x', () => {
			const result = simplify(add(variable('x'), number('0')));
			expect(toLatex(result.result)).toBe('x');
		});

		it('x * 1 -> x', () => {
			const result = simplify(multiply(variable('x'), number('1')));
			expect(toLatex(result.result)).toBe('x');
		});

		it('x * 0 -> 0', () => {
			const result = simplify(multiply(variable('x'), number('0')));
			expect(toLatex(result.result)).toBe('0');
		});

		it('-(-x) -> x (via normalize)', () => {
			const result = simplify(opposite(opposite(variable('x'))));
			expect(toLatex(result.result)).toBe('x');
		});
	});

	describe('normalization (polynomial canonical form)', () => {
		it('2x + 3x -> 5x', () => {
			const result = simplifyLatex('2x + 3x');
			expect(result).toBe('5 x');
		});

		it('x^2 + x^2 -> 2x^2', () => {
			const result = simplifyLatex('x^2 + x^2');
			expect(result).toBe('2 x^2');
		});
	});

	describe('trigonometric identities', () => {
		it('sin^2(x) + cos^2(x) -> 1', () => {
			const result = simplifyLatex('\\sin^2(x) + \\cos^2(x)');
			expect(result).toBe('1');
		});

		it('cos(-x) -> cos(x)', () => {
			expect(simplifyLatex('\\cos(-x)')).toBe('\\cos\\left( x \\right)');
		});

		it('sin(-x) -> -sin(x)', () => {
			expect(simplifyLatex('\\sin(-x)')).toBe('-\\sin\\left( x \\right)');
		});

		it('tan(-x) -> -tan(x)', () => {
			expect(simplifyLatex('\\tan(-x)')).toBe('-\\tan\\left( x \\right)');
		});
	});

	describe('logarithm / exponential', () => {
		it('ln(e) -> 1 (via normalize, e as variable)', () => {
			// normalize treats 'e' as a variable, not as euler() constant
			const result = simplify(ln(variable('e')));
			expect(toLatex(result.result)).toBe('1');
		});
	});

	describe('abs with assumptions', () => {
		it('|x| -> x when x is positive', () => {
			const ctx: TypeContext = {
				assumptions: new Map([['x', { sign: 'positive' }]])
			};
			const result = simplify(abs(variable('x')), { ctx });
			expect(toLatex(result.result)).toBe('x');
		});

		it('|x| -> -x when x is negative', () => {
			const ctx: TypeContext = {
				assumptions: new Map([['x', { sign: 'negative' }]])
			};
			const result = simplify(abs(variable('x')), { ctx });
			expect(toLatex(result.result)).toBe('-x');
		});
	});

	describe('infinity transforms', () => {
		it('arctan(+inf) -> pi/2', () => {
			const result = simplify(func('arctan', [positiveInfinity()]), {
				verbosity: 'summarized'
			});
			const latex = toLatex(result.result);
			// Should contain pi in some form
			expect(latex).toContain('\\pi');
		});
	});

	describe('cost invariant', () => {
		it('result cost should be <= input cost', () => {
			const expressions = [
				add(variable('x'), number('0')),
				multiply(variable('x'), number('1')),
				opposite(opposite(variable('x')))
			];

			for (const expr of expressions) {
				const inputCost = computeCost(expr);
				const result = simplify(expr);
				expect(result.cost).toBeLessThanOrEqual(inputCost);
			}
		});
	});

	describe('fixpoint', () => {
		it('simplify(simplify(e)) == simplify(e)', () => {
			const expressions = [
				add(variable('x'), number('0')),
				multiply(variable('x'), number('1')),
				parseLatex('2x + 3x')
			];

			for (const expr of expressions) {
				const once = simplify(expr);
				const twice = simplify(once.result);
				expect(toLatex(twice.result)).toBe(toLatex(once.result));
			}
		});
	});

	describe('step recording', () => {
		it('should record steps when verbosity is detailed', () => {
			const result = simplify(add(variable('x'), number('0')), {
				verbosity: 'detailed'
			});
			expect(result.steps.length).toBeGreaterThan(0);
		});

		it('should record per-rule steps with rule names', () => {
			const node = parseLatex('\\sin^2(x) + \\cos^2(x)');
			const result = simplify(node, { verbosity: 'detailed' });
			const ruleSteps = result.steps.filter((s) => s.phase === 'rules');
			expect(ruleSteps.length).toBeGreaterThan(0);
			// Steps should have individual rule names, not generic phase name
			expect(ruleSteps[0].rule).not.toBe('pattern-rules');
			expect(ruleSteps.some((s) => s.rule === 'pythagorean')).toBe(true);
		});

		it('should record no steps when verbosity is result', () => {
			const result = simplify(add(variable('x'), number('0')), {
				verbosity: 'result'
			});
			expect(result.steps.length).toBe(0);
		});
	});

	describe('options', () => {
		it('should respect enableTrig=false', () => {
			// sin^2(x) + cos^2(x) should NOT simplify to 1 with trig disabled
			const node = parseLatex('\\sin^2(x) + \\cos^2(x)');
			const result = simplify(node, { enableTrig: false });
			// It might normalize but shouldn't apply trig identity
			const latex = toLatex(result.result);
			// Should still contain sin and cos in some form
			expect(latex).toContain('\\sin');
		});
	});
});
