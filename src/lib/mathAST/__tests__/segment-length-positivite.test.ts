/**
 * Longueurs de segments, lot « positivité » (Q-F, décision de David du 2026-10-12,
 * `docs/wip/longueurs-segments-progress.md`).
 *
 * - une longueur `AB` (mode longueur) est STRICTEMENT POSITIVE par défaut, par `numtype` ;
 * - une hypothèse déclarée sur `AB` (ou `BA`) par un modèle garde la priorité ;
 * - un segment à points identiques (`AA`, `A'A'`) n'est pas supposé positif (il vaut 0) ;
 * - `solve` ne garde que les valeurs positives d'une longueur inconnue ; un domaine passé
 *   par l'appelant garde la priorité ;
 * - en mode produit, et sans longueur, rien ne change.
 *
 * Entrées parsées, coefficients ≠ 1.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../equivalence';
import { parseLatex } from '../parser';
import { simplify } from '../simplify';
import { toLatex } from '../latex-generator';
import { evaluate } from '../eval/evaluate';
import { substitute } from '../eval/substitute';
import { solve } from '../solve';
import { isPositiveType } from '../numtype';
import { answerAssumptionsToTypeContext } from '../assumptions';
import { UNIVERSAL_SET } from '../domain';
import type { MathNode, RelationNode } from '../types';

// =============================================================================
// Helpers
// =============================================================================

const LENGTH = { capitalPairs: 'length' } as const;

function read(latex: string): MathNode {
	return parseLatex(latex, LENGTH);
}

function readEquation(latex: string, product = false): RelationNode {
	const node = product ? parseLatex(latex) : read(latex);
	if (node.type !== 'relation') throw new Error(`Pas une équation : ${latex}`);
	return node;
}

function simplified(latex: string, product = false): string {
	return toLatex(simplify(product ? parseLatex(latex) : read(latex)).result);
}

function decimalValue(node: MathNode): number | null {
	const result = evaluate(node, { mode: 'decimal' });
	if (result.status !== 'value' || typeof result.value !== 'number') return null;
	return result.value;
}

/** Les valeurs décimales des solutions, triées. */
function solutionValues(latex: string, variable: string): (number | null)[] {
	const result = solve(readEquation(latex), { variable });
	return result.solutions.map((s) => decimalValue(s.value)).sort((a, b) => (a ?? 0) - (b ?? 0));
}

// =============================================================================
// numtype : le signe d'une longueur
// =============================================================================

describe('numtype : une longueur est strictement positive par défaut', () => {
	it('AB, BA, 3AB, AB + CD sont positifs', () => {
		for (const latex of ['AB', 'BA', '3AB', 'AB+CD', "A'B'", 'A_1B_1']) {
			expect(isPositiveType(read(latex)), latex).toBe(true);
		}
	});

	it('AA et A’A’ (points identiques) ne sont pas supposés positifs', () => {
		expect(isPositiveType(read('AA'))).toBe(false);
		expect(isPositiveType(read("A'A'"))).toBe(false);
	});

	it('une hypothèse déclarée sur AB garde la priorité (non nul : plus de signe)', () => {
		const ctx = answerAssumptionsToTypeContext({ AB: 'nonzero' });
		expect(isPositiveType(read('AB'), ctx)).toBe(false);
		expect(isPositiveType(read('BA'), ctx)).toBe(false);
		// Une hypothèse sur une autre lettre ne retire rien à AB
		expect(isPositiveType(read('AB'), answerAssumptionsToTypeContext({ x: 'integer' }))).toBe(true);
	});
});

// =============================================================================
// simplify
// =============================================================================

describe('simplify : une longueur sort des valeurs absolues', () => {
	it.each([
		['\\sqrt{AB^2}', 'AB'],
		['|AB|', 'AB'],
		['\\sqrt{9AB^2}', '3 AB'],
		['\\frac{AB}{AB}', '1'],
		['|3BA|', '3 BA']
	])('simplify(%s) = %s', (latex, expected) => {
		expect(simplified(latex)).toBe(expected);
	});

	it('|AA| garde sa valeur absolue (points identiques)', () => {
		expect(simplified('|AA|')).toBe('\\left| AA \\right|');
	});

	it('sans longueur, rien ne change : √(x²) et |x| restent', () => {
		expect(simplified('\\sqrt{x^2}')).toBe('\\sqrt{x^2}');
		expect(simplified('|x|')).toBe('\\left| x \\right|');
	});

	it('mode produit : sorties d’avant le lot (mesurées le 2026-10-12)', () => {
		expect(simplified('\\sqrt{AB^2}', true)).toBe('\\sqrt{A B^2}');
		expect(simplified('|AB|', true)).toBe('\\left| A B \\right|');
		expect(simplified('\\sqrt{9AB^2}', true)).toBe('\\sqrt{9 A B^2}');
		expect(simplified('\\sqrt{(AB)^2}', true)).toBe('\\left| A B \\right|');
	});
});

