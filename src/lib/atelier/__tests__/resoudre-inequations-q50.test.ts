/**
 * `.résoudre` : une inéquation écrite comme une équation (Q50 du chantier
 * `simplify-carte` ; David, 2026-10-25).
 *
 * - Les bornes de l'ensemble solution s'écrivent comme les solutions d'une
 *   équation (Q22, Q23) : `]−√2/2 ; √2/2[`, `(1 − √5)/2`, une vraie fraction
 *   au lieu de `1 / 2`.
 * - Les décimaux tapés restent décimaux dans les étapes, la conclusion et la
 *   ligne de réponse (Q46, S1) : `x < 0,3`, `x² − 0,5 < 0`, `[−0,5 ; 0,5]`.
 */

import { describe, it, expect } from 'vitest';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { solveSteps } from '../solve-steps';

// =============================================================================
// Décor
// =============================================================================

function solved(inequality: string): { steps: readonly RenderedStep[]; answer: string } {
	const result = solveSteps(inequality);
	if (result === null) throw new Error(`pas d'étapes pour ${inequality}`);
	return result;
}

/** Le LaTeX, sans espaces, sans couleur, sans `\left`/`\right` ni `\{` ; `\\` devient `|`. */
function flat(latex: string | undefined): string {
	return (latex ?? '')
		.replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '')
		.replace(/\\textcolor\{blue\}\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/g, '$1')
		.replace(/\\left|\\right/g, '')
		.replace(/\\,/g, '')
		.replace(/\\([{}])/g, '$1')
		.replace(/[\s&]/g, '')
		.replace(/\\\\/g, '|');
}

/** Tout le texte montré : titres et LaTeX des étapes, puis la réponse. */
function shown(inequality: string): string {
	const { steps, answer } = solved(inequality);
	return [...steps.map((s) => `${flat(s.title)} :: ${flat(s.expressionLatex)}`), flat(answer)].join(
		'\n'
	);
}

function answer(inequality: string): string {
	return flat(solved(inequality).answer);
}

/** La conclusion (dernière étape) dit la même chose que la ligne de réponse. */
function concludesAsAnswer(inequality: string): void {
	const { steps, answer: line } = solved(inequality);
	expect(flat(steps[steps.length - 1].expressionLatex)).toBe(flat(line));
}

// =============================================================================
// Bornes écrites comme des solutions
// =============================================================================

describe('.résoudre — les bornes s’écrivent comme les solutions d’une équation (Q50)', () => {
	it('x² < 0,5 : ]−√2/2 ; √2/2[', () => {
		expect(answer('x^2<0,5')).toBe('S=]-\\dfrac{\\sqrt{2}}{2};\\dfrac{\\sqrt{2}}{2}[');
		concludesAsAnswer('x^2<0,5');
	});

	it('x² − x − 1 < 0 : ](1 − √5)/2 ; (1 + √5)/2[, tableau de signes compris', () => {
		const text = shown('x^2-x-1<0');
		expect(answer('x^2-x-1<0')).toBe('S=]\\dfrac{1-\\sqrt{5}}{2};\\dfrac{1+\\sqrt{5}}{2}[');
		expect(text).not.toContain('\\dfrac{1}{2}\\sqrt{5}');
		concludesAsAnswer('x^2-x-1<0');
	});

	it('1/(2x − 1) > 0 : une vraie fraction, pas « 1 / 2 »', () => {
		expect(answer('1/(2x-1)>0')).toBe('S=]\\dfrac{1}{2};+\\infty[');
		expect(answer('(x-1)/(2x-1)<=0')).toBe('S=]\\dfrac{1}{2};1]');
		concludesAsAnswer('1/(2x-1)>0');
	});

	it('premier degré : 2x < √2 répond x < √2/2, dans l’étape aussi', () => {
		expect(answer('2x<\\sqrt{2}')).toBe('x<\\dfrac{\\sqrt{2}}{2}');
		expect(shown('2x<\\sqrt{2}')).not.toContain('\\dfrac{1}{2}\\sqrt{2}');
		expect(answer('2x<1+\\sqrt{5}')).toBe('x<\\dfrac{1+\\sqrt{5}}{2}');
	});

	it('sans décimal, 3x < 1 garde x < 1/3', () => {
		expect(answer('3x<1')).toBe('x<\\dfrac{1}{3}');
	});
});

// =============================================================================
// Décimaux gardés
// =============================================================================

describe('.résoudre — les décimaux tapés restent décimaux dans une inéquation (Q50)', () => {
	it('2x < 0,6 : x < 0,3 dans la division et sur la ligne', () => {
		const text = shown('2x<0,6');
		expect(answer('2x<0,6')).toBe('x<0.3');
		expect(text).not.toContain('\\dfrac{3}{10}');
	});

	it('−2x ≤ 0,6 : x ≥ −0,3, sens retourné', () => {
		expect(answer('-2x<=0,6')).toBe('x\\geqslant-0.3');
	});

	it('0,5x > 1 : « On divise les deux membres par 0,5 »', () => {
		const text = shown('0,5x>1');
		expect(text).toContain('0.5');
		expect(text).not.toContain('\\dfrac{1}{2}');
		expect(answer('0,5x>1')).toBe('x>2');
	});

	it('x² < 0,5 : x² − 0,5 < 0 dans les étapes', () => {
		const text = shown('x^2<0,5');
		expect(text).toContain('x^2-0.5<0');
		expect(text).not.toContain('x^2-\\dfrac{1}{2}');
	});

	it('x² ≤ 0,25 : [−0,5 ; 0,5]', () => {
		const text = shown('x^2<=0,25');
		expect(text).toContain('x^2-0.25\\leqslant0');
		expect(answer('x^2<=0,25')).toBe('S=[-0.5;0.5]');
		concludesAsAnswer('x^2<=0,25');
	});

	it('(x − 0,5)/(x + 1) > 0 : la racine 0,5 partout, jusqu’au tableau', () => {
		const text = shown('(x-0,5)/(x+1)>0');
		expect(answer('(x-0,5)/(x+1)>0')).toBe('S=]-\\infty;-1[\\cup]0.5;+\\infty[');
		expect(text).not.toContain('\\dfrac{1}{2}');
		concludesAsAnswer('(x-0,5)/(x+1)>0');
	});
});
