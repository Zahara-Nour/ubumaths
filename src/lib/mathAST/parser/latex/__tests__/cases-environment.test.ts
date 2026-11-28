/**
 * `\begin{cases} … \end{cases}` → nœud `piecewise` (chantier `fonctions-par-morceaux`, PR 1).
 *
 * Une ligne = `valeur & condition` ; la condition peut être précédée de
 * `\text{si}` / `\text{pour}` ; une DERNIÈRE ligne `valeur & \text{sinon}` (ou
 * `\text{otherwise}`) est le `otherwise`. Aller-retour : `toLatex` puis relecture
 * redonne le même arbre.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../index';
import { toLatex } from '../../../latex-generator';
import { piecewise, piecewisePiece } from '../../../factory';
import type { MathNode } from '../../../types';

// =============================================================================
// Constantes
// =============================================================================

/** 3x si x < 2, x² si x ≥ 2. */
const TWO_PIECES = piecewise([
	piecewisePiece(parseLatex('x<2'), parseLatex('3x')),
	piecewisePiece(parseLatex('x\\geq 2'), parseLatex('x^2'))
]);

/** 2x si 0 ≤ x ≤ 1, x² si x < 0 ou x > 1, et un « et ». */
const COMPOUND = piecewise([
	piecewisePiece(parseLatex('0\\leq x\\leq 1'), parseLatex('2x')),
	piecewisePiece(parseLatex('x<0 \\lor x>3'), parseLatex('x^2')),
	piecewisePiece(parseLatex('x>1 \\land x\\neq 2'), parseLatex('\\frac{1}{x-2}'))
]);

/** 3x si x < 0, sinon x². */
const WITH_OTHERWISE = piecewise(
	[piecewisePiece(parseLatex('x<0'), parseLatex('3x'))],
	parseLatex('x^2')
);

// =============================================================================
// Tests
// =============================================================================

describe('parseLatex — environnement cases', () => {
	it('deux lignes valeur & condition', () => {
		expect(parseLatex('\\begin{cases} 3x & x<2 \\\\ x^2 & x\\geq 2 \\end{cases}')).toEqual(
			TWO_PIECES
		);
	});

	it('`\\text{si }` et `\\text{ pour }` devant la condition', () => {
		expect(
			parseLatex(
				'\\begin{cases} 3x & \\text{si } x<2 \\\\ x^2 & \\text{ pour } x\\geq 2 \\end{cases}'
			)
		).toEqual(TWO_PIECES);
	});

	it('dernière ligne `\\text{sinon}` ou `\\text{otherwise}` → otherwise', () => {
		expect(parseLatex('\\begin{cases} 3x & x<0 \\\\ x^2 & \\text{sinon} \\end{cases}')).toEqual(
			WITH_OTHERWISE
		);
		expect(parseLatex('\\begin{cases} 3x & x<0 \\\\ x^2 & \\text{otherwise} \\end{cases}')).toEqual(
			WITH_OTHERWISE
		);
	});

	it('un `\\\\` final avant `\\end` est toléré', () => {
		expect(parseLatex('\\begin{cases} 3x & x<2 \\\\ x^2 & x\\geq 2 \\\\ \\end{cases}')).toEqual(
			TWO_PIECES
		);
	});

	it('ligne sans condition au milieu → erreur', () => {
		expect(() => parseLatex('\\begin{cases} 3x \\\\ x^2 & x\\geq 2 \\end{cases}')).toThrow();
	});

	it('ligne sans condition en dernier (sans « sinon ») → erreur', () => {
		expect(() => parseLatex('\\begin{cases} 3x & x<2 \\\\ x^2 \\end{cases}')).toThrow();
	});

	it('`sinon` ailleurs qu’en dernière ligne → erreur', () => {
		expect(() =>
			parseLatex('\\begin{cases} 3x & \\text{sinon} \\\\ x^2 & x\\geq 2 \\end{cases}')
		).toThrow();
	});

	it('environnement vide → erreur', () => {
		expect(() => parseLatex('\\begin{cases} \\end{cases}')).toThrow();
	});
});

describe('aller-retour toLatex → parseLatex', () => {
	const cases: ReadonlyArray<readonly [string, MathNode]> = [
		['deux morceaux', TWO_PIECES],
		['conditions composées', COMPOUND],
		['sinon', WITH_OTHERWISE]
	];
	it.each(cases)('%s', (_, node) => {
		expect(parseLatex(toLatex(node))).toEqual(node);
	});
});
