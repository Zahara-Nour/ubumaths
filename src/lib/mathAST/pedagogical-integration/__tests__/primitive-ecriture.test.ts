/**
 * L'écriture de la primitive que voit l'élève (décisions de David du 2026-10-11)
 *
 * Les primitives étaient justes mais mal écrites : `0.5 \exp(2x)`,
 * `3\dfrac{x^3}{3}+2\dfrac{x^2}{2}+x`, `\ln(x)\,x - x`. Contrat :
 * - la primitive FINALE (dernière étape) est écrite simplement ;
 * - l'étape brute d'avant reste (la méthode se voit), puis « On simplifie » ;
 * - coefficients exacts (jamais `0.5` ni `0.333…`), `e^{u}` jamais `\exp(u)` ;
 * - les étapes « Intégration par parties » / « Choix de u et dv » montrent
 *   l'intégrale seule, sans un faux `= <intégrande>` ;
 * - VALEUR : F′ = f à chaque étape (aucune réécriture ne change la primitive).
 *
 * Écriture réelle de `toLatex` : la constante d'Euler s'écrit
 * `\exponentialE` (MathLive l'affiche `e`), `\ln x` s'écrit
 * `\ln\left( x \right)`. Dans les étapes, `\ln\lvert u\rvert` s'écrit
 * `\ln\left| u \right|` (décision de David du 2026-10-13 : plus de
 * `\ln\left( \left| u \right| \right)`, parenthèses doublées).
 */
import { describe, expect, it } from 'vitest';
import { containsVariable } from '../../common/contains-variable';
import { extractExactRational } from '../../common/numeric';
import type { RenderedStep } from '../../common/step-renderer-base';
import type { Verbosity } from '../../common/verbosity';
import { differentiate } from '../../differentiation';
import { flattenProductShallow } from '../../flatten';
import { areEquivalent } from '../../equivalence';
import { compile } from '../../eval/compile';
import { toLatex as toLatexSafe } from '../../latex-generator';
import { findNodes } from '../../transforms';
import { parseLatex } from '../../parser';
import type { MathNode } from '../../types';
import { generatePedagogicalIntegrationSteps, PedagogicalIntegrationRenderer } from '..';
import type { IntegrationSchoolLevel, PedagogicalIntegrationStep } from '..';

const renderer = new PedagogicalIntegrationRenderer();
const LEVELS: readonly IntegrationSchoolLevel[] = ['lycee', 'superieur'];
const VERBOSITIES: readonly Verbosity[] = ['summarized', 'detailed'];

/** Points d'évaluation : x > 0 et loin des pôles (2x + 1 = 0, x³ = 7). */
const POINTS = [0.3, 0.8, 1.4, 2.6];

interface Case {
	readonly integrand: string;
	/** Primitive finale attendue, dans l'écriture réelle de `toLatex`. */
	readonly expected: string;
}

// Tableau des attendus du journal docs/wip/primitive-ecriture-progress.md
const DEMO_CASES: readonly Case[] = [
	{ integrand: 'e^{2x}', expected: '\\dfrac{1}{2} \\exponentialE^{2 x}' },
	{ integrand: 'e^{3x + 1}', expected: '\\dfrac{1}{3} \\exponentialE^{3 x + 1}' },
	{
		integrand: '\\dfrac{1}{2x + 1}',
		expected: '\\dfrac{1}{2} \\ln\\left| 2 x + 1 \\right|'
	},
	{ integrand: '5 e^x', expected: '5 \\exponentialE^x' },
	{ integrand: '2x e^{x^2}', expected: '\\exponentialE^{x^2}' },
	{ integrand: '3x^2 + 2x + 1', expected: 'x^3 + x^2 + x' },
	{ integrand: '\\dfrac{x}{4}', expected: '\\dfrac{x^2}{8}' },
	{ integrand: 'x \\sin(x)', expected: '\\sin\\left( x \\right) - x \\cos\\left( x \\right)' },
	{ integrand: '\\ln(x)', expected: 'x \\ln\\left( x \\right) - x' },
	{
		integrand: '3 \\sin(x) + 2 \\cos(x)',
		// ordre de `tidy` gardé (décision de David du 2026-10-11)
		expected: '2 \\sin\\left( x \\right) - 3 \\cos\\left( x \\right)'
	}
];

