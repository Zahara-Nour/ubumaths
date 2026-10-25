/**
 * `.résoudre` : multiplier quand l'inconnue est divisée, résoudre un membre
 * factorisé sans le développer (Q51 et Q52 du chantier `simplify-carte` ;
 * David, 2026-10-25 : « x/4 = 0,5 doit être résolu en multipliant par 4 ;
 * pourquoi pas d'étape pour 0,5(x+1) = 2 ? on divise par 0,5 puis on enlève 1 »).
 *
 * - **Q51** : un coefficient écrit en fraction (`x/4`, `\frac{2}{3}x`) se défait
 *   en multipliant par son inverse ; un coefficient décimal ou entier, en
 *   divisant (`0,5x = 1` → « On divise par 0,5 », inchangé).
 * - **Q52** : `k(…) = c` divisé par k (multiplié par l'inverse si k est une
 *   fraction), `−(…)` multiplié par −1, terme constant ôté d'abord,
 *   développement si x est des deux côtés, parenthèses ôtées après un +, sens
 *   retourné pour un facteur négatif dans une inéquation.
 *
 * Avant : « On divise par 1/4 » (Q51) ; aucune étape (`UndevelopedLinearForm`,
 * repli sur le moteur) pour tout membre non développé (Q52).
 */

import { describe, it, expect } from 'vitest';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';
import { solveSteps } from '../solve-steps';

// =============================================================================
// Décor
// =============================================================================

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

/** Les titres des étapes, l'étape d'identification ôtée. */
function titles(equation: string): string[] {
	return solved(equation)
		.steps.map((s) => s.title)
		.filter((t) => !t.includes('du premier degré'));
}

/** La forme obtenue par chaque étape (dernière ligne du bloc), l'identification ôtée. */
function forms(equation: string): string[] {
	return solved(equation)
		.steps.filter((s) => !s.title.includes('du premier degré') && !s.title.startsWith('Solution'))
		.map((s) => {
			const lines = flat(s.expressionLatex).split('|');
			return lines[lines.length - 1];
		});
}

function answer(equation: string): string {
	return flat(solved(equation).answer);
}

// =============================================================================
// Q51 : l'inconnue divisée, on multiplie
// =============================================================================

describe('.résoudre — Q51 : un coefficient en fraction se défait en multipliant', () => {
	it('x/4 = 0,5 : « On multiplie les deux membres par 4 », x = 2', () => {
		expect(titles('x/4=0,5')).toContain('On multiplie les deux membres par $4$');
		expect(titles('x/4=0,5').join(' ')).not.toContain('divise');
		expect(answer('x/4=0,5')).toBe('x=2');
	});

	it('\\frac{x}{4} = 0,5 : même chose', () => {
		expect(titles('\\frac{x}{4}=0,5')).toContain('On multiplie les deux membres par $4$');
		expect(answer('\\frac{x}{4}=0,5')).toBe('x=2');
	});

	it('x/3 < 0,1 : « On multiplie les deux membres par 3 », x < 0,3', () => {
		expect(titles('x/3<0,1')).toContain('On multiplie les deux membres par $3$');
		expect(answer('x/3<0,1')).toBe('x<0.3');
	});

	it('(2/3)x = 1 : « On multiplie les deux membres par 3/2 »', () => {
		expect(titles('\\frac{2}{3}x=1')).toContain(
			'On multiplie les deux membres par $\\dfrac{3}{2}$'
		);
		expect(answer('\\frac{2}{3}x=1')).toBe('x=\\dfrac{3}{2}');
	});

	it('2x/3 − 1 = 1 : on ajoute 1, puis on multiplie par 3/2', () => {
		expect(titles('\\frac{2x}{3}-1=1')).toEqual([
			'On ajoute $1$ aux deux membres',
			'On multiplie les deux membres par $\\dfrac{3}{2}$',
			'Solution : $x = 3$'
		]);
	});

	it('−x/4 < 1 : on multiplie par −4, le sens change', () => {
		expect(titles('-\\frac{x}{4}<1')).toContain(
			'On multiplie les deux membres par $-4$ (changement de sens car $-4$ est négatif)'
		);
		expect(answer('-\\frac{x}{4}<1')).toBe('x>-4');
	});

	it('témoins : 0,5x = 1 et 3x = 6 divisent toujours', () => {
		expect(titles('0,5x=1')).toContain('On divise les deux membres par $0.5$');
		expect(titles('3x=6')).toContain('On divise les deux membres par $3$');
	});
});

// =============================================================================
// Q52 : un membre factorisé, sans le développer
// =============================================================================

