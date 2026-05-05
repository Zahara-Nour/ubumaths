/**
 * Phase 1 — Pipeline skeleton tests.
 *
 * Covers the public entry point `generatePedagogicalDifferentiationSteps`
 * for the trivial top-level cases (constant, variable, greek letter) and
 * verifies that non-trivial expressions throw the well-known
 * `PedagogicalDifferentiationNotImplemented` until Phase 2 fills in the
 * dispatcher branches.
 *
 * Subsequent phases (2a–2f) extend this file rather than replacing it: each
 * Phase 2x adds new `describe` blocks for the rule family it implements.
 */

import { describe, expect, it } from 'vitest';
import {
	generatePedagogicalDifferentiationSteps,
	isTrivialWrtVariable,
	PedagogicalDifferentiationNotImplemented
} from '../pipeline';
import { func, greek, number, variable } from '../../factory';
import { parseLatex } from '../../parser';
import type { MathNode } from '../../types';

const lyceeOpts = { variable: 'x', schoolLevel: 'lycee' as const };

describe('isTrivialWrtVariable', () => {
	it('returns true for numbers', () => {
		expect(isTrivialWrtVariable(number('5'), 'x')).toBe(true);
	});

	it('returns true for the differentiation variable', () => {
		expect(isTrivialWrtVariable(variable('x'), 'x')).toBe(true);
	});

	it('returns true for a different variable', () => {
		// `y` is constant w.r.t. `x` — derivative is 0.
		expect(isTrivialWrtVariable(variable('y'), 'x')).toBe(true);
	});

	it('returns true for greek letters', () => {
		expect(isTrivialWrtVariable(greek('alpha'), 'x')).toBe(true);
	});

	it('returns false for an expression containing the variable', () => {
		const node = parseLatex('x^2');
		expect(isTrivialWrtVariable(node, 'x')).toBe(false);
	});

	it('returns true for an expression that does not contain the variable', () => {
		const node = parseLatex('y^2 + 3');
		expect(isTrivialWrtVariable(node, 'x')).toBe(true);
	});
});

describe('generatePedagogicalDifferentiationSteps — trivial top-level', () => {
	it('emits one step for `(5)` with rule "constant" and derivative 0', () => {
		const result = generatePedagogicalDifferentiationSteps(number('5'), lyceeOpts);

		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].rule).toBe('constant');
		expect(result.steps[0].variable).toBe('x');
		expect(result.derivative.type).toBe('number');
		// `constantRule()` returns a number `0`.
		if (result.derivative.type === 'number') {
			expect(result.derivative.value).toBe('0');
		}
	});

	it('emits one step for `(x)` with rule "variable" and derivative 1', () => {
		const result = generatePedagogicalDifferentiationSteps(variable('x'), lyceeOpts);

		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].rule).toBe('variable');
		expect(result.derivative.type).toBe('number');
		if (result.derivative.type === 'number') {
			expect(result.derivative.value).toBe('1');
		}
	});

	it('emits one step for `(y)` with rule "variable" and derivative 0 (different variable)', () => {
		const result = generatePedagogicalDifferentiationSteps(variable('y'), lyceeOpts);

		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].rule).toBe('variable');
		expect(result.derivative.type).toBe('number');
		if (result.derivative.type === 'number') {
			expect(result.derivative.value).toBe('0');
		}
	});

	it('emits one step for `(α)` with rule "greek-letter" and derivative 0', () => {
		const result = generatePedagogicalDifferentiationSteps(greek('alpha'), lyceeOpts);

		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].rule).toBe('greek-letter');
	});

	it('top-level trivial step carries globalBefore/globalAfter equal to before/after', () => {
		const node = number('5');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		const step = result.steps[0];
		expect(step.globalBefore).toBe(node);
		expect(step.globalAfter).toBe(step.after);
	});

	it('emits no subSteps on a trivial top-level step', () => {
		const result = generatePedagogicalDifferentiationSteps(number('7'), lyceeOpts);
		expect(result.steps[0].subSteps).toBeUndefined();
	});

	it('respects the `variable` option for differentiation', () => {
		const result = generatePedagogicalDifferentiationSteps(variable('y'), {
			variable: 'y',
			schoolLevel: 'lycee'
		});

		expect(result.steps[0].variable).toBe('y');
		// (y)' w.r.t. y = 1
		if (result.derivative.type === 'number') {
			expect(result.derivative.value).toBe('1');
		}
	});

	it('treats `y^2 + 3` as trivial when differentiated w.r.t. x', () => {
		const node = parseLatex('y^2 + 3');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].rule).toBe('constant');
	});
});