// Cas lycée courants traités par le moteur
const LYCEE_CASES: readonly Case[] = [
	{ integrand: '\\dfrac{1}{x}', expected: '\\ln\\left| x \\right|' },
	{ integrand: 'e^{-x}', expected: '-\\exponentialE^{-x}' },
	{ integrand: '4e^{-2x}', expected: '-2 \\exponentialE^{-2 x}' },
	{ integrand: '\\cos(2x)', expected: '\\dfrac{1}{2} \\sin\\left( 2 x \\right)' },
	{
		integrand: '\\sin(3x + 1)',
		expected: '-\\dfrac{1}{3} \\cos\\left( 3 x + 1 \\right)'
	},
	{ integrand: '(2x + 1)^3', expected: '\\dfrac{\\left( 2 x + 1 \\right)^4}{8}' }
];

const ALL_CASES = [...DEMO_CASES, ...LYCEE_CASES];

/** Toutes les étapes rendues, sous-étapes comprises, à plat. */
function flatten(steps: readonly RenderedStep[]): RenderedStep[] {
	return steps.flatMap((s) => [s, ...flatten(s.subSteps ?? [])]);
}

function flattenRaw(steps: readonly PedagogicalIntegrationStep[]): PedagogicalIntegrationStep[] {
	return steps.flatMap((s) => [s, ...flattenRaw(s.subSteps ?? [])]);
}

/** La primitive écrite dans la DERNIÈRE étape rendue. */
function finalPrimitiveLatex(rendered: readonly RenderedStep[]): string {
	const last = rendered.at(-1);
	const latex = last?.expressionLatex ?? '';
	if (last?.rule === 'add-constant') {
		const m = /^\\textcolor\{blue\}\{(.*) \+ C\}$/s.exec(latex);
		return m ? m[1] : latex;
	}
	const afterEquals = latex.slice(latex.lastIndexOf('= ') + 2);
	return afterEquals.replace(/\s*\\end\{aligned\}\s*$/, '').trim();
}

function run(integrand: string, level: IntegrationSchoolLevel, verbosity: Verbosity) {
	const result = generatePedagogicalIntegrationSteps(parseLatex(integrand), {
		level,
		verbosity
	});
	const rendered = renderer.renderAll(result.steps, { schoolLevel: level, verbosity });
	return { result, rendered };
}

/** F′ = f numériquement (différence finie centrée). */
function expectDerivativeMatches(F: MathNode, integrand: string): void {
	const f = compile(parseLatex(integrand));
	const Fc = compile(F);
	const h = 1e-5;
	for (const x of POINTS) {
		const slope = (Fc({ x: x + h }) - Fc({ x: x - h })) / (2 * h);
		expect(slope).toBeCloseTo(f({ x }), 4);
	}
}

const METHOD_EXCLUDED = new Set([
	'identify-integrand',
	'identify-definite-integral',
	'simplify-result',
	'add-constant'
]);

describe('écriture de la primitive finale', () => {
	for (const level of LEVELS) {
		it.each(ALL_CASES)(
			`${level} — ∫ $integrand dx s'écrit $expected`,
			({ integrand, expected }) => {
				const { result, rendered } = run(integrand, level, 'summarized');
				expect(finalPrimitiveLatex(rendered)).toBe(expected);
				expect(result.antiderivative).toBeDefined();
			}
		);
	}
});

describe('la méthode reste visible avant « On simplifie »', () => {
	it.each(ALL_CASES)('∫ $integrand dx', ({ integrand }) => {
		const { rendered } = run(integrand, 'lycee', 'summarized');
		// Au moins une étape de méthode (règle, forme composée, IPP, linéarité…)
		expect(rendered.some((s) => !METHOD_EXCLUDED.has(s.rule))).toBe(true);
		const simplifyIndex = rendered.findIndex((s) => s.rule === 'simplify-result');
		if (simplifyIndex !== -1) {
			expect(METHOD_EXCLUDED.has(rendered[simplifyIndex - 1].rule)).toBe(false);
			expect(rendered[simplifyIndex].title).toBe('On simplifie');
		}
	});

	it('∫ 3x^2 + 2x + 1 dx : la ligne brute est gardée, puis simplifiée', () => {
		const { rendered } = run('3x^2 + 2x + 1', 'lycee', 'summarized');
		const simplify = rendered.find((s) => s.rule === 'simplify-result');
		expect(simplify?.expressionLatex).toContain('\\dfrac{x^3}{3}');
		expect(simplify?.expressionLatex).toContain('= x^3 + x^2 + x');
	});
});

