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
 * un refus honnête plutôt qu'une valeur fausse.
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
		['m\\ln x=3', '\\exponentialE^{\\dfrac{3}{m}}']
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
		'\\log(x) \\cdot a = 2'
	])('%s : la solution annule l’équation pour chaque valeur du paramètre', (latex) => {
		solvedForEveryParameter(latex, VALUES);
	});

	it('un paramètre au SECOND MEMBRE reste refusé : \\ln x = a (refus inchangé)', () => {
		expect(isSolverFailure(solve(relationOf('\\ln x = a'), { variable: 'x' }))).toBe(true);
	});

	it('2\\ln x = 1 reste √e (coefficient numérique, inchangé)', () => {
		const solutions = solvedForEveryParameter('2\\ln x=1', [0]);
		expect(solutions).toEqual(['\\sqrt{\\exponentialE}']);
	});
});

// =============================================================================
// exp, sin, cos : la valeur dépend du signe ou de la taille du paramètre
// =============================================================================

describe('V41 — cas frères : jamais une valeur fausse', () => {
	/**
	 * Une réponse est acceptable si c'est un refus, ou si chaque solution annule
	 * l'équation pour les valeurs du paramètre où elle a un sens.
	 */
	it.each([
		['a e^x=1', [2, 3, 0.5]],
		['k e^x=2', [2, 3, 0.5]],
		['a\\exp(x)=1', [2, 3, 0.5]],
		['a\\cos x=1', [2, 3, -4]],
		['a\\sin x = 1', [2, 3, -4]],
		// ln(ax) est développé en ln a + ln x (a > 0) : pour a < 0, e/a existe
		['\\ln(ax)=1', [2, 3, -2]],
		['\\ln(x^a)=1', [2, 3, -2]],
		['a\\ln(x^2)=1', [2, 3, -2]],
		['a\\sin(x^2)=1', [2, 3, -4]]
	] as const)('%s : refus ou valeur juste', (latex, values) => {
		const relation = relationOf(latex);
		const result = solve(relation, { variable: 'x' });
		if (isSolverFailure(result)) {
			expect(result.solutions, latex).toEqual([]);
			return;
		}
		solvedForEveryParameter(latex, values);
	});
});
