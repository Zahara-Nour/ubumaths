/**
 * Pedagogical Integration — Renderer tests.
 *
 * Verifies that rendered steps carry coherent French titles, optional
 * explanations (verbosity-gated), LaTeX with the integral on top and the
 * antiderivative below, and proper recursion into subSteps.
 */

import { describe, expect, it } from 'vitest';
import { add, exp, implicitMultiply, ln, number, power, sin, variable } from '../../factory';
import { generatePedagogicalIntegrationSteps, PedagogicalIntegrationRenderer } from '..';

const x = () => variable('x');

describe('PedagogicalIntegrationRenderer — basic rendering', () => {
	const renderer = new PedagogicalIntegrationRenderer();

	it('renders ∫1 dx (lycee, summarized) with title and integral LaTeX', () => {
		const result = generatePedagogicalIntegrationSteps(number('1'), { level: 'lycee' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});

		expect(rendered.length).toBe(result.steps.length);
		const constantStep = rendered.find((s) => s.rule === 'apply-constant-rule');
		expect(constantStep).toBeDefined();
		expect(constantStep?.title.length).toBeGreaterThan(0);
		expect(constantStep?.expressionLatex).toContain('\\int');
		expect(constantStep?.expressionLatex).toContain('\\textcolor{blue}');
	});

	it('renders ∫x dx with the power-rule title in lycee', () => {
		const result = generatePedagogicalIntegrationSteps(x(), { level: 'lycee' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		const power = rendered.find((s) => s.rule === 'apply-power-rule');
		expect(power?.title).toContain('puissance');
	});

	it('renders ∫x dx with the power-rule formula at supérieur', () => {
		const result = generatePedagogicalIntegrationSteps(x(), { level: 'superieur' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'superieur',
			verbosity: 'summarized'
		});
		const power = rendered.find((s) => s.rule === 'apply-power-rule');
		// Supérieur title is the LaTeX formula itself.
		expect(power?.title).toContain('\\int');
		expect(power?.title).toContain('x^n');
	});

	it('emits an explanation when verbosity is "detailed" (lycee)', () => {
		const result = generatePedagogicalIntegrationSteps(x(), { level: 'lycee' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		const power = rendered.find((s) => s.rule === 'apply-power-rule');
		expect(power?.explanation).toBeDefined();
		expect(power?.explanation?.length ?? 0).toBeGreaterThan(0);
	});

	it('omits the explanation at verbosity "summarized"', () => {
		const result = generatePedagogicalIntegrationSteps(x(), { level: 'lycee' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		const power = rendered.find((s) => s.rule === 'apply-power-rule');
		expect(power?.explanation).toBeUndefined();
	});
});

describe('PedagogicalIntegrationRenderer — composite forms', () => {
	const renderer = new PedagogicalIntegrationRenderer();

	it('renders the composite-exp title with u in the bindings (lycee detailed)', () => {
		const integrand = implicitMultiply(
			implicitMultiply(number('2'), x()),
			exp(power(x(), number('2')))
		);
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		const composite = rendered.find((s) => s.rule === 'apply-composite-exp');
		expect(composite?.explanation).toContain("u'·e^u");
		expect(composite?.expressionLatex).toContain('\\int');
	});

	it('renders the composite-ln title at supérieur with the formula', () => {
		const integrand = implicitMultiply(number('2'), x()); // numerator
		const integrandFull = {
			type: 'division' as const,
			numerator: integrand,
			denominator: add(power(x(), number('2')), number('1')),
			displayStyle: 'fraction' as const
		};
		const result = generatePedagogicalIntegrationSteps(integrandFull, {
			level: 'superieur'
		});
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'superieur',
			verbosity: 'summarized'
		});
		const composite = rendered.find((s) => s.rule === 'apply-composite-ln');
		expect(composite?.title).toContain("u'");
		expect(composite?.title).toContain('\\ln');
	});
});

describe('PedagogicalIntegrationRenderer — definite integral', () => {
	const renderer = new PedagogicalIntegrationRenderer();

	it('renders the definite-integral identification with bounds in LaTeX', () => {
		const result = generatePedagogicalIntegrationSteps(exp(x()), {
			level: 'lycee',
			definite: { lower: number('0'), upper: number('1') }
		});
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		const ident = rendered.find((s) => s.rule === 'identify-definite-integral');
		expect(ident?.expressionLatex).toContain('\\int_');
		expect(ident?.expressionLatex).toContain('0');
		expect(ident?.expressionLatex).toContain('1');
	});

	it('renders the fundamental-theorem step with the bracket-notation primitive', () => {
		const result = generatePedagogicalIntegrationSteps(exp(x()), {
			level: 'lycee',
			definite: { lower: number('0'), upper: number('1') }
		});
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		const ftc = rendered.find((s) => s.rule === 'apply-fundamental-theorem');
		expect(ftc?.expressionLatex).toContain('\\left[');
		expect(ftc?.expressionLatex).toContain('\\right]');
	});

	it('renders substitute-bounds with [F]_a^b → F(b) - F(a)', () => {
		const result = generatePedagogicalIntegrationSteps(x(), {
			level: 'lycee',
			definite: { lower: number('0'), upper: number('2') }
		});
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		const subst = rendered.find((s) => s.rule === 'substitute-bounds');
		expect(subst).toBeDefined();
		expect(subst?.expressionLatex).toContain('\\left[');
	});
});

describe('PedagogicalIntegrationRenderer — IPP', () => {
	const renderer = new PedagogicalIntegrationRenderer();

	it('renders ∫ln(x) dx IPP with all 3 IPP titles', () => {
		const result = generatePedagogicalIntegrationSteps(ln(x()), { level: 'lycee' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		const ident = rendered.find((s) => s.rule === 'identify-parts');
		const choose = rendered.find((s) => s.rule === 'choose-u-dv');
		const apply = rendered.find((s) => s.rule === 'apply-parts-formula');
		expect(ident?.title).toContain('parties');
		expect(choose?.title).toContain('u');
		expect(apply?.title).toContain('uv');
	});

	it('renders ∫x · sin(x) dx IPP with bindings exposed in choose-u-dv title', () => {
		const integrand = implicitMultiply(x(), sin(x()));
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		const choose = rendered.find((s) => s.rule === 'choose-u-dv');
		// The choose-u-dv title interpolates u and dv from bindings.
		expect(choose?.title).toMatch(/u\s*=/);
		expect(choose?.title).toMatch(/dv\s*=/);
	});
});

describe('PedagogicalIntegrationRenderer — primaire/college fallback', () => {
	const renderer = new PedagogicalIntegrationRenderer();

	it('bumps primaire to lycee', () => {
		const result = generatePedagogicalIntegrationSteps(x(), { level: 'lycee' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'primaire',
			verbosity: 'summarized'
		});
		// All rendered steps must report lycee as effective level.
		for (const s of rendered) {
			expect(s.schoolLevel).toBe('lycee');
		}
	});

	it('bumps college to lycee', () => {
		const result = generatePedagogicalIntegrationSteps(x(), { level: 'lycee' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'college',
			verbosity: 'summarized'
		});
		for (const s of rendered) {
			expect(s.schoolLevel).toBe('lycee');
		}
	});
});

describe('PedagogicalIntegrationRenderer — recursion into subSteps', () => {
	const renderer = new PedagogicalIntegrationRenderer();

	it('recurses into the linearity sub-steps for ∫(x² + x) dx', () => {
		const integrand = add(power(x(), number('2')), x());
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		const linearity = rendered.find((s) => s.rule === 'apply-linearity-sum');
		expect(linearity?.subSteps?.length).toBe(2);
		// Each substep also has rendered title and LaTeX.
		for (const sub of linearity?.subSteps ?? []) {
			expect(sub.title.length).toBeGreaterThan(0);
			expect(sub.expressionLatex).toBeDefined();
		}
	});

	it('preserves step.id from raw step on the rendered step', () => {
		const result = generatePedagogicalIntegrationSteps(x(), { level: 'lycee' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		for (let i = 0; i < result.steps.length; i++) {
			expect(rendered[i].id).toBe(result.steps[i].id);
		}
	});
});

describe('PedagogicalIntegrationRenderer — narrative steps', () => {
	const renderer = new PedagogicalIntegrationRenderer();

	it('renders identify-integrand with single-line LaTeX (no transformation)', () => {
		const result = generatePedagogicalIntegrationSteps(x(), { level: 'lycee' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		const ident = rendered.find((s) => s.rule === 'identify-integrand');
		// Single-line: no `\\` line break, just the integral wrapped in color.
		expect(ident?.expressionLatex).toContain('\\textcolor{blue}');
		expect(ident?.expressionLatex).not.toContain('\\begin{aligned}');
	});

	it('renders add-constant with the antiderivative + C in single line', () => {
		const result = generatePedagogicalIntegrationSteps(x(), { level: 'lycee' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		const addC = rendered.find((s) => s.rule === 'add-constant');
		expect(addC?.expressionLatex).toContain('+ C');
	});
});
