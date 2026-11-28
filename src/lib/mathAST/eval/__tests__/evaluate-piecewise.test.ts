/**
 * Calcul exact d'une fonction par morceaux (chantier `fonctions-par-morceaux`, PR 1).
 *
 * Une fois la variable remplacée par une valeur exacte, un nœud `piecewise` dont
 * les conditions se tranchent vaut la valeur du PREMIER morceau vrai, calculée
 * exactement. Une condition qu'on ne tranche pas (paramètre sans valeur) laisse
 * le nœud tel quel ; aucun morceau vrai et pas de `sinon` : pas de valeur.
 */

import { describe, it, expect } from 'vitest';
import { evaluate } from '../evaluate';
import { substitute } from '../substitute';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { piecewise, piecewisePiece, number } from '../../factory';
import type { MathNode } from '../../types';

// =============================================================================
// Fonctions
// =============================================================================

/** f(x) = 3x si x < k, x² si x ≥ k (coefficient ≠ 1 : un x nu cache les facteurs). */
function threeXThenSquare(bound: string): MathNode {
	return piecewise([
		piecewisePiece(parseLatex(`x<${bound}`), parseLatex('3x')),
		piecewisePiece(parseLatex(`x\\geq ${bound}`), parseLatex('x^2'))
	]);
}

/** La valeur exacte de `body` en x = `at` (LaTeX), écrite en LaTeX. */
function exactAt(body: MathNode, at: string, values: Record<string, MathNode> = {}): string {
	const result = evaluate(substitute(body, { ...values, x: parseLatex(at) }), { mode: 'exact' });
	if (result.status !== 'value') throw new Error(`pas de valeur : ${JSON.stringify(result)}`);
	return toLatex(result.node);
}

/** La valeur exacte attendue, calculée par le même moteur sur l'expression écrite. */
function expected(latex: string): string {
	const result = evaluate(parseLatex(latex), { mode: 'exact' });
	if (result.status !== 'value') throw new Error(`pas de valeur attendue : ${latex}`);
	return toLatex(result.node);
}

// =============================================================================
// Tests
// =============================================================================

describe('evaluate — fonction par morceaux, conditions tranchées', () => {
	const f = threeXThenSquare('2');

	it('f(1) = 3 (premier morceau)', () => {
		expect(exactAt(f, '1')).toBe(expected('3'));
	});

	it('f(3) = 9 (second morceau)', () => {
		expect(exactAt(f, '3')).toBe(expected('9'));
	});

	it('f(2) = 4 : la borne va au morceau ≥', () => {
		expect(exactAt(f, '2')).toBe(expected('4'));
	});

	it('f(-1/2) = -3/2, exact', () => {
		expect(exactAt(f, '-\\frac{1}{2}')).toBe(expected('-\\frac{3}{2}'));
	});

	it('f(√2) = 3√2 : √2 < 2 tranché', () => {
		expect(exactAt(f, '\\sqrt{2}')).toBe(expected('3\\sqrt{2}'));
	});

	it('f(√4) = 4 : √4 = 2 exactement, donc le morceau ≥', () => {
		expect(exactAt(f, '\\sqrt{4}')).toBe(expected('4'));
	});

	it('mode décimal : f(3) = 9', () => {
		const result = evaluate(substitute(f, { x: number('3') }), { mode: 'decimal' });
		expect(result.status === 'value' && result.value).toBe(9);
	});
});

describe('evaluate — conditions composées, ≠, sinon', () => {
	// g(x) = 2x si 0 ≤ x ≤ 1, x² si x < 0 ou x > 1
	const g = piecewise([
		piecewisePiece(parseLatex('0\\leq x\\leq 1'), parseLatex('2x')),
		piecewisePiece(parseLatex('x<0 \\lor x>1'), parseLatex('x^2'))
	]);

	it('chaîne 0 ≤ x ≤ 1 : g(1/2) = 1', () => {
		expect(exactAt(g, '\\frac{1}{2}')).toBe(expected('1'));
	});

	it('« ou » : g(-3) = 9 et g(3) = 9', () => {
		expect(exactAt(g, '-3')).toBe(expected('9'));
		expect(exactAt(g, '3')).toBe(expected('9'));
	});

	it('« et » : 2x si x > 0 ∧ x < 1', () => {
		const h = piecewise(
			[piecewisePiece(parseLatex('x>0 \\land x<1'), parseLatex('2x'))],
			parseLatex('5')
		);
		expect(exactAt(h, '\\frac{1}{4}')).toBe(expected('\\frac{1}{2}'));
		expect(exactAt(h, '1')).toBe(expected('5'));
	});

	it('≠ et sinon : le morceau écarté n’est pas calculé (pas de division par zéro)', () => {
		const q = piecewise(
			[piecewisePiece(parseLatex('x\\neq 1'), parseLatex('\\frac{3}{x-1}'))],
			parseLatex('7')
		);
		expect(exactAt(q, '3')).toBe(expected('\\frac{3}{2}'));
		expect(exactAt(q, '1')).toBe(expected('7'));
	});

	it('aucun morceau vrai et pas de sinon : pas de valeur, raison en français', () => {
		const hole = piecewise([
			piecewisePiece(parseLatex('x<0'), parseLatex('3x')),
			piecewisePiece(parseLatex('x>1'), parseLatex('x^2'))
		]);
		const result = evaluate(substitute(hole, { x: parseLatex('\\frac{1}{2}') }), {
			mode: 'exact'
		});
		expect(result.status).toBe('unevaluable');
		if (result.status === 'unevaluable') expect(result.reason).toMatch(/^Aucun morceau/);
		const decimal = evaluate(substitute(hole, { x: parseLatex('\\frac{1}{2}') }), {
			mode: 'decimal'
		});
		expect(decimal.status).toBe('unevaluable');
	});
});

