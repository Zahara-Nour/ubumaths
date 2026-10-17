/**
 * Composées : le coefficient de rééquilibrage est EXPLIQUÉ (décisions de David
 * du 2026-10-13, PR 2 de `.intégrer`).
 *
 * Avant : `∫ e^{2x} dx` annonçait « forme u′e^u, primitive e^u » et écrivait
 * ½e^{2x} sans dire d'où venait le ½. Désormais une étape de réécriture
 * « On fait apparaître u′ » écrit `e^{2x} = \dfrac12 \times 2e^{2x}` et sort la
 * constante ; la forme u′e^u s'applique alors EXACTEMENT à `2e^{2x}`.
 * Même principe pour sin, cos, ln, la puissance, le signe (`e^{-x} = -(-e^{-x})`).
 * Quand u′ = 1 (`\frac3x`, `3(x+1)^2`), il n'y a pas de u′ à faire apparaître :
 * l'étape dit « On sort la constante k » (« On sort le signe − » pour k = −1),
 * décision de David du 2026-10-13.
 *
 * Et deux corrections de rédaction :
 * - `\ln|u|` s'écrit `\ln\left| u \right|` (plus de `\ln\left( \left| u \right| \right)`),
 *   et `\ln u` sans valeur absolue quand u > 0 est CERTAIN (`x^2+1` ; intégrale
 *   définie sur un intervalle où u > 0) ;
 * - « F(borne haute) − F(borne basse) » devient « F(b) − F(a) », juste même
 *   quand a > b ; avec une borne nommée a ou b, les bornes elles-mêmes.
 */

import { describe, expect, it } from 'vitest';
import { parseLatex } from '../../parser';
import type { RenderedStep } from '../../common/step-renderer-base';
import type { Verbosity } from '../../common/verbosity';
import { generatePedagogicalIntegrationSteps, PedagogicalIntegrationRenderer } from '..';

// =============================================================================
// Décor
// =============================================================================

function flatten(steps: readonly RenderedStep[]): RenderedStep[] {
	return steps.flatMap((step) => [step, ...flatten(step.subSteps ?? [])]);
}

function render(
	latex: string,
	verbosity: Verbosity = 'detailed',
	bounds?: readonly [string, string],
	level: 'lycee' | 'superieur' = 'lycee'
): RenderedStep[] {
	const result = generatePedagogicalIntegrationSteps(parseLatex(latex), {
		level,
		...(bounds && { definite: { lower: parseLatex(bounds[0]), upper: parseLatex(bounds[1]) } })
	});
	return flatten(
		new PedagogicalIntegrationRenderer().renderAll(result.steps, {
			schoolLevel: level,
			verbosity
		})
	);
}

/** [intégrande, réécriture f = k × u′g(u), primitive écrite par la forme composée] */
const CASES: ReadonlyArray<readonly [string, string, string]> = [
	[
		'e^{2x}',
		'\\exponentialE^{2 x} = \\dfrac{1}{2} \\times 2 \\exponentialE^{2 x}',
		'\\dfrac{1}{2} \\exponentialE^{2 x}'
	],
	[
		'e^{-x}',
		'\\exponentialE^{-x} = -\\left( -\\exponentialE^{-x} \\right)',
		'-\\exponentialE^{-x}'
	],
	[
		'\\sin(2x)',
		'\\sin\\left( 2 x \\right) = \\dfrac{1}{2} \\times 2 \\sin\\left( 2 x \\right)',
		'-\\dfrac{1}{2} \\cos\\left( 2 x \\right)'
	],
	[
		'\\cos(3x+1)',
		'\\cos\\left( 3 x + 1 \\right) = \\dfrac{1}{3} \\times 3 \\cos\\left( 3 x + 1 \\right)',
		'\\dfrac{1}{3} \\sin\\left( 3 x + 1 \\right)'
	],
	[
		'xe^{x^2}',
		'x \\exponentialE^{x^2} = \\dfrac{1}{2} \\times 2 x \\exponentialE^{x^2}',
		'\\dfrac{1}{2} \\exponentialE^{x^2}'
	],
	[
		'\\frac{1}{2x+1}',
		'\\dfrac{1}{2 x + 1} = \\dfrac{1}{2} \\times \\dfrac{2}{2 x + 1}',
		'\\dfrac{1}{2} \\ln\\left| 2 x + 1 \\right|'
	],
	[
		'\\frac{x}{x^2+1}',
		'\\dfrac{x}{x^2 + 1} = \\dfrac{1}{2} \\times \\dfrac{2 x}{x^2 + 1}',
		'\\dfrac{1}{2} \\ln\\left( x^2 + 1 \\right)'
	],
	[
		'(2x+1)^3',
		'\\left( 2 x + 1 \\right)^3 = \\dfrac{1}{2} \\times 2 \\left( 2 x + 1 \\right)^3',
		'\\dfrac{1}{2} \\dfrac{\\left( 2 x + 1 \\right)^{3 + 1}}{3 + 1}'
	]
];

// =============================================================================
// L'étape « On fait apparaître u′ »
// =============================================================================

