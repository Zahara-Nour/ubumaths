/**
 * Deux défauts de rendu du second degré, vus à l'écran.
 *
 * ⚠️ Le premier n'est pas cosmétique : il rend une expression FAUSSE.
 */

import { describe, it, expect } from 'vitest';
import { generateEquationSteps, generateInequalitySteps } from '../index';
import { parseCustomSafe } from '../../parser/custom';
import { QuadraticEquationRenderer } from '../quadratic-renderer';
import { toLatex } from '../../latex-generator';
import type { MathNode } from '../../types';

const ast = (s: string) => (parseCustomSafe(s) as { ast: never }).ast;

function rawSolutionsLatex(source: string): string {
	const steps = generateEquationSteps(ast(source), { level: 'lycee' });
	const step = steps.find((s) => s.rule === 'simplify-solutions');
	const op = step?.operation;
	if (op?.kind !== 'simplify-solutions') throw new Error(`pas de simplify pour ${source}`);
	return op.rawSolutions.map((s: MathNode) => toLatex(s)).join(' | ');
}

describe('le dénominateur 2a des solutions substituées', () => {
	/**
	 * ⚠️ **Le dénominateur était construit en multiplication IMPLICITE.** Juste
	 * pour `2a` tant que `a` est une lettre ; illisible, puis franchement faux,
	 * dès que `a` est le nombre qu'il est toujours ici (les coefficients
	 * paramétriques sont refusés en amont) :
	 *
	 *   a = 1   →  `\dfrac{3 - \sqrt{5}}{2 1}`    illisible
	 *   a = 2   →  `\dfrac{3 - \sqrt{1}}{2 2}`    se lit « vingt-deux »
	 *   a = -1  →  `\dfrac{-3 - \sqrt{5}}{2 -1}`  se lit « 2 − 1 », soit 1 : FAUX
	 */
	it('a = 1 : un point médian, pas une juxtaposition', () => {
		const latex = rawSolutionsLatex('x^2-3x+1=0');

		expect(latex).toContain('2 \\cdot 1');
		expect(latex).not.toContain('{2 1}');
	});

	it('a = 2 : « 2 2 » ne doit pas se lire vingt-deux', () => {
		const latex = rawSolutionsLatex('2x^2-3x+1=0');

		expect(latex).toContain('2 \\cdot 2');
		expect(latex).not.toContain('{2 2}');
	});

	it('a négatif : « 2 -1 » se lisait comme une soustraction', () => {
		const latex = rawSolutionsLatex('-x^2+3x-1=0');

		// Sans le séparateur, le dénominateur valait 1 au lieu de -2.
		expect(latex).toContain('2 \\cdot');
		expect(latex).not.toContain('{2 -1}');
	});

	it('la racine double aussi', () => {
		const latex = rawSolutionsLatex('x^2-2x+1=0');

		expect(latex).not.toMatch(/\{2 -?\d/);
	});
});

describe('la spécification de colonnes du tableau rationnel', () => {
	/**
	 * ⚠️ `\begin{array}{|c|cccccc|}` déclarait **une colonne de moins** qu'il n'y
	 * avait de cases. Sans effet à l'écran depuis que le tableau se dessine en
	 * HTML, mais les exports qui composent le LaTeX (Typst, PDF) s'appuient
	 * dessus.
	 */
	it('autant de colonnes déclarées que de cases', () => {
		const steps = generateInequalitySteps(ast('(x-1)/(x+2)>0'), { level: 'lycee' });
		const rendered = new QuadraticEquationRenderer().renderAll(steps, {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		const table = rendered.find((s) => s.rule === 'rational-sign-table');
		const latex = table?.expressionLatex ?? '';

		const spec = /\\begin\{array\}\{\|c\|(c+)\|\}/.exec(latex);
		expect(spec, 'spécification de colonnes introuvable').not.toBeNull();

		const declared = 1 + spec![1].length;
		const cells = (latex.split('\\hline')[1] ?? '').split('&').length;
		expect(declared).toBe(cells);
	});
});
