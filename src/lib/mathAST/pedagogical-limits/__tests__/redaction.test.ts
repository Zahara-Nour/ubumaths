/**
 * Rédaction des limites (2026-10-14) : les défauts mesurés en phase 0.
 *
 * 1. Croissances comparées écrites `e^x` (et non `\exp(x)`) : reconnues ;
 *    `e^{1/x}` en 0⁺ / 0⁻ : limite d'une composée.
 * 2. Limite sans côté qui n'existe pas (`1/x` en 0) : les étapes concluent.
 * 3. Pas de sous-étape vide (`x + 1 = x + 1`, `\lim 1 = 1`).
 * 4. Prose (titres, explications, descriptions) : les maths entre `$…$`.
 * 5. Côté d'un pôle : le signe du dénominateur (`$x - 2 \to 0^+$`) ; e écrit e ;
 *    `\ln x` en 0 sans côté : le côté implicite (domaine ]0 ; +∞[).
 *
 * Entrées parsées (`parseLatex`), lycée et supérieur, détaillé et résumé.
 */

import { describe, expect, it } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import type { RenderedStep } from '../../common/step-renderer-base';
import type { LimitDirection } from '../../limits/types';
import { generatePedagogicalLimitSteps } from '../pipeline';
import { PedagogicalLimitRenderer } from '../renderer';
import { PedagogicalLimitNotImplemented } from '../types';
import type { PedagogicalLimitResult, PedagogicalLimitStep } from '../types';

// =============================================================================
// Constantes
// =============================================================================

const LEVELS = ['lycee', 'superieur'] as const;
const VERBOSITIES = ['detailed', 'summarized'] as const;

/** Maths en Unicode ou en ASCII hors des `$…$` */
const UNICODE_MATH = /[∞⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻×·−→≤≥√πℓ∼≠⇒]|\blim\b|=|\d\s*\/\s*\d/;

/** `\\exp(…)` ; `\\exponentialE` (la constante e, sortie LaTeX du moteur) n'en est pas */
const EXP_FUNCTION = /\\exp(?!onentialE)/;

// =============================================================================
// Fonctions
// =============================================================================

function run(
	expression: string,
	approach: string,
	level: (typeof LEVELS)[number],
	verbosity: (typeof VERBOSITIES)[number] = 'detailed',
	direction?: LimitDirection
): { result: PedagogicalLimitResult; rendered: readonly RenderedStep[] } {
	const result = generatePedagogicalLimitSteps(parseLatex(expression), {
		variable: 'x',
		approach: parseLatex(approach),
		direction,
		schoolLevel: level,
		verbosity
	});
	const rendered = new PedagogicalLimitRenderer().renderAll(result.steps, {
		schoolLevel: level,
		verbosity
	});
	return { result, rendered };
}

function flat(steps: readonly RenderedStep[]): RenderedStep[] {
	return steps.flatMap((s) => [s, ...flat(s.subSteps ?? [])]);
}

function flatRaw(steps: readonly PedagogicalLimitStep[]): PedagogicalLimitStep[] {
	return steps.flatMap((s) => [s, ...flatRaw(s.subSteps ?? [])]);
}

function rules(steps: readonly RenderedStep[]): string[] {
	return flat(steps).map((s) => s.rule);
}

/** Les deux membres d'un bloc `aligned` à deux lignes, ou null */
function members(latex: string): [string, string] | null {
	const match = latex.match(/\\textcolor\{blue\}\{(.*)\} \\\\\n {2}& = (.*)\n\\end\{aligned\}$/);
	return match ? [match[1], match[2]] : null;
}

/** `\left( x + 1 \right)` et `x + 1` sont la même écriture */
function bare(latex: string): string {
	return latex
		.replace(/\\lim_\{[^}]*\}\s*/g, '')
		.replace(/\\left\(\s*/g, '')
		.replace(/\s*\\right\)/g, '')
		.replace(/\s+/g, '');
}

