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
		schoolLevels: ['college', 'lycee']
	},
	{
		label: '√18 → 3√2',
		expression: sqrt(number('18')),
		schoolLevels: ['college', 'lycee']
	},
	{
		label: '√45 → 3√5',
		expression: sqrt(number('45')),
		schoolLevels: ['college', 'lycee']
	},
	{
		label: '√2 × √3 → √6',
		expression: multiply(sqrt(number('2')), sqrt(number('3')), 'cross'),
		schoolLevels: ['college', 'lycee']
	},
	{
		label: '√2 × √8 → √16 → 4 (produit = carré parfait)',
		expression: multiply(sqrt(number('2')), sqrt(number('8')), 'cross'),
		schoolLevels: ['college', 'lycee']
	},
	{
		// L'autre chemin : 216 n'est pas un carré parfait et les deux racines
		// se simplifient, donc on extrait AVANT de multiplier.
		label: '√12 × √18 → 2√3 × 3√2 → 6√6 (extraction d abord)',
		expression: multiply(sqrt(number('12')), sqrt(number('18')), 'cross'),
		schoolLevels: ['college', 'lycee']
	}
];
