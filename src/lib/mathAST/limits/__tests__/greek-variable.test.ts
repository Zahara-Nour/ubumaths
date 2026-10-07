/**
 * Variable de limite grecque (`\lim_{\alpha\to+\infty}`, `\lim_{\theta\to0}`).
 *
 * Un exercice en production écrit `\lim_{\alpha\to+\infty}\frac{\alpha+1}{\alpha+2}`.
 * Le parseur n'acceptait qu'une lettre latine comme variable (« Expected \to
 * in limit subscript »). La variable d'un nœud `limit` est alors le NOM de la
 * lettre (`'alpha'`), celui que porte le nœud `greek` du corps : le moteur la
 * retrouve par `containsVariable` / la substitution.
 *
 * π est une constante : `\lim_{\pi\to…}` est refusé avec un message clair.
 *
 * Chaque cas asserte la VALEUR rendue, et les deux parseurs le même arbre.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { parseLatex } from '../../parser';
import { parsePratt } from '../../parser/latex/parser-pratt';
import { parseRD } from '../../parser/latex/parser-rd';
import { toLatex } from '../../latex-generator';
import { isLimit } from '../../guards';
import type { LimitResult } from '../types';

function describeLimit(result: LimitResult): string {
	if (result.value === null) return `${result.status} null`;
	if (result.value.type === 'infinity') {
		return `${result.status} ${result.value.sign === 'positive' ? '+inf' : '-inf'}`;
	}
	return `${result.status} ${toLatex(result.value)}`;
}

function studentLimit(latex: string): string {
	const node = parseLatex(latex);
	if (!isLimit(node)) throw new Error(`${latex} n'est pas une limite`);
	return describeLimit(evaluateLimit(node));
}

const CASES: ReadonlyArray<readonly [string, string]> = [
	['\\lim_{\\alpha\\to+\\infty}\\frac{\\alpha+1}{\\alpha+2}', 'exact 1'],
	['\\lim_{\\alpha\\to+\\infty}\\ln\\frac{\\alpha+1}{\\alpha+2}', 'exact 0'],
	['\\lim_{\\theta\\to0}\\frac{\\sin\\theta}{\\theta}', 'exact 1'],
	['\\lim_{\\phi\\to+\\infty}3\\phi^2-\\phi', 'infinite +inf'],
	['\\lim_{t\\to0^+}\\ln t', 'exact -inf']
];

describe('limite dont la variable est une lettre grecque', () => {
	it.each(CASES)('%s → %s', (latex, expected) => {
		expect(studentLimit(latex)).toBe(expected);
	});

	it('la variable du nœud limit est le nom de la lettre', () => {
		const node = parseLatex('\\lim_{\\alpha\\to+\\infty}\\frac{\\alpha+1}{\\alpha+2}');
		expect(isLimit(node) && node.variable).toBe('alpha');
	});

	it.each(CASES)('Pratt et RD rendent le même arbre : %s', (latex) => {
		expect(parseRD(latex)).toEqual(parsePratt(latex));
	});

	it.each([
		['Pratt', parsePratt],
		['RD', parseRD]
	] as const)('%s : π ne peut pas être la variable de limite', (_name, parse) => {
		expect(() => parse('\\lim_{\\pi\\to0}\\pi')).toThrow(/π|\\pi/);
	});

	it('une lettre grecque sans accolades : \\lim_\\theta', () => {
		const node = parseLatex('\\lim_\\theta \\theta');
		expect(isLimit(node) && node.variable).toBe('theta');
	});
});
