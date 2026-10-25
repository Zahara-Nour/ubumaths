/**
 * `.limite` : étapes de limite (lot 5f-3 du chantier `simplify-carte`, R7 ;
 * Q45 « les deux », David, 2026-10-24).
 *
 * - Les décimaux tapés restent décimaux dans les étapes (S1 : décimal si
 *   l'écriture est finie, sinon fraction) : `x²(0,5 + 1/x²)`, « La limite
 *   vaut 0,5 », comme la réponse de la ligne.
 * - « Simplification du facteur commun » montre le calcul : le développement
 *   (quand l'écriture tapée n'est pas développée), la factorisation, puis la
 *   simplification : `((x+1)² − 1)/x = (x² + 2x)/x = x(x + 2)/x = x + 2`.
 */

import { describe, it, expect } from 'vitest';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput, type CalcSession } from '../calcul';
import { inDecimalRegister } from '$lib/mathAST/pedagogical-limits/decimal-register';
import { divide, number, opposite, subtract, variable } from '$lib/mathAST/factory';
import { toLatex } from '$lib/mathAST/latex-generator';

// =============================================================================
// Décor
// =============================================================================

function steps(input: string): readonly RenderedStep[] {
	const s: CalcSession = { atelier: new Atelier(), engine: new WebReplEngine() };
	const result = runInput(s, input);
	if (result.kind !== 'commande') throw new Error(`attendu une commande, reçu ${result.kind}`);
	if (result.steps === undefined) throw new Error(`pas d'étapes pour ${input}`);
	return result.steps;
}

/** Le LaTeX d'une étape, sans espaces, sans couleur, sans `\left`/`\right` ; `\\` devient `|`. */
function flat(step: RenderedStep): string {
	return (step.expressionLatex ?? '')
		.replace(/\\begin\{aligned\}|\\end\{aligned\}/g, '')
		.replace(/\\textcolor\{blue\}\{((?:[^{}]|\{(?:[^{}]|\{[^{}]*\})*\})*)\}/g, '$1')
		.replace(/\\left|\\right/g, '')
		.replace(/[\s&]/g, '')
		.replace(/\\\\/g, '|');
}

/** Tout ce qu'affichent les étapes : titres, explications, LaTeX, sous-étapes comprises. */
function shown(list: readonly RenderedStep[]): string {
	return list
		.flatMap((s) => [s.title, s.explanation ?? '', flat(s), shown(s.subSteps ?? [])])
		.join('\n');
}

function step(list: readonly RenderedStep[], title: string): RenderedStep {
	const found = list.find((s) => s.title === title);
	if (found === undefined) throw new Error(`pas d'étape « ${title} »`);
	return found;
}

function last(list: readonly RenderedStep[]): RenderedStep {
	return list[list.length - 1];
}

// =============================================================================
// Décimaux gardés (Q45, 1)
// =============================================================================

describe('les décimaux tapés restent décimaux dans les étapes', () => {
	it('(0,5x² + 1)/x² en +∞ : x²(0,5 + 1/x²), la limite vaut 0,5', () => {
		const list = steps('.limite (0,5x^2+1)/x^2 en +inf');
		expect(flat(step(list, 'On factorise par le terme prépondérant'))).toContain(
			'x^2(0{,}5+\\dfrac{1}{x^2})'
		);
		expect(last(list).title).toBe('La limite vaut $0{,}5$');
		expect(flat(last(list))).toBe('\\lim_{x\\to+\\infty}\\dfrac{0{,}5x^2+1}{x^2}|=0{,}5');
		expect(shown(list)).not.toContain('\\dfrac{1}{2}');
	});

	it('(1,5x + 2)/(3x − 1) en +∞ : 1,5 et 0,5 partout, jamais 3/2 ni 1/2', () => {
		const list = steps('.limite (1,5x+2)/(3x-1) en +inf');
		expect(flat(step(list, 'On factorise par le terme prépondérant'))).toContain(
			'x(1{,}5+\\dfrac{2}{x})'
		);
		expect(last(list).title).toBe('La limite vaut $0{,}5$');
		const all = shown(list);
		expect(all).not.toContain('\\dfrac{3}{2}');
		expect(all).not.toContain('\\dfrac{1}{2}');
		expect(all).toContain('vaut $0{,}5$');
	});

	it('écriture décimale infinie : la fraction (0,5x + 1)/(1,5x) en +∞ → 1/3', () => {
		const list = steps('.limite (0,5x+1)/(1,5x) en +inf');
		expect(last(list).title).toBe('La limite vaut $\\dfrac{1}{3}$');
		expect(shown(list)).toContain('0{,}5');
	});

	it('sans décimal tapé, les fractions restent : (x² + 1)/(2x²) en +∞ → 1/2', () => {
		const list = steps('.limite (x^2+1)/(2x^2) en +inf');
		expect(last(list).title).toBe('La limite vaut $\\dfrac{1}{2}$');
		expect(shown(list)).not.toContain('{,}');
	});

	it('(0,5x² − 0,5)/(x − 1) en 1 : 0,5(x − 1)(x + 1), puis 0,5(x + 1)', () => {
		const list = steps('.limite (0,5x^2-0,5)/(x-1) en 1');
		const simplification = flat(step(list, 'Simplification du facteur commun'));
		expect(simplification).toContain('\\dfrac{0{,}5(x-1)(x+1)}{x-1}');
		expect(simplification).toContain('=\\lim_{x\\to1}0{,}5(x+1)');
		expect(shown(list)).not.toContain('\\dfrac{1}{2}');
		expect(last(list).title).toBe('La limite vaut $1$');
	});
});

