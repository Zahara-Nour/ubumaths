/**
 * Standard-negatif — Cas standard avec discriminant strictement négatif
 * (pas de solution réelle dans ℝ).
 */

import { add, implicitMultiply, number, power, relation, variable } from '../../factory';
import type { DemoCase } from '../demo-helpers';

const x = variable('x');
const xSquared = power(x, number('2'));

export const STANDARD_NEGATIF: readonly DemoCase[] = [
	{
		// x² + x + 1 = 0  →  Δ = -3, S = ∅
		label: 'x² + x + 1 = 0',
		equation: relation('=', add(add(xSquared, x), number('1')), number('0'))
	},
	{
		// x² + 2x + 5 = 0  →  Δ = -16, S = ∅
		label: 'x² + 2x + 5 = 0',
		equation: relation(
			'=',
			add(add(xSquared, implicitMultiply(number('2'), x)), number('5')),
			number('0')
		)
	},
	{
		// 2x² + 3x + 4 = 0  →  Δ = -23, S = ∅
		label: '2x² + 3x + 4 = 0',
		equation: relation(
			'=',
			add(
				add(implicitMultiply(number('2'), xSquared), implicitMultiply(number('3'), x)),
				number('4')
			),
			number('0')
		)
	}
];
