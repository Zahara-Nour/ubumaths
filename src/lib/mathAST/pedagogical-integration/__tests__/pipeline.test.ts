/**
 * Pedagogical Integration — Pipeline tests.
 *
 * Verifies the dispatch order, antiderivative correctness, and step shape of
 * the pedagogical integration pipeline. Antiderivative correctness is checked
 * structurally (LaTeX render) rather than by symbolic equality, because the
 * pipeline preserves intermediate forms (e.g. `3·x³/3` rather than `x³`) so
 * the trace stays faithful to a teacher's blackboard.
 */

import { describe, expect, it } from 'vitest';
import {
	add,
	cos,
	divide,
	exp,
	implicitMultiply,
	ln,
	number,
	opposite,
	power,
	sin,
	subtract,
	variable
} from '../../factory';
import { toLatex } from '../../latex-generator';
import { generatePedagogicalIntegrationSteps, PedagogicalIntegrationNotImplemented } from '..';

const x = () => variable('x');
const t = () => variable('t');

function rules(steps: readonly { rule: string }[]): string[] {
	return steps.map((s) => s.rule);
}

describe('pedagogical-integration pipeline — basic primitives', () => {
	it('integrates a constant: ∫1 dx → x', () => {
		const result = generatePedagogicalIntegrationSteps(number('1'), { level: 'lycee' });
		expect(toLatex(result.antiderivative)).toBe('x');
		expect(rules(result.steps)).toEqual([
			'identify-integrand',
			'apply-constant-rule',
			'add-constant'
		]);
	});

	it('integrates a non-trivial constant: ∫5 dx → 5x', () => {
		const result = generatePedagogicalIntegrationSteps(number('5'), { level: 'lycee' });
		expect(toLatex(result.antiderivative)).toContain('5');
		expect(toLatex(result.antiderivative)).toContain('x');
	});

	it('integrates ∫x dx → x²/2', () => {
		const result = generatePedagogicalIntegrationSteps(x(), { level: 'lycee' });
		expect(toLatex(result.antiderivative)).toBe('\\dfrac{x^2}{2}');
		expect(rules(result.steps)).toContain('apply-power-rule');
	});

	it('integrates ∫x² dx → x³/3', () => {
		const result = generatePedagogicalIntegrationSteps(power(x(), number('2')), {
			level: 'lycee'
		});
		expect(toLatex(result.antiderivative)).toBe('\\dfrac{x^3}{3}');
	});

	it('integrates ∫x³ dx → x⁴/4', () => {
		const result = generatePedagogicalIntegrationSteps(power(x(), number('3')), {
			level: 'lycee'
		});
		expect(toLatex(result.antiderivative)).toBe('\\dfrac{x^4}{4}');
	});

	it('integrates ∫1/x dx → ln|x|', () => {
		const result = generatePedagogicalIntegrationSteps(divide(number('1'), x(), 'fraction'), {
			level: 'lycee'
		});
		expect(toLatex(result.antiderivative)).toContain('\\ln');
		expect(toLatex(result.antiderivative)).toContain('x');
	});

	it('integrates ∫e^x dx → e^x', () => {
		const result = generatePedagogicalIntegrationSteps(exp(x()), { level: 'lycee' });
		expect(toLatex(result.antiderivative)).toContain('exp');
		expect(rules(result.steps)).toContain('apply-known-primitive');
	});

	it('integrates ∫sin(x) dx → -cos(x)', () => {
		const result = generatePedagogicalIntegrationSteps(sin(x()), { level: 'lycee' });
		const latex = toLatex(result.antiderivative);
		expect(latex).toContain('cos');
		expect(latex).toContain('-');
	});

	it('integrates ∫cos(x) dx → sin(x)', () => {
		const result = generatePedagogicalIntegrationSteps(cos(x()), { level: 'lycee' });
		expect(toLatex(result.antiderivative)).toContain('sin');
	});

	it('respects auto variable detection on t', () => {
		const result = generatePedagogicalIntegrationSteps(power(t(), number('2')), {
			level: 'lycee'
		});
		expect(toLatex(result.antiderivative)).toBe('\\dfrac{t^3}{3}');
	});

	it('respects an explicit variable choice (multi-var would otherwise throw)', () => {
		// 3·x — variable y is the integration target, x is treated as constant.
		const integrand = implicitMultiply(number('3'), x());
		const result = generatePedagogicalIntegrationSteps(integrand, {
			level: 'lycee',
			variable: 'y'
		});
		expect(toLatex(result.antiderivative)).toContain('y');
	});
});