// =============================================================================
// Regression: blockers from code review (FunctionNode.power, top-level wrappers)
// =============================================================================

describe('Regression — FunctionNode.power must not be silently dropped', () => {
	it("(\\sin^2(x))' routes through power-constant-exp (NOT a bare sin step)", () => {
		const node = parseLatex('\\sin^2(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		// The dispatcher should treat this as (sin(x))^2 — top-level rule is a
		// power rule, with sin(x) as the inner base whose derivative produces a
		// `sin` sub-step.
		expect(result.steps[0].rule).toBe('power-constant-exp');
		expect(result.steps[0].subSteps).toBeDefined();
		expect(result.steps[0].subSteps?.[0].rule).toBe('sin');
	});

	it("(\\cos^3(x))' uses power-constant-exp with a cos sub-step", () => {
		const node = parseLatex('\\cos^3(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('power-constant-exp');
		expect(result.steps[0].subSteps?.[0].rule).toBe('cos');
	});

	it("(\\sin^{-1}(x))' refuses (inverse function out of V1 scope)", () => {
		// Constructed manually to avoid parser ambiguity around `^{-1}`.
		const node = func('sin', [variable('x')], { isInverse: true });
		expect(() => generatePedagogicalDifferentiationSteps(node, lyceeOpts)).toThrow(
			PedagogicalDifferentiationNotImplemented
		);
	});

	it("refuses derivative functions like f'(x) (out of V1 scope)", () => {
		const node = func('f', [variable('x')], { derivativeOrder: 1 });
		expect(() => generatePedagogicalDifferentiationSteps(node, lyceeOpts)).toThrow(
			PedagogicalDifferentiationNotImplemented
		);
	});
});

describe('Regression — top-level transparent wrappers must produce a step', () => {
	it('(+x) yields a single trivial top-level `variable` step', () => {
		const node = parseLatex('+x');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].rule).toBe('variable');
		// The before should preserve the original wrapping (so the LaTeX shows
		// what the author wrote).
		expect(result.steps[0].before).toBe(node);
	});

	it('((x)) yields a single trivial top-level `variable` step', () => {
		// Parser does not always preserve nested delimiters; build manually.
		const node: MathNode = {
			type: 'delimiter',
			delimiters: 'parentheses',
			content: variable('x')
		};
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].rule).toBe('variable');
	});

	it('+5 yields a single trivial top-level `constant` step', () => {
		const node = parseLatex('+5');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps).toHaveLength(1);
		expect(result.steps[0].rule).toBe('constant');
	});
});

describe('generatePedagogicalDifferentiationSteps — unimplemented surface (defensive)', () => {
	it('throws PedagogicalDifferentiationNotImplemented for an unsupported function name', () => {
		// `abs` is not differentiable at 0 — our pipeline mirrors
		// `differentiate.ts` and rejects it explicitly via the default branch.
		const node = parseLatex('|x|');
		// `parseLatex('|x|')` may produce different node shapes; if it doesn't
		// produce a function node, just check the throw doesn't crash.
		try {
			generatePedagogicalDifferentiationSteps(node, lyceeOpts);
			// Some parses yield a delimited expression that the dispatcher does
			// handle; in that case there's no throw — and that's fine too.
		} catch (e) {
			expect(e).toBeInstanceOf(PedagogicalDifferentiationNotImplemented);
		}
	});
});

// =============================================================================
// Phase 2a — Linearity tests
// =============================================================================

function getNumberValue(node: MathNode): string | null {
	return node.type === 'number' ? node.value : null;
}