describe('revue de 5f-3 : le registre décimal', () => {
	it('(x² − x)/(0,5x) en 0 : pas de « 0,5x = 0,5x » en sous-étape', () => {
		const list = steps('.limite (x^2-x)/(0,5x) en 0');
		const simplification = step(list, 'Simplification du facteur commun');
		const subTitles = (simplification.subSteps ?? []).map((s) => s.title);
		expect(subTitles.some((t) => t.startsWith('Factorisation du dénominateur'))).toBe(false);
	});

	it('(−0,5x² + 0,5)/(x − 1) en 1 : le signe devant, −0,5(x + 1)', () => {
		const list = steps('.limite (-0,5x^2+0,5)/(x-1) en 1');
		const simplification = flat(step(list, 'Simplification du facteur commun'));
		expect(simplification).toContain('=\\lim_{x\\to1}-0{,}5(x+1)');
		expect(shown(list)).not.toContain('0{,}5(-x');
	});
});

describe('inDecimalRegister', () => {
	it('x/1 → x, jamais 1x', () => {
		expect(toLatex(inDecimalRegister(divide(variable('x'), number('1'), 'fraction')))).toBe('x');
	});

	it('(−x − 1)/2 → −0,5(x + 1)', () => {
		const node = divide(subtract(opposite(variable('x')), number('1')), number('2'), 'fraction');
		expect(toLatex(inDecimalRegister(node)).replace(/\s/g, '')).toBe('-0.5\\left(x+1\\right)');
	});
});

// =============================================================================
// Le développement montré (Q45, 2)
// =============================================================================

describe('« Simplification du facteur commun » montre le calcul', () => {
	it('((x+1)² − 1)/x en 0 : développé, factorisé, simplifié', () => {
		const list = steps('.limite ((x+1)^2-1)/x en 0');
		expect(flat(step(list, 'Simplification du facteur commun'))).toBe(
			'\\lim_{x\\to0}\\dfrac{(x+1)^2-1}{x}' +
				'|=\\lim_{x\\to0}\\dfrac{x^2+2x}{x}' +
				'|=\\lim_{x\\to0}\\dfrac{x(x+2)}{x}' +
				'|=\\lim_{x\\to0}(x+2)'
		);
	});

	it('(x² − 1)/(x − 1) en 1 : déjà développé, factorisé puis simplifié', () => {
		const list = steps('.limite (x^2-1)/(x-1) en 1');
		expect(flat(step(list, 'Simplification du facteur commun'))).toBe(
			'\\lim_{x\\to1}\\dfrac{x^2-1}{x-1}' +
				'|=\\lim_{x\\to1}\\dfrac{(x-1)(x+1)}{x-1}' +
				'|=\\lim_{x\\to1}(x+1)'
		);
	});

	it('(x³ − 1)/(x − 1) en 1 : (x − 1)(x² + x + 1)/(x − 1)', () => {
		const list = steps('.limite (x^3-1)/(x-1) en 1');
		expect(flat(step(list, 'Simplification du facteur commun'))).toBe(
			'\\lim_{x\\to1}\\dfrac{x^3-1}{x-1}' +
				'|=\\lim_{x\\to1}\\dfrac{(x-1)(x^2+x+1)}{x-1}' +
				'|=\\lim_{x\\to1}(x^2+x+1)'
		);
	});

	it('déjà factorisé tapé : x(x + 1)/x en 0, pas de ligne répétée', () => {
		const list = steps('.limite (x(x+1))/x en 0');
		expect(flat(step(list, 'Simplification du facteur commun'))).toBe(
			'\\lim_{x\\to0}\\dfrac{x(x+1)}{x}|=\\lim_{x\\to0}(x+1)'
		);
	});

	it('les deux côtés factorisés : (x² − 1)/(x² − x) en 1', () => {
		const list = steps('.limite (x^2-1)/(x^2-x) en 1');
		const lines = flat(step(list, 'Simplification du facteur commun')).split('|');
		expect(lines).toHaveLength(3);
		expect(lines[1]).toContain('(x-1)(x+1)');
		expect(lines[2]).toBe('=\\lim_{x\\to1}\\dfrac{x+1}{x}');
	});
});

describe('.limite — la racine d’un nombre tapée reste écrite (revue du lot 5f-4)', () => {
	it('√(1/4)x² + 0,5x : pas de √0,25 à côté de √(1/4)', () => {
		const text = steps('.limite \\sqrt{\\frac{1}{4}}x^2+0,5x en +inf').map(flat).join('\n');
		expect(text).not.toMatch(/\\sqrt\{0(\{,\}|[.,])25\}/);
	});
});
