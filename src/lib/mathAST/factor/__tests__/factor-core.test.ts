/**
 * Noyau exact de factorisation (ADR 0024, lot 1).
 *
 * Le noyau reçoit un `MathNode` et une variable ; il lit le POLYNÔME (la forme
 * d'entrée n'importe pas) et rend sa factorisation exacte dans ℚ[x], ou dans ℝ
 * sur demande : une constante (le contenu, avec son signe), des facteurs à
 * coefficients entiers primitifs avec leur multiplicité, et un reste éventuel
 * sans racine rationnelle. Hors de son champ (pas un polynôme, coefficient non
 * rationnel ou symbolique), il rend `null` sans lever.
 *
 * Chaque cas part d'un LaTeX PARSÉ, et le rendu est comparé à l'entrée par
 * `areEquivalent` : la factorisation n'est jamais fausse.
 *
 * L'ordre des facteurs n'est pas une décision de produit : celui du noyau est
 * déterministe (puissance de x d'abord, puis facteurs du premier degré par
 * |racine| croissante, la racine positive avant la négative, puis les facteurs
 * de degré 2, puis le reste), et c'est lui que les tests figent.
 */

import { describe, it, expect } from 'vitest';
import type { MathNode } from '../../types';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { areEquivalent } from '../../equivalence';
import { findNodes } from '../../transforms';
import { isNumber } from '../../guards';
import {
	factorPolynomial,
	factorizationToNode,
	MAX_FACTOR_DEGREE,
	MAX_RATIONAL_ROOT_CANDIDATES,
	type Factorization,
	type FactorField
} from '../index';

// =============================================================================
// Outils
// =============================================================================

interface Measured {
	readonly input: MathNode;
	readonly factorization: Factorization;
	readonly node: MathNode;
	readonly latex: string;
}

function factorOf(source: string, field?: FactorField, variable = 'x'): Measured {
	const input = parseLatex(source);
	const factorization = factorPolynomial(input, variable, field ? { field } : undefined);
	if (factorization === null) throw new Error(`factorPolynomial(${source}) a rendu null`);
	const node = factorizationToNode(factorization);
	return { input, factorization, node, latex: toLatex(node) };
}

/** Aucun `number` négatif dans l'arbre rendu (invariant 1). */
function hasNegativeLiteral(node: MathNode): boolean {
	return findNodes(node, isNumber).some((n) => n.value.startsWith('-'));
}

// =============================================================================
// Le panel de l'ADR 0024, dans ℚ
// =============================================================================

describe('factorPolynomial dans ℚ : le panel', () => {
	it.each([
		['6x+9', '3 \\left( 2 x + 3 \\right)'],
		['3x^2+6x', '3 x \\left( x + 2 \\right)'],
		['4x^3-2x^2', '2 x^2 \\left( 2 x - 1 \\right)'],
		['x^2-9', '\\left( x - 3 \\right) \\left( x + 3 \\right)'],
		['4x^2-25', '\\left( 2 x - 5 \\right) \\left( 2 x + 5 \\right)'],
		['x^2+6x+9', '\\left( x + 3 \\right)^2'],
		['9x^2-12x+4', '\\left( 3 x - 2 \\right)^2'],
		['3x^2+6x+3', '3 \\left( x + 1 \\right)^2'],
		['2x^2-8', '2 \\left( x - 2 \\right) \\left( x + 2 \\right)'],
		['x^2-5x+6', '\\left( x - 2 \\right) \\left( x - 3 \\right)'],
		['2x^2+x-3', '\\left( x - 1 \\right) \\left( 2 x + 3 \\right)'],
		['\\frac12x^2-\\frac12', '\\dfrac{1}{2} \\left( x - 1 \\right) \\left( x + 1 \\right)'],
		['x^3-6x^2+11x-6', '\\left( x - 1 \\right) \\left( x - 2 \\right) \\left( x - 3 \\right)'],
		['x^3-8', '\\left( x - 2 \\right) \\left( x^2 + 2 x + 4 \\right)'],
		['x^3+x^2+x+1', '\\left( x + 1 \\right) \\left( x^2 + 1 \\right)'],
		['x^4-1', '\\left( x - 1 \\right) \\left( x + 1 \\right) \\left( x^2 + 1 \\right)'],
		// La forme d'entrée n'importe pas : le noyau voit 3x² + 10x − 8
		['(2x+1)^2-(x-3)^2', '\\left( 3 x - 2 \\right) \\left( x + 4 \\right)']
	])('%s → %s', (source, expected) => {
		const { input, node, latex } = factorOf(source);
		expect(latex).toBe(expected);
		expect(areEquivalent(node, input)).toBe(true);
		expect(hasNegativeLiteral(node)).toBe(false);
	});
});

