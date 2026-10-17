/**
 * Écart V37 — une borne au dénominateur non numérique (π, e, √2/π, π + 1).
 *
 * `solveInequality` ramène f − g à une seule fraction : `x < 2/π` devient
 * `(πx − 2)/π < 0`. `solve((πx − 2)/π = 0)` échouait (« Impossible d'extraire
 * les coefficients lineaires ») : le dénominateur, constant, n'est pas un
 * nombre, la décomposition rationnelle l'ignore (pas de variable dedans) et
 * le solveur affine ne lit pas la division. Zéros non résolus → signe
 * inconnu partout → ∅, statut « partial ». `\frac{3x-2}{5}` passait : le
 * dénominateur y est un nombre.
 *
 * `1/ln 2` échouait pour une autre raison (V38, voir plus bas).
 *
 * Chaque ensemble est vérifié deux fois : bornes (LaTeX, valeur, crochets)
 * et un échantillonnage de points (x ∈ S ⇔ l'inéquation est vraie en x).
 */

import { describe, it, expect } from 'vitest';
import { solveInequality } from '../index';
import { solve } from '../../solve';
import { parseLatex } from '../../../parser';
import { toLatex } from '../../../latex-generator';
import { substitute } from '../../../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../../../eval/evaluate';
import { containsValue } from '../../../domain/algebra';
import { endpointToNumber } from '$lib/math/intervals/endpoint';
import type { Domain, IntervalSet } from '../../../domain/types';
import type { MathNode, RelationNode } from '../../../types';

// =============================================================================
// Outils
// =============================================================================

function relationOf(latex: string): RelationNode {
	const node = parseLatex(latex);
	if (node.type !== 'relation') throw new Error(`Relation attendue : ${latex}`);
	return node;
}

type Bound = '-inf' | '+inf' | { latex: string; value: number };

interface ExpectedInterval {
	open: [boolean, boolean];
	lower: Bound;
	upper: Bound;
}

function expectBound(end: { value: unknown }, expected: Bound): void {
	const node = end.value as MathNode;
	const value = endpointToNumber(node);
	if (expected === '-inf') return void expect(value).toBe(-Infinity);
	if (expected === '+inf') return void expect(value).toBe(Infinity);
	expect(toLatex(node)).toBe(expected.latex);
	expect(value).toBeCloseTo(expected.value, 6);
}

function expectSolution(domain: Domain, expected: ExpectedInterval[]): void {
	expect(domain.kind).toBe('interval_set');
	const set = domain as IntervalSet;
	expect(set.intervals.length).toBe(expected.length);
	expected.forEach((exp, i) => {
		const got = set.intervals[i];
		expect([got.lower.type === 'open', got.upper.type === 'open']).toEqual(exp.open);
		expectBound(got.lower, exp.lower);
		expectBound(got.upper, exp.upper);
	});
}

/** g(x) − d(x), en flottant. */
function holdsAt(relation: RelationNode, x: number): boolean {
	const left = evaluateNodeToApproximatedNumber(substitute(relation.left, { x }));
	const right = evaluateNodeToApproximatedNumber(substitute(relation.right, { x }));
	switch (relation.relation) {
		case '<':
			return left < right;
		case '>':
			return left > right;
		case '<=':
			return left <= right;
		case '>=':
			return left >= right;
		default:
			throw new Error(`Relation inattendue : ${relation.relation}`);
	}
}

/** x ∈ S ⇔ l'inéquation tient en x, sur une grille qui évite les bornes. */
function expectSampledAgreement(relation: RelationNode, solution: Domain): void {
	for (let k = -400; k <= 400; k++) {
		const x = k / 97 + 0.0013;
		expect(containsValue(solution, x), `x = ${x}`).toBe(holdsAt(relation, x));
	}
}

function solveCase(latex: string) {
	const relation = relationOf(latex);
	const result = solveInequality(relation);
	return { relation, result };
}

const TWO_OVER_PI = 2 / Math.PI;