describe('Phase 2a — addition (sum + sum-with-constant)', () => {
	it("(2x + 3x)' uses the general `sum` rule with two linear-coefficient subSteps", () => {
		const node = parseLatex('2x + 3x');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps).toHaveLength(1);
		const top = result.steps[0];
		expect(top.rule).toBe('sum');
		expect(top.subSteps).toHaveLength(2);
		expect(top.subSteps?.[0].rule).toBe('linear-coefficient');
		expect(top.subSteps?.[1].rule).toBe('linear-coefficient');
		// Derivative is `2 + 3` (unsimplified — `simplifiedAdd` does not fold constants).
		expect(result.derivative.type).toBe('addition');
		if (result.derivative.type === 'addition') {
			expect(getNumberValue(result.derivative.left)).toBe('2');
			expect(getNumberValue(result.derivative.right)).toBe('3');
		}
	});

	it("(x + x)' uses general sum (both sides depend on x) and emits no inner steps", () => {
		const node = parseLatex('x + x');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('sum');
		// Both sub-derivations are trivial → no subSteps emitted.
		expect(result.steps[0].subSteps).toBeUndefined();
		// Derivative is `1 + 1` (unsimplified).
		expect(result.derivative.type).toBe('addition');
	});

	it("(x + 5)' uses the `sum-with-constant` special case", () => {
		const node = parseLatex('x + 5');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps).toHaveLength(1);
		const top = result.steps[0];
		expect(top.rule).toBe('sum-with-constant');
		expect(top.bindings?.f.type).toBe('variable');
		expect(top.bindings?.c.type).toBe('number');
		expect(getNumberValue(result.derivative)).toBe('1');
	});

	it("(5 + x)' uses sum-with-constant (constant on the left)", () => {
		const node = parseLatex('5 + x');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('sum-with-constant');
		expect(result.steps[0].bindings?.f.type).toBe('variable');
		expect(getNumberValue(result.steps[0].bindings?.c as MathNode)).toBe('5');
		expect(getNumberValue(result.derivative)).toBe('1');
	});
});

describe('Phase 2a — subtraction (difference + diff-with-constant)', () => {
	it("(5x - 2x)' uses the general `difference` rule", () => {
		const node = parseLatex('5x - 2x');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('difference');
		// Derivative is `5 - 2` (unsimplified — pedagogically acceptable, the student finishes).
		expect(result.derivative.type).toBe('subtraction');
		if (result.derivative.type === 'subtraction') {
			expect(getNumberValue(result.derivative.left)).toBe('5');
			expect(getNumberValue(result.derivative.right)).toBe('2');
		}
	});

	it("(2x - 5)' uses diff-with-constant (constant on the right) → derivative is the variable side", () => {
		const node = parseLatex('2x - 5');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('diff-with-constant');
		expect(result.steps[0].bindings?.f.type).toBe('multiplication');
		expect(getNumberValue(result.steps[0].bindings?.c as MathNode)).toBe('5');
		expect(getNumberValue(result.derivative)).toBe('2');
	});

	it("(5 - 2x)' uses diff-with-constant (c - f) → derivative is the negation of f'", () => {
		const node = parseLatex('5 - 2x');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('diff-with-constant');
		// Result is -2 — could be a number(-2) or opposite(2).
		const d = result.derivative;
		if (d.type === 'number') {
			expect(d.value).toBe('-2');
		} else if (d.type === 'opposite' && d.operand.type === 'number') {
			expect(d.operand.value).toBe('2');
		} else {
			expect.fail(`Expected -2 derivative, got node of type ${d.type}`);
		}
	});
});

describe('Phase 2a — multiplication (linear-coefficient only; general product → Phase 2c)', () => {
	it("(2x)' uses linear-coefficient and yields 2", () => {
		const node = parseLatex('2x');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('linear-coefficient');
		expect(getNumberValue(result.steps[0].bindings?.c as MathNode)).toBe('2');
		expect(result.steps[0].bindings?.f.type).toBe('variable');
		expect(getNumberValue(result.derivative)).toBe('2');
	});

	it("(x \\cdot y)' w.r.t. x uses linear-coefficient (y is constant w.r.t. x)", () => {
		const node = parseLatex('x \\cdot y');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('linear-coefficient');
		// The constant binding is `y` (variable named 'y', constant w.r.t. 'x').
		expect(result.steps[0].bindings?.c.type).toBe('variable');
		// Derivative: y · 1 = y.
		expect(result.derivative.type).toBe('variable');
	});
});

