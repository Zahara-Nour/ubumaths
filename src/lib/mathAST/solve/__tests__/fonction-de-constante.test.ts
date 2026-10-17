/**
 * Écart V38 — une fonction dont l'argument ne contient pas l'inconnue est une
 * CONSTANTE pour le classement.
 *
 * `getPolynomialDegree` refusait tout l'arbre dès qu'il y voyait `ln`, `cos`…
 * (`containsTranscendental`, aveugle à l'argument), et le classement lisait le
 * type transcendant de la même façon. `x = \ln 3`, `x\ln 2 = 1`,
 * `x\cos(1) = 1` répondaient « transcendante non supporte », et
 * `x < 1/\ln 2` rendait ∅ (statut `partial`). Même cause pour une puissance
 * constante à exposant non entier (`2^π`), lue comme « non polynomiale ».
 *
 * Chaque solution est vérifiée deux fois : sa forme exacte (LaTeX) quand elle
 * est fixée, puis numériquement (elle annule g − d). Les inéquations sont
 * vérifiées par échantillonnage (x ∈ S ⇔ l'inéquation tient en x).
 */

import { describe, it, expect } from 'vitest';
import { solve } from '../solve';
import { solveInequality } from '../inequality';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { substitute } from '../../eval/substitute';
import { evaluateNodeToApproximatedNumber } from '../../eval/evaluate';
import { containsValue } from '../../domain/algebra';
import { endpointToNumber } from '$lib/math/intervals/endpoint';
import type { Domain, IntervalSet } from '../../domain/types';
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

/** Valeurs des solutions, triées, après vérification qu'elles annulent g − d. */
function solvedValues(latex: string): number[] {
	const relation = relationOf(latex);
	const result = solve(relation, { variable: 'x' });
	expect(result.error, latex).toBeUndefined();
	const values = result.solutions
		// La forme EXACTE est évaluée, pas `approximate` : c'est elle qu'on affiche
		.map((s) => evaluateNodeToApproximatedNumber(s.value))
		.sort((a, b) => a - b);
	for (const v of values) {
		const gap = valueAt(relation.left, v) - valueAt(relation.right, v);
		expect(Math.abs(gap), `${latex} en x = ${v}`).toBeLessThan(1e-9);
	}
	return values;
}

