/**
 * Standard-positif — Cas standard avec discriminant strictement positif
 * (deux solutions réelles distinctes via la formule quadratique).
 */

import { add, implicitMultiply, number, power, relation, subtract, variable } from '../../factory';
import type { DemoCase } from '../demo-helpers';

const x = variable('x');
const xSquared = power(x, number('2'));

export const STANDARD_POSITIF: readonly DemoCase[] = [
	{
		// x² + 5x + 6 = 0  →  Δ = 1, x = -3 / -2
		label: 'x² + 5x + 6 = 0',
		equation: relation(
			'=',
			add(add(xSquared, implicitMultiply(number('5'), x)), number('6')),
			number('0')
		)
	},
	{
		// x² − 5x + 6 = 0  →  Δ = 1, x = 2 / 3
		label: 'x² − 5x + 6 = 0',
		equation: relation(
			'=',
			add(subtract(xSquared, implicitMultiply(number('5'), x)), number('6')),
			number('0')
		)
	},
	{
		// x² + 7x + 12 = 0  →  Δ = 1, x = -4 / -3
		label: 'x² + 7x + 12 = 0',
		equation: relation(
			'=',
			add(add(xSquared, implicitMultiply(number('7'), x)), number('12')),
			number('0')
		)
	},
	{
		// 3x² − 3x − 18 = 0  →  Δ = 225, x = -2 / 3
		label: '3x² − 3x − 18 = 0',
		equation: relation(
			'=',
			subtract(
				subtract(implicitMultiply(number('3'), xSquared), implicitMultiply(number('3'), x)),
				number('18')
			),
			number('0')
		)
	}
];
