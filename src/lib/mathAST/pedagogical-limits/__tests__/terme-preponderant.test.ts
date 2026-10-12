/**
 * Limite en ±∞ : factorisation du terme prépondérant (BO 2019, Tle spé,
 * capacités attendues : « la factorisation du terme prépondérant dans une
 * somme »). Remplace l'ancienne règle hors programme « quotient des termes de
 * plus haut degré » (`identify-dominant-term`).
 *
 * Tests sur le RENDU : titre et LaTeX de chaque étape, au lycée (détaillé,
 * résumé) et au supérieur. Rédaction validée par David (2026-10-12).
 */

import { describe, expect, it } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import type { RenderedStep } from '../../common/step-renderer-base';
import type { Verbosity } from '../../common/verbosity';
import { generatePedagogicalLimitSteps } from '../pipeline';
import { PedagogicalLimitRenderer } from '../renderer';
import type { LimitsSchoolLevel } from '../types';

// =============================================================================
// Helpers
// =============================================================================

function run(latex: string, schoolLevel: LimitsSchoolLevel = 'lycee') {
	const limit = parseLatex(latex);
	if (limit.type !== 'limit') throw new Error(`pas une limite : ${latex}`);
	return generatePedagogicalLimitSteps(limit.expression, {
		variable: limit.variable,
		approach: limit.approach,
		schoolLevel
	});
}

function render(latex: string, schoolLevel: LimitsSchoolLevel, verbosity: Verbosity) {
	const renderer = new PedagogicalLimitRenderer();
	return [...renderer.renderAll(run(latex, schoolLevel).steps, { schoolLevel, verbosity })];
}

/** Bloc d'une étape : la limite en bleu, puis « = … » quand elle change. */
function block(left: string, right?: string): string {
	if (right === undefined) {
		return `\\begin{aligned}\n  & \\textcolor{blue}{${left}}\n\\end{aligned}`;
	}
	return `\\begin{aligned}\n  & \\textcolor{blue}{${left}} \\\\\n  & = ${right}\n\\end{aligned}`;
}

/** Bloc des limites des termes : une ligne par limite, sans couleur. */
function lines(...rows: string[]): string {
	return `\\begin{aligned}\n${rows.map((r) => `  & ${r}`).join(' \\\\\n')}\n\\end{aligned}`;
}

type Row = { rule: string; title: string; latex: string; explanation?: string };

function rows(steps: RenderedStep[]): Row[] {
	return steps.map((s) => ({
		rule: s.rule,
		title: s.title,
		latex: s.expressionLatex ?? '',
		...(s.explanation && { explanation: s.explanation })
	}));
}

function rowsWithoutExplanation(steps: RenderedStep[]) {
	return rows(steps).map(({ rule, title, latex }) => ({ rule, title, latex }));
}

const PLUS = 'x \\to +\\infty';
const MINUS = 'x \\to -\\infty';
const lim = (sub: string, body: string) => `\\lim_{${sub}} ${body}`;

// =============================================================================
// Cas 1 — (3x + 1)/(2x − 5) : mêmes degrés
// =============================================================================

