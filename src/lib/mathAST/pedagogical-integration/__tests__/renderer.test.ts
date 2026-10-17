/**
 * Pedagogical Integration — Renderer tests.
 *
 * Verifies that rendered steps carry coherent French titles, optional
 * explanations (verbosity-gated), LaTeX with the integral on top and the
 * antiderivative below, and proper recursion into subSteps.
 */

import { describe, expect, it } from 'vitest';
import { add, exp, implicitMultiply, ln, number, power, sin, variable } from '../../factory';
import {
	generatePedagogicalIntegrationSteps,
	PedagogicalIntegrationRenderer,
	type PedagogicalIntegrationStep
} from '..';
import { integrateDefinite } from '../../integration/integrate';
import { parseLatex } from '../../parser';
import { compile } from '../../eval/compile';
import { toLatex } from '../../latex-generator';

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
		expect(composite?.explanation).toContain("$u'e^u$");
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
		// Notation de terminale (u, v′) au lycée depuis le 2026-10-13
		expect(apply?.title).toContain('u(x)v(x)');
	});

	it('renders ∫x · sin(x) dx IPP with bindings exposed in choose-u-dv title', () => {
		const integrand = implicitMultiply(x(), sin(x()));
		const result = generatePedagogicalIntegrationSteps(integrand, { level: 'lycee' });
		const rendered = renderer.renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'summarized'
		});
		const choose = rendered.find((s) => s.rule === 'choose-u-dv');
		// Le titre du choix interpole u et v′ (notation de terminale au lycée)
		expect(choose?.title).toMatch(/u\(x\)\s*=/);
		expect(choose?.title).toMatch(/v'\(x\)\s*=/);
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

// =============================================================================
// V28 — intégrale définie : valeur interdite dans [a ; b]
// =============================================================================

/** Intégrale définie pédagogique d'un intégrande saisi, rendue au niveau donné */
function renderDefinite(
	integrand: string,
	lower: string,
	upper: string,
	level: 'lycee' | 'superieur' = 'lycee',
	verbosity: 'summarized' | 'detailed' = 'summarized'
) {
	const result = generatePedagogicalIntegrationSteps(parseLatex(integrand), {
		level,
		definite: { lower: parseLatex(lower), upper: parseLatex(upper) }
	});
	const rendered = new PedagogicalIntegrationRenderer().renderAll(result.steps, {
		schoolLevel: level,
		verbosity
	});
	return { result, rendered };
}

describe('intégrale définie : valeur interdite dans [a ; b] (V28)', () => {
	it.each([
		// pôle intérieur, coefficient 5 et dénominateur 4x² − 9
		['\\frac{5}{4x^2-9}', '1', '2', 'x = \\dfrac{3}{2}', '\\left[ 1 ; 2 \\right]'],
		// bornes dans l'autre sens : même intervalle
		['\\frac{5}{4x^2-9}', '2', '1', 'x = \\dfrac{3}{2}', '\\left[ 1 ; 2 \\right]'],
		// pôle en une borne
		['\\frac{1}{x}', '0', '1', 'x = 0', '\\left[ 0 ; 1 \\right]'],
		// coefficient ≠ 1, forme u'/u
		['\\frac{3}{2x-1}', '0', '1', 'x = \\dfrac{1}{2}', '\\left[ 0 ; 1 \\right]'],
		['\\frac{3}{x}', '-1', '1', 'x = 0', '\\left[ -1 ; 1 \\right]'],
		// exclusion périodique : premier point interdit de [0 ; 2]
		['\\tan(x)', '0', '2', 'x = \\dfrac{\\pi}{2}', '\\left[ 0 ; 2 \\right]'],
		// exclusion périodique, borne négative et k ≠ 0 : fraction unique
		['\\tan(x)', '-2', '-1', 'x = -\\dfrac{\\pi}{2}', '\\left[ -2 ; -1 \\right]'],
		['\\tan(x)', '3', '5', 'x = \\dfrac{3 \\pi}{2}', '\\left[ 3 ; 5 \\right]'],
		// primitive que le pipeline ne sait pas calculer : le refus s'affiche quand même
		['\\frac{4}{(3x-2)^2}', '0', '1', 'x = \\dfrac{2}{3}', '\\left[ 0 ; 1 \\right]'],
		['\\tan(2x)', '0', '1', 'x = \\dfrac{\\pi}{4}', '\\left[ 0 ; 1 \\right]'],
		['\\ln(2x-1)', '0', '1', 'x = 0', '\\left[ 0 ; 1 \\right]']
	])(
		'∫ %s sur [%s ; %s] : une étape dit que l’intégrale n’est pas définie, aucune valeur',
		(integrand, lower, upper, point, interval) => {
			const { result, rendered } = renderDefinite(integrand, lower, upper);
			expect(result.value).toBeUndefined();
			expect(result.steps.map((s) => s.rule)).toEqual([
				'identify-definite-integral',
				'integrand-undefined-on-interval'
			]);
			const refusal = rendered[rendered.length - 1];
			expect(refusal.expressionLatex).toContain(
				`\\text{La fonction n’est pas définie en } ${point} \\text{, qui appartient à } ${interval}`
			);
			expect(refusal.expressionLatex).toContain(
				'\\text{l’intégrale n’est pas définie sur cet intervalle.}'
			);
			// aucune valeur calculée, nulle part dans la correction (hors intégrande)
			const integrandLatex = toLatex(parseLatex(integrand));
			for (const step of rendered) {
				expect((step.expressionLatex ?? '').replaceAll(integrandLatex, '')).not.toContain('\\ln');
			}
		}
	);

	it('titre et explication en prose, sans LaTeX brut (V25), aux deux niveaux', () => {
		for (const level of ['lycee', 'superieur'] as const) {
			const { rendered } = renderDefinite('\\frac{5}{4x^2-9}', '1', '2', level, 'detailed');
			const refusal = rendered[rendered.length - 1];
			expect(refusal.title).toBe('Intégrale non définie sur l’intervalle');
			expect(refusal.title).not.toContain('\\');
			expect(refusal.explanation ?? '').not.toContain('\\');
		}
	});

	it('∫ 5/(4x² − 9) sur [2 ; 3] : pôle hors de l’intervalle, valeur inchangée', () => {
		const { result, rendered } = renderDefinite('\\frac{5}{4x^2-9}', '2', '3');
		expect(rendered.map((s) => s.rule)).not.toContain('integrand-undefined-on-interval');
		expect(result.value && toLatex(result.value)).toBe(
			'-\\dfrac{5}{12} \\ln\\left( 3 \\right) + \\dfrac{5}{12} \\ln\\left( 7 \\right)'
		);
	});

	it.each([
		['\\frac{1}{x}', '1', '2', Math.log(2)],
		// ln|x| : bornes négatives, sans pôle dans l'intervalle
		['\\frac{2}{x}', '-2', '-1', -2 * Math.log(2)],
		// intégrande sans valeur interdite
		['3x^2+1', '0', '2', 10],
		['e^{2x}', '0', '1', (Math.exp(2) - 1) / 2]
	])('∫ %s sur [%s ; %s] : valeur inchangée', (integrand, lower, upper, expected) => {
		const { result, rendered } = renderDefinite(integrand, lower, upper);
		expect(rendered.map((s) => s.rule)).not.toContain('integrand-undefined-on-interval');
		expect(result.value).toBeDefined();
		const value = result.value ? compile(result.value)({}) : Number.NaN;
		expect(value).toBeCloseTo(expected, 10);
	});

	it('bornes littérales : pas de contrôle, comportement inchangé', () => {
		const { result, rendered } = renderDefinite('\\frac{1}{x}', '1', 'a');
		expect(rendered.map((s) => s.rule)).not.toContain('integrand-undefined-on-interval');
		expect(result.value).toBeDefined();
	});
});

describe('intégrale définie : refus, suites de la revue de V28', () => {
	it('une somme sous ∫ est entre parenthèses dans l’étape de refus', () => {
		const { rendered } = renderDefinite('\\frac{2}{x}+3x', '-1', '1');
		expect(rendered[rendered.length - 1].expressionLatex).toContain(
			'\\int_{-1}^{1} \\left( \\dfrac{2}{x} + 3 x \\right)\\,dx'
		);
	});

	it('pôle transcendant ln 2 ∈ [0 ; 1] : refus propre, aucun nombre publié', () => {
		// 2026-10-15 : ce test attendait un `throw` (domaine non résolu,
		// eˣ − 2 ≠ 0 pas inversé). `domain/` exclut maintenant ln 2 exactement :
		// le refus est l'étape `integrand-undefined-on-interval`, juste parce
		// que ln 2 ≈ 0,69 appartient à [0 ; 1].
		const { result } = renderDefinite('\\frac{e^x}{e^x-2}', '0', '1');
		expect(result.value).toBeUndefined();
		expect(result.steps.map((s) => s.rule)).toEqual([
			'identify-definite-integral',
			'integrand-undefined-on-interval'
		]);
		expect(result.undefinedAt).toBeDefined();
		if (result.undefinedAt === undefined) return;
		expect(toLatex(result.undefinedAt)).toMatch(/\\ln/);
		const pole = compile(result.undefinedAt)({});
		expect(pole).toBeCloseTo(Math.LN2, 12);
		expect(pole).toBeGreaterThanOrEqual(0);
		expect(pole).toBeLessThanOrEqual(1);
		// le mode A (moteur) refuse aussi
		const engine = integrateDefinite(
			parseLatex('\\frac{e^x}{e^x-2}'),
			parseLatex('0'),
			parseLatex('1'),
			{ variable: 'x' }
		);
		expect(engine.value).toBeNull();
	});

	it('un refus ne calcule pas la primitive : `antiderivative` absent', () => {
		const { result } = renderDefinite('\\frac{4}{(3x-2)^2}', '0', '1');
		expect(result.antiderivative).toBeUndefined();
	});
});

describe('valeur interdite non exacte : arrondie lisiblement, jamais un flottant brut', () => {
	it('∫ 3x²/(x³ − 2) de 1 à 2 : « x ≈ 1.26 », pas « x = 1.2599210498948732 »', () => {
		const { rendered } = renderDefinite('\\frac{3x^2}{x^3-2}', '1', '2');
		const refusal = rendered[rendered.length - 1];
		expect(refusal.rule).toBe('integrand-undefined-on-interval');
		expect(refusal.expressionLatex).toContain(
			'\\text{La fonction n’est pas définie en } x \\approx 1.26 \\text{, qui appartient à } \\left[ 1 ; 2 \\right]'
		);
		expect(refusal.expressionLatex).not.toContain('1.2599');
	});

	it('∫ 3x²/(x³ + 2) de −2 à −1 : « x ≈ -1.26 »', () => {
		const { rendered } = renderDefinite('\\frac{3x^2}{x^3+2}', '-2', '-1');
		const refusal = rendered[rendered.length - 1];
		expect(refusal.expressionLatex).toContain('pas définie en } x \\approx -1.26 \\text');
	});

	it('une valeur décimale courte reste exacte : « x = 0.5 »', () => {
		const { rendered } = renderDefinite('\\frac{1}{x-0.5}', '0', '1');
		const refusal = rendered[rendered.length - 1];
		expect(refusal.expressionLatex).toMatch(
			/pas définie en \} x = (0\.5|\\dfrac\{1\}\{2\}) \\text/
		);
	});
});

