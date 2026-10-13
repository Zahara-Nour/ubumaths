/**
 * IPP : notation de terminale au lycée, notation du supérieur au supérieur
 * (décision de David du 2026-10-13, PR 3 de `.intégrer`).
 *
 * Avant, le lycée rédigeait l'intégration par parties en notation du
 * supérieur : « $\int u\,dv = uv - \int v\,du$ », « Choix : u = x, dv = e^x »
 * (dv sans dx). Désormais, au lycée :
 * - la formule s'écrit avec u et v′ :
 *   $\int u(x)v'(x)\,dx = u(x)v(x) - \int u'(x)v(x)\,dx$ ; pour une intégrale
 *   définie, la version avec bornes
 *   $\int_a^b u(x)v'(x)\,dx = \left[u(x)v(x)\right]_a^b - \int_a^b u'(x)v(x)\,dx$
 *   est énoncée, puis la version primitive qui sert au calcul ;
 * - le choix se dit « On pose $u(x) = …$ et $v'(x) = …$, donc $u'(x) = …$ et
 *   $v(x) = …$ » ;
 * - les sous-étapes « On fait apparaître u′ » du v à coefficient (#1329)
 *   restent ; l'IPP cyclique suit la même notation.
 * Au supérieur, rien ne change.
 */

import { describe, expect, it } from 'vitest';
import { parseLatex } from '../../parser';
import { compile } from '../../eval/compile';
import type { RenderedStep } from '../../common/step-renderer-base';
import type { Verbosity } from '../../common/verbosity';
import {
	generatePedagogicalIntegrationSteps,
	PedagogicalIntegrationRenderer,
	type IntegrationSchoolLevel
} from '..';

// =============================================================================
// Décor
// =============================================================================

function flatten(steps: readonly RenderedStep[]): RenderedStep[] {
	return steps.flatMap((step) => [step, ...flatten(step.subSteps ?? [])]);
}

