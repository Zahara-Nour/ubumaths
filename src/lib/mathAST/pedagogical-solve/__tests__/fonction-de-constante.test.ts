/**
 * Écart V38 — corrections pédagogiques désormais atteintes.
 *
 * Tant que `getPolynomialDegree` lisait `\ln 2`, `\cos 2` comme transcendants,
 * `generateEquationSteps` et `generateInequalitySteps` refusaient ces entrées
 * (`UnsupportedEquationDegree(null)`). Elles produisent maintenant des étapes :
 * on vérifie la CONCLUSION et le sens de l'inégalité, contre l'oracle `solve` /
 * `solveInequality` sur l'énoncé. La prose (aucun LaTeX hors des `$…$`) est
 * gardée par `mathAST/__tests__/prose-maths-delimitees.test.ts`, qui contient
 * ces mêmes entrées.
 */

import { describe, it, expect } from 'vitest';
import { generateEquationSteps, generateInequalitySteps } from '../index';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { solve } from '../../solve/solve';
import { solveInequality } from '../../solve/inequality';
import { formatDomainFull } from '../../domain/format';
import type { EquationOperation, EquationStep } from '../types';
import type { RelationNode } from '../../types';

// =============================================================================
// Outils
// =============================================================================

const LEVELS = ['college', 'lycee', 'superieur'] as const;

function relationOf(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error(`Relation attendue : ${latex}`);
	return node;
}

function flattenSteps(steps: readonly EquationStep[]): EquationStep[] {
	return steps.flatMap((s) => [s, ...flattenSteps(s.subSteps ?? [])]);
}

function conclusion(steps: readonly EquationStep[]): RelationNode {
	const last = steps[steps.length - 1].after;
	if (last.type !== 'relation') throw new Error('la dernière étape ne rend pas une relation');
	return last;
}

function solutionSet(relation: RelationNode): string {
	return formatDomainFull(solveInequality(relation).solution).interval;
}

function divisionOperation(steps: readonly EquationStep[]): EquationOperation | undefined {
	return flattenSteps(steps)
		.map((s) => s.operation)
		.find((op) => op?.kind === 'divide-both-sides' || op?.kind === 'simplify-coefficient');
}

// =============================================================================
// Équation
// =============================================================================

describe('V38 — x ln 2 = 1, correction pédagogique', () => {
	for (const level of LEVELS) {
		it(`${level} : conclut x = 1/ln 2, comme solve`, () => {
			const input = relationOf('x\\ln 2=1');
			const steps = generateEquationSteps(input, { level });
			const final = conclusion(steps);
			expect(toLatex(final)).toBe('x = \\dfrac{1}{\\ln\\left( 2 \\right)}');

			const oracle = solve(input, { variable: 'x' });
			expect(oracle.solutions).toHaveLength(1);
			expect(toLatex(final.right)).toBe(toLatex(oracle.solutions[0].value));
		});
	}
});

// =============================================================================
// Inéquations du premier degré : sens retourné par un coefficient négatif
// =============================================================================

describe('V38 — coefficient négatif fonction d’une constante : sens retourné', () => {
	const cases: Array<[string, string, string]> = [
		// cos 2 ≈ −0,416
		['x\\cos 2>1', 'x < \\dfrac{1}{\\cos\\left( 2 \\right)}', ']-∞ ; 1/cos(2)['],
		// ln 2 − 1 ≈ −0,307
		['x\\ln 2-x>1', 'x < \\dfrac{1}{\\ln\\left( 2 \\right) - 1}', ']-∞ ; 1/(ln(2)-1)[']
	];

	for (const [latex, expectedLatex, expectedSet] of cases) {
		for (const level of LEVELS) {
			it(`${level} : ${latex} → ${expectedLatex}`, () => {
				const input = relationOf(latex);
				const steps = generateInequalitySteps(input, { level });
				const final = conclusion(steps);

				expect(toLatex(final)).toBe(expectedLatex);
				expect(divisionOperation(steps)).toMatchObject({ flipOperator: true });
				expect(solutionSet(input)).toBe(expectedSet);
				expect(solutionSet(final)).toBe(solutionSet(input));
			});
		}
	}

	it('témoin : x ln 2 > 1 garde le sens', () => {
		const input = relationOf('x\\ln 2>1');
		const steps = generateInequalitySteps(input, { level: 'lycee' });
		const final = conclusion(steps);
		expect(toLatex(final)).toBe('x > \\dfrac{1}{\\ln\\left( 2 \\right)}');
		expect(divisionOperation(steps)).not.toMatchObject({ flipOperator: true });
		expect(solutionSet(final)).toBe(solutionSet(input));
	});
});

// =============================================================================
// Inéquation rationnelle
// =============================================================================

describe('V38 — 1/(x ln 2) > 1 : ]0 ; 1/ln 2[', () => {
	for (const level of ['lycee', 'superieur'] as const) {
		it(`${level} : conclusion du tableau de signes = oracle`, () => {
			const input = relationOf('\\frac{1}{x\\ln 2}>1');
			const steps = generateInequalitySteps(input, { level });
			const concl = flattenSteps(steps)
				.map((s) => s.operation)
				.find((op) => op?.kind === 'inequality-conclude-rational');
			expect(concl).toMatchObject({
				solutionDescription: ']0 ; \\dfrac{1}{\\ln\\left( 2 \\right)}['
			});
			expect(solutionSet(input)).toBe(']0 ; 1/ln(2)[');
		});
	}
});