/** Une étape vide : ses deux membres s'écrivent pareil */
function emptySteps(steps: readonly RenderedStep[]): string[] {
	return flat(steps).flatMap((s) => {
		const pair = members(s.expressionLatex ?? '');
		return pair && bare(pair[0]) === bare(pair[1]) ? [`${s.rule} : ${s.expressionLatex}`] : [];
	});
}

/** Les textes de prose (rendus et descriptions) : maths en Unicode hors `$…$` */
function unicodeLeaks(
	rendered: readonly RenderedStep[],
	raw: readonly PedagogicalLimitStep[]
): string[] {
	const texts = [
		...flat(rendered).flatMap((s) => [s.title, s.explanation ?? '']),
		...flatRaw(raw).map((s) => s.description)
	];
	return texts.filter((t) => UNICODE_MATH.test(t.replace(/\$[^$]*\$/g, ' ')));
}

// =============================================================================
// Tests
// =============================================================================

describe('1. croissances comparées écrites avec e^x', () => {
	const CASES: ReadonlyArray<readonly [string, string, string]> = [
		['\\frac{e^x}{x}', '+\\infty', '+\\infty'],
		['x e^{-x}', '+\\infty', '0'],
		['\\frac{x^3}{e^x}', '+\\infty', '0']
	];
	for (const [expression, approach, value] of CASES) {
		for (const level of LEVELS) {
			for (const verbosity of VERBOSITIES) {
				it(`${expression} en ${approach} (${level}, ${verbosity}) : ${value}, limite de référence`, () => {
					const { result, rendered } = run(expression, approach, level, verbosity);
					expect(result.value && toLatex(result.value)).toBe(value);
					expect(rules(rendered)).toContain('apply-known-limit');
					const known = flat(rendered).find((s) => s.rule === 'apply-known-limit');
					// L'écriture de l'élève : e^x, jamais \\exp
					expect(known?.expressionLatex).not.toMatch(EXP_FUNCTION);
					expect(known?.title).toMatch(/croissances? comparées?/i);
				});
			}
		}
	}

	for (const level of LEVELS) {
		it(`e^{1/x} en 0⁺ et 0⁻ (${level}) : limite d'une composée`, () => {
			const right = run('e^{\\frac{1}{x}}', '0', level, 'detailed', 'right');
			expect(right.result.value && toLatex(right.result.value)).toBe('+\\infty');
			expect(rules(right.rendered)).toContain('apply-composition');
			const left = run('e^{\\frac{1}{x}}', '0', level, 'detailed', 'left');
			expect(left.result.value && toLatex(left.result.value)).toBe('0');
			expect(rules(left.rendered)).toContain('apply-composition');
			const step = flat(right.rendered).find((s) => s.rule === 'apply-composition');
			// lim 1/x = +∞ (en 0⁺), donc lim e^{1/x} = +∞
			expect(step?.expressionLatex).toContain('\\dfrac{1}{x} = +\\infty');
		});
	}

	it('e^{1/x} en 0 sans côté : la limite n’existe pas, et les étapes le disent', () => {
		const { result, rendered } = run('e^{\\frac{1}{x}}', '0', 'lycee');
		expect(result.status).toBe('does-not-exist');
		expect(rules(rendered).at(-1)).toBe('conclude-does-not-exist');
		// La limite à gauche vaut 0 (calculée, pas lue sur un signe)
		const left = flat(rendered).find((s) => s.rule === 'analyze-left-limit');
		expect(left?.expressionLatex).toContain('= 0');
	});
});