describe('cas 1 — (3x+1)/(2x−5) : factorisation par x des deux côtés', () => {
	for (const [approach, sub, label] of [
		['+\\infty', PLUS, '+∞'],
		['-\\infty', MINUS, '−∞']
	] as const) {
		const latex = `\\lim_{x\\to ${approach}}\\frac{3x+1}{2x-5}`;
		const L0 = lim(sub, '\\dfrac{3 x + 1}{2 x - 5}');
		const L1 = lim(
			sub,
			'\\dfrac{x \\left( 3 + \\dfrac{1}{x} \\right)}{x \\left( 2 - \\dfrac{5}{x} \\right)}'
		);
		const L2 = lim(sub, '\\dfrac{3 + \\dfrac{1}{x}}{2 - \\dfrac{5}{x}}');

		it(`lycée détaillé en ${label} : toutes les étapes`, () => {
			expect(rows(render(latex, 'lycee', 'detailed'))).toEqual([
				{
					rule: 'identify-limit',
					title: `On veut calculer la limite de l'expression quand x tend vers ${label}`,
					latex: block(L0),
					explanation:
						"On commence par observer la forme de l'expression pour choisir une technique adaptée."
				},
				{
					rule: 'detect-indeterminate-form',
					title: 'Forme indéterminée ∞/∞ reconnue',
					latex: block(L0),
					explanation:
						"Numérateur et dénominateur tendent vers l'infini : on ne peut pas conclure directement. On factorise par le terme prépondérant."
				},
				{
					rule: 'factor-dominant-term',
					title: 'On factorise par le terme prépondérant',
					latex: block(L0, L1),
					explanation:
						'Dans chaque somme, on met en facteur la plus grande puissance de x : les autres termes deviennent des quotients qui tendent vers 0.'
				},
				{
					rule: 'simplify-common-factor',
					title: 'Simplification par x',
					latex: block(L1, L2),
					explanation: 'x est un facteur commun au numérateur et au dénominateur : on simplifie.'
				},
				{
					rule: 'limits-of-terms',
					title: 'Limites des termes',
					latex: lines(
						`${lim(sub, '\\dfrac{1}{x}')} = 0`,
						`${lim(sub, '\\dfrac{5}{x}')} = 0`,
						`\\text{donc } ${lim(sub, '\\left( 3 + \\dfrac{1}{x} \\right)')} = 3`,
						`\\text{et } ${lim(sub, '\\left( 2 - \\dfrac{5}{x} \\right)')} = 2`
					),
					explanation:
						'Un nombre divisé par une puissance de x tend vers 0 : chaque parenthèse tend vers son premier terme.'
				},
				{
					rule: 'apply-quotient',
					title: "Limite d'un quotient",
					latex: block(L2, '\\dfrac{3}{2}'),
					explanation:
						'Le numérateur tend vers 3 et le dénominateur vers 2 : par quotient, la limite vaut 3/2.'
				},
				{
					rule: 'conclude',
					title: 'La limite vaut 3/2',
					latex: block(L0, '\\dfrac{3}{2}'),
					explanation: 'On peut maintenant conclure.'
				}
			]);
		});

		it(`lycée résumé en ${label} : factorisation, simplification, conclusion`, () => {
			expect(rowsWithoutExplanation(render(latex, 'lycee', 'summarized'))).toEqual([
				{
					rule: 'factor-dominant-term',
					title: 'On factorise par le terme prépondérant',
					latex: block(L0, L1)
				},
				{ rule: 'simplify-common-factor', title: 'Simplification par x', latex: block(L1, L2) },
				{ rule: 'conclude', title: 'La limite vaut 3/2', latex: block(L0, '\\dfrac{3}{2}') }
			]);
		});

		it(`supérieur détaillé en ${label} : la même factorisation, plus compacte`, () => {
			expect(rowsWithoutExplanation(render(latex, 'superieur', 'detailed'))).toEqual([
				{ rule: 'detect-indeterminate-form', title: 'Forme indéterminée ∞/∞', latex: block(L0) },
				{
					rule: 'factor-dominant-term',
					title: 'Factorisation par le terme prépondérant',
					latex: block(L0, L1)
				},
				{ rule: 'simplify-common-factor', title: 'Simplification par x', latex: block(L1, L2) },
				{ rule: 'conclude', title: '= 3/2', latex: block(L0, '\\dfrac{3}{2}') }
			]);
		});

		it(`supérieur résumé en ${label} : sans la forme indéterminée`, () => {
			expect(render(latex, 'superieur', 'summarized').map((s) => s.rule)).toEqual([
				'factor-dominant-term',
				'simplify-common-factor',
				'conclude'
			]);
		});

		it(`forme ∞/∞ rendue dans le résultat, valeur 3/2`, () => {
			const result = run(latex);
			expect(result.indeterminateForm).toBe('∞/∞');
			expect(result.value && toLatex(result.value)).toBe('\\dfrac{3}{2}');
		});
	}
});

// =============================================================================
// Cas 2 — (x² + 1)/(3x) : numérateur de plus haut degré
// =============================================================================