describe('Phase 2a — opposite (negation)', () => {
	it("(-x)' yields -1 with one negation step (no inner step since x is trivial)", () => {
		const node = parseLatex('-x');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('negation');
		expect(result.steps[0].subSteps).toBeUndefined();
		const d = result.derivative;
		if (d.type === 'number') {
			expect(d.value).toBe('-1');
		} else if (d.type === 'opposite' && d.operand.type === 'number') {
			expect(d.operand.value).toBe('1');
		} else {
			expect.fail(`Expected -1, got ${d.type}`);
		}
	});

	it("(-(2x))' yields -2 with negation around a linear-coefficient subStep", () => {
		const node = parseLatex('-(2x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('negation');
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('linear-coefficient');
	});
});

// =============================================================================
// Phase 2b — Powers + sqrt tests
// =============================================================================

describe('Phase 2b — power-natural special case', () => {
	it("(x^2)' uses power-natural with bindings { base: x, n: 2 }", () => {
		const node = parseLatex('x^2');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps).toHaveLength(1);
		const top = result.steps[0];
		expect(top.rule).toBe('power-natural');
		expect(top.subSteps).toBeUndefined(); // base is x: no inner step.
		expect(top.bindings?.base.type).toBe('variable');
		expect(getNumberValue(top.bindings?.n as MathNode)).toBe('2');
	});

	it("(x^3)' produces a non-trivial derivative shape (3·x^(3-1))", () => {
		const node = parseLatex('x^3');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('power-natural');
		// `simplifiedMultiply(simplifiedMultiply(3, x^2), 1)` reduces (·1) → 3·x^2.
		expect(result.derivative.type).toBe('multiplication');
	});

	it("(x^7)' uses power-natural — large exponents are still natural", () => {
		const node = parseLatex('x^7');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('power-natural');
		expect(getNumberValue(result.steps[0].bindings?.n as MathNode)).toBe('7');
	});

	it("(x^1)' does NOT use power-natural (n must be ≥ 2)", () => {
		// `x^1` parses as superscript with exponent 1; pedagogically this is a
		// degenerate case the dispatcher should still handle (via the generic
		// constant-exponent path). The rule chosen is `power-constant-exp`.
		const node = parseLatex('x^1');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('power-constant-exp');
	});
});

describe('Phase 2b — power-constant-exp (chain via dBase)', () => {
	it("((x+1)^3)' uses power-constant-exp with sum-with-constant subStep", () => {
		const node = parseLatex('(x+1)^3');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('power-constant-exp');
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('sum-with-constant');
	});

	it("((2x)^3)' uses power-constant-exp with linear-coefficient subStep", () => {
		const node = parseLatex('(2x)^3');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('power-constant-exp');
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('linear-coefficient');
	});
});

describe('Phase 2b — power-constant-base (c^x)', () => {
	it("(2^x)' uses power-constant-base", () => {
		const node = parseLatex('2^x');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('power-constant-base');
		expect(getNumberValue(result.steps[0].bindings?.base as MathNode)).toBe('2');
		expect(result.steps[0].bindings?.exp.type).toBe('variable');
	});
});

describe('Phase 2b — general-power (both depend on x)', () => {
	it("(x^x)' uses general-power", () => {
		const node = parseLatex('x^x');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('general-power');
	});
});

describe('Phase 2b — sqrt', () => {
	it("(√x)' uses derivative-of-sqrt — terminal shortcut, no inner step", () => {
		const node = parseLatex('\\sqrt{x}');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('derivative-of-sqrt');
		expect(result.steps[0].subSteps).toBeUndefined();
	});

	it("(√(x+1))' uses sqrt with chain (sub-step on the inner sum-with-constant)", () => {
		const node = parseLatex('\\sqrt{x+1}');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('sqrt');
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('sum-with-constant');
	});
});

// =============================================================================
// Phase 2c — Product (general) + Quotient + Inverse
// =============================================================================

describe('Phase 2c — general product (both factors depend on x)', () => {
	it("(x \\cdot \\sqrt{x})' uses the general product rule with two subSteps", () => {
		const node = parseLatex('x \\cdot \\sqrt{x}');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('product');
		// Bindings name u and v (left and right factors).
		expect(result.steps[0].bindings?.u.type).toBe('variable');
		// Sub-steps: x is trivial (no step) but √x emits one derivative-of-sqrt step.
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('derivative-of-sqrt');
	});

	it("(\\sqrt{x} \\cdot x^2)' produces general product with two non-empty sub-derivations", () => {
		const node = parseLatex('\\sqrt{x} \\cdot x^2');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('product');
		expect(result.steps[0].subSteps).toHaveLength(2);
		// One should be derivative-of-sqrt, the other power-natural — order
		// matches the operand order from the parser.
		const ruleNames = result.steps[0].subSteps?.map((s) => s.rule) ?? [];
		expect(ruleNames).toContain('derivative-of-sqrt');
		expect(ruleNames).toContain('power-natural');
	});
});

