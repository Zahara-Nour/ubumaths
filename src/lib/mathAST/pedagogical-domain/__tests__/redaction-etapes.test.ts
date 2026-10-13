/**
 * Rédaction des étapes d'ensemble de définition (phase 0 du 2026-10-13).
 *
 * Défauts mesurés puis corrigés :
 * - G1 : un domaine que le moteur n'a pas su résoudre (`unresolved`) ne doit
 *   pas produire d'étapes concluant « ℝ » ;
 * - D1 / Q1 : chaque étape montre l'ensemble de SA contrainte, l'intersection
 *   se fait à l'étape finale ;
 * - D2 / Q2 : écriture LaTeX des ensembles (exclusions périodiques, singleton,
 *   racines) ;
 * - D3 : une racine n-ième n'est pas une racine carrée ;
 * - Q6 : `x^2+1 > 0` justifié quand le dénominateur ne s'annule jamais.
 */

import { describe, expect, it } from 'vitest';
import {
	dispatchPedagogicalDomain,
	PedagogicalDomainNotImplemented,
	PedagogicalDomainRenderer
} from '../index';
import type { PedagogicalDomainSchoolLevel } from '../types';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import type { MathNode } from '$lib/mathAST/types';
import type { Domain } from '$lib/mathAST/domain';
import { domainToLatex } from '../renderer';

// =============================================================================
// Constantes
// =============================================================================

const LEVELS: readonly PedagogicalDomainSchoolLevel[] = ['lycee', 'superieur'];
const VERBOSITIES = ['detailed', 'summarized'] as const;

// =============================================================================
// Helpers
// =============================================================================

function render(
	expression: string,
	schoolLevel: PedagogicalDomainSchoolLevel,
	verbosity: 'detailed' | 'summarized' = 'detailed'
): readonly RenderedStep[] {
	const result = dispatchPedagogicalDomain({ expression, schoolLevel, verbosity });
	return new PedagogicalDomainRenderer().renderAll(result.steps, { schoolLevel, verbosity });
}

/** Ligne « Domaine : … » d'une étape, espaces retirés. */
function domainLine(step: RenderedStep): string {
	const match = /\\text\{Domaine : \}(.*)/.exec(step.expressionLatex ?? '');
	return (match?.[1] ?? '').replace(/\s+/g, '');
}

function compact(latex: string): string {
	return latex.replace(/\s+/g, '');
}

function stepOf(steps: readonly RenderedStep[], rule: string): RenderedStep {
	const step = steps.find((s) => s.rule === rule);
	if (!step) throw new Error(`pas d'étape ${rule} dans ${steps.map((s) => s.rule).join(', ')}`);
	return step;
}

// =============================================================================
// Tests
// =============================================================================

describe('G1 — domaine non résolu : pas d’étapes', () => {
	for (const level of LEVELS) {
		for (const expression of ['\\sqrt{\\sin x}', '\\frac{1}{x^5+x+1}']) {
			it(`${expression} (${level}) est refusé`, () => {
				expect(() => dispatchPedagogicalDomain({ expression, schoolLevel: level })).toThrow(
					PedagogicalDomainNotImplemented
				);
			});
		}
	}

	it('x^{-1/2} : pas d’étape « Domaine : ℝ » alors que le domaine est ]0 ; +∞[', () => {
		expect(() =>
			dispatchPedagogicalDomain({ expression: 'x^{-1/2}', schoolLevel: 'lycee' })
		).toThrow(PedagogicalDomainNotImplemented);
	});
});