describe('rien à simplifier : pas d’étape « On simplifie »', () => {
	it.each([
		'e^{2x}',
		'e^{3x + 1}',
		'\\dfrac{1}{2x + 1}',
		'\\cos(2x)',
		'\\sin(3x + 1)',
		'5 e^x',
		'e^{-x}'
	])('∫ %s dx', (integrand) => {
		const { rendered } = run(integrand, 'lycee', 'summarized');
		expect(rendered.some((s) => s.rule === 'simplify-result')).toBe(false);
	});

	it.each(['\\dfrac{x}{4}', '(2x + 1)^3', '3x^2 + 2x + 1'])(
		'∫ %s dx : un coefficient pas encore calculé garde l’étape',
		(integrand) => {
			const { rendered } = run(integrand, 'lycee', 'summarized');
			expect(rendered.some((s) => s.rule === 'simplify-result')).toBe(true);
		}
	);
});

describe('ni \\exp, ni nombre décimal, ni faux « = » d’IPP, dans aucune étape', () => {
	for (const level of LEVELS) {
		for (const verbosity of VERBOSITIES) {
			it.each(ALL_CASES)(`${level}/${verbosity} — ∫ $integrand dx`, ({ integrand }) => {
				const { rendered } = run(integrand, level, verbosity);
				for (const step of flatten(rendered)) {
					const text = `${step.title} ${step.explanation ?? ''} ${step.expressionLatex ?? ''}`;
					// `\exponentialE` (la constante e) est permis, pas `\exp(…)`
					expect(text).not.toMatch(/\\exp(?!onentialE)/);
					expect(text).not.toMatch(/\d\.\d/);
					if (step.rule === 'identify-parts' || step.rule === 'choose-u-dv') {
						expect(step.expressionLatex ?? '').not.toMatch(/=/);
					}
				}
			});
		}
	}
});

describe('F′ = f : aucune réécriture ne change la valeur', () => {
	it.each(ALL_CASES)('∫ $integrand dx', ({ integrand }) => {
		const { result } = run(integrand, 'lycee', 'summarized');
		expectDerivativeMatches(result.antiderivative, integrand);
		// Les deux côtés de « On simplifie » : la ligne brute et la ligne rangée
		for (const step of flattenRaw(result.steps)) {
			if (step.rule === 'simplify-result') {
				expectDerivativeMatches(step.before, integrand);
				expectDerivativeMatches(step.after, integrand);
			}
		}
	});
});

// =============================================================================
// Revue du 2026-10-11
// =============================================================================

interface DefiniteCase {
	readonly integrand: string;
	readonly lower: string;
	readonly upper: string;
	/** Valeur calculée à la main. */
	readonly value: number;
}

const DEFINITE_CASES: readonly DefiniteCase[] = [
	{ integrand: 'e^{2x}', lower: '0', upper: '1', value: (Math.E ** 2 - 1) / 2 },
	{ integrand: '2x e^{x^2}', lower: '0', upper: '1', value: Math.E - 1 },
	{ integrand: 'e^{-x}', lower: '0', upper: '1', value: 1 - 1 / Math.E },
	{ integrand: 'e^x', lower: '0', upper: '\\ln(2)', value: 1 },
	{ integrand: 'e^x', lower: '0', upper: '1', value: Math.E - 1 },
	{ integrand: '\\dfrac{1}{2x + 1}', lower: '0', upper: '1', value: Math.log(3) / 2 },
	{ integrand: '\\sin(2x)', lower: '0', upper: '\\dfrac{\\pi}{2}', value: 1 }
];

/** Un exposant laissé non calculé : `^{2 \times 1}`, `^{1^2}`, `e^0`, `e^1`. */
const UNCOMPUTED_EXPONENT =
	/\^\{[^}]*(\\times|\^)[^}]*\}|\\exponentialE\^(0|1)(?![0-9])|\\exponentialE\^\{(0|1)\}/;

