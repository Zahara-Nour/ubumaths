/**
 * Standard-double — Cas standard avec discriminant nul (solution double).
 */

import { add, implicitMultiply, number, power, relation, subtract, variable } from '../../factory';
import type { DemoCase } from '../demo-helpers';

const x = variable('x');
const xSquared = power(x, number('2'));

export const STANDARD_DOUBLE: readonly DemoCase[] = [
	{
		// x² − 2x + 1 = 0  →  Δ = 0, x = 1 (double)
		label: 'x² − 2x + 1 = 0',
		equation: relation(
			'=',
			add(subtract(xSquared, implicitMultiply(number('2'), x)), number('1')),
			number('0')
		)
	},
	{
		// 2x² − 4x + 2 = 0  →  Δ = 0, x = 1 (double)
		label: '2x² − 4x + 2 = 0',
		equation: relation(
			'=',
			add(
				subtract(implicitMultiply(number('2'), xSquared), implicitMultiply(number('4'), x)),
				number('2')
			),
			number('0')
		)
	},
	{
		// x² + 6x + 9 = 0  →  Δ = 0, x = -3 (double)
		label: 'x² + 6x + 9 = 0',
		equation: relation(
			'=',
			add(add(xSquared, implicitMultiply(number('6'), x)), number('9')),
			number('0')
		)
	}
];
