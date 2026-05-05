/**
 * c-zero — Cas spécial `ax² + bx = 0` (terme constant nul).
 *
 * Pipeline pédagogique : recognize-no-constant-term → factor-common-x →
 * zero-product → solve-each-factor → read-solutions.
 */

import { add, implicitMultiply, number, power, relation, subtract, variable } from '../../factory';
import type { DemoCase } from '../demo-helpers';

const x = variable('x');
const xSquared = power(x, number('2'));

export const C_ZERO: readonly DemoCase[] = [
	{
		// 2x² + 6x = 0  →  x = 0 / -3
		label: '2x² + 6x = 0',
		equation: relation(
			'=',
			add(implicitMultiply(number('2'), xSquared), implicitMultiply(number('6'), x)),
			number('0')
		)
	},
	{
		// x² + 3x = 0  →  x = 0 / -3
		label: 'x² + 3x = 0',
		equation: relation('=', add(xSquared, implicitMultiply(number('3'), x)), number('0'))
	},
	{
		// 5x² − 10x = 0  →  x = 0 / 2
		label: '5x² − 10x = 0',
		equation: relation(
			'=',
			subtract(implicitMultiply(number('5'), xSquared), implicitMultiply(number('10'), x)),
			number('0')
		)
	}
];