// =============================================================================
// Les cas de V37 et les quatre symboles
// =============================================================================

describe('V37 — borne en 2/π', () => {
	const cases: Array<[string, ExpectedInterval[]]> = [
		[
			'x<-\\frac{2}{\\pi}',
			[
				{
					open: [true, true],
					lower: '-inf',
					// Forme du solveur affine, déjà rendue pour `\\pi x<-2`
					upper: { latex: '\\dfrac{-2}{\\pi}', value: -TWO_OVER_PI }
				}
			]
		],
		[
			'-\\frac{x}{\\pi}<1',
			[{ open: [true, true], lower: { latex: '-\\pi', value: -Math.PI }, upper: '+inf' }]
		],
		[
			'x<\\frac{2}{\\pi}',
			[
				{
					open: [true, true],
					lower: '-inf',
					upper: { latex: '\\dfrac{2}{\\pi}', value: TWO_OVER_PI }
				}
			]
		],
		[
			'x>\\frac{2}{\\pi}',
			[
				{
					open: [true, true],
					lower: { latex: '\\dfrac{2}{\\pi}', value: TWO_OVER_PI },
					upper: '+inf'
				}
			]
		],
		[
			'x\\le\\frac{2}{\\pi}',
			[
				{
					open: [true, false],
					lower: '-inf',
					upper: { latex: '\\dfrac{2}{\\pi}', value: TWO_OVER_PI }
				}
			]
		],
		[
			'x\\ge\\frac{2}{\\pi}',
			[
				{
					open: [false, true],
					lower: { latex: '\\dfrac{2}{\\pi}', value: TWO_OVER_PI },
					upper: '+inf'
				}
			]
		],
		[
			'3x<\\frac{2}{\\pi}',
			[
				{
					open: [true, true],
					lower: '-inf',
					upper: { latex: '\\dfrac{2}{3 \\pi}', value: 2 / (3 * Math.PI) }
				}
			]
		]
	];

	it.each(cases)('%s', (latex, expected) => {
		const { relation, result } = solveCase(latex);
		expect(result.status).toBe('complete');
		expectSolution(result.solution, expected);
		expectSampledAgreement(relation, result.solution);
	});
});

// =============================================================================
// Cas frères : même cause, autre constante au dénominateur
// =============================================================================

// `1/ln 2` n'en est pas : `ln` d'une constante était lu comme transcendant,
// autre cause (V38), testée dans `solve/__tests__/fonction-de-constante.test.ts`.
describe('V37 — cas frères (e, √2/π, π + 1, second degré)', () => {
	it('x < 1/e', () => {
		const { relation, result } = solveCase('x<\\frac{1}{e}');
		expect(result.status).toBe('complete');
		expect(result.solution.kind).toBe('interval_set');
		const [iv] = (result.solution as IntervalSet).intervals;
		expect(iv.upper.type).toBe('open');
		expect(endpointToNumber(iv.upper.value as MathNode)).toBeCloseTo(1 / Math.E, 6);
		expectSampledAgreement(relation, result.solution);
	});

	it('x < √2/π', () => {
		const { relation, result } = solveCase('x<\\frac{\\sqrt2}{\\pi}');
		expect(result.status).toBe('complete');
		expectSolution(result.solution, [
			{
				open: [true, true],
				lower: '-inf',
				upper: { latex: '\\dfrac{\\sqrt{2}}{\\pi}', value: Math.SQRT2 / Math.PI }
			}
		]);
		expectSampledAgreement(relation, result.solution);
	});

	it('x < 1/(π + 1)', () => {
		const { relation, result } = solveCase('x<\\frac{1}{\\pi+1}');
		expect(result.status).toBe('complete');
		const [iv] = (result.solution as IntervalSet).intervals;
		expect(endpointToNumber(iv.upper.value as MathNode)).toBeCloseTo(1 / (Math.PI + 1), 6);
		expectSampledAgreement(relation, result.solution);
	});

	it('x² < 1/π : ]−1/√π ; 1/√π[', () => {
		const { relation, result } = solveCase('x^2<\\frac{1}{\\pi}');
		expect(result.status).toBe('complete');
		const set = result.solution as IntervalSet;
		expect(set.intervals).toHaveLength(1);
		const [iv] = set.intervals;
		expect([iv.lower.type, iv.upper.type]).toEqual(['open', 'open']);
		expect(endpointToNumber(iv.lower.value as MathNode)).toBeCloseTo(-1 / Math.sqrt(Math.PI), 6);
		expect(endpointToNumber(iv.upper.value as MathNode)).toBeCloseTo(1 / Math.sqrt(Math.PI), 6);
		expectSampledAgreement(relation, result.solution);
	});

	it('x² ≥ 1/π : ]−∞ ; −1/√π] ∪ [1/√π ; +∞[', () => {
		const { relation, result } = solveCase('x^2\\ge\\frac{1}{\\pi}');
		expect(result.status).toBe('complete');
		const set = result.solution as IntervalSet;
		expect(set.intervals).toHaveLength(2);
		expect(set.intervals[0].upper.type).toBe('closed');
		expect(set.intervals[1].lower.type).toBe('closed');
		expect(endpointToNumber(set.intervals[0].upper.value as MathNode)).toBeCloseTo(
			-1 / Math.sqrt(Math.PI),
			6
		);
		expectSampledAgreement(relation, result.solution);
	});
});

