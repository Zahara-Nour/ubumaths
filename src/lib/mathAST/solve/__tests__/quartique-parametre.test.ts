/**
 * Équations polynomiales de degré ≥ 3 à paramètre (relevé du 2026-10-26,
 * revue de normalize-usages) : une solution juste avec sa condition, ou un
 * refus honnête — jamais une formule fausse pour certaines valeurs du
 * paramètre.
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { isSolverFailure } from '../types';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import type { RelationNode } from '../../types';

function solved(latex: string) {
	return solve(parseLatex(latex) as RelationNode, { variable: 'x' });
}

/** Les solutions écrites, chacune avec sa condition. */
function written(latex: string): string[] {
	return solved(latex).solutions.map(
		(s) => toLatex(s.value) + (s.condition ? ` si ${toLatex(s.condition)}` : '')
	);
}

describe('xⁿ = k, n pair, k avec un paramètre : la condition k ≥ 0', () => {
	it.each([
		['x^4-a=0', ['\\sqrt[4]{a} si a \\geqslant 0', '-\\sqrt[4]{a} si a \\geqslant 0']],
		['x^4+a=0', ['\\sqrt[4]{-a} si a \\leqslant 0', '-\\sqrt[4]{-a} si a \\leqslant 0']],
		['x^6-a=0', ['\\sqrt[6]{a} si a \\geqslant 0', '-\\sqrt[6]{a} si a \\geqslant 0']],
		// toujours positif : pas de condition
		['x^4=a^2+1', ['\\sqrt[4]{a^2 + 1}', '-\\sqrt[4]{a^2 + 1}']]
	])('%s', (latex, expected) => {
		expect(written(latex)).toEqual(expected);
	});

	it('x⁴ = −a² − 1 : aucune solution réelle', () => {
		expect(solved('x^4=-a^2-1').status).toBe('no-real-solution');
	});

	it('n impair : pas de condition (∛a)', () => {
		expect(written('x^3-a=0')).toEqual(['\\sqrt[3]{a}']);
	});
});

describe('x(ax² + bx + c) = 0 avec un paramètre : le second degré et sa condition', () => {
	it('x³ − ax = 0 → 0, ±√a si a ≥ 0', () => {
		expect(written('x^3-ax=0')).toEqual([
			'0',
			'\\sqrt{a} si a \\geqslant 0',
			'-\\sqrt{a} si a \\geqslant 0'
		]);
	});

	it('x³ + x² + ax = 0 → 0 et les deux racines, si a ≤ 1/4', () => {
		const solutions = written('x^3+x^2+ax=0');
		expect(solutions).toHaveLength(3);
		expect(solutions[0]).toBe('0');
		expect(solutions.slice(1).every((s) => s.endsWith('si a \\leqslant \\dfrac{1}{4}'))).toBe(true);
	});
});

describe('formule de Cardan ou de Ferrari à paramètre : refus', () => {
	it.each(['ax^3+x-1=0', 'x^3-3x+a=0', 'ax^4+x-1=0', 'x^4-ax-1=0', '(a+1)x^4+x-2=0'])(
		'%s',
		(latex) => {
			const result = solved(latex);
			expect(isSolverFailure(result)).toBe(true);
		}
	);
});
