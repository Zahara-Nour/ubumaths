/**
 * Demo cases — TargetForm scenarios.
 *
 * Cases that demonstrate how `PedagogicalTarget.structure` and
 * `strictCosmetics` shape the resulting steps. The same input expression
 * produces different step sequences depending on the target.
 */

import { add, divide, number } from '../../factory';
import type { DemoCase } from '../demo-helpers';

export const TARGET_FORM_SCENARIOS: readonly DemoCase[] = [
	{
		label: '1/3 + 1/6 sans target → 3/6 (non réduit)',
		expression: add(
			divide(number('1'), number('3'), 'fraction'),
			divide(number('1'), number('6'), 'fraction')
		),
		schoolLevels: ['college', 'lycee']
	},
	{
		label: '1/3 + 1/6 + reduced-fraction strict → 1/2',
		expression: add(
			divide(number('1'), number('3'), 'fraction'),
			divide(number('1'), number('6'), 'fraction')
		),
		target: { structure: 'reduced-fraction', strictCosmetics: { reducedFractions: 'strict' } },
		schoolLevels: ['college', 'lycee']
	},
	{
		label: '5000000 + scientific target → 5 × 10⁶',
		expression: number('5000000'),
		target: { structure: 'scientific' },
		schoolLevels: ['college', 'lycee']
	}
];
