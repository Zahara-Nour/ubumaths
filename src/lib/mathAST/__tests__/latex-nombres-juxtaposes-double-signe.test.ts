/**
 * Deux nombres juxtaposés, deux signes consécutifs : deux écritures fausses.
 *
 * ## Le défaut (mesuré sur main à 99851c9d0, oracle des dérivées)
 *
 * - `mult(3, mult(3, x²))` en style implicite se rendait `3 3 x^2` : le défaut
 *   `3·3x²` vu par David dans les étapes de dérivation. Entre deux chiffres, le
 *   produit implicite n'existe pas à l'écrit : il faut la croix.
 * - `opposite(opposite(2))` se rendait `--2` (LaTeX) et `--2` (texte). La carte
 *   `f′` de l'atelier montrait `e^{--0.75 x}` dès qu'un paramètre négatif était
 *   substitué derrière un signe (`k = -0.75` dans `e^{-kx}`).
 *
 * Les deux générateurs (`toLatex` simple, `toLatex` avec métadonnées, `toCustom`)
 * doivent écrire la même chose.
 */

import { describe, it, expect } from 'vitest';
import { MathAST } from '../factory';
import { toLatex } from '../latex-generator';
import { toCustom } from '../custom-generator';
import type { MathNode } from '../types';

const n = (v: string): MathNode => MathAST.number(v);
const x = MathAST.variable('x');
const implicit = (a: MathNode, b: MathNode): MathNode => MathAST.multiply(a, b, 'implicit');

/** Les deux modes du générateur LaTeX doivent coïncider. */
function both(node: MathNode): readonly [string, string] {
	return [toLatex(node), toLatex(node, { renderMetadata: true })];
}

describe('deux nombres ne se juxtaposent pas', () => {
	it('3 × 3x² : la croix, pas une espace', () => {
		const node = implicit(n('3'), implicit(n('3'), MathAST.power(x, n('2'))));
		expect(toLatex(node)).toBe('3 \\times 3 x^2');
		// Le mode métadonnées accole toujours l'exposant entre accolades
		expect(toLatex(node, { renderMetadata: true })).toBe('3 \\times 3 x^{2}');
	});

	it('5 × 4 : la croix entre deux nombres', () => {
		expect(both(implicit(n('5'), n('4')))).toEqual(['5 \\times 4', '5 \\times 4']);
	});

	it('2x × 3 : x puis 3 ne colle pas deux chiffres, rendu inchangé', () => {
		// `x 3` ne colle pas deux chiffres : on ne touche pas au rendu existant
		expect(toLatex(implicit(implicit(n('2'), x), n('3')))).toBe('2 x 3');
	});

	it('3 × 2^x : un nombre devant une puissance de base numérique', () => {
		expect(toLatex(implicit(n('3'), MathAST.power(n('2'), x)))).toBe('3 \\times 2^x');
	});

	it('3x reste 3 x (rien ne change hors du cas visé)', () => {
		expect(both(implicit(n('3'), x))).toEqual(['3 x', '3 x']);
	});
});

describe('deux signes ne se suivent pas', () => {
	it('-(-2) en LaTeX', () => {
		const node = MathAST.opposite(MathAST.opposite(n('2')));
		expect(both(node)).toEqual(['-\\left( -2 \\right)', '-\\left( -2 \\right)']);
	});

	it('-(-0.75)x : un paramètre négatif substitué derrière un signe (carte f′)', () => {
		const node = implicit(MathAST.opposite(MathAST.opposite(n('0.75'))), x);
		expect(toLatex(node)).toBe('-\\left( -0.75 \\right) x');
		expect(toCustom(node)).toBe('-(-0.75)x');
	});

	it('-(-2) en texte', () => {
		expect(toCustom(MathAST.opposite(MathAST.opposite(n('2'))))).toBe('-(-2)');
	});

	it('-x reste -x', () => {
		expect(both(MathAST.opposite(x))).toEqual(['-x', '-x']);
	});
});
