/**
 * Demo cases — Radicaux (square roots).
 *
 * Extraction of perfect squares + multiplication of radicals.
 */

import { multiply, number, sqrt } from '../../factory';
import type { DemoCase } from '../demo-helpers';

export const RADICALS: readonly DemoCase[] = [
	{
		label: '√8 → 2√2',
		expression: sqrt(number('8')),
		schoolLevels: ['college']
	},
	{
		label: '√18 → 3√2',
		expression: sqrt(number('18')),
		schoolLevels: ['college']
	},
	{
		label: '√45 → 3√5',
		expression: sqrt(number('45')),
		schoolLevels: ['college']
	},
	{
		label: '√2 × √3 → √6',
		expression: multiply(sqrt(number('2')), sqrt(number('3')), 'cross'),
		schoolLevels: ['college']
	},
	{
		label: '√2 × √8 → 4 (collapse complet)',
		expression: multiply(sqrt(number('2')), sqrt(number('8')), 'cross'),
		schoolLevels: ['college']
	}
];