describe('composée à coefficient : une étape de réécriture le fait apparaître', () => {
	it.each(CASES)('∫ %s dx : réécriture %s', (integrand, rewrite) => {
		const steps = render(integrand);
		const reveal = steps.find((s) => s.rule === 'reveal-derivative');
		expect(reveal).toBeDefined();
		expect(reveal!.title).toBe("On fait apparaître $u'$");
		// L'égalité est écrite, en maths, dans l'explication
		expect(reveal!.explanation).toContain(`$${rewrite}$`);
		// La ligne de calcul réécrit l'intégrande sous l'intégrale
		const [, right] = rewrite.split(' = ');
		expect(reveal!.expressionLatex).toContain(right);
		expect(reveal!.expressionLatex).not.toMatch(/\\int -/);
	});

	it.each(CASES)(
		'∫ %s dx : la forme composée suit (réécriture %s, primitive %s)',
		(integrand, _r, F) => {
			const steps = render(integrand);
			const index = steps.findIndex((s) => s.rule === 'reveal-derivative');
			const composite = steps[index + 1];
			expect(composite.rule).toMatch(/^apply-composite-/);
			expect(composite.expressionLatex).toContain(`= ${F}`);
		}
	);

	it.each(CASES)(
		'∫ %s dx (résumé) : la réécriture reste, seule l’explication part',
		(integrand) => {
			const detailed = render(integrand, 'detailed');
			const summarized = render(integrand, 'summarized');
			expect(summarized.map((s) => s.title)).toEqual(detailed.map((s) => s.title));
			expect(summarized.map((s) => s.expressionLatex)).toEqual(
				detailed.map((s) => s.expressionLatex)
			);
			expect(summarized.every((s) => s.explanation === undefined)).toBe(true);
			expect(summarized.some((s) => s.rule === 'reveal-derivative')).toBe(true);
		}
	);

	it('forme exacte u′g(u) (`2e^{2x}`) : pas de réécriture', () => {
		expect(render('2e^{2x}').some((s) => s.rule === 'reveal-derivative')).toBe(false);
		expect(render('\\frac{2x}{x^2+1}').some((s) => s.rule === 'reveal-derivative')).toBe(false);
	});

	it('IPP `xe^{2x}` : v = ½e^{2x} est expliqué sous le choix de u et dv', () => {
		const steps = render('xe^{2x}');
		const reveals = steps.filter((s) => s.rule === 'reveal-derivative');
		// v = ∫e^{2x}dx, puis ∫ ½e^{2x} dx
		expect(reveals.length).toBe(2);
	});
});

// =============================================================================
// u′ = 1 : on sort la constante (décision de David du 2026-10-13)
// =============================================================================

/** [intégrande, titre, égalité de l'explication, ligne finale du calcul, primitive] */
const CONSTANT_CASES: ReadonlyArray<readonly [string, string, string, string, string]> = [
	[
		'\\frac3x',
		'On sort la constante $3$',
		'\\int \\dfrac{3}{x}\\,dx = 3 \\int \\dfrac{1}{x}\\,dx',
		'= 3 \\int \\dfrac{1}{x}\\,dx',
		'3 \\ln\\left| x \\right|'
	],
	[
		'3(x+1)^2',
		'On sort la constante $3$',
		'\\int 3 \\left( x + 1 \\right)^2\\,dx = 3 \\int \\left( x + 1 \\right)^2\\,dx',
		'= 3 \\int \\left( x + 1 \\right)^2\\,dx',
		'3 \\dfrac{\\left( x + 1 \\right)^{2 + 1}}{2 + 1}'
	],
	[
		'\\frac{-2}{x}',
		'On sort la constante $-2$',
		'\\int \\dfrac{-2}{x}\\,dx = -2 \\int \\dfrac{1}{x}\\,dx',
		'= -2 \\int \\dfrac{1}{x}\\,dx',
		'-2 \\ln\\left| x \\right|'
	],
	[
		'\\frac{-1}{x}',
		'On sort le signe $-$',
		'\\int \\dfrac{-1}{x}\\,dx = -\\int \\dfrac{1}{x}\\,dx',
		'= -\\int \\dfrac{1}{x}\\,dx',
		'-\\ln\\left| x \\right|'
	]
];

