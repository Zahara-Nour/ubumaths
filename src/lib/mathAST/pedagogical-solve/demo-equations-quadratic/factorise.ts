/**
 * Factorise — Cas déjà sous forme factorisée `(αx + β)(γx + δ) = 0`.
 *
 * Pipeline pédagogique : recognize-factored → zero-product →
 * solve-each-factor → read-solutions (sans expansion).
 */

import {
	add,
	implicitMultiply,
	number,
	parentheses,
	relation,
	subtract,
	variable
} from '../../factory';
import type { DemoCase } from '../demo-helpers';

const x = variable('x');

export const FACTORISE: readonly DemoCase[] = [
	{
		// (x − 2)(x + 3) = 0  →  x = 2 / -3
		label: '(x − 2)(x + 3) = 0',
		equation: relation(
			'=',
			implicitMultiply(parentheses(subtract(x, number('2'))), parentheses(add(x, number('3')))),
			number('0')
		)
	},
	{
		// (x + 1)(x − 5) = 0  →  x = -1 / 5
		label: '(x + 1)(x − 5) = 0',
		equation: relation(
			'=',
			implicitMultiply(parentheses(add(x, number('1'))), parentheses(subtract(x, number('5')))),
			number('0')
		)
	},
	{
		// (2x + 1)(x − 4) = 0  →  x = -1/2 / 4
		label: '(2x + 1)(x − 4) = 0',
		equation: relation(
			'=',
			implicitMultiply(
				parentheses(add(implicitMultiply(number('2'), x), number('1'))),
				parentheses(subtract(x, number('4')))
			),
			number('0')
		)
	}
];