describe('factorPolynomial : la structure rendue', () => {
	it('4x^3-2x^2 : constante 2, x de multiplicité 2, 2x − 1', () => {
		const { factorization } = factorOf('4x^3-2x^2');
		expect(factorization.constant).toEqual({ n: 2n, d: 1n });
		expect(factorization.factors).toEqual([
			{ kind: 'integer', coefficients: [0n, 1n], multiplicity: 2 },
			{ kind: 'integer', coefficients: [-1n, 2n], multiplicity: 1 }
		]);
		expect(factorization.rest).toBeNull();
		expect(factorization.complete).toBe(true);
	});

	it('\\frac12x^2-\\frac12 : la constante est 1/2', () => {
		const { factorization } = factorOf('\\frac12x^2-\\frac12');
		expect(factorization.constant).toEqual({ n: 1n, d: 2n });
		expect(factorization.factors).toEqual([
			{ kind: 'integer', coefficients: [-1n, 1n], multiplicity: 1 },
			{ kind: 'integer', coefficients: [1n, 1n], multiplicity: 1 }
		]);
	});

	it('9x^2-12x+4 : un facteur entier primitif de multiplicité 2', () => {
		const { factorization } = factorOf('9x^2-12x+4');
		expect(factorization.constant).toEqual({ n: 1n, d: 1n });
		expect(factorization.factors).toEqual([
			{ kind: 'integer', coefficients: [-2n, 3n], multiplicity: 2 }
		]);
	});

	it('le signe va dans la constante : -2x+6 → -2(x − 3)', () => {
		const { factorization, node, input, latex } = factorOf('-2x+6');
		expect(factorization.constant).toEqual({ n: -2n, d: 1n });
		expect(latex).toBe('-2 \\left( x - 3 \\right)');
		expect(areEquivalent(node, input)).toBe(true);
		expect(hasNegativeLiteral(node)).toBe(false);
	});

	it('constante −1 : -x^2+9 → −(x − 3)(x + 3)', () => {
		const { node, input, latex } = factorOf('-x^2+9');
		expect(latex).toBe('-\\left( x - 3 \\right) \\left( x + 3 \\right)');
		expect(areEquivalent(node, input)).toBe(true);
	});

	it('une constante seule reste une constante', () => {
		const { factorization, node, input, latex } = factorOf('6');
		expect(areEquivalent(node, input)).toBe(true);
		expect(factorization.constant).toEqual({ n: 6n, d: 1n });
		expect(factorization.factors).toEqual([]);
		expect(latex).toBe('6');
	});

	it('la variable est un paramètre : t^2-1 en t', () => {
		const { node, input, latex } = factorOf('t^2-1', 'Q', 't');
		expect(latex).toBe('\\left( t - 1 \\right) \\left( t + 1 \\right)');
		expect(areEquivalent(node, input)).toBe(true);
	});
});

// =============================================================================
// Irréductibles et corps ℝ
// =============================================================================

describe('irréductibles : renvoyés comme tels', () => {
	it.each([
		['x^2+x+1', 'x^2 + x + 1', [1n, 1n, 1n]],
		['x+1', 'x + 1', [1n, 1n]],
		['x^2+1', 'x^2 + 1', [1n, 0n, 1n]]
	])('%s → %s', (source, expected, coefficients) => {
		const { factorization, node, input, latex } = factorOf(source);
		expect(latex).toBe(expected);
		expect(areEquivalent(node, input)).toBe(true);
		expect(factorization.constant).toEqual({ n: 1n, d: 1n });
		expect(factorization.factors).toEqual([{ kind: 'integer', coefficients, multiplicity: 1 }]);
		expect(factorization.rest).toBeNull();
	});

	it.each([
		['x^2+x+1', 'x^2 + x + 1'],
		['x^2+1', 'x^2 + 1']
	])('Δ < 0 reste irréductible dans ℝ aussi : %s', (source, expected) => {
		const { node, input, latex } = factorOf(source, 'R');
		expect(latex).toBe(expected);
		expect(areEquivalent(node, input)).toBe(true);
	});
});

describe('Δ > 0 non carré : irréductible dans ℚ, scindé dans ℝ', () => {
	it.each([
		['x^2-2', 'x^2 - 2'],
		['x^2-2x-1', 'x^2 - 2 x - 1']
	])('ℚ : %s reste %s', (source, expected) => {
		const { factorization, node, input, latex } = factorOf(source, 'Q');
		expect(latex).toBe(expected);
		expect(areEquivalent(node, input)).toBe(true);
		expect(factorization.factors).toHaveLength(1);
	});

	it.each([
		['x^2-2', '\\left( x - \\sqrt{2} \\right) \\left( x + \\sqrt{2} \\right)'],
		['x^2-2x-1', '\\left( x - 1 - \\sqrt{2} \\right) \\left( x - 1 + \\sqrt{2} \\right)']
	])('ℝ : %s → %s', (source, expected) => {
		const { node, input, latex } = factorOf(source, 'R');
		expect(latex).toBe(expected);
		expect(areEquivalent(node, input)).toBe(true);
		expect(hasNegativeLiteral(node)).toBe(false);
	});

	it('ℝ : le coefficient dominant sort en constante, 2x^2-1 → 2(x − √2/2)(x + √2/2)', () => {
		const { node, input, latex } = factorOf('2x^2-1', 'R');
		expect(latex).toBe(
			'2 \\left( x - \\dfrac{\\sqrt{2}}{2} \\right) \\left( x + \\dfrac{\\sqrt{2}}{2} \\right)'
		);
		expect(areEquivalent(node, input)).toBe(true);
	});

	it('ℝ : les racines rationnelles d’abord, puis le facteur scindé, x^3-2x', () => {
		const { node, input, latex } = factorOf('x^3-2x', 'R');
		expect(latex).toBe('x \\left( x - \\sqrt{2} \\right) \\left( x + \\sqrt{2} \\right)');
		expect(areEquivalent(node, input)).toBe(true);
	});
});