describe('u′ = 1 : l’étape sort la constante, sans « faire apparaître u′ »', () => {
	const levels = ['lycee', 'superieur'] as const;

	describe.each(levels)('niveau %s', (level) => {
		it.each(CONSTANT_CASES)(
			'∫ %s dx : « %s »',
			(integrand, title, equality, lastLine, primitive) => {
				const steps = render(integrand, 'detailed', undefined, level);
				const index = steps.findIndex((s) => s.rule === 'reveal-derivative');
				expect(index).toBeGreaterThan(-1);
				const step = steps[index];
				expect(step.title).toBe(title);
				expect(step.explanation).toContain(`$${equality}$`);
				expect(`${step.title} ${step.explanation}`).not.toContain("u'");
				// Le calcul : l'intégrale, puis la constante sortie — pas de « k × … »
				expect(step.expressionLatex).toContain(lastLine);
				expect(step.expressionLatex).not.toContain('\\times');
				expect(step.expressionLatex).not.toMatch(/\\int -/);
				// La forme composée suit, au même coefficient
				const composite = steps[index + 1];
				expect(composite.rule).toMatch(/^apply-composite-/);
				expect(composite.expressionLatex).toContain(`= ${primitive}`);
			}
		);

		it.each(CONSTANT_CASES)('∫ %s dx (résumé) : même titre, même calcul', (integrand, title) => {
			const detailed = render(integrand, 'detailed', undefined, level);
			const summarized = render(integrand, 'summarized', undefined, level);
			const step = summarized.find((s) => s.rule === 'reveal-derivative');
			expect(step?.title).toBe(title);
			expect(step?.explanation).toBeUndefined();
			expect(summarized.map((s) => s.expressionLatex)).toEqual(
				detailed.map((s) => s.expressionLatex)
			);
		});
	});

	// Un intégrande qui commence par un signe va entre parenthèses sous \int,
	// produit compris (`-3\sin(x+2)`), comme une fraction ou un opposé
	it.each(['-3\\sin(x+2)', '-3e^x', '-2x^2'])('∫ %s dx : jamais `\\int -`', (integrand) => {
		for (const level of levels) {
			for (const step of render(integrand, 'detailed', undefined, level)) {
				expect(step.expressionLatex ?? '').not.toMatch(/\\int -/);
			}
		}
		const first = render(integrand)[0];
		expect(first.expressionLatex).toContain('\\int \\left( -');
	});

	it.each(['e^{2x}', '\\frac{x}{x^2+1}'])(
		'u′ ≠ 1 (∫ %s dx) : toujours « On fait apparaître $u′$ »',
		(integrand) => {
			const step = render(integrand).find((s) => s.rule === 'reveal-derivative');
			expect(step?.title).toBe("On fait apparaître $u'$");
			expect(step?.explanation).toContain("pour faire apparaître $u'$");
			expect(step?.expressionLatex).toContain('\\times');
		}
	);
});

// =============================================================================
// ln|u| et ln u
// =============================================================================

describe('logarithme : |u| général, u sans valeur absolue quand u > 0 est certain', () => {
	const all = (steps: readonly RenderedStep[]): string =>
		steps.map((s) => `${s.title} ${s.explanation ?? ''} ${s.expressionLatex ?? ''}`).join('\n');

	it('jamais de parenthèses doublées `\\ln\\left( \\left|`', () => {
		for (const integrand of ['\\frac{1}{x}', '\\frac{1}{2x+1}', '\\frac{3}{x}']) {
			expect(all(render(integrand))).not.toContain('\\ln\\left( \\left|');
		}
	});

	it('`\\frac{2x}{x^2+1}` : ln(x² + 1), sans valeur absolue', () => {
		const text = all(render('\\frac{2x}{x^2+1}'));
		expect(text).toContain('\\ln\\left( x^2 + 1 \\right)');
		expect(text).not.toContain('\\left|');
	});

	it('`\\frac{1}{x}` en primitive : ln|x|', () => {
		expect(all(render('\\frac{1}{x}'))).toContain('\\ln\\left| x \\right|');
	});

	it('`\\frac{1}{x}` de 1 à e : ln x, sans valeur absolue', () => {
		const text = all(render('\\frac{1}{x}', 'detailed', ['1', 'e']));
		expect(text).toContain('\\ln\\left( x \\right)');
		expect(text).not.toContain('\\left|');
	});

	it('`\\frac{1}{x}` de e à 1 : l’intervalle de la phrase dans l’ordre, [1 ; e]', () => {
		const text = all(render('\\frac{1}{x}', 'detailed', ['e', '1']));
		expect(text).toContain('$\\left[ 1 ; \\exponentialE \\right]$');
		expect(text).not.toContain('\\left[ \\exponentialE ; 1 \\right]');
	});

	it('`\\frac{1}{x}` de −2 à −1 : ln|x| (u < 0)', () => {
		expect(all(render('\\frac{1}{x}', 'detailed', ['-2', '-1']))).toContain('\\left|');
	});
});

// =============================================================================
// F(b) − F(a)
// =============================================================================

describe('évaluation aux bornes : F(b) − F(a)', () => {
	const substitute = (latex: string, bounds: readonly [string, string]) =>
		render(latex, 'detailed', bounds).find((s) => s.rule === 'substitute-bounds')!;

	it('`x^2` de 0 à 1 : F(b) − F(a)', () => {
		const step = substitute('x^2', ['0', '1']);
		expect(step.explanation).toContain('$F(b) - F(a)$');
		expect(step.explanation).not.toContain('borne haute');
	});

	it('bornes renversées (de 1 à 0) : toujours F(b) − F(a)', () => {
		expect(substitute('x^2', ['1', '0']).explanation).toContain('$F(b) - F(a)$');
	});

	it('une borne nommée a : les bornes elles-mêmes, pas de collision', () => {
		const step = substitute('x', ['0', 'a']);
		expect(step.explanation).toContain('$F(a) - F(0)$');
		expect(step.explanation).not.toContain('F(b)');
	});
});
