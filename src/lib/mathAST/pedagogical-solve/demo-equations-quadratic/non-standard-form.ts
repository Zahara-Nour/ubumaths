/**
 * Non-standard-form — L'équation n'est pas sous la forme `… = 0` initialement.
 * Le pipeline applique d'abord une étape `standardize`, puis dispatche.
 */

import { add, implicitMultiply, number, opposite, power, relation, variable } from '../../factory';
import type { DemoCase } from '../demo-helpers';

const x = variable('x');
const xSquared = power(x, number('2'));

export const NON_STANDARD_FORM: readonly DemoCase[] = [
	{
		// x² + 2 = x + 8  →  standardize → x² − x − 6 = 0  →  Δ = 25, x = -2 / 3
		label: 'x² + 2 = x + 8',
		equation: relation('=', add(xSquared, number('2')), add(x, number('8')))
	},
	{
		// x² + 5x = -6  →  standardize → x² + 5x + 6 = 0  →  Δ = 1, x = -3 / -2
		label: 'x² + 5x = −6',
		equation: relation('=', add(xSquared, implicitMultiply(number('5'), x)), opposite(number('6')))
	},
	{
		// 3x² = 2x + 1  →  standardize → 3x² − 2x − 1 = 0  →  Δ = 16, x = -1/3 / 1
		label: '3x² = 2x + 1',
		equation: relation(
			'=',
			implicitMultiply(number('3'), xSquared),
			add(implicitMultiply(number('2'), x), number('1'))
		)
	}
];
