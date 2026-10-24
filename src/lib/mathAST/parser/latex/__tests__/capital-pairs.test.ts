/**
 * Longueurs de segments : deux majuscules collées (`AB`) dans le parseur LaTeX.
 *
 * Spécification validée par David le 2026-10-12 (`docs/archive/wip/longueurs-segments-progress.md`) :
 * - option `capitalPairs` : `'length'` ou `'product'` (comportement d'avant, à l'identique, et
 *   défaut du parseur depuis la décision Q-M du 2026-10-12 : seuls les questions et
 *   `/dev/structure` demandent `'length'`) ;
 * - en mode longueur, deux majuscules COLLÉES dans la source (avec primes et indices) forment la
 *   longueur d'un segment ; trois ou plus, un nom de figure (`ABC`) gardé tel quel ;
 * - une espace ou une commande d'espacement entre les lettres garde le produit (`A B`) ;
 * - pas de longueur dans un indice (`x_{AB}`) ;
 * - `toLatex` écrit `AB`, relu à l'identique.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex, parseLatexSafe } from '../../index';
import { MathAST, pointName, segmentLength, figureName, implicitMultiply } from '../../../factory';
import { isSegmentLength, isFigureName } from '../../../guards';
import { toLatex } from '../../../latex-generator';
import { findNodes } from '../../../transforms';
import type { MathNode } from '../../../types';

// =============================================================================
// Helpers
// =============================================================================

const A = pointName('A');
const B = pointName('B');
const C = pointName('C');
const D = pointName('D');

/** Lecture en mode longueur, demandé explicitement. */
function read(latex: string): MathNode {
	return parseLatex(latex, { capitalPairs: 'length' });
}

function readAsProduct(latex: string): MathNode {
	return parseLatex(latex, { capitalPairs: 'product' });
}

function hasPointNames(node: MathNode): boolean {
	return findNodes(node, (n) => isSegmentLength(n) || isFigureName(n)).length > 0;
}

// =============================================================================
// Cas nominaux
// =============================================================================

describe('longueurs de segments : cas nominaux (mode longueur)', () => {
	it('AB est la longueur du segment [AB]', () => {
		expect(read('AB')).toEqual(segmentLength(A, B));
	});

	it("BA garde l'ordre écrit", () => {
		expect(read('BA')).toEqual(segmentLength(B, A));
	});

	it('AB^2 est le carré de la longueur AB (pas A·B²)', () => {
		const expected = MathAST.superscript(segmentLength(A, B), MathAST.number('2'));
		expect(read('AB^2')).toEqual(expected);
		expect(read('AB^{2}')).toEqual(expected);
	});

	it('3AB est le produit de 3 par la longueur AB', () => {
		expect(read('3AB')).toEqual(implicitMultiply(MathAST.number('3'), segmentLength(A, B)));
	});

	it('AB\\times CD est le produit de deux longueurs', () => {
		expect(read('AB\\times CD')).toEqual(
			MathAST.multiply(segmentLength(A, B), segmentLength(C, D), 'cross')
		);
	});

	it('\\frac{AB}{CD} est le quotient de deux longueurs', () => {
		const ast = read('\\frac{AB}{CD}');
		expect(ast.type).toBe('division');
		if (ast.type !== 'division') return;
		expect(ast.numerator).toEqual(segmentLength(A, B));
		expect(ast.denominator).toEqual(segmentLength(C, D));
	});

	it('(AB)^2 garde ses parenthèses autour de la longueur', () => {
		const ast = read('(AB)^2');
		expect(ast.type).toBe('superscript');
		if (ast.type !== 'superscript') return;
		expect(ast.base.type).toBe('delimiter');
		if (ast.base.type !== 'delimiter') return;
		expect(ast.base.content).toEqual(segmentLength(A, B));
	});

	it('Pythagore : AB^2=AC^2+BC^2 ne contient que des longueurs', () => {
		const ast = read('AB^2=AC^2+BC^2');
		const segments = findNodes(ast, isSegmentLength);
		expect(segments).toHaveLength(3);
		expect(findNodes(ast, (n) => n.type === 'variable')).toHaveLength(0);
	});

	it('AB+BC et AB=5 : sommes et égalités de longueurs', () => {
		expect(read('AB+BC')).toEqual(MathAST.add(segmentLength(A, B), segmentLength(B, C)));
		expect(read('AB=5')).toEqual(MathAST.equals(segmentLength(A, B), MathAST.number('5')));
	});

	it('EF, FG, GH sont des longueurs, même si F, G, H sont des fonctions génériques', () => {
		const E = pointName('E');
		const F = pointName('F');
		const G = pointName('G');
		const H = pointName('H');
		expect(read('EF')).toEqual(segmentLength(E, F));
		expect(read('FG')).toEqual(segmentLength(F, G));
		expect(read('GH^2')).toEqual(MathAST.superscript(segmentLength(G, H), MathAST.number('2')));
	});

	it('kAB : un coefficient littéral devant une longueur', () => {
		expect(read('kAB')).toEqual(implicitMultiply(MathAST.variable('k'), segmentLength(A, B)));
	});
});