describe('Q1 — chaque étape montre l’ensemble de sa propre contrainte', () => {
	const CASES: ReadonlyArray<{ expression: string; division: string; final: string }> = [
		{
			expression: '\\frac{\\ln x}{x-2}',
			division: '\\mathbb{R}\\setminus\\left\\{2\\right\\}',
			final: ']0;+\\infty[\\setminus\\left\\{2\\right\\}'
		},
		{
			expression: '\\frac{\\sqrt x}{x}',
			division: '\\mathbb{R}\\setminus\\left\\{0\\right\\}',
			final: ']0;+\\infty['
		},
		{
			expression: '\\frac{1}{\\ln x}',
			division: '\\mathbb{R}\\setminus\\left\\{1\\right\\}',
			final: ']0;+\\infty[\\setminus\\left\\{1\\right\\}'
		},
		{
			expression: '\\frac{1}{\\sqrt{x-1}}',
			division: '\\mathbb{R}\\setminus\\left\\{1\\right\\}',
			final: ']1;+\\infty['
		}
	];

	for (const level of LEVELS) {
		for (const verbosity of VERBOSITIES) {
			for (const { expression, division, final } of CASES) {
				it(`${expression} (${level}, ${verbosity})`, () => {
					const steps = render(expression, level, verbosity);
					expect(domainLine(stepOf(steps, 'division_constraint'))).toBe(division);
					expect(domainLine(stepOf(steps, 'intersection'))).toBe(final);
					expect(steps.at(-1)?.rule).toBe('intersection');
				});
			}
		}
	}
});

describe('Q2 — écriture des ensembles', () => {
	const CASES: ReadonlyArray<{ expression: string; rule: string; set: string }> = [
		{
			expression: '\\tan x',
			rule: 'tan_constraint',
			set: '\\mathbb{R}\\setminus\\left\\{\\frac{\\pi}{2}+k\\pi,\\k\\in\\mathbb{Z}\\right\\}'
		},
		{
			expression: '\\frac{1}{\\sin x}',
			rule: 'division_constraint',
			set: '\\mathbb{R}\\setminus\\left\\{k\\pi,\\k\\in\\mathbb{Z}\\right\\}'
		},
		{
			expression: '\\frac{1}{\\cos x}',
			rule: 'division_constraint',
			set: '\\mathbb{R}\\setminus\\left\\{\\frac{\\pi}{2}+k\\pi,\\k\\in\\mathbb{Z}\\right\\}'
		},
		{
			expression: '\\tan(2x)',
			rule: 'tan_constraint',
			set: '\\mathbb{R}\\setminus\\left\\{\\frac{\\pi}{4}+\\frac{k\\pi}{2},\\k\\in\\mathbb{Z}\\right\\}'
		},
		{
			expression: '\\sqrt x\\sqrt{-x}',
			rule: 'intersection',
			set: '\\left\\{0\\right\\}'
		},
		{
			expression: '\\frac{1}{x^2-2}',
			rule: 'division_constraint',
			set: '\\mathbb{R}\\setminus\\left\\{-\\sqrt{2};\\sqrt{2}\\right\\}'
		}
	];

	for (const level of LEVELS) {
		for (const verbosity of VERBOSITIES) {
			for (const { expression, rule, set } of CASES) {
				it(`${expression} (${level}, ${verbosity})`, () => {
					const steps = render(expression, level, verbosity);
					expect(domainLine(stepOf(steps, rule))).toBe(set);
				});
			}
		}
	}

	it('aucun glyphe Unicode dans le LaTeX des étapes', () => {
		const expressions = [
			'\\tan x',
			'\\frac{1}{x^2-2}',
			'\\frac{\\ln x}{x-2}',
			'\\sqrt x\\sqrt{-x}',
			'\\arccos\\left(\\dfrac{x}{2}\\right)'
		];
		for (const level of LEVELS) {
			for (const expression of expressions) {
				for (const step of render(expression, level)) {
					expect(step.expressionLatex).not.toMatch(/[√π∞ℝℤ∅∪·]/);
				}
			}
		}
	});
});

describe('D3 — racine n-ième', () => {
	for (const level of LEVELS) {
		it(`\\sqrt[4]{x} (${level}) : ni « racine carrée » ni \\sqrt{x}`, () => {
			const [step] = render('\\sqrt[4]{x}', level);
			expect(step.title).not.toMatch(/carrée|^√u/);
			expect(step.explanation ?? '').toContain('\\sqrt[4]{x}');
			expect(domainLine(step)).toBe('[0;+\\infty[');
		});
	}

	it('titre au lycée : racine d’indice pair', () => {
		const [step] = render('\\sqrt[4]{x}', 'lycee');
		expect(step.title).toBe('Contrainte de la racine paire');
	});
});