function render(
	latex: string,
	level: IntegrationSchoolLevel,
	verbosity: Verbosity,
	bounds?: readonly [string, string]
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

const IPP_RULES = new Set(['identify-parts', 'choose-u-dv', 'apply-parts-formula']);

/** Titres et explications des étapes d'IPP */
function ippTexts(steps: readonly RenderedStep[]): string[] {
	return steps.filter((s) => IPP_RULES.has(s.rule)).flatMap((s) => [s.title, s.explanation ?? '']);
}

const PRIMITIVE_FORMULA = "$\\int u(x)v'(x)\\,dx = u(x)v(x) - \\int u'(x)v(x)\\,dx$";
const BOUNDED_FORMULA =
	"$\\int_a^b u(x)v'(x)\\,dx = \\left[u(x)v(x)\\right]_a^b - \\int_a^b u'(x)v(x)\\,dx$";

/** Intégrande, bornes éventuelles */
interface IppCase {
	readonly latex: string;
	readonly bounds?: readonly [string, string];
}

const CASES: readonly IppCase[] = [
	{ latex: 'xe^x', bounds: ['0', '1'] },
	{ latex: '\\ln x', bounds: ['1', 'e'] },
	{ latex: 'x\\ln x' },
	{ latex: 'x^2e^x' },
	{ latex: 'xe^{2x}' },
	{ latex: 'e^x\\sin x' }
];

// =============================================================================
// Lycée : u et v′
// =============================================================================

describe('IPP au lycée : notation de terminale (u et v′)', () => {
	describe.each(['detailed', 'summarized'] as const)('%s', (verbosity) => {
		it.each(CASES)('$latex : ni dv, ni du, ni « uv − ∫ v du »', ({ latex, bounds }) => {
			const texts = ippTexts(render(latex, 'lycee', verbosity, bounds));
			expect(texts.length).toBeGreaterThan(0);
			for (const text of texts) {
				expect(text).not.toMatch(/\bdv\b|\bdu\b/);
				expect(text).not.toContain('\\int u\\,dv');
			}
		});

		it.each(CASES)('$latex : chaque choix nomme u(x) et v′(x)', ({ latex, bounds }) => {
			const chooses = render(latex, 'lycee', verbosity, bounds).filter(
				(s) => s.rule === 'choose-u-dv'
			);
			expect(chooses.length).toBeGreaterThan(0);
			for (const choose of chooses) {
				expect(choose.title).toMatch(/\$u\(x\) = .+\$, \$v'\(x\) = .+\$/);
			}
		});

		it.each(CASES)(
			'$latex : la formule appliquée est la version primitive',
			({ latex, bounds }) => {
				const applies = render(latex, 'lycee', verbosity, bounds).filter(
					(s) => s.rule === 'apply-parts-formula'
				);
				expect(applies.length).toBeGreaterThan(0);
				for (const apply of applies) expect(apply.title).toContain(PRIMITIVE_FORMULA);
			}
		);
	});

	it('xe^x de 0 à 1 : « On pose u(x) = x et v′(x) = e^x, donc u′(x) = 1 et v(x) = e^x »', () => {
		const choose = render('xe^x', 'lycee', 'detailed', ['0', '1']).find(
			(s) => s.rule === 'choose-u-dv'
		);
		expect(choose?.title).toBe("Choix : $u(x) = x$, $v'(x) = \\exponentialE^x$");
		expect(choose?.explanation).toBe(
			"On pose $u(x) = x$ et $v'(x) = \\exponentialE^x$, donc $u'(x) = 1$ et $v(x) = \\exponentialE^x$."
		);
	});

	it('\\ln x : u(x) = ln x, v′(x) = 1, donc u′(x) = 1/x et v(x) = x', () => {
		const choose = render('\\ln x', 'lycee', 'detailed', ['1', 'e']).find(
			(s) => s.rule === 'choose-u-dv'
		);
		expect(choose?.explanation).toBe(
			"On pose $u(x) = \\ln\\left( x \\right)$ et $v'(x) = 1$, donc $u'(x) = \\dfrac{1}{x}$ et $v(x) = x$."
		);
	});

	it.each([
		['xe^x', ['0', '1']],
		['\\ln x', ['1', 'e']]
	] as const)(
		'%s définie : la formule avec bornes, puis la version primitive qui sert au calcul',
		(latex, bounds) => {
			const identify = render(latex, 'lycee', 'detailed', bounds).find(
				(s) => s.rule === 'identify-parts'
			);
			expect(identify?.explanation).toContain(BOUNDED_FORMULA);
			expect(identify?.explanation).toContain(PRIMITIVE_FORMULA);
		}
	);

	it.each([['x\\ln x'], ['x^2e^x'], ['xe^{2x}'], ['e^x\\sin x']])(
		'%s primitive : la seule version primitive, sans bornes',
		(latex) => {
			const identifies = render(latex, 'lycee', 'detailed').filter(
				(s) => s.rule === 'identify-parts'
			);
			expect(identifies.length).toBeGreaterThan(0);
			for (const identify of identifies) {
				expect(identify.explanation).toContain(PRIMITIVE_FORMULA);
				expect(identify.explanation).not.toContain('\\int_a^b');
			}
		}
	);

	it('x²e^x de 0 à 1 : la formule avec bornes une seule fois (pas dans l’IPP imbriquée)', () => {
		const identifies = render('x^2e^x', 'lycee', 'detailed', ['0', '1']).filter(
			(s) => s.rule === 'identify-parts'
		);
		expect(identifies).toHaveLength(2);
		expect(identifies[0].explanation).toContain(BOUNDED_FORMULA);
		expect(identifies[1].explanation).not.toContain('\\int_a^b');
	});

	it('xe^{2x} : le v à coefficient garde sa sous-étape « On fait apparaître u′ »', () => {
		const result = generatePedagogicalIntegrationSteps(parseLatex('xe^{2x}'), { level: 'lycee' });
		const rendered = new PedagogicalIntegrationRenderer().renderAll(result.steps, {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		const choose = rendered.find((s) => s.rule === 'choose-u-dv');
		expect(choose?.subSteps?.map((s) => s.rule)).toContain('reveal-derivative');
		expect(choose?.explanation).toBe(
			"On pose $u(x) = x$ et $v'(x) = \\exponentialE^{2 x}$, donc $u'(x) = 1$ et $v(x) = \\dfrac{1}{2} \\exponentialE^{2 x}$."
		);
	});

	it('e^x sin x (IPP cyclique) : les deux choix en u et v′', () => {
		const chooses = render('e^x\\sin x', 'lycee', 'detailed').filter(
			(s) => s.rule === 'choose-u-dv'
		);
		expect(chooses.map((s) => s.explanation)).toEqual([
			"On pose $u(x) = \\exponentialE^x$ et $v'(x) = \\sin\\left( x \\right)$, donc $u'(x) = \\exponentialE^x$ et $v(x) = -\\cos\\left( x \\right)$.",
			"On pose $u(x) = \\exponentialE^x$ et $v'(x) = \\cos\\left( x \\right)$, donc $u'(x) = \\exponentialE^x$ et $v(x) = \\sin\\left( x \\right)$."
		]);
	});
});

// =============================================================================
// Supérieur : inchangé
// =============================================================================

describe('IPP au supérieur : notation inchangée (u, dv)', () => {
	it('xe^x de 0 à 1 : titres et explications d’avant', () => {
		const steps = render('xe^x', 'superieur', 'detailed', ['0', '1']);
		const byRule = (rule: string) => steps.find((s) => s.rule === rule);
		expect(byRule('identify-parts')?.title).toBe('$\\int u\\,dv$');
		expect(byRule('identify-parts')?.explanation).toBe(
			"L'intégration par parties s'utilise pour intégrer un produit : $\\int u\\,dv = uv - \\int v\\,du$."
		);
		expect(byRule('choose-u-dv')?.title).toBe('$u = x,\\ dv = \\exponentialE^x$');
		expect(byRule('choose-u-dv')?.explanation).toBe(
			"On pose $u = x$ et $dv = \\exponentialE^x$, d'où $du = dx$ et $v = \\exponentialE^x$."
		);
		expect(byRule('apply-parts-formula')?.title).toBe('$\\int u\\,dv = uv - \\int v\\,du$');
		expect(byRule('apply-parts-formula')?.explanation).toBe(
			"On applique la formule $\\int u\\,dv = uv - \\int v\\,du$, puis on calcule l'intégrale restante."
		);
	});

	describe.each(['detailed', 'summarized'] as const)('%s', (verbosity) => {
		it.each(CASES)('$latex : u et dv, jamais v′(x)', ({ latex, bounds }) => {
			const steps = render(latex, 'superieur', verbosity, bounds);
			const chooses = steps.filter((s) => s.rule === 'choose-u-dv');
			expect(chooses.length).toBeGreaterThan(0);
			for (const choose of chooses) expect(choose.title).toMatch(/dv = /);
			for (const text of ippTexts(steps)) expect(text).not.toContain("v'(x)");
		});
	});
});

// =============================================================================
// IPP cyclique en intégrale définie
// =============================================================================

describe('IPP cyclique définie : ∫₀^π eˣ sin x dx', () => {
	const bounds = ['0', '\\pi'] as const;

	it('valeur (e^π + 1)/2', () => {
		const result = generatePedagogicalIntegrationSteps(parseLatex('e^x\\sin x'), {
			level: 'lycee',
			definite: { lower: parseLatex(bounds[0]), upper: parseLatex(bounds[1]) }
		});
		expect(result.value).toBeDefined();
		expect(compile(result.value!)({})).toBeCloseTo((Math.exp(Math.PI) + 1) / 2, 9);
	});

	it('lycée : formule avec bornes annoncée, deux choix en u(x) et v′(x), ni dv ni du', () => {
		const steps = render('e^x\\sin x', 'lycee', 'detailed', bounds);
		const identify = steps.find((s) => s.rule === 'identify-parts');
		expect(identify?.explanation).toContain(BOUNDED_FORMULA);
		const chooses = steps.filter((s) => s.rule === 'choose-u-dv');
		expect(chooses).toHaveLength(2);
		for (const choose of chooses) expect(choose.explanation).toMatch(/^On pose \$u\(x\) = /);
		for (const text of ippTexts(steps)) expect(text).not.toMatch(/\bdv\b|\bdu\b/);
		expect(steps.map((s) => s.rule)).toContain('simplify-bounds-result');
	});

	it('supérieur : u et dv', () => {
		const chooses = render('e^x\\sin x', 'superieur', 'detailed', bounds).filter(
			(s) => s.rule === 'choose-u-dv'
		);
		expect(chooses).toHaveLength(2);
		for (const choose of chooses) expect(choose.title).toMatch(/dv = /);
	});
});
