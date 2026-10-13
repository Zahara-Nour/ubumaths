/**
 * Explications de l'intégration pédagogique (chantier K21)
 *
 * V22 — étape `decompose-rational` : la phrase annonçait
 * `Q(x) = (x − r₁)(x − r₂)` sans le coefficient dominant, faux pour `4x² − 1`,
 * et écrivait `x − -1` pour une racine négative. Attendu : une égalité VRAIE,
 * le dénominateur factorisé par le noyau (`factorizationToNode`, forme entière).
 *
 * V24 — étape `choose-u-dv` : « du = 1 dx » au lieu de « du = dx »
 * (∫xe^{2x}, ∫xe^x), « du = -1 dx » au lieu de « du = -dx ».
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { compile } from '../../eval/compile';
import { generatePedagogicalIntegrationSteps } from '../pipeline';
import { PedagogicalIntegrationRenderer } from '../renderer';
import type { RenderedStep } from '../../common/step-renderer-base';

function renderedSteps(latex: string, level: 'lycee' | 'superieur' = 'lycee'): RenderedStep[] {
	const result = generatePedagogicalIntegrationSteps(parseLatex(latex), { level });
	const renderer = new PedagogicalIntegrationRenderer();
	const flat = (s: RenderedStep): RenderedStep[] => [s, ...(s.subSteps ?? []).flatMap(flat)];
	return renderer
		.renderAll(result.steps, { schoolLevel: level, verbosity: 'detailed' })
		.flatMap(flat);
}

function explanationOf(
	latex: string,
	rule: string,
	level: 'lycee' | 'superieur' = 'lycee'
): string {
	const step = renderedSteps(latex, level).find((s) => s.rule === rule);
	if (!step?.explanation) throw new Error(`pas d'explication ${rule} pour ${latex}`);
	return step.explanation;
}

describe('V22 — décomposition en éléments simples : le dénominateur factorisé est juste', () => {
	const CASES = [
		{
			latex: '\\frac{1}{4x^2-1}',
			equality: '4 x^2 - 1 = \\left( 2 x - 1 \\right) \\left( 2 x + 1 \\right)'
		},
		{
			latex: '\\frac{3}{2x^2+x-3}',
			equality: '2 x^2 + x - 3 = \\left( x - 1 \\right) \\left( 2 x + 3 \\right)'
		},
		{
			latex: '\\frac{2x+1}{x^2-1}',
			equality: 'x^2 - 1 = \\left( x - 1 \\right) \\left( x + 1 \\right)'
		}
	];

	for (const c of CASES) {
		it(`${c.latex} : « ${c.equality} », égalité vérifiée numériquement`, () => {
			const explanation = explanationOf(c.latex, 'decompose-rational');
			expect(explanation).toContain(`On factorise le dénominateur : $${c.equality}$.`);

			const [left, right] = c.equality.split(' = ').map((side) => compile(parseLatex(side)));
			for (const x of [-2.5, -0.3, 0.7, 3.1]) {
				expect(left({ x })).toBeCloseTo(right({ x }), 10);
			}
		});

		it(`${c.latex} : jamais « x − - » ni « − -»`, () => {
			const step = renderedSteps(c.latex).find((s) => s.rule === 'decompose-rational');
			expect(`${step?.title} ${step?.explanation}`).not.toMatch(/− -/);
		});
	}
});

describe('V24 — choix de u et dv : du = dx, jamais « 1 dx »', () => {
	// Notation du supérieur (u, dv) ; le lycée écrit u′(x) depuis le 2026-10-13
	it.each([
		['xe^{2x}', 'du = dx'],
		['xe^x', 'du = dx'],
		['x\\cos x', 'du = dx'],
		['-xe^x', 'du = -dx'],
		['(1-x)e^x', 'du = -dx'],
		['3xe^x', 'du = 3\\,dx'],
		['x^2e^x', 'du = 2 x\\,dx']
	])('supérieur, ∫%s : « %s »', (latex, expected) => {
		const explanation = explanationOf(latex, 'choose-u-dv', 'superieur');
		expect(explanation).toContain(`$${expected}$ et $v =`);
	});

	it.each([
		['xe^{2x}', "u'(x) = 1"],
		['-xe^x', "u'(x) = -1"],
		['3xe^x', "u'(x) = 3"],
		['x^2e^x', "u'(x) = 2 x"]
	])('lycée, ∫%s : « %s » (notation de terminale)', (latex, expected) => {
		const explanation = explanationOf(latex, 'choose-u-dv');
		expect(explanation).toContain(`$${expected}$ et $v(x) =`);
	});

	it('aucune explication n’écrit « 1 dx », « -1 dx » ni « 1 x »', () => {
		for (const latex of ['xe^{2x}', 'xe^x', '(1-x)e^x', '-xe^x', 'x^2e^x', '\\ln x', 'x\\ln x']) {
			for (const step of renderedSteps(latex)) {
				// `\,dx` en LaTeX depuis V25 (les maths de la prose sont entre `$…$`)
				expect(step.explanation ?? '').not.toMatch(/(^|[^\d.])1( |\\,| \\cdot )(dx|x)\b/);
			}
		}
	});
});

describe('V25 (revue) — une constante négative s’écrit entre parenthèses sous ∫', () => {
	it.each([
		['-3x^2', 'extract-constant', '\\int \\left( -3 \\right) f(x)\\,dx = -3 \\int f(x)\\,dx'],
		['-\\dfrac{1}{2}e^x', 'extract-constant', '\\int \\left( -\\dfrac{1}{2} \\right) f(x)\\,dx'],
		['2x^3', 'extract-constant', '\\int 2 f(x)\\,dx = 2 \\int f(x)\\,dx'],
		// k = −1 : le seul signe, sans (−1) (décision de David du 2026-10-13)
		['-x^3', 'extract-constant', '\\int \\left( -f(x) \\right)\\,dx = -\\int f(x)\\,dx'],
		['-3', 'apply-constant-rule', '\\int \\left( -3 \\right)\\,dx = -3 x'],
		['5', 'apply-constant-rule', '\\int 5\\,dx = 5 x']
	])('∫%s, %s : « %s »', (latex, rule, expected) => {
		const explanation = explanationOf(latex, rule);
		expect(explanation).toContain(`$${expected}`);
		expect(explanation).not.toMatch(/\\int -/);
	});
});