describe('Q6 — dénominateur qui ne s’annule jamais', () => {
	for (const level of LEVELS) {
		it(`\\frac{1}{x^2+1} (${level}) : justifie x^2+1 > 0`, () => {
			const steps = render('\\frac{1}{x^2+1}', level);
			expect(steps).toHaveLength(1);
			const [step] = steps;
			expect(step.rule).toBe('division_constraint');
			expect(compact(step.explanation ?? '')).toContain('$x^2+1>0$');
			expect(step.explanation).toMatch(/pour tout réel/i);
			expect(step.explanation).toContain('somme d’un carré et d’un nombre strictement positif');
			expect(domainLine(step)).toBe('\\mathbb{R}');
		});
	}

	it('\\frac{1}{2x^2+3} : somme de termes positifs', () => {
		const [step] = render('\\frac{1}{2x^2+3}', 'lycee');
		expect(step.explanation).toContain('positifs ou nuls');
	});

	it('\\frac{\\sqrt x}{x^2+1} : la racine, le dénominateur, puis l’intersection', () => {
		const steps = render('\\frac{\\sqrt x}{x^2+1}', 'lycee');
		expect(steps.map((s) => s.rule)).toEqual([
			'sqrt_constraint',
			'division_constraint',
			'intersection'
		]);
		expect(domainLine(steps[2])).toBe('[0;+\\infty[');
	});
});

describe('Non-régression', () => {
	for (const level of LEVELS) {
		for (const verbosity of VERBOSITIES) {
			it(`\\frac1x (${level}, ${verbosity})`, () => {
				const steps = render('\\frac1x', level, verbosity);
				expect(steps.map((s) => s.rule)).toEqual(['division_constraint']);
				expect(domainLine(steps[0])).toBe('\\mathbb{R}\\setminus\\left\\{0\\right\\}');
			});

			it(`\\sqrt{x^2-5x+6} (${level}, ${verbosity})`, () => {
				const steps = render('\\sqrt{x^2-5x+6}', level, verbosity);
				expect(steps.map((s) => s.rule)).toEqual(['sqrt_constraint']);
				expect(domainLine(steps[0])).toBe(']-\\infty;2]\\cup[3;+\\infty[');
			});

			it(`\\ln\\frac{x+1}{x-1} (${level}, ${verbosity})`, () => {
				const steps = render('\\ln\\frac{x+1}{x-1}', level, verbosity);
				expect(steps.map((s) => s.rule)).toEqual([
					'division_constraint',
					'ln_constraint',
					'intersection'
				]);
				expect(domainLine(steps[0])).toBe('\\mathbb{R}\\setminus\\left\\{1\\right\\}');
				expect(domainLine(steps[1])).toBe(']-\\infty;-1[\\cup]1;+\\infty[');
				expect(domainLine(steps[2])).toBe(']-\\infty;-1[\\cup]1;+\\infty[');
			});

			it(`\\sqrt x + \\ln(1-x) (${level}, ${verbosity})`, () => {
				const steps = render('\\sqrt x + \\ln(1-x)', level, verbosity);
				expect(steps.map((s) => s.rule)).toEqual([
					'sqrt_constraint',
					'ln_constraint',
					'intersection'
				]);
				expect(domainLine(steps[0])).toBe('[0;+\\infty[');
				expect(domainLine(steps[1])).toBe(']-\\infty;1[');
				expect(domainLine(steps[2])).toBe('[0;1[');
			});
		}
	}
});

// =============================================================================
// Revue du 2026-10-13
// =============================================================================

