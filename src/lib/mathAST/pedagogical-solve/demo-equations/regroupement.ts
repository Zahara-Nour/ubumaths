/**
 * Regroupement — Termes en x présents des deux côtés (transposition nécessaire),
 * sans fractions.
 */

import {
	number,
	variable,
	add,
	subtract,
	implicitMultiply,
	opposite,
	relation
} from '../../factory';
import type { DemoCase } from '../demo-helpers';

const x = variable('x');

export const REGROUPEMENT: readonly DemoCase[] = [
	{
		// 3x − 2 = −5x + 7 → x = 9/8
		label: '3x − 2 = −5x + 7',
		equation: relation(
			'=',
			subtract(implicitMultiply(number('3'), x), number('2')),
			add(opposite(implicitMultiply(number('5'), x)), number('7'))
		)
	},
	{
		// 5 − 2x = 11 + 3x → x = -6/5
		label: '5 − 2x = 11 + 3x',
		equation: relation(
			'=',
			subtract(number('5'), implicitMultiply(number('2'), x)),
			add(number('11'), implicitMultiply(number('3'), x))
		)
	},
	{
		// 4x + 1 = 2x + 5 → x = 2
		label: '4x + 1 = 2x + 5',
		equation: relation(
			'=',
			add(implicitMultiply(number('4'), x), number('1')),
			add(implicitMultiply(number('2'), x), number('5'))
		)
	}
];