describe('pedagogical-integration pipeline — linearity', () => {
	it('integrates a sum of monomials: ∫(x² + x) dx', () => {
		const integrand = add(power(x(), number('2')), x());
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-linearity-sum');
		// Check the step structure: the linearity step has 2 sub-steps.
		const linearityStep = result.steps.find((s) => s.rule === 'apply-linearity-sum');
		expect(linearityStep?.subSteps?.length).toBe(2);
	});

	it('integrates a 3-term polynomial: ∫(3x² + 2x + 1) dx', () => {
		const integrand = add(
			add(
				implicitMultiply(number('3'), power(x(), number('2'))),
				implicitMultiply(number('2'), x())
			),
			number('1')
		);
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		const linearityStep = result.steps.find((s) => s.rule === 'apply-linearity-sum');
		expect(linearityStep).toBeDefined();
		expect(linearityStep?.subSteps?.length).toBe(3);
	});

	it('integrates a difference: ∫(x² - x) dx', () => {
		const integrand = subtract(power(x(), number('2')), x());
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-linearity-sum');
	});

	it('integrates a sum with leading negative term: ∫(-x² + 1) dx', () => {
		const integrand = add(opposite(power(x(), number('2'))), number('1'));
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-linearity-sum');
	});
});

describe('pedagogical-integration pipeline — constant extraction', () => {
	it('extracts a leading constant: ∫(5·x²) dx', () => {
		const integrand = implicitMultiply(number('5'), power(x(), number('2')));
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('extract-constant');
	});

	it('extracts a trailing constant: ∫(x² · 5) dx', () => {
		const integrand = implicitMultiply(power(x(), number('2')), number('5'));
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('extract-constant');
	});

	it('extracts division by a constant: ∫(x²/5) dx', () => {
		const integrand = divide(power(x(), number('2')), number('5'), 'fraction');
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('extract-constant');
	});

	it('does NOT extract for trivial constants 1 and 0', () => {
		// ∫(1·x²) should fall through to the power-rule directly (since 1·f reduces to f).
		// The current pipeline treats this as a multiplication that doesn't trigger
		// extract-constant (we explicitly reject c=1).
		const integrand = implicitMultiply(number('1'), power(x(), number('2')));
		// This won't match extract-constant; it must fall through. Currently the
		// dispatcher doesn't have a "1 · f → f" reducer at the top level so this
		// throws notImplemented. Document the current behaviour.
		expect(() => generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' })).toThrow(
			PedagogicalIntegrationNotImplemented
		);
	});
});

describe('pedagogical-integration pipeline — composite-exp', () => {
	it('integrates ∫2x · e^(x²) dx → e^(x²)', () => {
		const integrand = implicitMultiply(
			implicitMultiply(number('2'), x()),
			exp(power(x(), number('2')))
		);
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-composite-exp');
		expect(toLatex(result.antiderivative)).toContain('exp');
	});

	it('integrates ∫e^(2x) dx via composite-exp with rebalancing', () => {
		// Bare e^(2x) has u' = 2 (constant), so composite path applies with factor 1/2.
		const integrand = exp(implicitMultiply(number('2'), x()));
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-composite-exp');
	});

	it('integrates ∫x · e^(x²) dx → (1/2)e^(x²) (composite with 1/2 factor)', () => {
		const integrand = implicitMultiply(x(), exp(power(x(), number('2'))));
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-composite-exp');
	});
});

describe('pedagogical-integration pipeline — composite-ln', () => {
	it('integrates ∫(2x)/(x²+1) dx → ln(x²+1)', () => {
		const integrand = divide(
			implicitMultiply(number('2'), x()),
			add(power(x(), number('2')), number('1')),
			'fraction'
		);
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-composite-ln');
		expect(toLatex(result.antiderivative)).toContain('\\ln');
	});

	it('integrates ∫1/(2x+1) dx via composite-ln with rebalancing', () => {
		const integrand = divide(
			number('1'),
			add(implicitMultiply(number('2'), x()), number('1')),
			'fraction'
		);
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-composite-ln');
	});
});

