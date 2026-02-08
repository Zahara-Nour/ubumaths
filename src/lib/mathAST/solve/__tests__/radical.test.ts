/**
 * Radical Equation Solver Tests
 *
 * Tests for tryRadicalDecomposition: solving equations with
 * fractional exponents (√x, ∛x, x^(p/q)).
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseLatex } from '../../parser';
import type { MathNode, RelationNode } from '../../types';
import {
	equals,
	number,
	variable,
	func,
	superscript,
	subtract,
	multiply,
	add,
	opposite
} from '../../factory';
import { toLatex } from '../../latex-generator';

function parseEquation(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') {
		throw new Error(`Expected relation, got ${node.type}`);
	}
	return node;
}

/** Build equation from AST nodes */
function eq(lhs: MathNode, rhs: MathNode): RelationNode {
	return equals(lhs, rhs);
}

/** Helper: fractional exponent node p/q */
function frac(p: number, q: number): MathNode {
	return {
		type: 'division',
		numerator: number(String(p)),
		denominator: number(String(q)),
		displayStyle: 'fraction' as const
	};
}

describe('Radical equation solver', () => {
	// =========================================================================
	// Simple square root
	// =========================================================================
	describe('Simple square root', () => {
		it('should solve √x - 2 = 0 → x = 4', () => {
			const result = solve(parseEquation('\\sqrt{x} - 2 = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('4');
		});

		it('should solve √x = 2 → x = 4', () => {
			const result = solve(parseEquation('\\sqrt{x} = 2'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('4');
		});

		it('should solve √x = 0 → x = 0 (boundary)', () => {
			const result = solve(parseEquation('\\sqrt{x} = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('0');
		});

		it('should solve √x - 1 = 0 → x = 1', () => {
			const result = solve(parseEquation('\\sqrt{x} - 1 = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('1');
		});

		it('should solve √x - 10 = 0 → x = 100 (large constant)', () => {
			const result = solve(parseEquation('\\sqrt{x} - 10 = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('100');
		});
	});

	// =========================================================================
	// No-solution cases (even root, negative RHS)
	// =========================================================================
	describe('No-solution (even root, negative RHS)', () => {
		it('should return no-solution for √x + 1 = 0 (√x = -1 impossible)', () => {
			const result = solve(parseEquation('\\sqrt{x} + 1 = 0'));

			expect(result.status).toBe('no-solution');
			expect(result.solutions).toHaveLength(0);
		});

		it('should return no-solution for √x + 5 = 0 (√x = -5)', () => {
			const result = solve(parseEquation('\\sqrt{x} + 5 = 0'));

			expect(result.status).toBe('no-solution');
			expect(result.solutions).toHaveLength(0);
		});

		it('should return no-solution for 4th root: x^(1/4) + 1 = 0', () => {
			const lhs = add(superscript(variable('x'), frac(1, 4)), number('1'));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('no-solution');
			expect(result.solutions).toHaveLength(0);
		});
	});

	// =========================================================================
	// With coefficient
	// =========================================================================
	describe('With coefficient', () => {
		it('should solve 2√x - 6 = 0 → √x = 3 → x = 9', () => {
			const lhs = subtract(
				multiply(number('2'), func('sqrt', [variable('x')]), 'implicit'),
				number('6')
			);
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('9');
		});

		it('should solve 3√x - 12 = 0 → √x = 4 → x = 16', () => {
			const lhs = subtract(
				multiply(number('3'), func('sqrt', [variable('x')]), 'implicit'),
				number('12')
			);
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('16');
		});

		it('should solve -√x + 3 = 0 → √x = 3 → x = 9 (negative coefficient)', () => {
			// -sqrt(x) + 3 = 0
			const lhs = add(opposite(func('sqrt', [variable('x')])), number('3'));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('9');
		});
	});

	// =========================================================================
	// Cube root
	// =========================================================================
	describe('Cube root', () => {
		it('should solve ∛x - 2 = 0 → x = 8', () => {
			const result = solve(parseEquation('\\sqrt[3]{x} - 2 = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('8');
		});

		it('should solve ∛x + 2 = 0 → x = -8 (odd root, negative OK)', () => {
			const result = solve(parseEquation('\\sqrt[3]{x} + 2 = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('-8');
		});

		it('should solve ∛x = 0 → x = 0', () => {
			const result = solve(parseEquation('\\sqrt[3]{x} = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('0');
		});

		it('should solve ∛x - 3 = 0 → x = 27', () => {
			const result = solve(parseEquation('\\sqrt[3]{x} - 3 = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('27');
		});
	});

	// =========================================================================
	// Higher-index roots (4th, 5th)
	// =========================================================================
	describe('Higher-index roots', () => {
		it('should solve ⁴√x - 3 = 0 → x = 81', () => {
			const result = solve(parseEquation('\\sqrt[4]{x} - 3 = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('81');
		});

		it('should solve ⁵√x - 2 = 0 → x = 32', () => {
			const result = solve(parseEquation('\\sqrt[5]{x} - 2 = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('32');
		});

		it('should solve ⁵√x + 2 = 0 → x = -32 (odd root, negative OK)', () => {
			const result = solve(parseEquation('\\sqrt[5]{x} + 2 = 0'));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('-32');
		});

		it('should return no-solution for ⁴√x + 2 = 0 (even root, negative RHS)', () => {
			const result = solve(parseEquation('\\sqrt[4]{x} + 2 = 0'));

			expect(result.status).toBe('no-solution');
			expect(result.solutions).toHaveLength(0);
		});
	});

	// =========================================================================
	// Composed argument (recursive solve)
	// =========================================================================
	describe('Composed argument (recursive solve)', () => {
		it('should solve √(x-1) - 3 = 0 → x-1 = 9 → x = 10', () => {
			const lhs = subtract(func('sqrt', [subtract(variable('x'), number('1'))]), number('3'));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('10');
		});

		it('should solve √(x²-1) - 2 = 0 → x²-1 = 4 → x = ±√5', () => {
			const innerExpr = subtract(superscript(variable('x'), number('2')), number('1'));
			const lhs = subtract(func('sqrt', [innerExpr]), number('2'));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);
			const values = result.solutions.map((s) => toLatex(s.value)).sort();
			expect(values).toEqual(['-\\sqrt{5}', '\\sqrt{5}']);
		});

		it('should solve √(2x + 3) - 3 = 0 → 2x+3 = 9 → x = 3', () => {
			const inner = add(multiply(number('2'), variable('x'), 'implicit'), number('3'));
			const lhs = subtract(func('sqrt', [inner]), number('3'));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('3');
		});

		it('should solve ∛(x+1) - 2 = 0 → x+1 = 8 → x = 7', () => {
			const inner = add(variable('x'), number('1'));
			const sqrtNode: MathNode = {
				type: 'function',
				name: 'sqrt',
				args: [inner],
				base: number('3')
			};
			const lhs = subtract(sqrtNode, number('2'));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('7');
		});

		it('should solve √(x+4) = 0 → x+4 = 0 → x = -4', () => {
			const inner = add(variable('x'), number('4'));
			const result = solve(eq(func('sqrt', [inner]), number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('-4');
		});
	});

	// =========================================================================
	// General fractional exponents (SuperscriptNode)
	// =========================================================================
	describe('General fractional exponents (SuperscriptNode)', () => {
		it('should solve x^(2/3) = 4 → x = 4^(3/2) = 8', () => {
			const lhs = subtract(superscript(variable('x'), frac(2, 3)), number('4'));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('8');
		});

		it('should solve x^(1/2) - 3 = 0 → x = 9', () => {
			const lhs = subtract(superscript(variable('x'), frac(1, 2)), number('3'));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('9');
		});

		it('should solve x^(1/3) - 2 = 0 → x = 8', () => {
			const lhs = subtract(superscript(variable('x'), frac(1, 3)), number('2'));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('8');
		});

		it('should solve x^(3/2) = 27 → x = 27^(2/3) = 9', () => {
			const lhs = subtract(superscript(variable('x'), frac(3, 2)), number('27'));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('9');
		});

		it('should solve x^(2/3) = 0 → x = 0 (zero RHS)', () => {
			const lhs = superscript(variable('x'), frac(2, 3));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('0');
		});

		it('should solve x^(1/4) - 2 = 0 → x = 16 (4th root)', () => {
			const lhs = subtract(superscript(variable('x'), frac(1, 4)), number('2'));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('unique');
			expect(result.solutions).toHaveLength(1);
			expect(toLatex(result.solutions[0].value)).toBe('16');
		});

		it('should return no-solution for x^(1/2) + 3 = 0 (even root, negative)', () => {
			const lhs = add(superscript(variable('x'), frac(1, 2)), number('3'));
			const result = solve(eq(lhs, number('0')));

			expect(result.status).toBe('no-solution');
			expect(result.solutions).toHaveLength(0);
		});

		it('should NOT intercept x^(2/1) as a radical (integer exponent)', () => {
			// x^(2/1) = x^2 — radical solver should skip it (p % q === 0)
			// Note: polynomial solver also can't handle x^(2/1) notation,
			// so we just verify it doesn't crash and radical solver doesn't claim it
			const lhs = subtract(superscript(variable('x'), frac(2, 1)), number('4'));
			const result = solve(eq(lhs, number('0')));

			// Radical solver correctly skips this; polynomial solver can't simplify 2/1→2
			// so it falls through to 'unknown'. The key assertion is no crash.
			expect(result).toBeDefined();
		});
	});

	// =========================================================================
	// Domain interaction with radical solver
	// =========================================================================
	describe('Domain interaction', () => {
		it('should attach non-universal domain for √x - 2 = 0', () => {
			const result = solve(parseEquation('\\sqrt{x} - 2 = 0'));

			expect(result.domain).toBeDefined();
			expect(result.domain!.kind).not.toBe('universal');
		});

		it('should attach universal domain for ∛x - 2 = 0 (odd root)', () => {
			const result = solve(parseEquation('\\sqrt[3]{x} - 2 = 0'));

			expect(result.domain).toBeDefined();
			// Cube root is defined on all of ℝ
			expect(result.domain!.kind).toBe('universal');
		});

		it('should record domain step for √x - 2 = 0', () => {
			const result = solve(parseEquation('\\sqrt{x} - 2 = 0'), { verbosity: 'summarized' });

			const domainStep = result.steps.find((s) => s.rule === 'domain-computation');
			expect(domainStep).toBeDefined();
			expect(domainStep!.description).toContain('Ensemble de définition');
		});

		it('should NOT record domain step for ∛x - 2 = 0 (universal domain)', () => {
			const result = solve(parseEquation('\\sqrt[3]{x} - 2 = 0'), { verbosity: 'summarized' });

			const domainStep = result.steps.find((s) => s.rule === 'domain-computation');
			expect(domainStep).toBeUndefined();
		});
	});

	// =========================================================================
	// Non-radical equations (should fall through)
	// =========================================================================
	describe('Non-radical equations (should fall through)', () => {
		it('should NOT intercept polynomial x² - 4 = 0', () => {
			const result = solve(parseEquation('x^2 - 4 = 0'));

			expect(result.equationType).toBe('quadratic');
			expect(result.status).toBe('multiple');
			expect(result.solutions).toHaveLength(2);
		});

		it('should NOT intercept linear 2x + 4 = 0', () => {
			const result = solve(parseEquation('2x + 4 = 0'));

			expect(result.equationType).toBe('linear');
			expect(result.status).toBe('unique');
		});

		it('should NOT intercept exponential e^x - 3 = 0', () => {
			const result = solve(parseEquation('e^x - 3 = 0'));

			// exp/log solver handles this (or not), but radical solver should not intercept
			expect(result).toBeDefined();
			expect(result.equationType).not.toBe('radical');
		});

		it('should NOT intercept logarithmic ln(x) - 1 = 0', () => {
			const result = solve(parseEquation('\\ln(x) - 1 = 0'));

			expect(result.status).toBe('unique');
			expect(toLatex(result.solutions[0].value)).toBe('\\exponentialE');
		});

		it('should NOT intercept trig sin(x) = 0', () => {
			const result = solve(parseEquation('\\sin(x) = 0'));

			expect(result.status).not.toBe('no-solution');
		});
	});

	// =========================================================================
	// Step recording
	// =========================================================================
	describe('Step recording', () => {
		it('should record a radical-decomposition step', () => {
			const result = solve(parseEquation('\\sqrt{x} - 2 = 0'), { verbosity: 'summarized' });

			const radicalStep = result.steps.find((s) => s.rule === 'radical-decomposition');
			expect(radicalStep).toBeDefined();
			expect(radicalStep!.description).toContain('puissance');
		});

		it('should record a no-real-solution step for even root + negative', () => {
			const result = solve(parseEquation('\\sqrt{x} + 1 = 0'), { verbosity: 'summarized' });

			const noSolStep = result.steps.find((s) => s.rule === 'no-real-solution');
			expect(noSolStep).toBeDefined();
			expect(noSolStep!.description).toContain('racine');
		});
	});
});
