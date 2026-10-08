/**
 * Premier degré : un terme en x qui n'est pas de la forme `a·x`.
 *
 * Mesuré avant correctif (2026-10-08) : le générateur lit le coefficient de x
 * comme `terme / x`, sans vérifier que ce quotient est constant. Un membre
 * `(2x-4)` est UN SEUL terme pour `flattenSumShallow` (les délimiteurs sont
 * une frontière) : coefficient `(2x-4)/x`, division des deux membres par lui,
 * conclusion `x = 0`. Même défaut pour `2(x-1)=4` (x = 2x/(x-1)), `-(x-3)=0`
 * (x = 0), `(2x-4)/2=0` (x = 0) et l'inéquation `(x-1)>0` (x > 0).
 *
 * Le correctif #860 avait réparé le même défaut dans `solve.command.ts`, un
 * AUTRE générateur d'étapes : `pedagogical-solve` n'en a jamais bénéficié.
 */

import { describe, expect, it } from 'vitest';
import { parseLatex } from '../../parser';
import { isRelation } from '../../guards';
import type { RelationNode } from '../../types';
import { toLatex } from '../../latex-generator';
import { generateEquationSteps, generateInequalitySteps, UndevelopedLinearForm } from '..';

function rel(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (!isRelation(node)) throw new Error(`pas une relation : ${latex}`);
	return node;
}

function lastAfter(latex: string): string {
	const r = rel(latex);
	const steps =
		r.relation === '='
			? generateEquationSteps(r, { level: 'college', variable: 'x' })
			: generateInequalitySteps(r, { level: 'college', variable: 'x' });
	return toLatex(steps[steps.length - 1].after);
}

describe('membre entièrement parenthésé : raconté comme son contenu', () => {
	it.each([
		['(2x-4)=0', 'x = 2'],
		['\\left(2x-4\\right)=0', 'x = 2'],
		['(x+1)=3', 'x = 2'],
		['((x))=5', 'x = 5'],
		['0=(x-4)', 'x = 4'],
		['(x-1)>0', 'x > 1'],
		['(3-x)\\le 1', 'x \\geqslant 2']
	])('%s conclut %s', (input, expected) => {
		expect(lastAfter(input)).toBe(expected);
	});

	it('(2x-4)=0 raconte les mêmes étapes que 2x-4=0', () => {
		const withParens = generateEquationSteps(rel('(2x-4)=0'), { level: 'college' });
		const without = generateEquationSteps(rel('2x-4=0'), { level: 'college' });
		expect(withParens.map((s) => s.rule)).toEqual(without.map((s) => s.rule));
		expect(withParens.map((s) => toLatex(s.after))).toEqual(without.map((s) => toLatex(s.after)));
	});
});

describe('terme en x non développé : pas d’étapes plutôt que des étapes fausses', () => {
	it.each(['2(x-1)=4', '-(x-3)=0', '(2x-4)/2=0', '3+(x-1)=5', '-(x-1)>0'])(
		'%s lève UndevelopedLinearForm',
		(input) => {
			const r = rel(input);
			expect(() =>
				r.relation === '='
					? generateEquationSteps(r, { level: 'college', variable: 'x' })
					: generateInequalitySteps(r, { level: 'college', variable: 'x' })
			).toThrow(UndevelopedLinearForm);
		}
	);

	it.each([
		['3x+5=14x', 'x = \\dfrac{5}{11}'],
		['\\dfrac{x}{2}=3', 'x = 6'],
		['-3x=6', 'x = -2'],
		['\\dfrac{2}{3}x-1=1', 'x = 3']
	])('témoin : %s (coefficients constants) conclut %s', (input, expected) => {
		expect(lastAfter(input)).toBe(expected);
	});
});
