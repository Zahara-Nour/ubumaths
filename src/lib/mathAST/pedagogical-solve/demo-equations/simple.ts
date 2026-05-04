/**
 * Simple — Aucun nombre négatif, ni dans les coefficients, ni dans les calculs.
 * Pas de regroupement (x déjà isolé d'un côté ou aucune transposition).
 */

import { number, variable, add, implicitMultiply, relation } from '../../factory';
import type { DemoCase } from '../demo-helpers';

const x = variable('x');

export const SIMPLE: readonly DemoCase[] = [
	{
		label: '2x + 3 = 7',
		equation: relation('=', add(implicitMultiply(number('2'), x), number('3')), number('7'))
	},
	{
		label: 'x = 5',
		equation: relation('=', x, number('5'))
	},
	{
		label: '2x = 4',
		equation: relation('=', implicitMultiply(number('2'), x), number('4'))
	}
];