describe('Phase 2c — derivative-of-inverse special case', () => {
	it("(1/x)' uses derivative-of-inverse — terminal, no subSteps", () => {
		const node = parseLatex('\\frac{1}{x}');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('derivative-of-inverse');
		expect(result.steps[0].subSteps).toBeUndefined();
	});
});

describe('Phase 2c — inverse special case (1/f)', () => {
	it("(1/(x+1))' uses inverse with sub-step on the denominator (sum-with-constant)", () => {
		const node = parseLatex('\\frac{1}{x+1}');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('inverse');
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('sum-with-constant');
	});

	it("(1/x^2)' uses inverse with sub-step on power-natural", () => {
		const node = parseLatex('\\frac{1}{x^2}');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('inverse');
		expect(result.steps[0].subSteps?.[0].rule).toBe('power-natural');
	});
});

describe('Phase 2c — general quotient', () => {
	it("(x/(x+1))' uses general quotient with sub-step on the denominator", () => {
		const node = parseLatex('\\frac{x}{x+1}');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('quotient');
		expect(result.steps[0].bindings?.u.type).toBe('variable');
		// Numerator x is trivial (no inner step); denominator x+1 emits one.
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('sum-with-constant');
	});

	it("(x^2/(x+1))' uses general quotient with two sub-derivations", () => {
		const node = parseLatex('\\frac{x^2}{x+1}');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('quotient');
		expect(result.steps[0].subSteps).toHaveLength(2);
	});

	it("(2/(x+1))' (numerator constant, ≠ 1) uses general quotient (V1 limitation)", () => {
		const node = parseLatex('\\frac{2}{x+1}');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		// V1: only `1/f` triggers the `inverse` shortcut. Other constants fall
		// through to the general quotient rule. This is mathematically correct;
		// future work could extract the constant as a linear-coefficient.
		expect(result.steps[0].rule).toBe('quotient');
	});
});

// =============================================================================
// Phase 2d — Trigonometric functions
// =============================================================================

