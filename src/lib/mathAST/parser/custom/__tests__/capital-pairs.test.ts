/**
 * Longueurs de segments dans la syntaxe maison (`parseCustom`, lot 5).
 *
 * Mêmes règles que le parseur LaTeX (`parser/latex/__tests__/capital-pairs.test.ts`),
 * décisions de David du 2026-10-12 (`docs/archive/wip/longueurs-segments-progress.md`) :
 * - option `capitalPairs` : `'product'` par défaut (comportement d'avant, à l'identique, Q-M),
 *   `'length'` demandé par les questions ;
 * - en mode longueur, deux majuscules COLLÉES (primes et indices compris) forment une
 *   longueur, trois ou plus un nom de figure ; `A B` espacé reste un produit (Q-E) ;
 * - pas de longueur dans un indice ; `ab` reste un produit (Q6) ; unités inchangées.
 */

import { describe, it, expect } from 'vitest';
import { parseCustom, parseCustomRD, parseCustomSafe } from '../index';
import { parseLatex } from '../../index';
import { MathAST, pointName, segmentLength, figureName, implicitMultiply } from '../../../factory';
import { isSegmentLength, isFigureName } from '../../../guards';
import { toLatex } from '../../../latex-generator';
import { toCustom } from '../../../custom-generator';
import { findNodes } from '../../../transforms';
import type { MathNode } from '../../../types';

// =============================================================================
// Helpers
// =============================================================================

const A = pointName('A');
const B = pointName('B');
const C = pointName('C');
const D = pointName('D');

function read(input: string): MathNode {
	return parseCustom(input, { capitalPairs: 'length' });
}

function readRD(input: string): MathNode {
	return parseCustomRD(input, { capitalPairs: 'length' });
}

function hasPointNames(node: MathNode): boolean {
	return findNodes(node, (n) => isSegmentLength(n) || isFigureName(n)).length > 0;
}

// =============================================================================
// Cas nominaux
// =============================================================================

describe('syntaxe maison, mode longueur : cas nominaux', () => {
	it('AB est la longueur du segment [AB], BA garde son ordre', () => {
		expect(read('AB')).toEqual(segmentLength(A, B));
		expect(read('BA')).toEqual(segmentLength(B, A));
	});

	it('AB^2 est le carré de la longueur AB', () => {
		expect(read('AB^2')).toEqual(MathAST.superscript(segmentLength(A, B), MathAST.number('2')));
	});

	it('3AB est le produit de 3 par la longueur AB', () => {
		expect(read('3AB')).toEqual(implicitMultiply(MathAST.number('3'), segmentLength(A, B)));
	});

	it('AB*CD et {AB}/{CD} portent sur deux longueurs', () => {
		expect(findNodes(read('AB*CD'), isSegmentLength)).toEqual([
			segmentLength(A, B),
			segmentLength(C, D)
		]);
		const quotient = read('{AB}/{CD}');
		expect(quotient.type).toBe('division');
		if (quotient.type !== 'division') return;
		expect(findNodes(quotient.numerator, isSegmentLength)).toEqual([segmentLength(A, B)]);
		expect(findNodes(quotient.denominator, isSegmentLength)).toEqual([segmentLength(C, D)]);
	});

	it('Pythagore se lit comme en LaTeX', () => {
		expect(read('AB^2=AC^2+BC^2')).toEqual(
			parseLatex('AB^2=AC^2+BC^2', { capitalPairs: 'length' })
		);
	});

	it('EF, FG : longueurs (pas de fonction F) ; F(x) reste une fonction', () => {
		expect(read('FG')).toEqual(segmentLength(pointName('F'), pointName('G')));
		expect(read('F(x)').type).toBe('function');
	});

	it("primes et indices : A'B', A_1B_1, AB_1, A_12B", () => {
		expect(read("A'B'")).toEqual(segmentLength(pointName('A', 1), pointName('B', 1)));
		expect(read('A_1B_1')).toEqual(segmentLength(pointName('A', 0, '1'), pointName('B', 0, '1')));
		expect(read('AB_1')).toEqual(segmentLength(A, pointName('B', 0, '1')));
		expect(read('A_12B')).toEqual(segmentLength(pointName('A', 0, '12'), B));
		expect(read('A_{n}B')).toEqual(segmentLength(pointName('A', 0, 'n'), B));
	});

	it('le parseur rd lit comme le Pratt', () => {
		for (const input of ['AB', 'AB^2=AC^2+BC^2', "A'B'", 'A_1B_1', '3AB', 'ABC', 'A B', 'ab']) {
			expect(readRD(input), input).toEqual(read(input));
		}
	});
});

// =============================================================================
// Cas limites
// =============================================================================

describe('syntaxe maison, mode longueur : cas limites', () => {
	it('ABC, ABCD : noms de figure, affichés tels quels', () => {
		expect(read('ABC')).toEqual(figureName([A, B, C]));
		expect(toLatex(read('ABCD'))).toBe('ABCD');
	});

	it('A B (espace) reste un produit (Q-E)', () => {
		expect(hasPointNames(read('A B'))).toBe(false);
		expect(read('A B')).toEqual(parseCustom('A B'));
	});

	it('ab, aB, Ab restent des produits (Q6)', () => {
		for (const input of ['ab', 'aB', 'Ab']) {
			expect(read(input), input).toEqual(parseCustom(input));
		}
	});

	it('pas de longueur dans un indice : x_{AB}', () => {
		expect(hasPointNames(read('x_{AB}'))).toBe(false);
	});

	it('unités inchangées : 5[MW], 3[kWh]', () => {
		for (const input of ['5[MW]', '3[kWh]', '2[A]']) {
			expect(read(input), input).toEqual(parseCustom(input));
		}
	});

	it("A' seul reste une erreur, comme avant", () => {
		expect(parseCustomSafe("A'", { capitalPairs: 'length' }).errors.length).toBeGreaterThan(0);
	});
});

// =============================================================================
// Mode produit et écriture
// =============================================================================

describe('syntaxe maison : mode produit et écriture', () => {
	it('sans option et en mode produit, AB est le produit A·B (comportement d’avant)', () => {
		expect(hasPointNames(parseCustom('AB^2=AC^2+BC^2'))).toBe(false);
		expect(parseCustom('AB', { capitalPairs: 'product' })).toEqual(parseCustom('AB'));
	});

	it('toLatex écrit AB sans espace en mode longueur, A B en mode produit', () => {
		expect(toLatex(read('AB^2'))).toBe('AB^2');
		expect(toLatex(parseCustom('AB'))).toBe('A B');
	});

	it('toCustom relu en mode longueur rend le même arbre', () => {
		for (const input of ['AB', "2A'B'^2", '{AB}/{CD}', 'AB^2=AC^2+BC^2', 'A_1B_1+ABC']) {
			const ast = read(input);
			expect(read(toCustom(ast)), input).toEqual(ast);
		}
	});
});
