/**
 * Écart V40 — équations avec valeur absolue (2nde, 1re).
 *
 * `|x| = \pi`, `|x| = \ln 2`, et même `|x| = 3` répondaient « Type d'equation
 * non supporte: unknown » : aucun chemin de `solve` ne lisait `abs`.
 *
 * Le cours : |u| = c ⇔ u = c ou u = −c si c > 0 ; u = 0 si c = 0 ; aucune
 * solution si c < 0. Et |u| = |v| ⇔ u = v ou u = −v. On ne traite que u et v
 * AFFINES ; le reste est refusé (jamais une valeur fausse).
 *
 * Chaque solution est vérifiée deux fois : sa forme exacte (LaTeX), puis
 * numériquement (elle annule g − d).
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { substitute } from '../../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';
import { isSolverFailure } from '../types';
import { solveInequality } from '../inequality';
import { containsValue } from '../../domain/algebra';
import type { MathNode, RelationNode } from '../../types';

// =============================================================================
// Outils
// =============================================================================

function relationOf(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error(`Relation attendue : ${latex}`);
	return node;
}

function valueAt(node: MathNode, x: number): number {
	return evaluateNodeToApproximatedNumber(substitute(node, { x }));
}

/** Formes exactes des solutions, après vérification numérique de chacune. */
function solvedForms(latex: string): string[] {
	const relation = relationOf(latex);
	const result = solve(relation, { variable: 'x' });
	expect(result.error, latex).toBeUndefined();
	for (const s of result.solutions) {
		// La forme EXACTE est évaluée, pas `approximate` : c'est elle qu'on affiche
		const v = evaluateNodeToApproximatedNumber(s.value);
		const gap = valueAt(relation.left, v) - valueAt(relation.right, v);
		expect(Math.abs(gap), `${latex} en x = ${v}`).toBeLessThan(1e-9);
	}
	return result.solutions.map((s) => toLatex(s.value));
}

// =============================================================================
// |u| = c, c constante
// =============================================================================

describe('|u| = c : u = c ou u = −c', () => {
	it.each([
		['|x|=3', ['-3', '3']],
		['|x|=\\pi', ['-\\pi', '\\pi']],
		['|x|=\\ln 2', ['-\\ln\\left( 2 \\right)', '\\ln\\left( 2 \\right)']],
		// Comme x = 1.5 et x² = 2.25 : le moteur rend 3/2 (l'affichage décide du décimal)
		['|x|=1.5', ['-\\dfrac{3}{2}', '\\dfrac{3}{2}']],
		['\\left|x\\right|=3', ['-3', '3']],
		['|x-2|=3', ['-1', '5']],
		['|2x+1|=5', ['-3', '2']],
		['|2x+1|=4', ['-\\dfrac{5}{2}', '\\dfrac{3}{2}']],
		['|3-x|=1', ['2', '4']]
	])('%s → %j', (latex, expected) => {
		expect(solvedForms(latex)).toEqual(expected);
	});

	it('|x| = 0 → {0}, une seule fois', () => {
		expect(solvedForms('|x|=0')).toEqual(['0']);
		expect(solve(relationOf('|x|=0'), { variable: 'x' }).status).toBe('unique');
	});

	it.each(['|x|=-2', '|x|=\\ln\\frac12', '|x|+3=1'])('%s → ∅, conclu', (latex) => {
		const result = solve(relationOf(latex), { variable: 'x' });
		expect(result.status).toBe('no-solution');
		expect(result.solutions).toEqual([]);
		expect(isSolverFailure(result), latex).toBe(false);
	});
});

describe('deux solutions très proches de 0 ne sont pas confondues', () => {
	// Dédoublonner à 1e-10 près perdait +c : seule −c restait
	it.each(['|x|=10^{-11}', '|x|=0.00000000001', '|x|=10^{-20}'])('%s → −c et c', (latex) => {
		const result = solve(relationOf(latex), { variable: 'x' });
		expect(result.status).toBe('multiple');
		expect(result.solutions).toHaveLength(2);
		const [low, high] = result.solutions.map((s) => evaluateNodeToApproximatedNumber(s.value));
		expect(low).toBeLessThan(0);
		expect(high).toBeGreaterThan(0);
		expect(low).toBeCloseTo(-high, 30);
	});
});

describe('la valeur absolue est isolée d’abord', () => {
	it.each([
		['|x+1|-2=0', ['-3', '1']],
		['2\\left|x\\right|=6', ['-3', '3']],
		['5-|x|=2', ['-3', '3']],
		// `3|x-1|` ne se lit pas (« Unexpected token: | ») : écrit avec \\left|…\\right|
		['3\\left|x-1\\right|+1=7', ['-1', '3']]
	])('%s → %j', (latex, expected) => {
		expect(solvedForms(latex)).toEqual(expected);
	});
});

// =============================================================================
// |u| = |v|
// =============================================================================

describe('|u| = |v| : u = v ou u = −v', () => {
	it.each([
		['|x-1|=|x+3|', ['-1']],
		['|2x|=|x|', ['0']],
		['|x+1|=|2x-4|', ['1', '5']],
		['|x-1|=|2x-2|', ['1']]
	])('%s → %j', (latex, expected) => {
		expect(solvedForms(latex)).toEqual(expected);
	});

	it('|x − 1| = |1 − x| : tout réel est solution', () => {
		const result = solve(relationOf('|x-1|=|1-x|'), { variable: 'x' });
		expect(result.status).toBe('infinite');
		expect(result.error).toBeUndefined();
	});
});

// =============================================================================
// Hors périmètre : refus honnête, jamais une valeur fausse
// =============================================================================

describe('refus honnête hors des formes affines', () => {
	it.each(['|x^2-1|=3', '|x|=x+1', '|x|=a', '|x-a|=2', '|x|+|x-1|=3'])('%s → refusée', (latex) => {
		const result = solve(relationOf(latex), { variable: 'x' });
		expect(isSolverFailure(result), latex).toBe(true);
		expect(result.solutions).toEqual([]);
	});
});

// =============================================================================
// Conséquence : les inéquations affines se concluent par le tableau de signes
// =============================================================================

describe('inéquations : le signe de |u| − c se conclut une fois ses zéros trouvés', () => {
	it.each([
		['|x|<3', (x: number) => Math.abs(x) < 3],
		['|x-1|\\geq 2', (x: number) => Math.abs(x - 1) >= 2],
		['|2x+1|\\leq 5', (x: number) => Math.abs(2 * x + 1) <= 5]
	])('%s : x ∈ S ⇔ l’inéquation tient en x', (latex, holds) => {
		const result = solveInequality(relationOf(latex), { variable: 'x' });
		expect(result.status, latex).toBe('complete');
		for (let x = -6; x <= 6; x += 0.25) {
			expect(containsValue(result.solution, x), `${latex} en x = ${x}`).toBe(holds(x));
		}
	});
});
