/**
 * Regroupement-fractions — Termes en x des deux côtés ET fractions présentes.
 */

import {
	number,
	variable,
	add,
	subtract,
	implicitMultiply,
	relation,
	fraction
} from '../../factory';
import type { DemoCase } from '../demo-helpers';

const x = variable('x');

export const REGROUPEMENT_FRACTIONS: readonly DemoCase[] = [
	{
		// x/2 + 1 = x/3 + 2 → x = 6
		label: 'x/2 + 1 = x/3 + 2',
		equation: relation(
			'=',
			add(fraction(x, number('2')), number('1')),
			add(fraction(x, number('3')), number('2'))
		)
	},
	{
		// 2x/3 − 1/2 = x/4 + 1 → x = 18/5
		label: '2x/3 − 1/2 = x/4 + 1',
		equation: relation(
			'=',
			subtract(
				fraction(implicitMultiply(number('2'), x), number('3')),
				fraction(number('1'), number('2'))
			),
			add(fraction(x, number('4')), number('1'))
		)
	}
];
