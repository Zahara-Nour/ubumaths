/**
 * Écart V40 — un facteur collé à une valeur absolue : `2|x|`, `x|x|`, `|x||y|`
 * ===========================================================================
 *
 * Un élève tape `2|x|=6` au clavier : le parseur répondait « Unexpected token: | »
 * (seul `2\left|x\right|` passait). La barre `|` ne déclenchait jamais la
 * multiplication implicite, faute de savoir si elle ouvrait ou fermait.
 *
 * Règle choisie (ouvrante / fermante) : dans un même groupe (parenthèses,
 * accolades, `\left…\right`, contenu d'une valeur absolue), une barre qui suit
 * un facteur FERME la valeur absolue en cours s'il y en a une, et en OUVRE une
 * nouvelle (produit implicite) sinon. Après un opérateur ou au début, elle ouvre.
 *
 * Ambiguïté refusée : `|2|x|-1|` se lit |2|·x·|−1| ou |2|x|−1| ; on ne devine
 * pas, on demande `\left|…\right|`.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../index';
import { evaluate } from '../../../eval';
import { toLatex } from '../../../latex-generator';
import { substitute } from '../../../eval/substitute';
import { solve } from '../../../solve/solve';
import { evaluateNodeToApproximatedNumber } from '../../../eval/evaluate';
import { isSolverFailure } from '../../../solve/types';
import type { RelationNode } from '../../../types';

function valueAt(latex: string, x: number, y = 0): number {
	const result = evaluate(substitute(parseLatex(latex), { x, y }), { mode: 'decimal' });
	if (result.status !== 'value' || typeof result.value !== 'number') {
		throw new Error(`Pas de valeur pour ${latex}`);
	}
	return result.value;
}

function relationOf(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error(`Relation attendue : ${latex}`);
	return node;
}

// Coefficients ≠ 1, x négatif : un facteur oublié ou une barre mal appariée se voit
const POINTS: Array<[number, number]> = [
	[-2.5, 1.5],
	[0.75, -3]
];

describe('facteur collé à une barre ouvrante = produit implicite', () => {
	it.each<[string, (x: number, y: number) => number]>([
		['2|x|', (x) => 2 * Math.abs(x)],
		['3|x-1|', (x) => 3 * Math.abs(x - 1)],
		['x|x|', (x) => x * Math.abs(x)],
		['-2|x+1|', (x) => -2 * Math.abs(x + 1)],
		['\\frac12|x|', (x) => 0.5 * Math.abs(x)],
		['\\pi|x|', (x) => Math.PI * Math.abs(x)],
		['2|x|+|x-1|', (x) => 2 * Math.abs(x) + Math.abs(x - 1)],
		['|x||y|', (x, y) => Math.abs(x) * Math.abs(y)],
		['\\left|x\\right||y|', (x, y) => Math.abs(x) * Math.abs(y)],
		['|x| |y|', (x, y) => Math.abs(x) * Math.abs(y)],
		['|x|\\,|y|', (x, y) => Math.abs(x) * Math.abs(y)],
		['3|x|-2|y|', (x, y) => 3 * Math.abs(x) - 2 * Math.abs(y)],
		['2|x|^2', (x) => 2 * Math.abs(x) ** 2],
		// Dans un groupe neuf (parenthèses, accolades), la barre ouvre de nouveau
		['|3(1+2|x|)|', (x) => Math.abs(3 * (1 + 2 * Math.abs(x)))],
		['|\\frac{2|x|}{3}-1|', (x) => Math.abs((2 * Math.abs(x)) / 3 - 1)]
	])('%s', (latex, expected) => {
		for (const [x, y] of POINTS) {
			expect(valueAt(latex, x, y), `${latex} en x = ${x}, y = ${y}`).toBeCloseTo(
				expected(x, y),
				10
			);
		}
	});

	it('2|x| a le même arbre que 2\\left|x\\right|', () => {
		expect(parseLatex('2|x|')).toEqual(parseLatex('2\\left|x\\right|'));
	});

	it.each(['2|x|', '3|x-1|', 'x|x|', '|x||y|', '-2|x+1|=6'])(
		'aller-retour : toLatex(%s) se relit à l’identique',
		(latex) => {
			const once = toLatex(parseLatex(latex));
			expect(toLatex(parseLatex(once))).toBe(once);
		}
	);
});

describe('rien ne change pour ce qui passait déjà', () => {
	it.each([
		['|x|', '\\left| x \\right|'],
		['|x-1|=|x+3|', '\\left| x - 1 \\right| = \\left| x + 3 \\right|'],
		['\\left|x\\right|', '\\left| x \\right|'],
		['|-x|', '\\left| -x \\right|'],
		['|x|+1', '\\left| x \\right| + 1'],
		['|x|-|y|', '\\left| x \\right| - \\left| y \\right|'],
		['||x|-1|', '\\left| \\left| x \\right| - 1 \\right|'],
		['|x|(x+1)', '\\left| x \\right| \\left( x + 1 \\right)'],
		['2\\left|x\\right|', '2 \\left| x \\right|'],
		['|x+|y||', '\\left| x + \\left| y \\right| \\right|'],
		['|2(x+|y|)|', '\\left| 2 \\left( x + \\left| y \\right| \\right) \\right|'],
		['|x|^2', '\\left| x \\right|^2']
	])('%s → %s', (latex, expected) => {
		expect(toLatex(parseLatex(latex))).toBe(expected);
	});
});

describe('ambiguïté ouvrante / fermante : refus, jamais une lecture devinée', () => {
	it.each(['|2|x|-1|', '|x|y|z|', '|x|y+2|z|'])('%s est refusé', (latex) => {
		expect(() => parseLatex(latex)).toThrow(/\\left\|/);
	});

	it.each(['2|x', 'a|b'])('%s : barre fermante oubliée → erreur, jamais un produit', (latex) => {
		expect(() => parseLatex(latex)).toThrow(/close absolute value/);
	});

	it('la forme explicite de la valeur absolue imbriquée se lit', () => {
		expect(valueAt('\\left|2|x|-1\\right|', -2.5)).toBeCloseTo(4, 10);
	});

	it('une relation sépare les membres : |x|y=2|x| n’est pas ambigu', () => {
		expect(valueAt('|x|y', -2.5, 3)).toBeCloseTo(7.5, 10);
		expect(() => parseLatex('|x|y=2|x|')).not.toThrow();
	});
});

describe('bout de chaîne : solve', () => {
	it.each([
		['2|x|=6', [-3, 3]],
		['3|x-1|=6', [-1, 3]],
		['3|x-1|+1=7', [-1, 3]]
	])('%s → %j', (latex, expected) => {
		const result = solve(relationOf(latex), { variable: 'x' });
		expect(result.error, latex).toBeUndefined();
		const values = result.solutions
			.map((s) => evaluateNodeToApproximatedNumber(s.value))
			.sort((a, b) => a - b);
		expect(values).toHaveLength(expected.length);
		values.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 10));
	});

	it('x|x|=4 : refus honnête ou x = 2, jamais une valeur fausse', () => {
		const result = solve(relationOf('x|x|=4'), { variable: 'x' });
		const values = result.solutions.map((s) => evaluateNodeToApproximatedNumber(s.value));
		if (values.length === 0) {
			// Pas de solution annoncée : ce doit être un refus, jamais un « ∅ » conclu
			expect(isSolverFailure(result), JSON.stringify(result.status)).toBe(true);
		} else {
			expect(values).toHaveLength(1);
			expect(values[0]).toBeCloseTo(2, 10);
		}
	});
});