// =============================================================================
// Témoins déjà justes (ne doivent pas bouger)
// =============================================================================

describe('V37 — témoins', () => {
	const witnesses: Array<[string, number]> = [
		['\\pi x<1', 1 / Math.PI],
		['x<\\pi', Math.PI],
		['x<\\frac{2}{3}', 2 / 3],
		['x<\\frac{1}{\\sqrt2}', Math.SQRT1_2]
	];

	it.each(witnesses)('%s', (latex, bound) => {
		const { relation, result } = solveCase(latex);
		expect(result.status).toBe('complete');
		const [iv] = (result.solution as IntervalSet).intervals;
		expect(endpointToNumber(iv.upper.value as MathNode)).toBeCloseTo(bound, 6);
		expectSampledAgreement(relation, result.solution);
	});

	it('(π − 4)x > 1 : ]−∞ ; 1/(π − 4)[', () => {
		const { relation, result } = solveCase('(\\pi-4)x>1');
		expect(result.status).toBe('complete');
		const [iv] = (result.solution as IntervalSet).intervals;
		expect(endpointToNumber(iv.upper.value as MathNode)).toBeCloseTo(1 / (Math.PI - 4), 6);
		expectSampledAgreement(relation, result.solution);
	});
});

// =============================================================================
// La cause, au niveau de solve : P/c = 0, c constante non nulle
// =============================================================================

describe('V37 — solve(P/c = 0), c constante non numérique', () => {
	const equations: Array<[string, number[]]> = [
		['\\frac{\\pi x-2}{\\pi}=0', [TWO_OVER_PI]],
		['\\frac{\\pi x^2-1}{\\pi}=0', [-1 / Math.sqrt(Math.PI), 1 / Math.sqrt(Math.PI)]],
		['\\frac{3x-2}{5}=0', [2 / 3]]
	];

	it.each(equations)('%s', (latex, roots) => {
		const result = solve(relationOf(latex), { variable: 'x' });
		expect(result.error).toBeUndefined();
		const values = result.solutions
			.map((s) => s.approximate ?? evaluateNodeToApproximatedNumber(s.value))
			.sort((a, b) => a - b);
		expect(values).toHaveLength(roots.length);
		roots.forEach((r, i) => expect(values[i]).toBeCloseTo(r, 9));
	});

	it('dénominateur nul (π − π) : pas de résolution du numérateur', () => {
		const result = solve(relationOf('\\frac{x-1}{\\pi-\\pi}=0'), { variable: 'x' });
		expect(result.solutions.map((s) => s.approximate)).not.toContain(1);
	});
});
