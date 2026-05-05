/**
 * Demo cases — Fractions.
 *
 * Addition with same and different denominators, multiplication, division,
 * and reduction. Focus on college+ levels (primaire restricted to
 * same-denominator additions).
 */

import { add, divide, multiply, number } from '../../factory';
import type { DemoCase } from '../demo-helpers';

const f = (n: string, d: string) => divide(number(n), number(d), 'fraction');

export const FRACTIONS: readonly DemoCase[] = [
	{
		label: '1/3 + 1/6 (PGCD = 6)',
		expression: add(f('1', '3'), f('1', '6')),
		target: { structure: 'reduced-fraction', strictCosmetics: { reducedFractions: 'strict' } },
		schoolLevels: ['college', 'lycee', 'superieur']
	},
	{
		label: '1/4 + 1/6 (PGCD = 12)',
		expression: add(f('1', '4'), f('1', '6')),
		target: { structure: 'reduced-fraction', strictCosmetics: { reducedFractions: 'strict' } },
		schoolLevels: ['college', 'lycee', 'superieur']
	},
	{
		label: '2/3 × 5/7 (multiplication)',
		expression: multiply(f('2', '3'), f('5', '7'), 'cross'),
		schoolLevels: ['college', 'lycee', 'superieur']
	},
	{
		label: '(2/3) ÷ (5/7) (division)',
		expression: divide(f('2', '3'), f('5', '7'), 'fraction'),
		schoolLevels: ['college', 'lycee', 'superieur']
	},
	{
		label: '2/4 réduction stricte',
		expression: f('2', '4'),
		target: { structure: 'reduced-fraction', strictCosmetics: { reducedFractions: 'strict' } },
		schoolLevels: ['college', 'lycee']
	}
];