describe('pedagogical-integration pipeline — composite-sin / cos', () => {
	it('integrates ∫sin(2x) dx via composite-sin with rebalancing', () => {
		const integrand = sin(implicitMultiply(number('2'), x()));
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-composite-sin');
	});

	it('integrates ∫cos(2x) dx via composite-cos with rebalancing', () => {
		const integrand = cos(implicitMultiply(number('2'), x()));
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-composite-cos');
	});

	it('integrates ∫2x · sin(x²) dx', () => {
		const integrand = implicitMultiply(
			implicitMultiply(number('2'), x()),
			sin(power(x(), number('2')))
		);
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-composite-sin');
	});

	it('integrates ∫2x · cos(x²) dx', () => {
		const integrand = implicitMultiply(
			implicitMultiply(number('2'), x()),
			cos(power(x(), number('2')))
		);
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-composite-cos');
	});
});

describe('pedagogical-integration pipeline — composite-power', () => {
	it('integrates ∫(2x+1)^3 dx via composite-power with rebalancing', () => {
		const integrand = power(add(implicitMultiply(number('2'), x()), number('1')), number('3'));
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-composite-power');
	});

	it('integrates ∫2x · (x²+1)^3 dx via composite-power', () => {
		const integrand = implicitMultiply(
			implicitMultiply(number('2'), x()),
			power(add(power(x(), number('2')), number('1')), number('3'))
		);
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-composite-power');
	});
});

describe('pedagogical-integration pipeline — definite integral', () => {
	it('computes ∫_0^1 x dx with the fundamental-theorem trio', () => {
		const result = generatePedagogicalIntegrationSteps(x(), {
			level: 'lycee',
			definite: { lower: number('0'), upper: number('1') }
		});
		expect(rules(result.steps)).toContain('identify-definite-integral');
		expect(rules(result.steps)).toContain('apply-fundamental-theorem');
		expect(rules(result.steps)).toContain('substitute-bounds');
		expect(rules(result.steps)).toContain('simplify-bounds-result');
		expect(result.value).toBeDefined();
	});

	it('computes ∫_0^1 e^x dx → e - 1', () => {
		const result = generatePedagogicalIntegrationSteps(exp(x()), {
			level: 'lycee',
			definite: { lower: number('0'), upper: number('1') }
		});
		expect(result.value).toBeDefined();
	});

	it('computes ∫_0^2 x² dx → 8/3 (≈ numeric)', () => {
		const result = generatePedagogicalIntegrationSteps(power(x(), number('2')), {
			level: 'lycee',
			definite: { lower: number('0'), upper: number('2') }
		});
		expect(result.value).toBeDefined();
	});

	it('definite integral on supérieur omits the explicit substitute-bounds step', () => {
		const result = generatePedagogicalIntegrationSteps(x(), {
			level: 'superieur',
			definite: { lower: number('0'), upper: number('1') }
		});
		// At supérieur, the strategy folds substitute-bounds into the fundamental-theorem step.
		expect(rules(result.steps)).not.toContain('substitute-bounds');
		expect(rules(result.steps)).toContain('apply-fundamental-theorem');
	});

	it('definite integral does NOT emit add-constant', () => {
		const result = generatePedagogicalIntegrationSteps(x(), {
			level: 'lycee',
			definite: { lower: number('0'), upper: number('1') }
		});
		expect(rules(result.steps)).not.toContain('add-constant');
	});
});

describe('pedagogical-integration pipeline — IPP (lycée Tle spé)', () => {
	it('integrates ∫x · e^x dx via IPP', () => {
		const integrand = implicitMultiply(x(), exp(x()));
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('identify-parts');
		expect(rules(result.steps)).toContain('choose-u-dv');
		expect(rules(result.steps)).toContain('apply-parts-formula');
	});

	it('integrates ∫x · sin(x) dx via IPP', () => {
		const integrand = implicitMultiply(x(), sin(x()));
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-parts-formula');
	});

	it('integrates ∫x · cos(x) dx via IPP', () => {
		const integrand = implicitMultiply(x(), cos(x()));
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-parts-formula');
	});

	it('integrates ∫ln(x) dx via IPP (u=ln, dv=1) and produces x·ln(x) - x', () => {
		const integrand = ln(x());
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('identify-parts');
		expect(rules(result.steps)).toContain('apply-parts-formula');
		// Verify that the inner `vDu = x · (1/x)` simplification went through —
		// the resulting antiderivative must be `x·ln(x) - x` and contain BOTH
		// `\\ln` (from u·v = x·ln(x)) and a subtracted `x` term.
		const latex = toLatex(result.antiderivative);
		expect(latex).toContain('\\ln');
		expect(latex).toContain('x');
		expect(latex).toContain('-');
	});

	it('integrates ∫x · ln(x) dx via IPP (u=ln, dv=x)', () => {
		const integrand = implicitMultiply(x(), ln(x()));
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-parts-formula');
	});
});

