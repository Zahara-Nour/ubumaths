/**
 * `.résoudre` : étapes du solveur (lot 5f-4 du chantier `simplify-carte`, R8 ;
 * Q46, David, 2026-10-24).
 *
 * - Les décimaux tapés restent décimaux dans les étapes (S1 : décimal si
 *   l'écriture est finie, sinon fraction) : `x = 0,3`, `0,5x = 1`, « On divise
 *   les deux membres par 0,5 », comme la réponse de la ligne.
 * - Les solutions s'écrivent dans les étapes comme dans la réponse :
 *   `S = {−√2/2 ; √2/2}`, `(1 − √5)/2` (Q22, Q23).
 */

import { describe, it, expect } from 'vitest';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { solveSteps } from '../solve-steps';

// =============================================================================
// Décor
// =============================================================================

/** Une fraction de deux entiers (`\\dfrac{3}{10}`) — pas le trait d'une division (`\\dfrac{2x}{2}`). */
const NUMERIC_FRACTION = /\\dfrac\{-?\d+\}\{\d+\}/;

function solved(equation: string): { steps: readonly RenderedStep[]; answer: string } {
	const result = solveSteps(equation);
	if (result === null) throw new Error(`pas d'étapes pour ${equation}`);
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
function shown(equation: string): string {
	const { steps, answer } = solved(equation);
	return [...steps.map((s) => `${s.title} :: ${flat(s.expressionLatex)}`), flat(answer)].join('\n');
}

function last(equation: string): RenderedStep {
	const { steps } = solved(equation);
	return steps[steps.length - 1];
}

// =============================================================================
// Décimaux gardés
// =============================================================================

describe('.résoudre — les décimaux tapés restent décimaux dans les étapes (Q46)', () => {
	it('2x = 0,6 : x = 0,3 dans la division et dans la solution', () => {
		const text = shown('2x=0,6');
		expect(text).toContain('x=0.3');
		expect(last('2x=0,6').title).toBe('Solution : $x = 0.3$');
		expect(text).not.toContain('\\dfrac{3}{10}');
	});

	it('0,5x + 1 = 2 : 0,5x = 1, puis « On divise les deux membres par 0,5 »', () => {
		const text = shown('0,5x+1=2');
		expect(text).toContain('0.5x=1');
		expect(text).toContain('On divise les deux membres par $0.5$');
		expect(text).not.toContain('\\dfrac{1}{2}');
	});

	it('0,5x + 1 = 0,2 : −0,8 puis −1,6', () => {
		const text = shown('0,5x+1=0,2');
		expect(text).toContain('0.5x=-0.8');
		expect(text).toContain('x=-1.6');
		expect(text).not.toMatch(NUMERIC_FRACTION);
	});

	it('0,1x + 0,2 = 0,3x : les termes déplacés restent décimaux', () => {
		const text = shown('0,1x+0,2=0,3x');
		expect(text).toContain('On soustrait $0.3x$ aux deux membres');
		expect(text).not.toMatch(NUMERIC_FRACTION);
	});

	it('une fraction sans écriture décimale finie reste une fraction : 0,3x = 1 → x = 10/3', () => {
		const text = shown('0,3x=1');
		expect(text).toContain('x=\\dfrac{10}{3}');
	});

	it('|2x| = 0,6 : les deux branches en décimaux', () => {
		const text = shown('|2x|=0,6');
		expect(text).toContain('$0.6$ et $-0.6$');
		expect(text).toContain('2x=-0.6');
		expect(text).toContain('x=-0.3');
		expect(text).not.toMatch(NUMERIC_FRACTION);
	});

	it('second degré : coefficients, discriminant et formule en décimaux', () => {
		const text = shown('0,5x^2+x-1,5=0');
		expect(text).toContain('a=0.5,\\quadb=1,\\quadc=-1.5');
		expect(text).toContain('2\\times0.5');
		expect(text).not.toContain('\\dfrac{1}{2}');
		expect(text).not.toContain('\\dfrac{3}{2}');
	});

	it('x² + x = 0,75 : la forme ax² + bx + c = 0 et les solutions en décimaux', () => {
		const text = shown('x^2+x=0,75');
		expect(text).toContain('x^2+x-0.75=0');
		expect(flat(last('x^2+x=0,75').expressionLatex)).toBe('S={-1.5;0.5}');
	});

	it('la racine du discriminant reste décimale : Δ = 0,16, puis √0,16', () => {
		const text = shown('x^2-0,2x-0,03=0');
		expect(text).toContain('=0.16');
		expect(text).toContain('\\sqrt{0.16}');
		expect(text).not.toMatch(NUMERIC_FRACTION);
	});

	it('x² = 0,5 : x = ±√0,5', () => {
		expect(shown('x^2=0,5')).toContain('x=\\pm\\sqrt{0.5}');
	});

	it('produit nul : x(x − 0,5) = 0 → S = {0 ; 0,5}', () => {
		expect(flat(last('x(x-0,5)=0').expressionLatex)).toBe('S={0;0.5}');
		expect(shown('x(x-0,5)=0')).not.toMatch(NUMERIC_FRACTION);
	});

	it('0,5x² − x = 0 : la factorisation garde 0,5', () => {
		const text = shown('0,5x^2-x=0');
		expect(text).toContain('x(0.5x-1)=0');
		expect(text).not.toMatch(NUMERIC_FRACTION);
	});

	it("l'équation tapée reste telle qu'elle est écrite", () => {
		const { steps } = solved('x/4=0,5');
		expect(flat(steps[0].expressionLatex)).toBe('\\dfrac{x}{4}=0.5');
	});
});

// =============================================================================
// Solutions écrites comme la réponse
// =============================================================================

describe('.résoudre — les solutions des étapes ont l’écriture de la réponse (Q46)', () => {
	it('2x² = 1 : S = {−√2/2 ; √2/2}, comme la réponse', () => {
		const step = last('2x^2=1');
		expect(flat(step.expressionLatex)).toBe('S={-\\dfrac{\\sqrt{2}}{2};\\dfrac{\\sqrt{2}}{2}}');
		expect(flat(solved('2x^2=1').answer)).toBe(flat(step.expressionLatex));
	});

	it('x² = 0,5 : même écriture (un irrationnel n’a pas d’écriture décimale finie)', () => {
		expect(flat(last('x^2=0,5').expressionLatex)).toBe(
			'S={-\\dfrac{\\sqrt{2}}{2};\\dfrac{\\sqrt{2}}{2}}'
		);
	});

	it('x² − x − 1 = 0 : « On simplifie les solutions » donne (1 − √5)/2, une seule fraction', () => {
		const text = shown('x^2-x-1=0');
		expect(text).toContain('=\\dfrac{1-\\sqrt{5}}{2}|');
		expect(text).not.toContain('\\dfrac{1}{2}\\sqrt{5}');
		const { steps, answer } = solved('x^2-x-1=0');
		expect(flat(steps[steps.length - 1].expressionLatex)).toBe(flat(answer));
	});

	it('sans décimal tapé, une fraction reste une fraction : 3x = 2 → x = 2/3', () => {
		expect(last('3x=2').title).toBe('Solution : $x = \\dfrac{2}{3}$');
		expect(flat(last('(x-1)(2x-1)=0').expressionLatex)).toBe('S={1;\\dfrac{1}{2}}');
	});

	it('les étapes d’une équation sans décimal ni irrationnel ne changent pas', () => {
		expect(shown('3x+1=2')).toContain('3x=1');
		expect(shown('x^2-5x+6=0')).toContain('S={2;3}');
	});
});
