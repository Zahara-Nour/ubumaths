/**
 * `hashMathNode` distingue deux nœuds différents, quel que soit leur type.
 *
 * Il rendait `'UNKNOWN'` pour les types qu'il ne connaissait pas (`signed-zero`,
 * `piecewise`, puis les longueurs du 2026-10-12) : deux nœuds différents avaient la
 * même empreinte, donc `nodesEqual` les confondait. La garde est désormais
 * exhaustive (`never`) : un type de nœud ajouté sans empreinte ne compile plus.
 */

import { describe, it, expect } from 'vitest';
import { hashMathNode, nodesEqual } from '../hash';
import { parseCustom } from '../../parser/custom';
import { piecewise, piecewisePiece, signedZero } from '../../factory';
import type { MathNode } from '../../types';

/** `{ a si x < 0, b si x >= 0 }` (ou `{ a si x < 0, b }` sans seconde condition) */
function byPieces(negative: string, positive: string, withCondition = true): MathNode {
	const first = piecewisePiece(parseCustom('x < 0'), parseCustom(negative));
	if (!withCondition) return piecewise([first], parseCustom(positive));
	return piecewise([first, piecewisePiece(parseCustom('x >= 0'), parseCustom(positive))]);
}

describe('hashMathNode : des nœuds différents, des empreintes différentes', () => {
	it('0⁺ et 0⁻ ne se confondent pas', () => {
		expect(nodesEqual(signedZero('positive'), signedZero('negative'))).toBe(false);
		expect(nodesEqual(signedZero('negative'), signedZero('negative'))).toBe(true);
	});

	it('deux fonctions définies par morceaux différentes ne se confondent pas', () => {
		const absolute = byPieces('-x', 'x');
		const other = byPieces('-2x', '3x');
		const otherwise = byPieces('-x', 'x', false);
		expect(nodesEqual(absolute, other)).toBe(false);
		expect(nodesEqual(absolute, otherwise)).toBe(false);
		expect(nodesEqual(absolute, byPieces('-x', 'x'))).toBe(true);
	});

	it("aucune empreinte n'est 'UNKNOWN'", () => {
		for (const node of [signedZero('positive'), byPieces('-x', 'x')]) {
			expect(hashMathNode(node)).not.toBe('UNKNOWN');
		}
	});
});