function holdsAt(relation: RelationNode, x: number): boolean {
	const left = valueAt(relation.left, x);
	const right = valueAt(relation.right, x);
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

function expectSampledAgreement(relation: RelationNode, solution: Domain): void {
	for (let k = -1200; k <= 1200; k++) {
		const x = k / 97 + 0.0013;
		expect(containsValue(solution, x), `x = ${x}`).toBe(holdsAt(relation, x));
	}
}

// =============================================================================
// Les quatre équations de V38 : forme exacte
// =============================================================================

describe('V38 — fonction d’une constante, forme exacte', () => {
	const cases: Array<[string, string, number]> = [
		['x=\\ln 3', '\\ln\\left( 3 \\right)', Math.log(3)],
		['x\\ln 2=1', '\\dfrac{1}{\\ln\\left( 2 \\right)}', 1 / Math.LN2],
		['x\\cos(1)=1', '\\dfrac{1}{\\cos\\left( 1 \\right)}', 1 / Math.cos(1)],
		['\\frac{x}{\\ln 2}=1', '\\ln\\left( 2 \\right)', Math.LN2]
	];

	it.each(cases)('%s → %s', (latex, expectedLatex, expectedValue) => {
		const result = solve(relationOf(latex), { variable: 'x' });
		expect(result.error).toBeUndefined();
		expect(result.status).toBe('unique');
		expect(result.solutions).toHaveLength(1);
		expect(toLatex(result.solutions[0].value)).toBe(expectedLatex);
		expect(solvedValues(latex)).toHaveLength(1);
		expect(solvedValues(latex)[0]).toBeCloseTo(expectedValue, 9);
	});
});

// =============================================================================
// Cas frères : autres fonctions, autres degrés, autres solveurs
// =============================================================================

describe('V38 — cas frères (vérification numérique)', () => {
	const cases: Array<[string, number[]]> = [
		['3x=\\sin(1)', [Math.sin(1) / 3]],
		['x=\\sqrt{\\ln 2}', [Math.sqrt(Math.LN2)]],
		['x=\\log_{10}2', [Math.log10(2)]],
		['3x=\\log 2', [Math.log10(2) / 3]],
		['x=2^{\\pi}', [2 ** Math.PI]],
		['2x=2^{\\pi}', [2 ** Math.PI / 2]],
		['x\\ln 2=x+1', [1 / (Math.LN2 - 1)]],
		// Second degré
		['x^2=\\ln 5', [-Math.sqrt(Math.log(5)), Math.sqrt(Math.log(5))]],
		['x^2-\\ln 5=0', [-Math.sqrt(Math.log(5)), Math.sqrt(Math.log(5))]],
		[
			'x^2+x\\ln 2-1=0',
			[
				(-Math.LN2 - Math.sqrt(Math.LN2 ** 2 + 4)) / 2,
				(-Math.LN2 + Math.sqrt(Math.LN2 ** 2 + 4)) / 2
			]
		],
		// Hors polynôme : racine et inverse
		['\\sqrt{x}=\\ln 5', [Math.log(5) ** 2]],
		['\\frac{1}{x}=\\ln 2', [1 / Math.LN2]],
		['\\frac{2}{x}=\\cos 1', [2 / Math.cos(1)]]
	];

	it.each(cases)('%s', (latex, roots) => {
		const values = solvedValues(latex);
		expect(values).toHaveLength(roots.length);
		roots.forEach((r, i) => expect(values[i]).toBeCloseTo(r, 9));
	});
});

describe('V38 — inéquations', () => {
	const cases: Array<[string, Array<[number, number]>]> = [
		['x<\\frac{1}{\\ln 2}', [[-Infinity, 1 / Math.LN2]]],
		['x\\ln 2>1', [[1 / Math.LN2, Infinity]]],
		['2x\\ge\\cos(1)', [[Math.cos(1) / 2, Infinity]]],
		['x<2^{\\pi}', [[-Infinity, 2 ** Math.PI]]],
		['x^2<\\ln 5', [[-Math.sqrt(Math.log(5)), Math.sqrt(Math.log(5))]]]
	];

	it.each(cases)('%s', (latex, bounds) => {
		const relation = relationOf(latex);
		const result = solveInequality(relation);
		expect(result.status).toBe('complete');
		expect(result.solution.kind).toBe('interval_set');
		const set = result.solution as IntervalSet;
		expect(set.intervals).toHaveLength(bounds.length);
		bounds.forEach(([lo, hi], i) => {
			expect(endpointToNumber(set.intervals[i].lower.value as MathNode)).toBeCloseTo(lo, 9);
			expect(endpointToNumber(set.intervals[i].upper.value as MathNode)).toBeCloseTo(hi, 9);
		});
		expectSampledAgreement(relation, result.solution);
	});
});

// =============================================================================
// Témoins : vraies équations transcendantes, résultat inchangé
// =============================================================================

describe('V38 — témoins transcendants', () => {
	// Mixtes : l'inconnue à la fois dans une fonction et hors d'elle — inchangés
	it.each(['\\ln x+x=2', '2^x=x+3', 'x^{\\ln 2}=3'])('%s : toujours non résolue', (latex) => {
		const result = solve(relationOf(latex), { variable: 'x' });
		expect(result.status).toBe('no-solution');
		expect(result.solutions).toHaveLength(0);
		expect(result.error).toBeDefined();
	});

	it('e^x ln 2 = 1 → −ln(ln 2)', () => {
		const result = solve(relationOf('e^x\\ln 2=1'), { variable: 'x' });
		expect(result.equationType).toBe('exponential');
		expect(result.solutions.map((s) => toLatex(s.value))).toEqual([
			'-\\ln\\left( \\ln\\left( 2 \\right) \\right)'
		]);
		expect(solvedValues('e^x\\ln 2=1')).toEqual([expect.closeTo(-Math.log(Math.LN2), 9)]);
	});

	it('cos(x) ln 2 = 0 → ±π/2', () => {
		const result = solve(relationOf('\\cos(x)\\ln 2=0'), { variable: 'x' });
		expect(result.equationType).toBe('trigonometric');
		expect(result.solutions.map((s) => toLatex(s.value))).toEqual([
			'\\dfrac{1}{2} \\pi',
			'-\\dfrac{1}{2} \\pi'
		]);
		expect(solvedValues('\\cos(x)\\ln 2=0')).toEqual([
			expect.closeTo(-Math.PI / 2, 9),
			expect.closeTo(Math.PI / 2, 9)
		]);
	});

	it('\\ln x = 2 → e²', () => {
		const result = solve(relationOf('\\ln x=2'), { variable: 'x' });
		expect(result.equationType).toBe('logarithmic');
		expect(toLatex(result.solutions[0].value)).toBe('\\exponentialE^2');
		expect(solvedValues('\\ln x=2')).toEqual([expect.closeTo(Math.E ** 2, 9)]);
	});

	it('\\cos x = 1/2 → ±π/3', () => {
		const result = solve(relationOf('\\cos x=\\frac12'), { variable: 'x' });
		expect(result.equationType).toBe('trigonometric');
		expect(result.solutions.map((s) => toLatex(s.value))).toEqual([
			'\\dfrac{1}{3} \\pi',
			'-\\dfrac{1}{3} \\pi'
		]);
	});

	it('e^x = 3 → ln 3', () => {
		const result = solve(relationOf('e^x=3'), { variable: 'x' });
		expect(result.equationType).toBe('exponential');
		expect(toLatex(result.solutions[0].value)).toBe('\\ln\\left( 3 \\right)');
	});

	it('\\cos x = \\ln 2 : reste trigonométrique', () => {
		const result = solve(relationOf('\\cos x=\\ln 2'), { variable: 'x' });
		expect(result.equationType).toBe('trigonometric');
		expect(result.solutions.map((s) => toLatex(s.value))).toEqual([
			'\\arccos\\left( \\ln\\left( 2 \\right) \\right)',
			'-\\arccos\\left( \\ln\\left( 2 \\right) \\right)'
		]);
	});

	it('x e^x = 1 : toujours non supportée', () => {
		const result = solve(relationOf('x e^{x}=1'), { variable: 'x' });
		expect(result.status).toBe('no-solution');
		expect(result.error).toBeDefined();
	});

	it('\\ln x < 1 → ]0 ; e[', () => {
		const relation = relationOf('\\ln x<1');
		const result = solveInequality(relation);
		expect(result.status).toBe('complete');
		const [iv] = (result.solution as IntervalSet).intervals;
		expect(endpointToNumber(iv.lower.value as MathNode)).toBe(0);
		expect(endpointToNumber(iv.upper.value as MathNode)).toBeCloseTo(Math.E, 9);
	});
});