describe('intégrales définies : la valeur est calculée', () => {
	for (const level of LEVELS) {
		it.each(DEFINITE_CASES)(
			`${level} — ∫_{$lower}^{$upper} $integrand dx`,
			({ integrand, lower, upper, value }) => {
				const result = generatePedagogicalIntegrationSteps(parseLatex(integrand), {
					level,
					definite: { lower: parseLatex(lower), upper: parseLatex(upper) }
				});
				expect(result.value).toBeDefined();
				const valueNode = result.value as MathNode;
				expect(compile(valueNode)({})).toBeCloseTo(value, 9);
				const rendered = renderer.renderAll(result.steps, {
					schoolLevel: level,
					verbosity: 'summarized'
				});
				const last = rendered.at(-1);
				expect(last?.rule).toBe('simplify-bounds-result');
				const shown = (last?.expressionLatex ?? '').split('= ').at(-1) ?? '';
				expect(shown).not.toMatch(UNCOMPUTED_EXPONENT);
				expect(toLatexSafe(valueNode)).not.toMatch(UNCOMPUTED_EXPONENT);
			}
		);
	}

	it('∫_0^1 e^x dx vaut e − 1, écrit e - 1', () => {
		const result = generatePedagogicalIntegrationSteps(parseLatex('e^x'), {
			level: 'lycee',
			definite: { lower: parseLatex('0'), upper: parseLatex('1') }
		});
		expect(toLatexSafe(result.value as MathNode)).toBe('\\exponentialE - 1');
	});

	it('∫_0^1 2x e^{x^2} dx vaut e − 1, écrit e - 1', () => {
		const result = generatePedagogicalIntegrationSteps(parseLatex('2x e^{x^2}'), {
			level: 'lycee',
			definite: { lower: parseLatex('0'), upper: parseLatex('1') }
		});
		expect(toLatexSafe(result.value as MathNode)).toBe('\\exponentialE - 1');
	});
});

describe('IPP : chaque « = » affiché est vrai', () => {
	it.each(['x e^x', '\\ln(x)', 'x \\sin(x)', 'e^x \\sin(x)'])(
		'∫ %s dx : la formule garde l’intégrale restante',
		(integrand) => {
			for (const level of LEVELS) {
				const { rendered } = run(integrand, level, 'summarized');
				const formulas = rendered.filter((s) => s.rule === 'apply-parts-formula');
				expect(formulas.length).toBeGreaterThan(0);
				for (const step of formulas) {
					const latex = step.expressionLatex ?? '';
					// Après le premier « = » : uv − ∫ v du, l'intégrale restante écrite
					const rhs = latex.slice(latex.indexOf('= '));
					expect(rhs).toContain('\\int');
				}
			}
		}
	);
});

describe('coefficient non réduit : il y a quelque chose à simplifier', () => {
	it.each([
		['\\dfrac{2}{4} e^x', '\\dfrac{1}{2} \\exponentialE^x'],
		['\\dfrac{1}{1} \\sin(x)', '-\\cos\\left( x \\right)'],
		['\\dfrac{6}{3} \\cos(x)', '2 \\sin\\left( x \\right)']
	])('∫ %s dx s’écrit %s', (integrand, expected) => {
		const { rendered, result } = run(integrand, 'lycee', 'summarized');
		expect(finalPrimitiveLatex(rendered)).toBe(expected);
		expectDerivativeMatches(result.antiderivative, integrand);
	});
});

describe('« On simplifie » : une explication vraie même quand on ne fait que réordonner', () => {
	it('∫ \\ln x dx', () => {
		const { rendered } = run('\\ln(x)', 'lycee', 'detailed');
		const simplify = rendered.find((s) => s.rule === 'simplify-result');
		expect(simplify?.title).toBe('On simplifie');
		expect(simplify?.explanation).toBe('On écrit le résultat sous une forme simplifiée.');
	});
});

// =============================================================================
// Lot 4 de l'ADR 0024 (V17, V18) : l'exponentielle commune mise en facteur
// =============================================================================

/**
 * Décision de David du 2026-10-11 (journal moteur-factorisation §9) : quand
 * TOUS les termes de la primitive portent la même exponentielle e^{u},
 * « On simplifie » développe, puis met e^{u} en facteur, par les stratégies de
 * `factoriser` (pedagogical-simplify). Sans exponentielle commune : forme
 * développée et rangée, comme avant.
 */
