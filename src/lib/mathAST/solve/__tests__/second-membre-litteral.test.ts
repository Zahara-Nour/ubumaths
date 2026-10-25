/**
 * Second membre LITTÉRAL : `y = f(x)` résolue en x (lot 1 du chantier
 * « réciproque », docs/archive/wip/atelier-reciproque-phase0.md).
 *
 * Mesuré le 2026-10-13 : `y = e^{2x+1}`, `y = \ln(x-1)`, `y = \sqrt{x+2}`,
 * `y = 2^x`, `y = 3e^x - 1`, la logistique, `y = \ln x + \ln 2` revenaient en
 * échec (« non supporte ») alors que `e^x = 3` est résolue. On remonte la
 * fonction couche par couche (ln, exp, racine), et la solution porte la
 * CONDITION sur le paramètre sous laquelle elle existe (`y > 0` pour eᵘ = y).
 *
 * Chaque solution est vérifiée NUMÉRIQUEMENT pour des valeurs du paramètre
 * qui respectent la condition ; la condition est vérifiée sur des valeurs
 * dedans et dehors. Coefficients ≠ 1 partout où c'est possible.
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { isSolverFailure } from '../types';
import type { SolveResult } from '../types';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { substitute } from '../../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';
import { isLogical, isRelation } from '../../guards';
import { flattenRelationChain } from '../../flatten';
import type { MathNode, RelationNode } from '../../types';

// =============================================================================
// Outils
// =============================================================================

function relationOf(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error(`Relation attendue : ${latex}`);
	return node;
}

function valueAt(node: MathNode, bindings: Record<string, number>): number {
	return evaluateNodeToApproximatedNumber(substitute(node, bindings));
}

/** Vraie quand la condition (relation, chaîne, « et ») tient pour ces valeurs. */
function holds(condition: MathNode, bindings: Record<string, number>): boolean {
	if (isLogical(condition) && condition.operator === 'and') {
		return holds(condition.left, bindings) && holds(condition.right, bindings);
	}
	if (isLogical(condition) && condition.operator === 'or') {
		return holds(condition.left, bindings) || holds(condition.right, bindings);
	}
	if (!isRelation(condition)) throw new Error(`Condition illisible : ${toLatex(condition)}`);
	const { operands, relations } = flattenRelationChain(condition);
	const values = operands.map((operand) => valueAt(operand, bindings));
	return relations.every((op, i) => {
		const [a, b] = [values[i], values[i + 1]];
		if (op === '<') return a < b;
		if (op === '<=') return a <= b;
		if (op === '>') return a > b;
		if (op === '>=') return a >= b;
		if (op === '!=') return a !== b;
		throw new Error(`Relation inattendue : ${op}`);
	});
}

function solveFor(latex: string): SolveResult {
	return solve(relationOf(latex), { variable: 'x' });
}

/**
 * Résout en x et vérifie, pour chaque valeur du paramètre, que chaque
 * solution dont la condition tient annule g − d.
 */
function checkSolutions(latex: string, parameter: string, values: readonly number[]): SolveResult {
	const relation = relationOf(latex);
	const result = solve(relation, { variable: 'x' });
	expect(isSolverFailure(result), `${latex} : ${result.error}`).toBe(false);
	expect(result.solutions.length, latex).toBeGreaterThan(0);
	for (const p of values) {
		for (const solution of result.solutions) {
			const params = { [parameter]: p };
			if (solution.condition && !holds(solution.condition, params)) continue;
			const x = valueAt(solution.value, params);
			const gap =
				valueAt(relation.left, { ...params, x }) - valueAt(relation.right, { ...params, x });
			expect(Math.abs(gap), `${latex} avec ${parameter} = ${p}, x = ${x}`).toBeLessThan(1e-9);
		}
	}
	return result;
}

function conditionOf(result: SolveResult, index = 0): string | undefined {
	const condition = result.solutions[index].condition;
	return condition && toLatex(condition).replace(/\s+/g, '');
}

// =============================================================================
// Cas nominaux : la solution et sa condition
// =============================================================================

