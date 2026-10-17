/**
 * Écart V41 — un coefficient LITTÉRAL devant ln, exp, sin, cos…
 *
 * `extractTranscendentalEquation` évaluait le coefficient numériquement et,
 * faute d'y arriver (`a` est un paramètre), le remplaçait par 1 : `a\ln x = 1`
 * rendait e au lieu de e^{1/a}, `k e^x = 2` rendait ln 2, `a\cos x = 1`
 * rendait 0.
 *
 * Convention suivie, celle de `ax = 1` → 1/a : la valeur est écrite avec le
 * paramètre, SANS condition sur lui (aucun solveur n'en écrit). Quand la
 * valeur dépend du signe ou de la taille du paramètre (e^x = 1/a n'a de
 * solution que si a > 0, cos x = 1/a que si |a| ≥ 1), le solveur refuse :
 * un refus honnête plutôt qu'une valeur fausse (depuis le 2026-10-13, e^x = 1/a
 * est résolue avec la condition a > 0 : voir la fin du fichier).
 *
 * tan u = c a une solution pour tout c : `a\\tan x = 1` est résolue.
 *
 * Chaque solution est vérifiée NUMÉRIQUEMENT pour plusieurs valeurs du
 * paramètre (elle annule g − d), puis sa forme exacte est fixée.
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { isSolverFailure } from '../types';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { substitute, getVariables } from '../../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';
import type { MathNode, RelationNode } from '../../types';

// =============================================================================
// Outils
// =============================================================================

function relationOf(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error(`Relation attendue : ${latex}`);
	return node;
}

/** Les lettres de l'équation autres que x : ses paramètres. */
function parametersOf(relation: RelationNode): string[] {
	const names = new Set([...getVariables(relation.left), ...getVariables(relation.right)]);
	names.delete('x');
	return [...names];
}

function valueAt(node: MathNode, bindings: Record<string, number>): number {
	return evaluateNodeToApproximatedNumber(substitute(node, bindings));
}

/**
 * Résout en x, puis vérifie, pour chaque valeur donnée aux paramètres, que
 * chaque solution annule g − d. Rend les solutions en LaTeX.
 */
function solvedForEveryParameter(latex: string, parameterValues: readonly number[]): string[] {
	const relation = relationOf(latex);
	const result = solve(relation, { variable: 'x' });
	expect(result.error, latex).toBeUndefined();
	expect(result.solutions.length, latex).toBeGreaterThan(0);
	const parameters = parametersOf(relation);
	for (const p of parameterValues) {
		const params = Object.fromEntries(parameters.map((name) => [name, p]));
		for (const solution of result.solutions) {
			const x = valueAt(solution.value, params);
			const gap =
				valueAt(relation.left, { ...params, x }) - valueAt(relation.right, { ...params, x });
			expect(Math.abs(gap), `${latex} avec paramètre = ${p}, x = ${x}`).toBeLessThan(1e-9);
		}
	}
	return result.solutions.map((s) => toLatex(s.value));
}

// =============================================================================
// ln et log : la valeur est juste pour tout paramètre non nul
// =============================================================================

