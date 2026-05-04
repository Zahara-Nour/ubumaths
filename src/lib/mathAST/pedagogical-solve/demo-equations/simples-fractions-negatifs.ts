/**
 * Simples-fractions-négatifs — Fractions ET nombres négatifs (coefficients,
 * constantes ou solution).
 */

import { number, variable, add, subtract, opposite, relation, fraction } from '../../factory';
import type { DemoCase } from '../demo-helpers';

const x = variable('x');

export const SIMPLES_FRACTIONS_NEGATIFS: readonly DemoCase[] = [
	{
		// Coefficient négatif fractionnaire : -x/2 + 1/3 = 0 → x = 2/3
		label: '−x/2 + 1/3 = 0',
		equation: relation(
			'=',
			add(opposite(fraction(x, number('2'))), fraction(number('1'), number('3'))),
			number('0')
		)
	},
	{
		// Constante négative fractionnaire : x/2 − 1/3 = 1 → x = 8/3
		label: 'x/2 − 1/3 = 1',
		equation: relation(
			'=',
			subtract(fraction(x, number('2')), fraction(number('1'), number('3'))),
			number('1')
		)
	},
	{
		// Solution négative fractionnaire : -x/2 = 1/4 → x = -1/2
		label: '−x/2 = 1/4',
		equation: relation('=', opposite(fraction(x, number('2'))), fraction(number('1'), number('4')))
	}
];
