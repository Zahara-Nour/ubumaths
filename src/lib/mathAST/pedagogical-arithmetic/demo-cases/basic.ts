/**
 * Demo cases — Basic operations.
 *
 * Atomic binary operations and grouping at college+ levels, plus a few
 * cases with explicit parentheses to exercise priority handling.
 */

import { add, multiply, number, parentheses, subtract } from '../../factory';
import type { DemoCase } from '../demo-helpers';

export const BASIC: readonly DemoCase[] = [
	{
		label: '2 + 3',
		expression: add(number('2'), number('3'))
	},
	{
		label: '2 + 3 × 4 (priorité)',
		expression: add(number('2'), multiply(number('3'), number('4'), 'cross'))
	},
	{
		label: '2 + 3 × 4 + 5 × 6 (regroupement)',
		expression: add(
			add(number('2'), multiply(number('3'), number('4'), 'cross')),
			multiply(number('5'), number('6'), 'cross')
		)
	},
	{
		label: '10 − 7 + 3',
		expression: add(subtract(number('10'), number('7')), number('3'))
	},
	{
		label: '(2 + 3) × 4 (parenthèses)',
		expression: multiply(parentheses(add(number('2'), number('3'))), number('4'), 'cross')
	},
	{
		label: '2 × (3 + 4) (parenthèses)',
		expression: multiply(number('2'), parentheses(add(number('3'), number('4'))), 'cross')
	},
	{
		label: '10 − (3 + 2) (parenthèses en soustraction)',
		expression: subtract(number('10'), parentheses(add(number('3'), number('2'))))
	},
	{
		label: '(2 + 3) × (4 − 1) (deux parenthèses)',
		expression: multiply(
			parentheses(add(number('2'), number('3'))),
			parentheses(subtract(number('4'), number('1'))),
			'cross'
		)
	}
];