describe('cas 2 — (x²+1)/(3x) : on factorise le numérateur seulement', () => {
	for (const [approach, sub, label, value, valueText] of [
		['-\\infty', MINUS, '−∞', '-\\infty', '−∞'],
		['+\\infty', PLUS, '+∞', '+\\infty', '+∞']
	] as const) {
		const latex = `\\lim_{x\\to ${approach}}\\frac{x^2+1}{3x}`;
		const L0 = lim(sub, '\\dfrac{x^2 + 1}{3 x}');
		const L1 = lim(sub, '\\dfrac{x^2 \\left( 1 + \\dfrac{1}{x^2} \\right)}{3 x}');
		const L2 = lim(sub, '\\dfrac{x \\left( 1 + \\dfrac{1}{x^2} \\right)}{3}');

		it(`lycée détaillé en ${label}`, () => {
			const steps = rows(render(latex, 'lycee', 'detailed'));
			expect(steps.map(({ rule, title, latex }) => ({ rule, title, latex }))).toEqual([
				{
					rule: 'identify-limit',
					title: `On veut calculer la limite de l'expression quand x tend vers ${label}`,
					latex: block(L0)
				},
				{
					rule: 'detect-indeterminate-form',
					title: 'Forme indéterminée ∞/∞ reconnue',
					latex: block(L0)
				},
				{
					rule: 'factor-dominant-term',
					title: 'On factorise par le terme prépondérant',
					latex: block(L0, L1)
				},
				{ rule: 'simplify-common-factor', title: 'Simplification par x', latex: block(L1, L2) },
				{
					rule: 'limits-of-terms',
					title: 'Limites des termes',
					latex: lines(
						`${lim(sub, '\\dfrac{1}{x^2}')} = 0`,
						`\\text{donc } ${lim(sub, '\\left( 1 + \\dfrac{1}{x^2} \\right)')} = 1`
					)
				},
				{ rule: 'apply-product', title: "Limite d'un produit", latex: block(L2, value) },
				{ rule: 'conclude-infinite', title: `La limite vaut ${valueText}`, latex: block(L0, value) }
			]);
			expect(steps.find((s) => s.rule === 'apply-product')?.explanation).toBe(
				`Le facteur x tend vers ${label} et l'autre facteur tend vers 1/3 : par produit, (${label}) × 1/3 = ${valueText}.`
			);
		});

		it(`lycée résumé en ${label}`, () => {
			expect(render(latex, 'lycee', 'summarized').map((s) => s.rule)).toEqual([
				'factor-dominant-term',
				'simplify-common-factor',
				'conclude-infinite'
			]);
		});
	}
});

// =============================================================================
// Cas 3 — 2x/(x² + 1) : dénominateur de plus haut degré
// =============================================================================

describe("cas 3 — 2x/(x²+1) : le dénominateur tend vers l'infini", () => {
	for (const [approach, sub, label] of [
		['+\\infty', PLUS, '+∞'],
		['-\\infty', MINUS, '−∞']
	] as const) {
		const latex = `\\lim_{x\\to ${approach}}\\frac{2x}{x^2+1}`;
		const infinityLatex = label === '+∞' ? '+\\infty' : '-\\infty';
		const L0 = lim(sub, '\\dfrac{2 x}{x^2 + 1}');
		const L1 = lim(sub, '\\dfrac{2 x}{x^2 \\left( 1 + \\dfrac{1}{x^2} \\right)}');
		const L2 = lim(sub, '\\dfrac{2}{x \\left( 1 + \\dfrac{1}{x^2} \\right)}');

		it(`lycée détaillé en ${label}`, () => {
			const steps = rows(render(latex, 'lycee', 'detailed'));
			expect(steps.map(({ rule, title, latex }) => ({ rule, title, latex }))).toEqual([
				{
					rule: 'identify-limit',
					title: `On veut calculer la limite de l'expression quand x tend vers ${label}`,
					latex: block(L0)
				},
				{
					rule: 'detect-indeterminate-form',
					title: 'Forme indéterminée ∞/∞ reconnue',
					latex: block(L0)
				},
				{
					rule: 'factor-dominant-term',
					title: 'On factorise par le terme prépondérant',
					latex: block(L0, L1)
				},
				{ rule: 'simplify-common-factor', title: 'Simplification par x', latex: block(L1, L2) },
				{
					rule: 'limits-of-terms',
					title: 'Limites des termes',
					latex: lines(
						`${lim(sub, '\\dfrac{1}{x^2}')} = 0`,
						`\\text{donc } ${lim(sub, '\\left( 1 + \\dfrac{1}{x^2} \\right)')} = 1`
					)
				},
				{
					rule: 'apply-product',
					title: "Limite d'un produit",
					latex: block(lim(sub, 'x \\left( 1 + \\dfrac{1}{x^2} \\right)'), infinityLatex)
				},
				{ rule: 'apply-quotient', title: "Limite d'un quotient", latex: block(L2, '0') },
				{ rule: 'conclude', title: 'La limite vaut 0', latex: block(L0, '0') }
			]);
			expect(steps.find((s) => s.rule === 'apply-product')?.explanation).toBe(
				`Le facteur x tend vers ${label} et l'autre facteur tend vers 1 : par produit, (${label}) × 1 = ${label}.`
			);
			expect(steps.find((s) => s.rule === 'apply-quotient')?.explanation).toBe(
				`2 divisé par une quantité qui tend vers ${label} : la limite vaut 0.`
			);
		});
	}
});

