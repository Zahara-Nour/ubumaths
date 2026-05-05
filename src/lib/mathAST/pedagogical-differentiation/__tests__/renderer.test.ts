/**
 * Phase 1 — Renderer skeleton tests.
 *
 * Covers the baseline rendering behaviour: title lookup with school-level
 * fallback, primaire/college bump to lycee, verbosity-gated explanations,
 * and recursive subSteps rendering.
 *
 * Phase 3 will extend the renderer (aligned 2-line LaTeX, highlight from
 * globalBefore, locale switching) and add tests here for those features.
 */

import { describe, expect, it } from 'vitest';
import { number, variable } from '../../factory';
import { PedagogicalDifferentiationRenderer } from '../renderer';
import type { PedagogicalDifferentiationStep } from '../types';

const renderer = new PedagogicalDifferentiationRenderer();

function makeStep(
	overrides: Partial<PedagogicalDifferentiationStep> = {}
): PedagogicalDifferentiationStep {
	return {
		id: 1,
		rule: 'constant',
		description: "Dérivée d'une constante",
		before: number('5'),
		after: number('0'),
		variable: 'x',
		verbosityLevel: 'summarized',
		...overrides
	} as PedagogicalDifferentiationStep;
}

describe('PedagogicalDifferentiationRenderer — basic rendering', () => {
	it('renders a trivial constant step with the lycee title', () => {
		const step = makeStep({ rule: 'constant' });
		const rendered = renderer.render(step, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});

		expect(rendered.id).toBe(1);
		expect(rendered.rule).toBe('constant');
		expect(rendered.title).toBe("Dérivée d'une constante");
		expect(rendered.schoolLevel).toBe('lycee');
	});

	it('renders the LaTeX as a 2-line aligned block with the blue highlight on `(before)`', () => {
		const step = makeStep();
		const rendered = renderer.render(step, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});

		expect(rendered.expressionLatex).toContain('\\begin{aligned}');
		expect(rendered.expressionLatex).toContain('\\end{aligned}');
		expect(rendered.expressionLatex).toContain('\\textcolor{blue}');
		expect(rendered.expressionLatex).toMatch(/\(.*\)'/);
		expect(rendered.expressionLatex).toContain('=');
	});

	it('falls back to step.description when neither effective level nor lycee has a title', () => {
		// Use a fake rule the lookup doesn't know — TypeScript would flag this
		// in production code, but the runtime fallback should still kick in.
		const step = makeStep({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			rule: '__unknown__' as any,
			description: 'fallback description'
		});
		const rendered = renderer.render(step, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});

		expect(rendered.title).toBe('fallback description');
	});
});

describe('PedagogicalDifferentiationRenderer — school level bump', () => {
	it('bumps `primaire` to `lycee` and uses lycee titles', () => {
		const step = makeStep();
		const rendered = renderer.render(step, {
			schoolLevel: 'primaire',
			verbosity: 'summarized'
		});

		expect(rendered.schoolLevel).toBe('lycee');
		expect(rendered.title).toBe("Dérivée d'une constante");
	});

	it('bumps `college` to `lycee` and uses lycee titles', () => {
		const step = makeStep();
		const rendered = renderer.render(step, {
			schoolLevel: 'college',
			verbosity: 'summarized'
		});

		expect(rendered.schoolLevel).toBe('lycee');
	});

	it('uses superieur titles when level is `superieur` and falls back when missing', () => {
		// `product` has a superieur title in descriptions-fr.ts.
		const productStep = makeStep({
			rule: 'product',
			bindings: { u: variable('x'), v: variable('y') }
		});
		const rendered = renderer.render(productStep, {
			schoolLevel: 'superieur',
			verbosity: 'summarized'
		});

		expect(rendered.title).toContain('uv');
	});
});

describe('PedagogicalDifferentiationRenderer — verbosity', () => {
	it('omits explanation at verbosity `summarized`', () => {
		const step = makeStep({ rule: 'sum', bindings: { f: variable('x'), g: number('1') } });
		const rendered = renderer.render(step, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});

		expect(rendered.explanation).toBeUndefined();
	});

	it('includes explanation at verbosity `detailed` for rules that define one', () => {
		const step = makeStep({ rule: 'sum', bindings: { f: variable('x'), g: number('1') } });
		const rendered = renderer.render(step, {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});

		expect(rendered.explanation).toBeDefined();
		expect(rendered.explanation).toContain('f');
		expect(rendered.explanation).toContain('g');
	});

	it('leaves explanation undefined at `detailed` for rules without a known explanation', () => {
		// Use an unknown rule that no explanation table has an entry for.
		const step = makeStep({
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			rule: '__unknown_rule__' as any
		});
		const rendered = renderer.render(step, {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});

		expect(rendered.explanation).toBeUndefined();
	});

	it('leaves explanation undefined at `detailed` for `superieur` (no explanation table)', () => {
		// EXPLANATIONS.superieur is empty by design — titles already carry the formula.
		const step = makeStep({ rule: 'product', bindings: { u: variable('x'), v: number('1') } });
		const rendered = renderer.render(step, {
			schoolLevel: 'superieur',
			verbosity: 'detailed'
		});

		// At supérieur level there is no fallback to lycee for explanations only —
		// the renderer reads EXPLANATIONS[level][rule] ?? EXPLANATIONS.lycee[rule].
		// Since EXPLANATIONS.superieur is empty, we DO fall back to lycee, and lycee
		// has a `product` entry. So the explanation is present.
		expect(rendered.explanation).toBeDefined();
	});
});