describe('y = f(x) résolue en x, avec la condition sur y', () => {
	it('y = e^{2x+1} → x = (ln y − 1)/2, si y > 0', () => {
		const result = checkSolutions('y=e^{2x+1}', 'y', [0.5, 2, 7]);
		expect(result.solutions).toHaveLength(1);
		expect(conditionOf(result)).toBe('y>0');
	});

	it('y = ln(x − 1) → x = e^y + 1, sans condition', () => {
		const result = checkSolutions('y=\\ln(x-1)', 'y', [-1, 0, 2.5]);
		expect(result.solutions).toHaveLength(1);
		expect(conditionOf(result)).toBeUndefined();
	});

	it('y = √(x + 2) → x = y² − 2, si y ≥ 0', () => {
		const result = checkSolutions('y=\\sqrt{x+2}', 'y', [0, 1.5, 3]);
		expect(result.solutions).toHaveLength(1);
		expect(conditionOf(result)).toBe('y\\geqslant0');
	});

	it('y = 2^x → x = ln y / ln 2, si y > 0', () => {
		const result = checkSolutions('y=2^x', 'y', [0.25, 1, 8]);
		expect(result.solutions).toHaveLength(1);
		expect(conditionOf(result)).toBe('y>0');
	});

	it('y = 3e^x − 1 → x = ln((y + 1)/3), si y > −1', () => {
		const result = checkSolutions('y=3e^x-1', 'y', [-0.5, 2, 5]);
		expect(result.solutions).toHaveLength(1);
		expect(conditionOf(result)).toBe('y>-1');
	});

	it('y = 5 − 2e^{3x} → si y < 5', () => {
		const result = checkSolutions('y=5-2e^{3x}', 'y', [-4, 0, 4.5]);
		expect(conditionOf(result)).toBe('y<5');
	});

	it('logistique y = eˣ/(eˣ + 1) → x = ln(y/(1 − y)), si 0 < y < 1', () => {
		const result = checkSolutions('y=\\frac{e^x}{e^x+1}', 'y', [0.2, 0.5, 0.9]);
		expect(result.solutions).toHaveLength(1);
		const condition = result.solutions[0].condition;
		expect(condition).toBeDefined();
		if (!condition) return;
		for (const y of [0.01, 0.5, 0.99]) expect(holds(condition, { y }), `y = ${y}`).toBe(true);
		for (const y of [-1, 0, 1, 2]) expect(holds(condition, { y }), `y = ${y}`).toBe(false);
	});

	it('y = ln x + ln 2 → x = e^{y − ln 2}, sans condition', () => {
		const result = checkSolutions('y=\\ln(x)+\\ln(2)', 'y', [-1, 0, 3]);
		expect(conditionOf(result)).toBeUndefined();
	});

	it('le paramètre peut être à droite ou s’appeler a : e^{2x+1} = a', () => {
		const result = checkSolutions('e^{2x+1}=a', 'a', [0.5, 3]);
		expect(conditionOf(result)).toBe('a>0');
	});

	it('couches emboîtées : e^{√x} = y → x = (ln y)², si y ≥ 1', () => {
		const result = checkSolutions('e^{\\sqrt{x}}=y', 'y', [1, 3, 10]);
		const condition = result.solutions[0].condition;
		expect(condition).toBeDefined();
		if (!condition) return;
		expect(holds(condition, { y: 1 })).toBe(true);
		expect(holds(condition, { y: 0.5 })).toBe(false);
	});
});

// =============================================================================
// x² = y : les deux racines n'existent que si y ≥ 0
// =============================================================================

describe('x² = y : condition y ≥ 0 sur les deux branches', () => {
	it.each(['x^2=y', 'y=x^2', '3x^2=y'])('%s', (latex) => {
		const result = checkSolutions(latex, 'y', [0, 2, 9]);
		expect(result.solutions).toHaveLength(2);
		expect(conditionOf(result, 0)).toBe('y\\geqslant0');
		expect(conditionOf(result, 1)).toBe('y\\geqslant0');
	});

	it('x² + 1 = y → si y ≥ 1', () => {
		const result = checkSolutions('x^2+1=y', 'y', [1, 5]);
		expect(conditionOf(result, 0)).toBe('y\\geqslant1');
	});

	it('x² = y² + 1 : discriminant toujours positif, aucune condition', () => {
		const result = checkSolutions('x^2=y^2+1', 'y', [-2, 0, 3]);
		expect(conditionOf(result, 0)).toBeUndefined();
	});
});

// =============================================================================
// Limites : absence démontrée, refus honnêtes
// =============================================================================

describe('jamais « pas de solution » sans preuve', () => {
	it('e^x = −y² − 1 : aucune valeur de y ne convient, pas de solution réelle', () => {
		const result = solveFor('e^x=-y^2-1');
		expect(isSolverFailure(result)).toBe(false);
		expect(result.solutions).toHaveLength(0);
		expect(result.status).toBe('no-real-solution');
	});

	it.each(['y=xe^x', 'y=e^x+x', 'y=\\ln(x)+x', 'a e^x=y'])(
		'%s : non résolue, signalée comme un échec du solveur',
		(latex) => {
			const result = solveFor(latex);
			expect(isSolverFailure(result), latex).toBe(true);
		}
	);

	// ln(ax) = 1 : la couche ln est ôtée sur l'équation ÉCRITE (ax = e), pas
	// sur sa forme développée ln a + ln x (fausse pour a < 0) — juste pour a ≠ 0
	// Pour a = 0, ln(0) n'existe pas : la solution porte a ≠ 0 (revue #1302)
	it('\\ln(ax) = 1 → x = e/a si a ≠ 0, juste aussi pour a < 0', () => {
		const result = checkSolutions('\\ln(ax)=1', 'a', [2, -1.5]);
		expect(conditionOf(result)).toBe('a\\neq0');
	});
});