const EXP_FACTOR_CASES: readonly Case[] = [
	{ integrand: 'x^2e^x', expected: '\\left( x^2 - 2 x + 2 \\right) \\exponentialE^x' },
	{ integrand: '3x^2e^x', expected: '3 \\left( x^2 - 2 x + 2 \\right) \\exponentialE^x' },
	{ integrand: 'xe^x', expected: '\\left( x - 1 \\right) \\exponentialE^x' },
	{ integrand: '3xe^x', expected: '3 \\left( x - 1 \\right) \\exponentialE^x' },
	{
		integrand: 'xe^{2x}',
		// coefficients fractionnaires : forme acceptée « pour l'instant » (§9)
		expected: '\\left( \\dfrac{x}{2} - \\dfrac{1}{4} \\right) \\exponentialE^{2 x}'
	},
	{
		integrand: 'e^x\\sin(x)',
		// V17 : la forme que donnent les stratégies (pas ½(sin x − cos x)eˣ)
		expected:
			'\\left( \\dfrac{\\sin\\left( x \\right)}{2} - \\dfrac{\\cos\\left( x \\right)}{2} \\right) \\exponentialE^x'
	},
	{ integrand: 'xe^{-x}', expected: '-\\left( x + 1 \\right) \\exponentialE^{-x}' },
	{
		integrand: '3xe^{-2x}',
		expected: '-\\left( \\dfrac{3 x}{2} + \\dfrac{3}{4} \\right) \\exponentialE^{-2 x}'
	},
	{
		integrand: 'x^3e^x',
		expected: '\\left( x^3 - 3 x^2 + 6 x - 6 \\right) \\exponentialE^x'
	},
	{ integrand: '(2x+1)e^x', expected: '\\left( 2 x - 1 \\right) \\exponentialE^x' }
];

/** F′ = f exactement : la dérivée de F est équivalente à l'intégrande. */
function expectExactDerivative(F: MathNode, integrand: string): void {
	const derivative = differentiate(F, { variable: 'x' });
	expect(areEquivalent(derivative, parseLatex(integrand))).toBe(true);
}

describe('exponentielle commune : développée puis mise en facteur', () => {
	for (const level of LEVELS) {
		it.each(EXP_FACTOR_CASES)(
			`${level} — ∫ $integrand dx s'écrit $expected`,
			({ integrand, expected }) => {
				const { result, rendered } = run(integrand, level, 'summarized');
				expect(finalPrimitiveLatex(rendered)).toBe(expected);
				expect(toLatexSafe(result.antiderivative)).toBe(expected);
				expectExactDerivative(result.antiderivative, integrand);
			}
		);
	}

	it.each(EXP_FACTOR_CASES)(
		'∫ $integrand dx : « On simplifie » part de la méthode, F′ = f des deux côtés',
		({ integrand }) => {
			const { result, rendered } = run(integrand, 'lycee', 'detailed');
			const simplify = rendered.find((s) => s.rule === 'simplify-result');
			expect(simplify?.title).toBe('On simplifie');
			expect(simplify?.explanation).toMatch(/en facteur/);
			const top = result.steps;
			const index = top.findIndex((s) => s.rule === 'simplify-result');
			expect(index).toBeGreaterThan(0);
			// Chaque étape part du résultat de la précédente
			expect(toLatexSafe(top[index].before)).toBe(toLatexSafe(top[index - 1].after));
			expect(toLatexSafe(top[index + 1].before)).toBe(toLatexSafe(top[index].after));
			expectExactDerivative(top[index].before, integrand);
			expectExactDerivative(top[index].after, integrand);
			const developed = top[index].bindings?.developed;
			if (developed) expectExactDerivative(developed, integrand);
		}
	);

	it('∫ x²eˣ dx : la ligne développée est montrée entre la brute et la factorisée', () => {
		const { rendered } = run('x^2e^x', 'lycee', 'summarized');
		const simplify = rendered.find((s) => s.rule === 'simplify-result');
		const latex = simplify?.expressionLatex ?? '';
		expect(latex).toContain(
			'x^2 \\exponentialE^x - 2 \\left( x \\exponentialE^x - \\exponentialE^x \\right)'
		);
		expect(latex).toContain('= x^2 \\exponentialE^x - 2 x \\exponentialE^x + 2 \\exponentialE^x');
		expect(latex).toContain('= \\left( x^2 - 2 x + 2 \\right) \\exponentialE^x');
	});

	it.each([
		['x \\cos(x)', 'x \\sin\\left( x \\right) + \\cos\\left( x \\right)'],
		['\\ln(x)', 'x \\ln\\left( x \\right) - x'],
		['3x \\cos(x)', '3 x \\sin\\left( x \\right) + 3 \\cos\\left( x \\right)']
	])('sans exponentielle commune, ∫ %s dx reste développée : %s', (integrand, expected) => {
		const { result, rendered } = run(integrand, 'lycee', 'detailed');
		expect(finalPrimitiveLatex(rendered)).toBe(expected);
		expectExactDerivative(result.antiderivative, integrand);
		const simplify = rendered.find((s) => s.rule === 'simplify-result');
		expect(simplify?.explanation ?? '').not.toMatch(/en facteur/);
	});

	it.each([
		['e^{2x}', '\\dfrac{1}{2} \\exponentialE^{2 x}'],
		['3e^{2x}', '\\dfrac{3}{2} \\exponentialE^{2 x}']
	])('un terme seul, ∫ %s dx, ne change pas : %s', (integrand, expected) => {
		const { rendered } = run(integrand, 'lycee', 'summarized');
		expect(finalPrimitiveLatex(rendered)).toBe(expected);
	});

	it.each([
		['x e^x', '0', '1', '1', 1],
		['x^2 e^x', '0', '1', '\\exponentialE - 2', Math.E - 2],
		['3x e^{2x}', '0', '1', null, (3 * (Math.E ** 2 + 1)) / 4]
	] as const)('∫ %s dx de %s à %s : valeur exacte %s', (integrand, lower, upper, latex, value) => {
		for (const level of LEVELS) {
			const result = generatePedagogicalIntegrationSteps(parseLatex(integrand), {
				level,
				definite: { lower: parseLatex(lower), upper: parseLatex(upper) }
			});
			const valueNode = result.value as MathNode;
			expect(compile(valueNode)({})).toBeCloseTo(value, 9);
			if (latex !== null) expect(toLatexSafe(valueNode)).toBe(latex);
			expect(toLatexSafe(valueNode)).not.toMatch(UNCOMPUTED_EXPONENT);
		}
	});
});

