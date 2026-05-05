/**
 * b-zero — Cas spécial `ax² + c = 0` (coefficient b nul).
 *
 * Pipeline pédagogique : recognize-no-linear-term → isolate-square →
 * extract-square-root (ou no-real-solution si rhs < 0) → read-solutions.
 */

import { add, number, power, relation, subtract, variable } from '../../factory';
import { implicitMultiply } from '../../factory';
import type { DemoCase } from '../demo-helpers';

const x = variable('x');
const xSquared = power(x, number('2'));

export const B_ZERO: readonly DemoCase[] = [
	{
		// x² − 9 = 0  →  x = ±3
		label: 'x² − 9 = 0',
		equation: relation('=', subtract(xSquared, number('9')), number('0'))
	},
	{
		// x² + 4 = 0  →  S = ∅ (rhs négatif après isolation)
		label: 'x² + 4 = 0',
		equation: relation('=', add(xSquared, number('4')), number('0'))
	},
	{
		// 2x² − 8 = 0  →  x = ±2
		label: '2x² − 8 = 0',
		equation: relation(
			'=',
			subtract(implicitMultiply(number('2'), xSquared), number('8')),
			number('0')
		)
	},
	{
		// x² = 0  →  x = 0 (rhs nul)
		label: 'x² = 0',
		equation: relation('=', xSquared, number('0'))
	}
];