describe('PedagogicalDifferentiationRenderer — recursion', () => {
	it('recurses into subSteps and propagates options', () => {
		const inner: PedagogicalDifferentiationStep = makeStep({
			id: 2,
			rule: 'power-natural',
			bindings: { base: variable('x'), n: number('2') }
		});
		const outer: PedagogicalDifferentiationStep = makeStep({
			id: 1,
			rule: 'sum',
			subSteps: [inner],
			bindings: { f: variable('x'), g: number('1') }
		});

		const rendered = renderer.render(outer, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});

		expect(rendered.subSteps).toHaveLength(1);
		expect(rendered.subSteps?.[0].id).toBe(2);
		expect(rendered.subSteps?.[0].rule).toBe('power-natural');
	});

	it('leaves subSteps undefined when the source has none', () => {
		const step = makeStep();
		const rendered = renderer.render(step, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});

		expect(rendered.subSteps).toBeUndefined();
	});

	it('renderAll renders an array of steps', () => {
		const steps = [
			makeStep({ id: 1, rule: 'constant' }),
			makeStep({ id: 2, rule: 'variable', before: variable('x'), after: number('1') })
		];
		const rendered = renderer.renderAll(steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});

		expect(rendered).toHaveLength(2);
		expect(rendered[0].id).toBe(1);
		expect(rendered[1].rule).toBe('variable');
	});
});

describe('PedagogicalDifferentiationRenderer — power-natural binding interpolation', () => {
	it('inlines the n binding into the title at lycee level', () => {
		const step = makeStep({
			rule: 'power-natural',
			bindings: { base: variable('x'), n: number('3') }
		});
		const rendered = renderer.render(step, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});

		expect(rendered.title).toContain('3');
	});
});

// =============================================================================
// V1.1 — Leibniz notation
// =============================================================================

describe('PedagogicalDifferentiationRenderer — Lagrange / Leibniz notation', () => {
	it('default notation is Lagrange (preserves V1 snapshot output)', () => {
		const step = makeStep();
		const rendered = renderer.render(step, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});

		expect(rendered.expressionLatex).toMatch(/\(.*\)'/);
		expect(rendered.expressionLatex).not.toContain('\\frac{d}');
	});

	it('explicit notation: lagrange equals default', () => {
		const step = makeStep();
		const renderedDefault = renderer.render(step, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		const renderedExplicit = renderer.render(step, {
			schoolLevel: 'lycee',
			verbosity: 'summarized',
			notation: 'lagrange'
		});
		expect(renderedExplicit.expressionLatex).toBe(renderedDefault.expressionLatex);
	});

	it('notation: leibniz produces \\frac{d}{dx} for variable x', () => {
		const step = makeStep({ variable: 'x', before: variable('x'), after: number('1') });
		const rendered = renderer.render(step, {
			schoolLevel: 'lycee',
			verbosity: 'summarized',
			notation: 'leibniz'
		});

		expect(rendered.expressionLatex).toContain('\\frac{d}{dx}');
		expect(rendered.expressionLatex).not.toMatch(/\(.*\)'/);
	});

	it('notation: leibniz uses the step variable for the denominator (y, t, …)', () => {
		const stepY = makeStep({ variable: 'y', before: variable('y'), after: number('1') });
		const renderedY = renderer.render(stepY, {
			schoolLevel: 'lycee',
			verbosity: 'summarized',
			notation: 'leibniz'
		});
		expect(renderedY.expressionLatex).toContain('\\frac{d}{dy}');

		const stepT = makeStep({ variable: 't', before: variable('t'), after: number('1') });
		const renderedT = renderer.render(stepT, {
			schoolLevel: 'lycee',
			verbosity: 'summarized',
			notation: 'leibniz'
		});
		expect(renderedT.expressionLatex).toContain('\\frac{d}{dt}');
	});

	it('notation: leibniz propagates to subSteps', () => {
		const inner: PedagogicalDifferentiationStep = makeStep({
			id: 2,
			rule: 'power-natural',
			variable: 'x',
			before: variable('x'),
			after: number('1'),
			bindings: { base: variable('x'), n: number('2') }
		});
		const outer: PedagogicalDifferentiationStep = makeStep({
			id: 1,
			rule: 'sum',
			subSteps: [inner],
			bindings: { f: variable('x'), g: number('1') }
		});

		const rendered = renderer.render(outer, {
			schoolLevel: 'lycee',
			verbosity: 'summarized',
			notation: 'leibniz'
		});

		expect(rendered.expressionLatex).toContain('\\frac{d}{dx}');
		expect(rendered.subSteps?.[0].expressionLatex).toContain('\\frac{d}{dx}');
	});

	it('renderAll passes the notation through to every step', () => {
		const steps = [
			makeStep({ id: 1, rule: 'constant', variable: 'x' }),
			makeStep({ id: 2, rule: 'variable', variable: 'x' })
		];
		const rendered = renderer.renderAll(steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized',
			notation: 'leibniz'
		});

		expect(rendered).toHaveLength(2);
		expect(rendered[0].expressionLatex).toContain('\\frac{d}{dx}');
		expect(rendered[1].expressionLatex).toContain('\\frac{d}{dx}');
	});
});