// =============================================================================
// Points primés et indicés (Q-D)
// =============================================================================

describe('longueurs entre points primés et indicés', () => {
	it("A'B' : apostrophes", () => {
		expect(read("A'B'")).toEqual(segmentLength(pointName('A', 1), pointName('B', 1)));
	});

	it("A^{\\prime}B^{\\prime} : l'écriture de MathLive", () => {
		expect(read('A^{\\prime}B^{\\prime}')).toEqual(
			segmentLength(pointName('A', 1), pointName('B', 1))
		);
	});

	it("A''B : deux primes sur le premier point", () => {
		expect(read("A''B")).toEqual(segmentLength(pointName('A', 2), B));
	});

	it("A'B'^2 : le carré porte sur la longueur", () => {
		expect(read("A'B'^2")).toEqual(
			MathAST.superscript(segmentLength(pointName('A', 1), pointName('B', 1)), MathAST.number('2'))
		);
	});

	it('A_1B_1 et A_{1}B_{1} : indices numériques', () => {
		const expected = segmentLength(pointName('A', 0, '1'), pointName('B', 0, '1'));
		expect(read('A_1B_1')).toEqual(expected);
		expect(read('A_{1}B_{1}')).toEqual(expected);
	});

	it('OM_n et A_{12}B : indice lettre, indice à plusieurs chiffres', () => {
		expect(read('OM_n')).toEqual(segmentLength(pointName('O'), pointName('M', 0, 'n')));
		expect(read('A_{12}B')).toEqual(segmentLength(pointName('A', 0, '12'), B));
	});
});

// =============================================================================
// Noms de figure (Q-A)
// =============================================================================

describe('trois majuscules collées ou plus : nom de figure, gardé tel quel', () => {
	it('ABC est un nom de figure', () => {
		expect(read('ABC')).toEqual(figureName([A, B, C]));
	});

	it('ABCD est un nom de figure à quatre points', () => {
		expect(read('ABCD')).toEqual(figureName([A, B, C, D]));
	});

	it('\\Delta ABC : Δ suivi du nom de figure', () => {
		expect(read('\\Delta ABC')).toEqual(
			implicitMultiply(MathAST.greek('Delta'), figureName([A, B, C]))
		);
	});
});

// =============================================================================
// Cas limites : le produit reste un produit
// =============================================================================

describe('cas limites : ce qui reste un produit', () => {
	it('A B (espace dans la source) reste le produit A·B (Q-E)', () => {
		expect(read('A B')).toEqual(implicitMultiply(MathAST.variable('A'), MathAST.variable('B')));
	});

	it('A\\,B et A~B (espacement LaTeX) restent des produits', () => {
		expect(hasPointNames(read('A\\,B'))).toBe(false);
		expect(hasPointNames(read('A~B'))).toBe(false);
	});

	it('A\\times B et A\\cdot B restent des produits', () => {
		expect(read('A\\times B')).toEqual(
			MathAST.multiply(MathAST.variable('A'), MathAST.variable('B'), 'cross')
		);
		expect(hasPointNames(read('A\\cdot B'))).toBe(false);
	});

	it('ab, aB, Ab, xy : les minuscules restent des produits (Q6)', () => {
		for (const latex of ['ab', 'aB', 'Ab', 'xy']) {
			expect(hasPointNames(read(latex)), latex).toBe(false);
		}
	});

	it('x_{AB} : pas de longueur dans un indice', () => {
		const ast = read('x_{AB}');
		expect(hasPointNames(ast)).toBe(false);
	});

	it("x_AB : l'indice prend A, B reste une lettre (x_A·B)", () => {
		expect(read('x_AB')).toEqual(
			implicitMultiply(
				MathAST.subscript(MathAST.variable('x'), MathAST.variable('A')),
				MathAST.variable('B')
			)
		);
	});

	it('une seule majuscule ne change rien : \\pi R^2, 2\\pi R, Ce^{2x}', () => {
		for (const latex of ['\\pi R^2', '2\\pi R', 'Ce^{2x}', 'F(x)', 'P_A(B)']) {
			expect(hasPointNames(read(latex)), latex).toBe(false);
		}
	});

	it('F(x) reste la fonction générique F', () => {
		const ast = read('F(x)');
		expect(ast.type).toBe('function');
	});

	it('AF(x) : longueur AF puis parenthèse', () => {
		const ast = read('AF(x)');
		expect(ast.type).toBe('multiplication');
		if (ast.type !== 'multiplication') return;
		expect(ast.left).toEqual(segmentLength(A, pointName('F')));
	});

	it("A' seul reste une erreur de lecture, comme avant", () => {
		expect(parseLatexSafe("A'", { capitalPairs: 'length' }).ast).toBeNull();
	});
});