describe('.résoudre — Q52 : un membre factorisé se résout sans le développer', () => {
	it('0,5(x+1) = 2 : on divise par 0,5, puis on soustrait 1', () => {
		expect(titles('0,5(x+1)=2')).toEqual([
			'On divise les deux membres par $0.5$',
			'On soustrait $1$ aux deux membres',
			'Solution : $x = 3$'
		]);
		expect(forms('0,5(x+1)=2')).toEqual(['x+1=4', 'x=3']);
	});

	it('−(x − 3) = 0 : on multiplie par −1, puis on ajoute 3', () => {
		expect(titles('-(x-3)=0')).toEqual([
			'On multiplie les deux membres par $-1$',
			'On ajoute $3$ aux deux membres',
			'Solution : $x = 3$'
		]);
		expect(forms('-(x-3)=0')).toEqual(['x-3=0', 'x=3']);
	});

	it('2(x+1) + 3 = 7 : le terme constant d’abord, puis la division', () => {
		expect(titles('2(x+1)+3=7')).toEqual([
			'On soustrait $3$ aux deux membres',
			'On divise les deux membres par $2$',
			'On soustrait $1$ aux deux membres',
			'Solution : $x = 1$'
		]);
		expect(forms('2(x+1)+3=7')).toEqual(['2(x+1)=4', 'x+1=2', 'x=1']);
	});

	it('3 − (x − 1) = 5 : on soustrait 3, puis on multiplie par −1', () => {
		expect(forms('3-(x-1)=5')).toEqual(['-(x-1)=2', 'x-1=-2', 'x=-1']);
	});

	it('3(x − 1) = 2x + 1 : x des deux côtés, on développe', () => {
		const t = titles('3(x-1)=2x+1');
		expect(t[0]).toBe('On développe');
		expect(forms('3(x-1)=2x+1')[0]).toBe('3x-3=2x+1');
		expect(answer('3(x-1)=2x+1')).toBe('x=4');
	});

	it('2(x − 1) + x = 4 : deux termes en x, on développe', () => {
		expect(titles('2(x-1)+x=4')[0]).toBe('On développe');
		expect(forms('2(x-1)+x=4')[0]).toBe('2x-2+x=4');
		expect(answer('2(x-1)+x=4')).toBe('x=2');
	});

	it('3 + (x − 1) = 5 : parenthèses ôtées après un +', () => {
		expect(titles('3+(x-1)=5')[0]).toBe('On supprime les parenthèses');
		expect(forms('3+(x-1)=5')[0]).toBe('3+x-1=5');
		expect(answer('3+(x-1)=5')).toBe('x=3');
	});

	it('(x + 1)/2 = 3 : l’inconnue divisée, on multiplie par 2', () => {
		expect(titles('\\frac{x+1}{2}=3')[0]).toBe('On multiplie les deux membres par $2$');
		expect(forms('\\frac{x+1}{2}=3')).toEqual(['x+1=6', 'x=5']);
	});

	it('(2x − 4)/2 = 0 : on multiplie par 2', () => {
		expect(forms('(2x-4)/2=0')[0]).toBe('2x-4=0');
		expect(answer('(2x-4)/2=0')).toBe('x=2');
	});

	it('½(x + 1) = 3 : coefficient en fraction, on multiplie par 2', () => {
		expect(titles('\\frac{1}{2}(x+1)=3')[0]).toBe('On multiplie les deux membres par $2$');
		expect(forms('\\frac{1}{2}(x+1)=3')[0]).toBe('x+1=6');
	});

	it('4 = 2(x − 1) : l’inconnue à droite, même chemin', () => {
		expect(titles('4=2(x-1)')[0]).toBe('On divise les deux membres par $2$');
		expect(forms('4=2(x-1)')[0]).toBe('2=x-1');
		expect(answer('4=2(x-1)')).toBe('x=3');
	});

	it('inéquation : −(x − 1) > 0, on multiplie par −1 et le sens change', () => {
		expect(titles('-(x-1)>0')[0]).toBe(
			'On multiplie les deux membres par $-1$ (changement de sens car $-1$ est négatif)'
		);
		expect(forms('-(x-1)>0')[0]).toBe('x-1<0');
		expect(answer('-(x-1)>0')).toBe('x<1');
	});

	it('inéquation : −2(x + 1) ≤ 4, on divise par −2 et le sens change', () => {
		expect(titles('-2(x+1)\\le4')[0]).toBe(
			'On divise les deux membres par $-2$ (changement de sens car $-2$ est négatif)'
		);
		expect(forms('-2(x+1)\\le4')[0]).toBe('x+1\\geqslant-2');
		expect(answer('-2(x+1)\\le4')).toBe('x\\geqslant-3');
	});
});

describe('.résoudre — Q52 : parcours, la conclusion juste au bout des étapes', () => {
	it.each([
		['5-2(x-1)=1', 'x=3'],
		['2(3(x-1)+1)=8', 'x=2'],
		['\\frac{2(x+1)}{3}=4', 'x=5'],
		['-(x+1)+3=0', 'x=2'],
		['\\sqrt{2}(x-1)=2', 'x=1+\\sqrt{2}'],
		['2,5(x-0,4)=1', 'x=0.8'],
		['3-2(x+1)>7', 'x<-3'],
		['3(x-1)\\ne6', 'x\\neq3']
	])('%s répond %s', (equation, expected) => {
		expect(answer(equation)).toBe(expected);
	});
});
