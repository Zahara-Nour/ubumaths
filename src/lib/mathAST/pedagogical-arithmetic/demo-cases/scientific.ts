/**
 * Demo cases — Notation scientifique.
 *
 * Conversion + multiplication.
 */

import { multiply, number, opposite, superscript } from '../../factory';
import type { DemoCase } from '../demo-helpers';

const sci = (a: string, n: string, neg = false) =>
	multiply(number(a), superscript(number('10'), neg ? opposite(number(n)) : number(n)), 'cross');

export const SCIENTIFIC: readonly DemoCase[] = [
	{
		label: '5 000 000 → 5 × 10⁶',
		expression: number('5000000'),
		target: { structure: 'scientific' },
		schoolLevels: ['college']
	},
	{
		label: '0.000037 → 3.7 × 10⁻⁵',
		expression: number('0.000037'),
		target: { structure: 'scientific' },
		schoolLevels: ['college']
	},
	{
		label: '(3 × 10⁴) × (2 × 10⁻²) → 6 × 10²',
		expression: multiply(sci('3', '4'), sci('2', '2', true), 'cross'),
		target: { structure: 'scientific' },
		schoolLevels: ['college']
	},
	{
		label: '(5 × 10³) × (4 × 10²) → 2 × 10⁶ (overflow re-norm)',
		expression: multiply(sci('5', '3'), sci('4', '2'), 'cross'),
		target: { structure: 'scientific' },
		schoolLevels: ['college']
	}
];