// =============================================================================
// Mode produit : comportement d'avant
// =============================================================================

describe("mode 'product' : le comportement d'avant, à l'identique", () => {
	it('sans option, le parseur lit un produit (défaut, décision Q-M)', () => {
		expect(parseLatex('AB')).toEqual(
			implicitMultiply(MathAST.variable('A'), MathAST.variable('B'))
		);
		expect(parseLatex('AB', { parser: 'rd' })).toEqual(
			implicitMultiply(MathAST.variable('A'), MathAST.variable('B'))
		);
	});

	it('AB est le produit A·B', () => {
		expect(readAsProduct('AB')).toEqual(
			implicitMultiply(MathAST.variable('A'), MathAST.variable('B'))
		);
	});

	it('AB^2 est A·B², ABC est A·B·C', () => {
		expect(readAsProduct('AB^2')).toEqual(
			implicitMultiply(
				MathAST.variable('A'),
				MathAST.superscript(MathAST.variable('B'), MathAST.number('2'))
			)
		);
		expect(hasPointNames(readAsProduct('ABC'))).toBe(false);
	});

	it("A'B' reste une erreur de lecture", () => {
		expect(parseLatexSafe("A'B'", { capitalPairs: 'product' }).ast).toBeNull();
	});
});

// =============================================================================
// Écriture et relecture (Q-G)
// =============================================================================

describe('toLatex : écriture AB, relue à l’identique', () => {
	it("écrit AB, A'B', A_{1}B_{1} et ABC sans espace ni \\mathit", () => {
		expect(toLatex(segmentLength(A, B))).toBe('AB');
		expect(toLatex(segmentLength(pointName('A', 1), pointName('B', 2)))).toBe("A'B''");
		expect(toLatex(segmentLength(pointName('A', 0, '1'), pointName('B', 0, 'n')))).toBe(
			'A_{1}B_{n}'
		);
		expect(toLatex(figureName([A, B, C]))).toBe('ABC');
	});

	it.each([
		'AB',
		'BA',
		'3AB^2+2CD',
		'AB\\times CD',
		'AB CD',
		'\\frac{AB}{CD}',
		'\\sqrt{AB}',
		"A'B'^2",
		'A_1B_1',
		'OM_n',
		'ABC',
		'kAB',
		'AB^2=AC^2+BC^2',
		'(AB)^2'
	])('aller-retour parse → toLatex → parse : %s', (latex) => {
		const first = read(latex);
		expect(read(toLatex(first))).toEqual(first);
	});
});

// =============================================================================
// Fabrique
// =============================================================================

describe('fabrique des noms de points', () => {
	it('refuse un point qui n’est pas une majuscule', () => {
		expect(() => pointName('a')).toThrow();
		expect(() => pointName('AB')).toThrow();
	});

	it('refuse un nom de figure de moins de trois points', () => {
		expect(() => figureName([A, B])).toThrow();
	});
});

// =============================================================================
// Parseur rd : mêmes lectures que Pratt
// =============================================================================

describe('parseur rd : mêmes longueurs que Pratt', () => {
	it.each([
		'AB',
		'AB^2',
		'3AB',
		'AB\\times CD',
		'AB^2=AC^2+BC^2',
		"A'B'",
		'A^{\\prime}B^{\\prime}',
		'A_1B_1',
		'OM_n',
		'ABC',
		'A B',
		'x_{AB}',
		'kAB'
	])('%s', (latex) => {
		expect(parseLatex(latex, { parser: 'rd', capitalPairs: 'length' })).toEqual(read(latex));
	});

	it("mode 'product' : AB reste le produit A·B", () => {
		expect(parseLatex('AB', { parser: 'rd', capitalPairs: 'product' })).toEqual(
			implicitMultiply(MathAST.variable('A'), MathAST.variable('B'))
		);
	});
});