describe('V41 — coefficient littéral devant ln : la valeur porte le paramètre', () => {
	const VALUES = [2, 3, -1.5, 0.25];

	it.each([
		['a\\ln x=1', '\\exponentialE^{\\dfrac{1}{a}}'],
		['a\\ln(x)=2', '\\exponentialE^{\\dfrac{2}{a}}'],
		['\\ln(x)\\cdot a=1', '\\exponentialE^{\\dfrac{1}{a}}'],
		['k\\ln x=1', '\\exponentialE^{\\dfrac{1}{k}}'],
		['m\\ln x=3', '\\exponentialE^{\\dfrac{3}{m}}'],
		// Le signe sort de la fraction, comme -3\\ln x = 1 → e^{-\\frac13}
		['-a\\ln x=1', '\\exponentialE^{-\\dfrac{1}{a}}'],
		['a\\ln x+1=0', '\\exponentialE^{-\\dfrac{1}{a}}'],
		['(a+1)\\ln x=1', '\\exponentialE^{\\dfrac{1}{a + 1}}'],
		['a^2\\ln x=1', '\\exponentialE^{\\dfrac{1}{a^2}}'],
		['a\\ln x=\\pi', '\\exponentialE^{\\dfrac{\\pi}{a}}'],
		['a\\ln(-x)=1', '-\\exponentialE^{\\dfrac{1}{a}}'],
		['a\\log x=1', '10^{\\dfrac{1}{a}}']
	])('%s → x = %s', (latex, expected) => {
		const solutions = solvedForEveryParameter(latex, VALUES);
		expect(solutions).toEqual([expected]);
	});

	it.each([
		'\\lambda\\ln x=1',
		'-a\\ln x=1',
		'2a\\ln x=1',
		'a\\ln x - 1 = 0',
		'a\\ln(2x+1)=3',
		'a\\ln(x-1)=1',
		'a\\ln(x)-\\ln 2=0',
		'\\log(x) \\cdot a = 2'
	])('%s : la solution annule l’équation pour chaque valeur du paramètre', (latex) => {
		solvedForEveryParameter(latex, VALUES);
	});

	it('2\\ln x = 1 reste √e (coefficient numérique, inchangé)', () => {
		const solutions = solvedForEveryParameter('2\\ln x=1', [0]);
		expect(solutions).toEqual(['\\sqrt{\\exponentialE}']);
	});
});

// =============================================================================
// tan : tan u = c a une solution pour tout c
// =============================================================================

describe('V41 — coefficient littéral devant tan : arctan(c) + kπ', () => {
	it('a\\tan x = 1 → x = arctan(1/a), période π (même forme que 2\\tan x = 1)', () => {
		const solutions = solvedForEveryParameter('a\\tan x=1', [2, 3, -1.5, 0.25]);
		expect(solutions).toEqual(['\\arctan\\left( \\dfrac{1}{a} \\right)']);
		const result = solve(relationOf('a\\tan x=1'), { variable: 'x' });
		expect(result.periodicSolutions && toLatex(result.periodicSolutions.period)).toBe('\\pi');
	});
});

// =============================================================================
// exp, sin, cos, second membre littéral : l'existence dépend du paramètre
// =============================================================================

describe('V41 — cas frères refusés plutôt qu’une valeur fausse', () => {
	it.each([
		'a\\cos x=1',
		'a\\sin x = 1',
		'a\\ln x+b=1',
		'\\ln(x^a)=1',
		'a\\ln(x^2)=1',
		'a\\sin(x^2)=1'
	])('%s : refus', (latex) => {
		expect(isSolverFailure(solve(relationOf(latex), { variable: 'x' })), latex).toBe(true);
	});
});

// =============================================================================
// Depuis le lot 1 « réciproque » (2026-10-13) : la condition est écrite
// =============================================================================

describe('second membre ou coefficient littéral : résolu, avec la condition sur le paramètre', () => {
	// e^x = 1/a n'a de solution que si a > 0 : la solution porte `a > 0`
	// (`Solution.condition`, voir second-membre-litteral.test.ts). ln x = a et
	// ln(ax) = 1 (lue sur l'équation écrite : ax = e) n'en ont pas besoin.
	it.each([
		['a e^x=1', 'a>0'],
		['k e^x=2', 'k>0'],
		['a\\exp(x)=1', 'a>0'],
		['\\ln x = a', undefined],
		['\\ln(ax)=1', 'a\\neq0']
	])('%s : condition %s', (latex, condition) => {
		const VALUES =
			condition === undefined || condition.includes('neq') ? [2, 3, -1.5, 0.25] : [2, 3, 0.25];
		solvedForEveryParameter(latex, VALUES);
		const result = solve(relationOf(latex), { variable: 'x' });
		const written = result.solutions[0].condition;
		expect(written && toLatex(written).replace(/\s+/g, '')).toBe(condition);
	});
});