// =============================================================================
// Revue du lot 4 : le coefficient numérique devant, dans les lignes d'IPP
// =============================================================================

/** Un facteur qui COMMENCE par un nombre (`\\dfrac{1}{2}`, `-\\dfrac{1}{2}e^{u}`). */
function startsWithNumber(factor: MathNode): boolean {
	const inner =
		factor.type === 'opposite' || factor.type === 'delimiter'
			? factor.type === 'opposite'
				? factor.operand
				: factor.content
			: factor;
	if (inner !== factor) return startsWithNumber(inner);
	const first = flattenProductShallow(inner)[0]?.factor ?? inner;
	return !containsVariable(first, 'x') && extractExactRational(first) !== null;
}

/** Les produits où un nombre suit une lettre (`x \\dfrac{1}{2} e^{2x}`). */
function numbersAfterLetters(node: MathNode): string[] {
	return findNodes(node, (n) => n.type === 'multiplication')
		.filter((product) => {
			const factors = flattenProductShallow(product).map(({ factor }) => factor);
			const firstLetter = factors.findIndex((f) => containsVariable(f, 'x'));
			return firstLetter !== -1 && factors.slice(firstLetter + 1).some(startsWithNumber);
		})
		.map((product) => toLatexSafe(product));
}

describe('IPP : aucun nombre après une lettre (coefficient devant)', () => {
	it.each(['xe^{2x}', '3xe^{-2x}', 'x^2e^{2x}', '3xe^x', 'x^2e^x'])('∫ %s dx', (integrand) => {
		for (const level of LEVELS) {
			const { result } = run(integrand, level, 'summarized');
			for (const step of flattenRaw(result.steps)) {
				const nodes = [step.before, step.after, ...Object.values(step.bindings ?? {})];
				for (const node of nodes) {
					expect(numbersAfterLetters(node), `${step.rule} : ${toLatexSafe(node)}`).toEqual([]);
				}
			}
		}
	});

	it('∫ xe^{2x} dx : uv s’écrit \\dfrac{1}{2}xe^{2x}', () => {
		const { rendered } = run('xe^{2x}', 'lycee', 'summarized');
		const formula = rendered.find((s) => s.rule === 'apply-parts-formula');
		expect(formula?.expressionLatex).toContain(
			'& = \\dfrac{1}{2} x \\exponentialE^{2 x} - \\int \\dfrac{1}{2} \\exponentialE^{2 x}\\,dx'
		);
	});

	it('∫ 3xe^{-2x} dx : uv s’écrit -\\dfrac{3}{2}xe^{-2x}', () => {
		const { rendered } = run('3xe^{-2x}', 'lycee', 'summarized');
		const formula = rendered.find((s) => s.rule === 'apply-parts-formula');
		expect(formula?.expressionLatex).toContain(
			'& = -\\dfrac{3}{2} x \\exponentialE^{-2 x} - \\int'
		);
	});
});