describe('Revue — les étapes doivent prouver le domaine', () => {
	const REFUSED = [
		// x > 0 appliqué sans être écrit : l'intersection affichée ne se déduit pas des étapes
		'\\sqrt{x}+x^{-1/2}',
		// valeur interdite irrationnelle connue seulement en décimal (Q3)
		'\\frac{1}{x^3-2}'
	];
	for (const level of LEVELS) {
		for (const expression of REFUSED) {
			it(`${expression} (${level}) est refusé`, () => {
				expect(() => dispatchPedagogicalDomain({ expression, schoolLevel: level })).toThrow(
					PedagogicalDomainNotImplemented
				);
			});
		}
	}

	it('\\frac{1}{(\\frac1x)^2+1} : pas de « pour tout réel x » (faux en 0)', () => {
		const steps = render('\\frac{1}{(\\frac1x)^2+1}', 'lycee');
		for (const step of steps) {
			expect(step.explanation ?? '').not.toMatch(/pour tout réel/i);
		}
	});

	it('\\frac{1}{x-\\sqrt2} : pas d’étape « $2 \\geq 0$ »', () => {
		const steps = render('\\frac{1}{x-\\sqrt2}', 'lycee');
		expect(steps.map((s) => s.rule)).toEqual(['division_constraint']);
		expect(domainLine(steps[0])).toBe('\\mathbb{R}\\setminus\\left\\{\\sqrt{2}\\right\\}');
	});
});

describe('Revue — écriture des exclusions périodiques', () => {
	const CASES: ReadonlyArray<{ expression: string; set: string }> = [
		{
			expression: '\\tan(\\frac{\\pi x}{2})',
			set: '\\mathbb{R}\\setminus\\left\\{1+2k,\\k\\in\\mathbb{Z}\\right\\}'
		},
		{
			expression: '\\tan(\\pi x)',
			set: '\\mathbb{R}\\setminus\\left\\{\\frac{1}{2}+k,\\k\\in\\mathbb{Z}\\right\\}'
		},
		{
			expression: '\\tan(x-1)',
			set: '\\mathbb{R}\\setminus\\left\\{1+\\frac{\\pi}{2}+k\\pi,\\k\\in\\mathbb{Z}\\right\\}'
		}
	];
	for (const { expression, set } of CASES) {
		it(expression, () => {
			const [step] = render(expression, 'lycee');
			expect(domainLine(step)).toBe(set);
		});
	}
});

describe('Revue — ]-∞ ; a[ ∪ ]a ; +∞[ s’écrit ℝ ∖ {a}', () => {
	const inf = (sign: 'positive' | 'negative'): MathNode => ({ type: 'infinity', sign });
	const num = (value: string): MathNode => ({ type: 'number', value });
	const open = (lower: MathNode, upper: MathNode) => ({
		kind: 'interval' as const,
		lower: { value: lower, type: 'open' as const },
		upper: { value: upper, type: 'open' as const }
	});
	const set = (...intervals: ReturnType<typeof open>[]): Domain => ({
		kind: 'interval_set',
		intervals,
		excludedPoints: []
	});

	it(']-∞ ; 0[ ∪ ]0 ; +∞[ → ℝ ∖ {0}', () => {
		const latex = domainToLatex(
			set(open(inf('negative'), num('0')), open(num('0'), inf('positive')))
		);
		expect(compact(latex)).toBe('\\mathbb{R}\\setminus\\left\\{0\\right\\}');
	});

	it(']-∞ ; -1[ ∪ ]-1 ; 1[ ∪ ]1 ; +∞[ → ℝ ∖ {-1 ; 1}', () => {
		const minusOne: MathNode = { type: 'opposite', operand: num('1') };
		const latex = domainToLatex(
			set(
				open(inf('negative'), minusOne),
				open(minusOne, num('1')),
				open(num('1'), inf('positive'))
			)
		);
		expect(compact(latex)).toBe('\\mathbb{R}\\setminus\\left\\{-1;1\\right\\}');
	});

	it(']0 ; 1[ ∪ ]1 ; 2[ → ]0 ; 2[ ∖ {1}', () => {
		const latex = domainToLatex(set(open(num('0'), num('1')), open(num('1'), num('2'))));
		expect(compact(latex)).toBe(']0;2[\\setminus\\left\\{1\\right\\}');
	});

	it('\\sqrt{x^2-1} reste une réunion', () => {
		const [step] = render('\\sqrt{x^2-1}', 'lycee');
		expect(domainLine(step)).toBe(']-\\infty;-1]\\cup[1;+\\infty[');
	});
});
