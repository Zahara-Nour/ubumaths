/**
 * Solve — la constante d'Euler HORS d'un exposant.
 *
 * ⚠️ Réponse fausse et assurée relevée en revue : `e^x = e` rendait
 * « Pas de solution : l'équation est contradictoire ». Le parseur LaTeX garde
 * la lettre `e` comme variable ; `promoteEulerInRelation` ne la promeut que
 * comme BASE d'un exposant. Le `e` seul du second membre restait une variable,
 * `detectVariable` voyait `{e, x}` et l'équation tombait dans le chemin des
 * équations constantes. Avec l'inconnue imposée, la réponse restait `ln(e)`.
 *
 * Valeurs EXACTES : on compare le LaTeX de la solution, pas une approximation.
 *
 * @module mathAST/solve/__tests__/euler-standalone.test
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { solveInequality } from '../inequality';
import { parseLatex } from '../../parser';
import { parseCustom } from '../../parser/custom';
import { toLatex } from '../../latex-generator';
import { isRelation } from '../../guards';
import type { MathNode, RelationNode } from '../../types';

function asRelation(node: MathNode): RelationNode {
	if (!isRelation(node)) throw new Error('relation attendue');
	return node;
}

/** Les solutions en LaTeX, dans l'ordre rendu par le solveur. */
function solutionsOf(relation: RelationNode, variable?: string): string[] {
	const result = solve(relation, variable ? { variable } : undefined);
	return result.solutions.map((s) => toLatex(s.value));
}

const FAMILY: ReadonlyArray<[string, string]> = [
	['e^x=e', '1'],
	['e^x=e^2', '2'],
	['e^{2x}=e', '\\dfrac{1}{2}'],
	['e^x=1', '0'],
	['e^x=2', '\\ln\\left( 2 \\right)'],
	['\\ln(x)=1', '\\exponentialE'],
	['\\ln(x)=2', '\\exponentialE^2'],
	['e^{x+1}=e^3', '2'],
	['2e^x=2e', '1'],
	['e^x=e^{-x}', '0']
];

describe('solve — e seul, lettre du parseur LaTeX', () => {
	for (const [latex, expected] of FAMILY) {
		it(`${latex} → x = ${expected} (inconnue détectée)`, () => {
			const result = solve(asRelation(parseLatex(latex)));
			expect(result.variable).toBe('x');
			expect(result.status).toBe('unique');
			expect(solutionsOf(asRelation(parseLatex(latex)))).toEqual([expected]);
		});

		it(`${latex} → x = ${expected} (inconnue imposée)`, () => {
			expect(solutionsOf(asRelation(parseLatex(latex)), 'x')).toEqual([expected]);
		});
	}

	it('e^x = −1 → pas de solution réelle (inchangé)', () => {
		const result = solve(asRelation(parseLatex('e^x=-1')));
		expect(result.status).toBe('no-real-solution');
		expect(result.solutions).toEqual([]);
	});
});

describe('solve — les autres écritures de e', () => {
	it('\\exponentialE^x = \\exponentialE → 1', () => {
		expect(solutionsOf(asRelation(parseLatex('\\exponentialE^x=\\exponentialE')))).toEqual(['1']);
	});

	it('syntaxe custom : e^x = e → 1', () => {
		expect(solutionsOf(asRelation(parseCustom('e^x=e')))).toEqual(['1']);
	});

	it('syntaxe custom : 2e^x = 2e → 1', () => {
		expect(solutionsOf(asRelation(parseCustom('2e^x=2e')))).toEqual(['1']);
	});

	it('syntaxe custom : e^x = e^(-x) → 0', () => {
		expect(solutionsOf(asRelation(parseCustom('e^x=e^(-x)')))).toEqual(['0']);
	});
});

describe('solve — e reste l’inconnue quand c’est la seule lettre', () => {
	it('e + 1 = 3 → e = 2', () => {
		const result = solve(asRelation(parseLatex('e+1=3')));
		expect(result.variable).toBe('e');
		expect(result.solutions.map((s) => toLatex(s.value))).toEqual(['2']);
	});

	it('inconnue imposée e : 2e = x reste résolue en e', () => {
		const result = solve(asRelation(parseLatex('2e=x')), { variable: 'e' });
		expect(result.variable).toBe('e');
		expect(result.status).toBe('unique');
	});
});

describe('solveInequality — même cause, e seul', () => {
	it('e^x > e → x > 1 (même ensemble que \\exponentialE^x > \\exponentialE)', () => {
		const withLetter = solveInequality(asRelation(parseLatex('e^x>e')));
		const withConstant = solveInequality(asRelation(parseLatex('\\exponentialE^x>\\exponentialE')));
		expect(withLetter.variable).toBe('x');
		expect(withConstant.variable).toBe('x');
		expect(withLetter.solution).toEqual(withConstant.solution);
	});
});