describe('valeur interdite approchée : 3 chiffres significatifs, jamais « 0 » ni « -0 »', () => {
	/** L'étape du refus, valeur interdite fabriquée (le domaine ne les rend pas justes près de 0) */
	function refusalWith(point: ReturnType<typeof parseLatex>): string {
		const step: PedagogicalIntegrationStep = {
			id: 1,
			rule: 'integrand-undefined-on-interval',
			description: '',
			before: parseLatex('\\frac{1}{x}'),
			after: parseLatex('\\frac{1}{x}'),
			variable: 'x',
			verbosityLevel: 'summarized',
			definite: { lower: parseLatex('-1'), upper: number('1') },
			bindings: { point }
		};
		return (
			new PedagogicalIntegrationRenderer().render(step, {
				schoolLevel: 'lycee',
				verbosity: 'detailed'
			}).expressionLatex ?? ''
		);
	}

	it.each([
		['0.0004123', 'x \\approx 0.000412 '],
		['-0.0004123', 'x \\approx -0.000412 '],
		['0.0007368', 'x \\approx 0.000737 '],
		['1.2599210498948732', 'x \\approx 1.26 '],
		['1234.5678', 'x \\approx 1230 '],
		['0.0000001234', 'x \\approx 0.000000123 ']
	])('%s → « %s »', (value, expected) => {
		const latex = refusalWith(parseLatex(value));
		expect(latex).toContain(`pas définie en } ${expected}\\text`);
		expect(latex).not.toMatch(/approx -?0 |e[+-]\d/);
	});
});