// =============================================================================
// Second membre numérique : rien ne change
// =============================================================================

describe('second membre numérique : inchangé, sans condition', () => {
	it.each([
		['e^x=3', '\\ln\\left( 3 \\right)'],
		['\\sqrt{x+2}=3', '7'],
		['2^x=8', '3']
	])('%s → %s', (latex, expected) => {
		const result = solveFor(latex);
		expect(result.solutions.map((s) => toLatex(s.value))).toEqual([expected]);
		expect(result.solutions[0].condition).toBeUndefined();
	});

	it('x² = 4 : deux solutions, sans condition', () => {
		const result = solveFor('x^2=4');
		expect(result.solutions).toHaveLength(2);
		expect(result.solutions.every((s) => s.condition === undefined)).toBe(true);
	});
});

// =============================================================================
// Revue #1302 : indice d'une racine, base d'un logarithme, quotient en eˣ
// =============================================================================

describe('racine d’indice n : puissance n, condition seulement si n est pair', () => {
	it('\\sqrt[4]{x} = a → x = a⁴, si a ≥ 0', () => {
		const result = checkSolutions('\\sqrt[4]{x}=a', 'a', [0.5, 2, 3]);
		expect(conditionOf(result)).toBe('a\\geqslant0');
	});

	it('\\sqrt[3]{x+1} = a → x = a³ − 1, sans condition (indice impair)', () => {
		const result = checkSolutions('\\sqrt[3]{x+1}=a', 'a', [-2, 0.5, 2]);
		expect(conditionOf(result)).toBeUndefined();
	});

	it('e^{\\sqrt[4]{x}} = a → x = (ln a)⁴, si a ≥ 1', () => {
		const result = checkSolutions('e^{\\sqrt[4]{x}}=a', 'a', [1, 3, 10]);
		const condition = result.solutions[0].condition;
		expect(condition && holds(condition, { a: 0.5 })).toBe(false);
	});
});

describe('logarithme de base b : x = bᶜ', () => {
	it('\\log_2(x) = a → x = 2ᵃ, sans condition', () => {
		const result = checkSolutions('\\log_2(x)=a', 'a', [-1, 0, 3]);
		expect(conditionOf(result)).toBeUndefined();
	});

	it('\\log_3(2x+1) = a', () => {
		checkSolutions('\\log_3(2x+1)=a', 'a', [-1, 0.5, 2]);
	});

	// Même défaut sur main avec un second membre NUMÉRIQUE : log_2(x) = 3 → 1000
	it.each([
		['\\log_2(x)=3', 8],
		['\\log_2(x+1)=3', 7],
		['\\log_5(2x)=2', 12.5],
		['\\log_{10}(x)=2', 100],
		['\\log(x)=2', 100]
	])('%s → x = %s', (latex, expected) => {
		const result = solveFor(latex);
		expect(result.solutions).toHaveLength(1);
		expect(valueAt(result.solutions[0].value, {})).toBeCloseTo(expected, 9);
	});
});

describe('quotient en eˣ : une racine qui annule le dénominateur est exclue', () => {
	// (e^{2x} − 1)/(e^x − 1) = e^x + 1 pour x ≠ 0 : y = e^x + 1, x ≠ 0 → y > 1, y ≠ 2
	it.each([
		['y=\\frac{e^{2x}-1}{e^x-1}', [1.5, 3, 7]],
		['y=\\frac{e^{2x}-4}{e^x-2}', [2.5, 3, 7]]
	] as const)('%s : chaque solution annule l’équation, aucune n’est interdite', (latex, values) => {
		const result = checkSolutions(latex, 'y', values);
		expect(result.solutions).toHaveLength(1);
	});

	it('y = (e^{2x} − 1)/(e^x − 1) avec y = 2 : aucune solution (x = 0 interdit)', () => {
		const result = solveFor('y=\\frac{e^{2x}-1}{e^x-1}');
		expect(isSolverFailure(result)).toBe(false);
		expect(conditionOf(result)).toBe('y>1\\landy\\neq2');
		for (const solution of result.solutions) {
			expect(solution.condition && holds(solution.condition, { y: 2 })).toBe(false);
		}
	});
});