// =============================================================================
// Cas 4 — polynôme −2x³ + x : forme ∞ − ∞
// =============================================================================

describe('cas 4 — polynôme −2x³ + x : forme ∞ − ∞, factorisation sans simplification', () => {
	for (const [approach, sub, label, value, valueText, xLimit] of [
		['-\\infty', MINUS, '−∞', '+\\infty', '+∞', '−∞'],
		['+\\infty', PLUS, '+∞', '-\\infty', '−∞', '+∞']
	] as const) {
		const latex = `\\lim_{x\\to ${approach}}-2x^3+x`;
		const L0 = lim(sub, '\\left( -2 x^3 + x \\right)');
		const L1 = lim(sub, 'x^3 \\left( -2 + \\dfrac{1}{x^2} \\right)');

		it(`lycée détaillé en ${label}`, () => {
			const steps = rows(render(latex, 'lycee', 'detailed'));
			expect(steps.map(({ rule, title, latex }) => ({ rule, title, latex }))).toEqual([
				{
					rule: 'identify-limit',
					title: `On veut calculer la limite de l'expression quand x tend vers ${label}`,
					latex: block(L0)
				},
				{
					rule: 'detect-indeterminate-form',
					title: 'Forme indéterminée ∞ − ∞ reconnue',
					latex: block(L0)
				},
				{
					rule: 'factor-dominant-term',
					title: 'On factorise par le terme prépondérant',
					latex: block(L0, L1)
				},
				{
					rule: 'limits-of-terms',
					title: 'Limites des termes',
					latex: lines(
						`${lim(sub, '\\dfrac{1}{x^2}')} = 0`,
						`\\text{donc } ${lim(sub, '\\left( -2 + \\dfrac{1}{x^2} \\right)')} = -2`
					)
				},
				{ rule: 'apply-product', title: "Limite d'un produit", latex: block(L1, value) },
				{ rule: 'conclude-infinite', title: `La limite vaut ${valueText}`, latex: block(L0, value) }
			]);
			expect(steps.find((s) => s.rule === 'apply-product')?.explanation).toBe(
				`Le facteur x³ tend vers ${xLimit} et l'autre facteur tend vers −2 : par produit, (${xLimit}) × (−2) = ${valueText}.`
			);
			const prose = steps.map((s) => `${s.title} ${s.explanation ?? ''}`).join(' ');
			expect(prose).not.toMatch(/plus haut degré/);
		});

		it(`lycée résumé en ${label} : factorisation et conclusion`, () => {
			expect(render(latex, 'lycee', 'summarized').map((s) => s.rule)).toEqual([
				'factor-dominant-term',
				'conclude-infinite'
			]);
		});

		it(`forme ∞ − ∞ rendue dans le résultat en ${label}`, () => {
			expect(run(latex).indeterminateForm).toBe('∞-∞');
		});
	}

	it('supérieur : forme, factorisation, conclusion', () => {
		const L0 = lim(MINUS, '\\left( -2 x^3 + x \\right)');
		expect(
			rowsWithoutExplanation(render('\\lim_{x\\to -\\infty}-2x^3+x', 'superieur', 'detailed'))
		).toEqual([
			{ rule: 'detect-indeterminate-form', title: 'Forme indéterminée ∞ − ∞', latex: block(L0) },
			{
				rule: 'factor-dominant-term',
				title: 'Factorisation par le terme prépondérant',
				latex: block(L0, lim(MINUS, 'x^3 \\left( -2 + \\dfrac{1}{x^2} \\right)'))
			},
			{ rule: 'conclude-infinite', title: '= +∞', latex: block(L0, '+\\infty') }
		]);
	});
});

// =============================================================================
// Cas 5 et 6 — monôme et constante : une seule étape
// =============================================================================