// =============================================================================
// areEquivalent
// =============================================================================

describe('areEquivalent : une longueur est positive', () => {
	it.each([
		['\\sqrt{AB^2}', 'AB'],
		['|AB|', 'BA'],
		['\\sqrt{9AB^2}', '3BA'],
		['\\sqrt{AB^2+0}', 'AB']
	])('%s ≡ %s', (a, b) => {
		expect(areEquivalent(read(a), read(b))).toBe(true);
	});

	it('|AA| ≢ AA (points identiques)', () => {
		expect(areEquivalent(read('|AA|'), read('AA'))).toBe(false);
	});

	it('|AB − CD| ≢ AB − CD : une différence de longueurs n’a pas de signe connu', () => {
		expect(areEquivalent(read('|AB-CD|'), read('AB-CD'))).toBe(false);
	});

	it('une hypothèse déclarée sur AB garde la priorité : |AB| ≢ AB si AB est seulement non nul', () => {
		expect(areEquivalent(read('|AB|'), read('AB'), { assumptions: { AB: 'nonzero' } })).toBe(false);
	});

	it('mode produit et minuscules : inchangé', () => {
		expect(areEquivalent(parseLatex('|AB|'), parseLatex('AB'))).toBe(false);
		expect(areEquivalent(parseLatex('\\sqrt{(AB)^2}'), parseLatex('|AB|'))).toBe(true);
		expect(areEquivalent(read('|x|'), read('x'))).toBe(false);
	});
});

// =============================================================================
// solve
// =============================================================================

describe('solve : une longueur inconnue est positive', () => {
	it('AB^2 = 9 → AB = 3 seulement', () => {
		expect(solutionValues('AB^2=9', 'AB')).toEqual([3]);
		expect(solve(readEquation('AB^2=9'), { variable: 'AB' }).status).toBe('unique');
	});

	it('(2AB)^2 = 36 → AB = 3', () => {
		expect(solutionValues('(2AB)^2=36', 'AB')).toEqual([3]);
	});

	it('3BA^2 = 75, résolue en AB → 5', () => {
		expect(solutionValues('3BA^2=75', 'AB')).toEqual([5]);
	});

	it('Pythagore littéral en AB → √(AC² + BC²)', () => {
		const result = solve(readEquation('AB^2=AC^2+BC^2'), { variable: 'AB' });
		expect(result.solutions).toHaveLength(1);
		const [solution] = result.solutions;
		expect(solution && toLatex(solution.value)).toBe('\\sqrt{AC^2 + BC^2}');
		expect(solution && decimalValue(substitute(solution.value, { AC: 3, BC: 4 }))).toBe(5);
	});

	it('AB^2 = -4 : aucune solution', () => {
		expect(solve(readEquation('AB^2=-4'), { variable: 'AB' }).solutions).toEqual([]);
	});

	it('AA^2 = 9 (points identiques) : ±3, comme aujourd’hui', () => {
		expect(solutionValues('AA^2=9', 'AA')).toEqual([-3, 3]);
	});

	it('x^2 = 9 : ±3, inchangé', () => {
		expect(solutionValues('x^2=9', 'x')).toEqual([-3, 3]);
	});

	it('un domaine passé par l’appelant garde la priorité', () => {
		const result = solve(readEquation('AB^2=9'), { variable: 'AB', domain: UNIVERSAL_SET });
		const values = result.solutions.map((s) => decimalValue(s.value)).sort();
		expect(values).toEqual([-3, 3]);
	});

	it('x + AB = 3, en x : la solution 3 − AB reste (pas de filtre sur une autre inconnue)', () => {
		const result = solve(readEquation('x+AB=3'), { variable: 'x' });
		expect(result.solutions).toHaveLength(1);
	});

	it('AB + BC = 10, en AB : 10 − BC reste (signe inconnu, gardé)', () => {
		const result = solve(readEquation('AB+BC=10'), { variable: 'AB' });
		expect(result.solutions).toHaveLength(1);
	});

	it('mode produit : inchangé', () => {
		const result = solve(readEquation('AB^2=9', true), { variable: 'B' });
		expect(result.solutions).toHaveLength(2);
	});
});
