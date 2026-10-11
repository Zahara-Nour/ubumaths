/**
 * cot, sec, csc réécrites en quotients de sin et cos : un pôle devient un
 * dénominateur nul, visible par la substitution et par le suivi des signes.
 *
 * @module mathAST/limits/reciprocal-trig
 */

import type { MathNode } from '../types';
import { isFunction } from '../guards';
import { divide, func, number } from '../factory';
import { mapNode } from '../transforms';

/** cot u → cos u / sin u, sec u → 1 / cos u, csc u → 1 / sin u. */
export function rewriteReciprocalTrig(expr: MathNode): MathNode {
	return mapNode(expr, (node) => {
		if (!isFunction(node) || node.args.length !== 1 || node.power || node.isInverse) return node;
		const [arg] = node.args;
		switch (node.name) {
			case 'cot':
				return divide(func('cos', [arg]), func('sin', [arg]), 'fraction');
			case 'sec':
				return divide(number('1'), func('cos', [arg]), 'fraction');
			case 'csc':
				return divide(number('1'), func('sin', [arg]), 'fraction');
			default:
				return node;
		}
	});
}
