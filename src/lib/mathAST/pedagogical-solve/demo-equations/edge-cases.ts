/**
 * Edge cases — Cas dégénérés du premier degré : pas de solution, ∞ solutions,
 * ou simplifications inattendues.
 *
 * NOTE : Le pipeline pédagogique actuel ne détecte pas explicitement les cas
 * "pas de solution" et "∞ solutions". Les snapshots capturent ce qui est
 * effectivement produit. À améliorer dans une phase ultérieure (ajouter une
 * branche dédiée dans `linear.ts` pour `a = 0` ou des résultats triviaux).
 */

import { number, variable, add, implicitMultiply, relation } from '../../factory';
import type { DemoCase } from '../demo-helpers';

const x = variable('x');

export const EDGE_CASES: readonly DemoCase[] = [
	{
		// 0·x = 0 → ∞ solutions (toute valeur de x convient)
		label: '0·x = 0',
		equation: relation('=', implicitMultiply(number('0'), x), number('0'))
	},
	{
		// 0·x = 5 → pas de solution (contradiction)
		label: '0·x = 5',
		equation: relation('=', implicitMultiply(number('0'), x), number('5'))
	},
	{
		// x = x + 1 → pas de solution (après transposition : 0 = 1)
		label: 'x = x + 1',
		equation: relation('=', x, add(x, number('1')))
	}
];