describe('cas 5 — monôme : une seule étape, sans factorisation', () => {
	for (const [expression, approach, sub, body, value, valueText] of [
		['\\pi x', '+\\infty', PLUS, '\\pi x', '+\\infty', '+∞'],
		['-3x^2', '-\\infty', MINUS, '-3 x^2', '-\\infty', '−∞']
	] as const) {
		it(`${expression} en ${approach}`, () => {
			const latex = `\\lim_{x\\to ${approach}}${expression}`;
			expect(rowsWithoutExplanation(render(latex, 'lycee', 'summarized'))).toEqual([
				{
					rule: 'conclude-infinite',
					title: `La limite vaut ${valueText}`,
					latex: block(lim(sub, body), value)
				}
			]);
			const detailed = render(latex, 'lycee', 'detailed').map((s) => s.rule);
			expect(detailed).toEqual(['identify-limit', 'conclude-infinite']);
		});
	}
});

describe('cas 6 — constante : une seule étape', () => {
	it('5 en +∞', () => {
		expect(
			rowsWithoutExplanation(render('\\lim_{x\\to +\\infty}5', 'lycee', 'summarized'))
		).toEqual([{ rule: 'conclude', title: 'La limite vaut 5', latex: block(lim(PLUS, '5'), '5') }]);
	});
});

// =============================================================================
// Cas 7 — expression non développée : on développe d'abord
// =============================================================================

describe('cas 7 — (x+1)²/(2x²) : on développe, puis la même mécanique', () => {
	const latex = '\\lim_{x\\to +\\infty}\\frac{(x+1)^2}{2x^2}';
	const L0 = lim(PLUS, '\\dfrac{\\left( x + 1 \\right)^2}{2 x^2}');
	const Lexp = lim(PLUS, '\\dfrac{x^2 + 2 x + 1}{2 x^2}');
	const L1 = lim(PLUS, '\\dfrac{x^2 \\left( 1 + \\dfrac{2}{x} + \\dfrac{1}{x^2} \\right)}{2 x^2}');
	const L2 = lim(PLUS, '\\dfrac{1 + \\dfrac{2}{x} + \\dfrac{1}{x^2}}{2}');

	it('lycée détaillé', () => {
		const steps = rows(render(latex, 'lycee', 'detailed'));
		expect(steps.map(({ rule, title, latex }) => ({ rule, title, latex }))).toEqual([
			{
				rule: 'identify-limit',
				title: "On veut calculer la limite de l'expression quand x tend vers +∞",
				latex: block(L0)
			},
			{
				rule: 'detect-indeterminate-form',
				title: 'Forme indéterminée ∞/∞ reconnue',
				latex: block(L0)
			},
			{ rule: 'expand', title: 'On développe', latex: block(L0, Lexp) },
			{
				rule: 'factor-dominant-term',
				title: 'On factorise par le terme prépondérant',
				latex: block(Lexp, L1)
			},
			{ rule: 'simplify-common-factor', title: 'Simplification par x²', latex: block(L1, L2) },
			{
				rule: 'limits-of-terms',
				title: 'Limites des termes',
				latex: lines(
					`${lim(PLUS, '\\dfrac{2}{x}')} = 0`,
					`${lim(PLUS, '\\dfrac{1}{x^2}')} = 0`,
					`\\text{donc } ${lim(PLUS, '\\left( 1 + \\dfrac{2}{x} + \\dfrac{1}{x^2} \\right)')} = 1`
				)
			},
			{ rule: 'apply-quotient', title: "Limite d'un quotient", latex: block(L2, '\\dfrac{1}{2}') },
			{ rule: 'conclude', title: 'La limite vaut 1/2', latex: block(L0, '\\dfrac{1}{2}') }
		]);
	});

	it('lycée résumé : factorisation, simplification, conclusion', () => {
		expect(render(latex, 'lycee', 'summarized').map((s) => s.rule)).toEqual([
			'factor-dominant-term',
			'simplify-common-factor',
			'conclude'
		]);
	});
});

// =============================================================================
// Plus de règle hors programme
// =============================================================================

describe('la règle « quotient des termes de plus haut degré » a disparu', () => {
	for (const latex of [
		'\\lim_{x\\to +\\infty}\\frac{3x+1}{2x-5}',
		'\\lim_{x\\to -\\infty}\\frac{x^2+1}{3x}',
		'\\lim_{x\\to +\\infty}\\frac{2x}{x^2+1}',
		'\\lim_{x\\to -\\infty}-2x^3+x'
	]) {
		it(`${latex} : ni « plus haut degré », ni « coefficients dominants »`, () => {
			for (const level of ['lycee', 'superieur'] as const) {
				const prose = render(latex, level, 'detailed')
					.map((s) => `${s.title} ${s.explanation ?? ''}`)
					.join(' ');
				expect(prose).not.toMatch(/plus haut degré|coefficients dominants|termes dominants/);
			}
		});
	}
});