describe('2. limite sans côté qui n’existe pas : les étapes concluent', () => {
	for (const [expression, approach] of [
		['\\frac1x', '0'],
		['\\frac{1}{x-2}', '2']
	] as const) {
		for (const level of LEVELS) {
			for (const verbosity of VERBOSITIES) {
				it(`${expression} en ${approach} (${level}, ${verbosity})`, () => {
					const { result, rendered } = run(expression, approach, level, verbosity);
					expect(result.status).toBe('does-not-exist');
					expect(rendered.at(-1)?.rule).toBe('conclude-does-not-exist');
					expect(rendered.at(-1)?.title).toMatch(/n'existe pas/);
				});
			}
		}
	}
});

describe('3. pas de sous-étape vide', () => {
	for (const level of LEVELS) {
		for (const verbosity of VERBOSITIES) {
			it(`(x+1)/(x+1) en −1 (${level}, ${verbosity}) : vaut 1, sans « x + 1 = x + 1 » ni « lim 1 = 1 »`, () => {
				const { result, rendered } = run('\\frac{x+1}{x+1}', '-1', level, verbosity);
				expect(result.value && toLatex(result.value)).toBe('1');
				expect(emptySteps(rendered)).toEqual([]);
				expect(rules(rendered)).not.toContain('apply-direct-substitution');
			});

			it(`(x^2-1)/(x-1) en 1 (${level}, ${verbosity}) : le dénominateur x − 1 ne se « factorise » pas`, () => {
				const { result, rendered } = run('\\frac{x^2-1}{x-1}', '1', level, verbosity);
				expect(result.value && toLatex(result.value)).toBe('2');
				expect(emptySteps(rendered)).toEqual([]);
				expect(rules(rendered)).toContain('factor-numerator');
				expect(rules(rendered)).not.toContain('factor-denominator');
			});
		}
	}
});

describe('4. prose : les maths entre $…$', () => {
	const PANEL: ReadonlyArray<readonly [string, string, LimitDirection?]> = [
		['\\frac1x', '0', 'left'],
		['\\frac1x', '0', 'right'],
		['\\frac1x', '0'],
		['\\frac{1}{x-2}', '2', 'right'],
		['\\frac{x^2-1}{x-1}', '1'],
		['\\frac{2x^2+1}{x^2-3}', '+\\infty'],
		['\\frac{x^3+1}{x}', '-\\infty'],
		['\\frac{\\ln x}{x}', '+\\infty'],
		['\\frac{e^x}{x}', '+\\infty'],
		['\\frac{\\sin x}{x}', '0'],
		['\\frac{1}{x^2}', '0'],
		['\\frac{\\sqrt{x+1}-1}{x}', '0'],
		['x\\sin\\left(\\frac{1}{x}\\right)', '0'],
		['e^{\\frac{1}{x}}', '0', 'right']
	];
	for (const [expression, approach, direction] of PANEL) {
		for (const level of LEVELS) {
			it(`${expression} en ${approach}${direction ? ` (${direction})` : ''} (${level})`, () => {
				const { result, rendered } = run(expression, approach, level, 'detailed', direction);
				expect(unicodeLeaks(rendered, result.steps)).toEqual([]);
			});
		}
	}

	it('les titres écrivent la valeur et la forme en LaTeX', () => {
		const left = run('\\frac1x', '0', 'lycee', 'detailed', 'left');
		expect(left.rendered.at(-1)?.title).toBe('La limite vaut $-\\infty$');
		const inf = run('\\frac{2x^2+1}{x^2-3}', '+\\infty', 'lycee');
		const form = flat(inf.rendered).find((s) => s.rule === 'detect-indeterminate-form');
		expect(form?.title).toContain('$\\frac{\\infty}{\\infty}$');
		const simplify = flat(inf.rendered).find((s) => s.rule === 'simplify-common-factor');
		expect(simplify?.title).toBe('Simplification par $x^2$');
	});
});

describe('5. côté d’un pôle, e, côté implicite', () => {
	for (const level of LEVELS) {
		it(`1/(x−2) en 2⁺ (${level}) : le signe du dénominateur`, () => {
			const { rendered } = run('\\frac{1}{x-2}', '2', level, 'detailed', 'right');
			const step = flat(rendered).find((s) => s.rule === 'analyze-right-limit');
			expect(step?.explanation).toContain('$x - 2 \\to 0^+$');
		});

		it(`ln x en 0 sans côté (${level}) : la limite à droite, −∞`, () => {
			const { result, rendered } = run('\\ln x', '0', level);
			expect(result.value && toLatex(result.value)).toBe('-\\infty');
			expect(rules(rendered)).toContain('apply-known-limit');
			// Le côté est dit : ln n'est définie qu'à droite de 0
			expect(rendered.some((s) => s.expressionLatex?.includes('0^+'))).toBe(true);
		});
	}

	it('(1 + 1/x)^x en +∞ : la valeur s’écrit e, jamais \\exp(1)', () => {
		const { result, rendered } = run('\\left(1+\\frac{1}{x}\\right)^{x}', '+\\infty', 'lycee');
		expect(result.value && toLatex(result.value)).not.toMatch(EXP_FUNCTION);
		for (const step of flat(rendered)) expect(step.expressionLatex).not.toMatch(EXP_FUNCTION);
	});
});

describe('non-régression : les cas justes gardent leur valeur', () => {
	const CASES: ReadonlyArray<readonly [string, string, string, LimitDirection?]> = [
		['\\frac{x^2-1}{x-1}', '1', '2'],
		['\\frac{2x^2+1}{x^2-3}', '+\\infty', '2'],
		['\\frac{\\ln x}{x}', '+\\infty', '0'],
		['x\\ln x', '0', '0', 'right'],
		['\\frac{\\sin x}{x}', '0', '1'],
		['\\frac{1}{x^2}', '0', '+\\infty']
	];
	for (const [expression, approach, value, direction] of CASES) {
		for (const level of LEVELS) {
			it(`${expression} en ${approach} (${level}) = ${value}`, () => {
				const { result } = run(expression, approach, level, 'detailed', direction);
				expect(result.value && toLatex(result.value)).toBe(value);
			});
		}
	}
});

describe('revue (2026-10-14)', () => {
	it('e^{sin x / x} en 0 : la valeur s’écrit e, jamais e^1', () => {
		const { result, rendered } = run('e^{\\frac{\\sin x}{x}}', '0', 'lycee');
		expect(result.value && toLatex(result.value)).toBe('\\exponentialE');
		for (const step of flat(rendered)) expect(step.expressionLatex).not.toContain('^1');
	});

	for (const [expression, left, right] of [
		['e^{\\frac{1}{x}}', '0', '+\\infty'],
		['e^{-\\frac{1}{x}}', '+\\infty', '0'],
		['e^{\\frac{1}{x-1}}', '0', '+\\infty']
	] as const) {
		const approach = expression.includes('x-1') ? '1' : '0';
		it(`${expression} en ${approach} sans côté : chaque côté montre sa composée`, () => {
			const { result, rendered } = run(expression, approach, 'lycee');
			expect(result.status).toBe('does-not-exist');
			for (const [rule, value] of [
				['analyze-left-limit', left],
				['analyze-right-limit', right]
			] as const) {
				const side = rendered.find((s) => s.rule === rule);
				expect(side?.expressionLatex).toContain(`= ${value}`);
				// La valeur finie (0) vient du pipeline sur ce côté : ses étapes restent visibles
				expect(side?.subSteps?.map((s) => s.rule)).toContain('apply-composition');
			}
		});
	}

	it('ln x / x en 0 sans côté : une seule étude du côté droit', () => {
		const { result, rendered } = run('\\frac{\\ln x}{x}', '0', 'lycee');
		expect(result.value && toLatex(result.value)).toBe('-\\infty');
		expect(rules(rendered).filter((r) => r === 'analyze-right-limit')).toHaveLength(1);
	});

	it('1/(x−1)² en 1 sans côté : +∞ des deux côtés, la limite existe', () => {
		const { result, rendered } = run('\\frac{1}{(x-1)^2}', '1', 'lycee');
		expect(result.status).toBe('infinite');
		expect(result.value && toLatex(result.value)).toBe('+\\infty');
		expect(rules(rendered)).not.toContain('conclude-does-not-exist');
	});

	it('x^x en 0 : forme 0⁰, pas de substitution « continue au point » — étapes refusées', () => {
		expect(() => run('x^x', '0', 'lycee')).toThrow(PedagogicalLimitNotImplemented);
	});
});