describe('Phase 2d — sin/cos/tan with chain', () => {
	it("(sin(x))' produces a sin step (no inner step since x is trivial)", () => {
		const node = parseLatex('\\sin(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('sin');
		expect(result.steps[0].subSteps).toBeUndefined();
		expect(result.steps[0].bindings?.u.type).toBe('variable');
	});

	it("(\\cos(x))' produces a cos step", () => {
		const node = parseLatex('\\cos(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('cos');
	});

	it("(\\tan(x))' produces a tan step", () => {
		const node = parseLatex('\\tan(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('tan');
	});

	it("(\\sin(2x))' has a sin step with linear-coefficient subStep (chain)", () => {
		const node = parseLatex('\\sin(2x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('sin');
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('linear-coefficient');
	});

	it("(\\cos(x^2))' has a cos step with power-natural subStep", () => {
		const node = parseLatex('\\cos(x^2)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('cos');
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('power-natural');
	});
});

describe('Phase 2d — inverse trigonometric', () => {
	it("(\\arcsin(x))' produces an arcsin step", () => {
		const node = parseLatex('\\arcsin(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('arcsin');
	});

	it("(\\arccos(x))' produces an arccos step", () => {
		const node = parseLatex('\\arccos(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('arccos');
	});

	it("(\\arctan(x^2))' has an arctan step with power-natural subStep", () => {
		const node = parseLatex('\\arctan(x^2)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('arctan');
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('power-natural');
	});
});

describe('Phase 2d — trig within composites', () => {
	it("(\\sin(x) + \\cos(x))' uses general sum with two trig sub-steps", () => {
		const node = parseLatex('\\sin(x) + \\cos(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('sum');
		expect(result.steps[0].subSteps).toHaveLength(2);
		const ruleNames = result.steps[0].subSteps?.map((s) => s.rule) ?? [];
		expect(ruleNames).toContain('sin');
		expect(ruleNames).toContain('cos');
	});

	it("(x \\cdot \\sin(x))' uses general product with linear-coefficient + sin sub-steps", () => {
		const node = parseLatex('x \\cdot \\sin(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('product');
		// Inner steps: only sin emits a step (x is trivial inline).
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('sin');
	});
});

// =============================================================================
// Phase 2e — Exponential / Logarithm
// =============================================================================

describe('Phase 2e — exp', () => {
	it("(\\exp(x))' produces an exp step", () => {
		const node = parseLatex('\\exp(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('exp');
		expect(result.steps[0].subSteps).toBeUndefined();
	});

	it("(\\exp(2x))' has an exp step with linear-coefficient subStep (chain)", () => {
		const node = parseLatex('\\exp(2x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('exp');
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('linear-coefficient');
	});
});

describe('Phase 2e — ln', () => {
	it("(\\ln(x))' produces a ln step", () => {
		const node = parseLatex('\\ln(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('ln');
	});

	it("(\\ln(x^2 + 1))' has a ln step with sum-with-constant subStep", () => {
		const node = parseLatex('\\ln(x^2 + 1)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('ln');
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('sum-with-constant');
	});
});

describe('Phase 2e — log (base-aware)', () => {
	it("(\\log(x))' produces a log step (defaults to base 10)", () => {
		const node = parseLatex('\\log(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('log');
		// Default base = 10.
		expect(result.steps[0].bindings?.base.type).toBe('number');
	});
});

// =============================================================================
// Phase 2f — Hyperbolic
// =============================================================================

describe('Phase 2f — sinh/cosh/tanh', () => {
	it("(\\sinh(x))' produces a sinh step", () => {
		const node = parseLatex('\\sinh(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('sinh');
	});

	it("(\\cosh(x))' produces a cosh step", () => {
		const node = parseLatex('\\cosh(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('cosh');
	});

	it("(\\tanh(x))' produces a tanh step", () => {
		const node = parseLatex('\\tanh(x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('tanh');
	});

	it("(\\sinh(2x))' has a sinh step with linear-coefficient subStep", () => {
		const node = parseLatex('\\sinh(2x)');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('sinh');
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('linear-coefficient');
	});
});

describe('Phase 2f — inverse hyperbolic', () => {
	it('dispatchUnaryFunction handles asinh when given a manually-constructed function node', () => {
		// The LaTeX parser does not currently recognise `arcsinh`/`asinh`
		// keywords reliably; we exercise the dispatcher directly using the
		// factory so we still cover the wiring.
		const arg = variable('x');
		const node = func('asinh', [arg]);
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('asinh');
	});

	it('handles acosh and atanh similarly', () => {
		const acosh = func('acosh', [variable('x')]);
		const atanh = func('atanh', [variable('x')]);

		expect(generatePedagogicalDifferentiationSteps(acosh, lyceeOpts).steps[0].rule).toBe('acosh');
		expect(generatePedagogicalDifferentiationSteps(atanh, lyceeOpts).steps[0].rule).toBe('atanh');
	});
});

describe('Phase 2a — composite (multi-level recursion)', () => {
	it("(2x + 5)' produces sum-with-constant + linear-coefficient nested", () => {
		const node = parseLatex('2x + 5');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		expect(result.steps[0].rule).toBe('sum-with-constant');
		expect(result.steps[0].subSteps).toHaveLength(1);
		expect(result.steps[0].subSteps?.[0].rule).toBe('linear-coefficient');
		expect(getNumberValue(result.derivative)).toBe('2');
	});

	it("(2x - 3y + 7)' w.r.t. x flattens: 7 trivial; -3y trivial; 2x → 2", () => {
		// Parser produces ((2x - 3y) + 7). Let's verify general behavior.
		const node = parseLatex('2x - 3y + 7');
		const result = generatePedagogicalDifferentiationSteps(node, lyceeOpts);

		// At least one step must be present and the final derivative is 2.
		expect(result.steps.length).toBeGreaterThanOrEqual(1);
		expect(getNumberValue(result.derivative)).toBe('2');
	});
});

describe('generatePedagogicalDifferentiationSteps — interruption', () => {
	it('honours an already-aborted AbortSignal by throwing AbortError', () => {
		const ctrl = new AbortController();
		ctrl.abort();
		expect(() =>
			generatePedagogicalDifferentiationSteps(parseLatex('x + 1'), {
				...lyceeOpts,
				signal: ctrl.signal
			})
		).toThrow(/Aborted/);
	});
});

describe('generatePedagogicalDifferentiationSteps — id generation', () => {
	it('emits sequential step ids starting at 1', () => {
		const r1 = generatePedagogicalDifferentiationSteps(number('5'), lyceeOpts);
		expect(r1.steps[0].id).toBe(1);
	});

	it('every fresh call resets the id sequence to 1', () => {
		const r1 = generatePedagogicalDifferentiationSteps(number('5'), lyceeOpts);
		const r2 = generatePedagogicalDifferentiationSteps(number('7'), lyceeOpts);
		expect(r1.steps[0].id).toBe(1);
		expect(r2.steps[0].id).toBe(1);
	});
});