describe('evaluate — paramètre dans les conditions', () => {
	const f = threeXThenSquare('k');

	it('k = 2 : mêmes valeurs qu’avec 2 écrit', () => {
		const k = { k: number('2') };
		expect(exactAt(f, '1', k)).toBe(expected('3'));
		expect(exactAt(f, '3', k)).toBe(expected('9'));
		expect(exactAt(f, '2', k)).toBe(expected('4'));
	});

	it('k sans valeur : nœud gardé, refus « variable libre », pas de plantage', () => {
		const result = evaluate(substitute(f, { x: number('3') }), { mode: 'exact' });
		expect(result.status).toBe('unevaluable');
		if (result.status === 'unevaluable') expect(result.reason).toContain('k');
	});

	it('x = k, k sans valeur : nœud gardé, pas le « sinon » (revue)', () => {
		const equal = piecewise(
			[piecewisePiece(parseLatex('x=k'), parseLatex('3x'))],
			parseLatex('x^2')
		);
		const result = evaluate(substitute(equal, { x: number('3') }), { mode: 'exact' });
		expect(result.status).toBe('unevaluable');
		if (result.status === 'unevaluable') expect(result.reason).toContain('k');
	});

	it('x ≠ k, k sans valeur : nœud gardé, pas le premier morceau (revue)', () => {
		const different = piecewise(
			[piecewisePiece(parseLatex('x\\neq k'), parseLatex('3x'))],
			parseLatex('x^2')
		);
		const result = evaluate(substitute(different, { x: number('3') }), { mode: 'exact' });
		expect(result.status).toBe('unevaluable');
		if (result.status === 'unevaluable') expect(result.reason).toContain('k');
	});

	it('x = k avec k = 3 : tranché (premier morceau)', () => {
		const equal = piecewise(
			[piecewisePiece(parseLatex('x=k'), parseLatex('3x'))],
			parseLatex('x^2')
		);
		expect(exactAt(equal, '3', { k: number('3') })).toBe(expected('9'));
		expect(exactAt(equal, '2', { k: number('3') })).toBe(expected('4'));
	});

	it('nœud gardé : un morceau imbriqué non choisi ne lève pas « aucun morceau » (revue)', () => {
		// { {1 si x > 5} si x < k ; 2 sinon } en x = 1, k inconnu : refus pour k
		const inner = piecewise([piecewisePiece(parseLatex('x>5'), parseLatex('1'))]);
		const outer = piecewise([piecewisePiece(parseLatex('x<k'), inner)], parseLatex('2'));
		const result = evaluate(substitute(outer, { x: number('1') }), { mode: 'exact' });
		expect(result.status).toBe('unevaluable');
		if (result.status === 'unevaluable') expect(result.reason).toContain('k');
	});

	it('condition avec π : tranchée (π n’est pas une lettre sans valeur)', () => {
		const withPi = piecewise(
			[piecewisePiece(parseLatex('x<\\pi'), parseLatex('1'))],
			parseLatex('2')
		);
		expect(exactAt(withPi, '3')).toBe(expected('1'));
		expect(exactAt(withPi, '4')).toBe(expected('2'));
	});

	it('premier morceau indécidable : on ne saute pas au suivant', () => {
		// 3x si x < k, x² sinon — en x = 3, k inconnu : ni l'un ni l'autre
		const withOtherwise = piecewise(
			[piecewisePiece(parseLatex('x<k'), parseLatex('3x'))],
			parseLatex('x^2')
		);
		const result = evaluate(substitute(withOtherwise, { x: number('3') }), { mode: 'exact' });
		expect(result.status).toBe('unevaluable');
	});
});
