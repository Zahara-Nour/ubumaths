/**
 * Demo cases — Basic operations.
 *
 * Atomic binary operations and grouping at college+ levels, plus a few
 * cases with explicit parentheses to exercise priority handling, and a
 * handful of inline divisions (e.g. `12 / 3 = 4`) using
 * `displayStyle: 'inline'` rather than fraction layout.
 */

import { add, divide, multiply, number, parentheses, subtract } from '../../factory';
import type { DemoCase } from '../demo-helpers';

/** Inline division `a / b` — distinct from fraction layout. */
const div = (a: string, b: string) => divide(number(a), number(b), 'inline');

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
	},
	{
		label: '12 ÷ 3 (division simple)',
		expression: div('12', '3')
	},
	{
		label: '6 + 12 ÷ 3 (priorité division)',
		expression: add(number('6'), div('12', '3'))
	},
	{
		label: '20 ÷ 4 − 3 (division puis soustraction)',
		expression: subtract(div('20', '4'), number('3'))
	},
	{
		label: '(15 + 5) ÷ 4 (parenthèses + division)',
		expression: divide(parentheses(add(number('15'), number('5'))), number('4'), 'inline')
	},
	{
		label: '24 ÷ 6 + 2 × 3 (combine division + multiplication)',
		expression: add(div('24', '6'), multiply(number('2'), number('3'), 'cross'))
	}
];
