/**
 * Simple-négatifs — Pas de regroupement, mais nombres négatifs présents
 * (coefficients négatifs, constantes négatives, ou solution négative).
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

export const SIMPLE_NEGATIFS: readonly DemoCase[] = [
	{
		// Coefficient négatif sur x : -x + 3 = 0 → x = 3
		label: '−x + 3 = 0',
		equation: relation('=', add(opposite(x), number('3')), number('0'))
	},
	{
		// Constante négative dans l'équation : 2x − 5 = 1 → x = 3
		label: '2x − 5 = 1',
		equation: relation('=', subtract(implicitMultiply(number('2'), x), number('5')), number('1'))
	},
	{
		// Solution négative : 3x = -6 → x = -2
		label: '3x = −6',
		equation: relation('=', implicitMultiply(number('3'), x), opposite(number('6')))
	},
	{
		// Coefficient ET solution négatifs : −2x + 4 = 10 → x = -3
		label: '−2x + 4 = 10',
		equation: relation(
			'=',
			add(opposite(implicitMultiply(number('2'), x)), number('4')),
			number('10')
		)
	}
];