// =============================================================================
// Revue du lot 4 (2) : parenthèse d'IPP développée, exposant stable, texte juste
// =============================================================================

describe('parenthèse d’IPP sans exponentielle commune à tous les termes', () => {
	it.each([
		[
			'x^2e^{2x}+x',
			'\\left( \\dfrac{x^2}{2} - \\dfrac{x}{2} + \\dfrac{1}{4} \\right) \\exponentialE^{2 x} + \\dfrac{x^2}{2}'
		],
		[
			'x^2\\sin(x)',
			'-x^2 \\cos\\left( x \\right) + 2 x \\sin\\left( x \\right) + 2 \\cos\\left( x \\right)'
		],
		[
			'x^2\\cos(x)+x',
			// ordre de `tidy` (décision de David du 2026-10-11)
			'x^2 \\sin\\left( x \\right) + 2 x \\cos\\left( x \\right) + \\dfrac{x^2}{2} - 2 \\sin\\left( x \\right)'
		],
		// parenthèse venue de u, pas de l'IPP : gardée
		[
			'(2x+1)\\sin(x)',
			'2 \\sin\\left( x \\right) - \\cos\\left( x \\right) \\left( 2 x + 1 \\right)'
		]
	])('∫ %s dx s’écrit %s', (integrand, expected) => {
		for (const level of LEVELS) {
			const { result, rendered } = run(integrand, level, 'summarized');
			expect(finalPrimitiveLatex(rendered)).toBe(expected);
			expectExactDerivative(result.antiderivative, integrand);
		}
	});
});

describe('une seule écriture de l’exposant dans l’étape « On simplifie »', () => {
	it.each([
		['xe^{x/2}', '2 \\left( x - 2 \\right) \\exponentialE^{x / 2}', '\\dfrac{x}{2}'],
		['3xe^{\\frac{x}{2}}', '6 \\left( x - 2 \\right) \\exponentialE^{\\dfrac{x}{2}}', 'x / 2']
	])('∫ %s dx s’écrit %s, sans %s', (integrand, expected, foreign) => {
		const { result, rendered } = run(integrand, 'lycee', 'detailed');
		expect(finalPrimitiveLatex(rendered)).toBe(expected);
		const simplify = rendered.find((s) => s.rule === 'simplify-result');
		expect(`${simplify?.explanation} ${simplify?.expressionLatex}`).not.toContain(foreign);
		expectExactDerivative(result.antiderivative, integrand);
	});
});

describe('le texte de « On simplifie » ne promet pas une ligne cachée', () => {
	it.each([
		['xe^x', 'On met $\\exponentialE^x$ en facteur.'],
		['3xe^x', 'On met $\\exponentialE^x$ en facteur.'],
		['x^2e^x', 'On développe, puis on met $\\exponentialE^x$ en facteur.']
	])('∫ %s dx : « %s »', (integrand, explanation) => {
		const { rendered } = run(integrand, 'lycee', 'detailed');
		const simplify = rendered.find((s) => s.rule === 'simplify-result');
		expect(simplify?.explanation).toBe(explanation);
		const lines = (simplify?.expressionLatex ?? '').split('= ').length;
		expect(lines).toBe(explanation.startsWith('On développe') ? 3 : 2);
	});
});

describe('IPP : un signe moins devant, pas dans une parenthèse', () => {
	it.each([
		['x^2e^{-x}', '-x^2 \\exponentialE^{-x}', 'x^2 \\left( -\\exponentialE^{-x} \\right)'],
		['x\\sin(x)', '-x \\cos\\left( x \\right)', 'x \\left( -\\cos\\left( x \\right) \\right)']
	])('∫ %s dx : uv s’écrit %s', (integrand, uv, old) => {
		const { result, rendered } = run(integrand, 'lycee', 'summarized');
		const formula = rendered.find((s) => s.rule === 'apply-parts-formula');
		expect(formula?.expressionLatex).toContain(`& = ${uv} - \\int`);
		expect(formula?.expressionLatex).not.toContain(old);
		expectExactDerivative(result.antiderivative, integrand);
	});
});