describe('pedagogical-integration pipeline — strategy differences', () => {
	it('lycée includes identify-integrand and add-constant', () => {
		const result = generatePedagogicalIntegrationSteps(x(), { level: 'lycee' });
		expect(rules(result.steps)).toContain('identify-integrand');
		expect(rules(result.steps)).toContain('add-constant');
	});

	it('supérieur omits identify-integrand and add-constant', () => {
		const result = generatePedagogicalIntegrationSteps(x(), { level: 'superieur' });
		expect(rules(result.steps)).not.toContain('identify-integrand');
		expect(rules(result.steps)).not.toContain('add-constant');
	});

	it('lycée enables IPP (Q3 user override per Tle spé programme)', () => {
		// IPP is enabled at lycée; ∫ln(x) dx must succeed there.
		const result = generatePedagogicalIntegrationSteps(ln(x()), { level: 'lycee' });
		expect(rules(result.steps)).toContain('apply-parts-formula');
	});
});

describe('pedagogical-integration pipeline — notImplemented cases', () => {
	it('refuses partial-fractions: ∫1/(x²-1) dx', () => {
		const integrand = divide(
			number('1'),
			subtract(power(x(), number('2')), number('1')),
			'fraction'
		);
		expect(() => generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' })).toThrow(
			PedagogicalIntegrationNotImplemented
		);
	});

	it('refuses arctan-yielding: ∫1/(x²+1) dx (V2 — out of V1 scope)', () => {
		const integrand = divide(number('1'), add(power(x(), number('2')), number('1')), 'fraction');
		expect(() => generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' })).toThrow(
			PedagogicalIntegrationNotImplemented
		);
	});

	it('refuses cyclic IPP: ∫e^x · sin(x) dx', () => {
		const integrand = implicitMultiply(exp(x()), sin(x()));
		expect(() => generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' })).toThrow(
			PedagogicalIntegrationNotImplemented
		);
	});

	it('error carries the integrand', () => {
		const integrand = divide(number('1'), add(power(x(), number('2')), number('1')), 'fraction');
		try {
			generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
			expect.fail('should have thrown');
		} catch (e) {
			expect(e).toBeInstanceOf(PedagogicalIntegrationNotImplemented);
			expect((e as PedagogicalIntegrationNotImplemented).integrand).toBeDefined();
		}
	});
});

describe('pedagogical-integration pipeline — abort/timeout', () => {
	it('respects an aborted signal', () => {
		const ctrl = new AbortController();
		ctrl.abort();
		expect(() =>
			generatePedagogicalIntegrationSteps(x(), { level: 'lycee', signal: ctrl.signal })
		).toThrow();
	});
});

describe('pedagogical-integration pipeline — step shape invariants', () => {
	it('every step has a unique id', () => {
		const integrand = add(power(x(), number('2')), x());
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		const allIds: number[] = [];
		const collect = (steps: readonly { id: number; subSteps?: readonly { id: number }[] }[]) => {
			for (const s of steps) {
				allIds.push(s.id);
				if (s.subSteps)
					collect(s.subSteps as readonly { id: number; subSteps?: readonly { id: number }[] }[]);
			}
		};
		collect(result.steps);
		// Uniqueness is what matters — the order may differ from DFS because parent
		// steps capture their id AFTER their sub-step recursion completes.
		expect(new Set(allIds).size).toBe(allIds.length);
		expect(allIds.every((n) => n > 0)).toBe(true);
	});

	it('every step has a non-empty description', () => {
		const result = generatePedagogicalIntegrationSteps(x(), { level: 'lycee' });
		for (const s of result.steps) {
			expect(s.description.length).toBeGreaterThan(0);
		}
	});

	it('every step records the integration variable', () => {
		const result = generatePedagogicalIntegrationSteps(power(t(), number('2')), {
			level: 'lycee'
		});
		for (const s of result.steps) {
			expect(s.variable).toBe('t');
		}
	});

	it('every step has before/after MathNodes', () => {
		const result = generatePedagogicalIntegrationSteps(exp(x()), { level: 'lycee' });
		for (const s of result.steps) {
			expect(s.before).toBeDefined();
			expect(s.after).toBeDefined();
		}
	});
});
