/**
 * Simples-fractions — Coefficients ou constantes fractionnaires, mais aucun
 * nombre négatif (ni dans l'équation, ni dans les calculs intermédiaires,
 * ni dans la solution).
 */

import { number, variable, add, implicitMultiply, relation, fraction } from '../../factory';
import type { DemoCase } from '../demo-helpers';

const x = variable('x');

export const SIMPLES_FRACTIONS: readonly DemoCase[] = [
	{
		// x/2 + 1/3 = 1 → x = 4/3
		label: 'x/2 + 1/3 = 1',
		equation: relation(
			'=',
			add(fraction(x, number('2')), fraction(number('1'), number('3'))),
			number('1')
		)
	},
	{
		// 2x/3 = 4/9 → x = 2/3
		label: '2x/3 = 4/9',
		equation: relation(
			'=',
			fraction(implicitMultiply(number('2'), x), number('3')),
			fraction(number('4'), number('9'))
		)
	},
	{
		// x/4 + 1/2 = 3/4 → x = 1
		label: 'x/4 + 1/2 = 3/4',
		equation: relation(
			'=',
			add(fraction(x, number('4')), fraction(number('1'), number('2'))),
			fraction(number('3'), number('4'))
		)
	}
];