// =============================================================================
// Hors du champ du noyau : null, sans lever
// =============================================================================

describe('hors du champ : null', () => {
	it.each([
		['xe^x-e^x', 'pas un polynôme en x (exponentielle)'],
		['\\sin x', 'pas un polynôme en x (fonction)'],
		['ax+ay', 'coefficient symbolique'],
		['\\frac{1}{x}', 'fraction rationnelle, pas un polynôme'],
		['\\sqrt{2}x+1', 'coefficient non rationnel']
	])('%s (%s)', (source) => {
		expect(() => factorPolynomial(parseLatex(source), 'x')).not.toThrow();
		expect(factorPolynomial(parseLatex(source), 'x')).toBeNull();
	});
});

// =============================================================================
// Garde-fous : jamais faux, jamais long
// =============================================================================

describe('garde-fous', () => {
	it(`degré au-dessus de la borne (${MAX_FACTOR_DEGREE}) : null`, () => {
		expect(factorPolynomial(parseLatex('x^9-x'), 'x')).toBeNull();
		expect(factorPolynomial(parseLatex('(x+1)^{10}'), 'x')).toBeNull();
	});

	it('au degré de la borne, la factorisation se fait ; le reste sans racine rationnelle reste entier', () => {
		// x⁸ − 1 = (x − 1)(x + 1)(x⁶ + x⁴ + x² + 1) : le noyau ne cherche pas de
		// facteur de degré 2 dans un reste de degré ≥ 3 (limite du lot 1)
		const { factorization, node, input, latex } = factorOf('x^8-1');
		expect(latex).toBe(
			'\\left( x - 1 \\right) \\left( x + 1 \\right) \\left( x^6 + x^4 + x^2 + 1 \\right)'
		);
		expect(factorization.rest).toEqual([1n, 0n, 1n, 0n, 1n, 0n, 1n]);
		expect(factorization.complete).toBe(true);
		expect(areEquivalent(node, input)).toBe(true);
	});

	it('gros coefficients : recherche ±p/q coupée, factorisation partielle mais juste', () => {
		// (1000003x − 1)(x² + 1) : le coefficient dominant dépasse la borne des diviseurs
		const { factorization, node, input } = factorOf('2000006x^3-2x^2+2000006x-2');
		expect(factorization.constant).toEqual({ n: 2n, d: 1n });
		expect(factorization.complete).toBe(false);
		expect(factorization.rest).toEqual([-1n, 1000003n, -1n, 1000003n]);
		expect(areEquivalent(node, input)).toBe(true);
	});

	it.each([
		['1000000000000x^2-1', '\\left( 1000000 x - 1 \\right) \\left( 1000000 x + 1 \\right)'],
		['1000000000000x^2-2000000x+1', '\\left( 1000000 x - 1 \\right)^2']
	])('gros coefficients au degré 2 : Δ reste exact, %s', (source, expected) => {
		const { factorization, node, input, latex } = factorOf(source);
		expect(latex).toBe(expected);
		expect(factorization.complete).toBe(true);
		expect(areEquivalent(node, input)).toBe(true);
	});

	it('ℝ : radicande au-delà de la borne, le facteur reste entier et le dit', () => {
		const { factorization, node, input, latex } = factorOf('x^2-10000000019', 'R');
		expect(latex).toBe('x^2 - 10000000019');
		expect(factorization.complete).toBe(false);
		expect(areEquivalent(node, input)).toBe(true);
	});

	it(`trop de candidats ±p/q (> ${MAX_RATIONAL_ROOT_CANDIDATES}) : partiel, juste et rapide`, () => {
		// (720720x − 1)(x² + 720720) : 240 diviseurs de chaque côté
		const start = Date.now();
		const { factorization, node, input } = factorOf('720720x^3-x^2+519437318400x-720720');
		expect(Date.now() - start).toBeLessThan(2000);
		expect(factorization.complete).toBe(false);
		expect(areEquivalent(node, input)).toBe(true);
	});
});
