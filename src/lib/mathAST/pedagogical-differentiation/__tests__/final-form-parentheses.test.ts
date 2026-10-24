/**
 * La forme finale de f′ ouvre les sommes que la dérivée brute porte sans
 * parenthèse écrite (revue du lot 5f-1, chantier simplify-carte, 2026-10-24).
 *
 * La règle du produit donne `1 − (eˣ + xeˣ)` sans nœud de parenthèse. Depuis
 * Q40, `tidy` garde cette parenthèse sous-entendue ; la forme finale, elle,
 * réduit : elle l'ouvre avant `auto`, comme `tidy` le faisait avant 5f-1.
 * Attendus : les formes d'avant 5f-1, mesurées sur `HEAD~1`.
 */

import { describe, it, expect } from 'vitest';
import { finalDerivativeOf } from '../final-form';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';

const derived = (f: string, order = 1) => {
	const result = finalDerivativeOf(parseCustom(f), order);
	return result === null ? null : toCustom(result);
};

describe('f′ finale : les sommes sous-entendues de la dérivée brute sont ouvertes', () => {
	it.each([
		['1-x*e^x', 1, '-(x+1)e^x'],
		['x-(x+1)ln(x+1)', 1, '-ln(x+1)'],
		['x^3-(x^2+1)(x-1)', 1, '2x-1'],
		['3x-(2x+1)(x-3)', 1, '8-4x'],
		['10-(x-1)(x+2)', 1, '-2x-1'],
		['x-x^2*e^x', 1, '-x^2e^x-2xe^x+1'],
		['5-(x-2)ln(x)', 1, '{2-x}/x-ln(x)'],
		['-3x*e^(2x)', 2, '-(12x+12)e^{2x}']
	])('%s (ordre %i) → %s', (f, order, expected) => {
		expect(derived(f, order)).toBe(expected);
	});
});
