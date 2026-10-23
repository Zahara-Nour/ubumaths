/**
 * Les produits d'exponentielles NÉS du développement se combinent aussi
 * (bug quot-04 de l'oracle des dérivées, lot 5a du chantier simplify-carte).
 *
 * f = eˣ/(eˣ + 1) : le numérateur de f′, `eˣ(eˣ + 1) − eˣ·eˣ`, rendait
 * `(eˣ)² − e^{2x} + eˣ` en `auto`. Les identités de la base d'Euler
 * (`eᵃ·eᵇ → e^{a+b}`) passaient AVANT le développement de `normalize` ; le
 * produit `eˣ·eˣ` qu'il fabrique restait `(eˣ)²`, que rien ne regroupait avec
 * le `e^{2x}` déjà réduit.
 *
 * Entrées PARSÉES (invariant 4 : `e` est la lettre, `\exponentialE` la constante).
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { normalize, denormalize } from '../../normal';
import { generatePedagogicalSimplifySteps } from '../pipeline';

function intentLatex(latex: string, intent: 'auto' | 'developper'): string {
	return toLatex(
		generatePedagogicalSimplifySteps(parseLatex(latex), { intent, schoolLevel: 'lycee' }).result
	);
}

describe('exponentielles regroupées après le développement', () => {
	it.each([
		['e^{x}(e^{x}+1) - e^{x}e^{x}', '\\exponentialE^x'],
		['(e^{x}+1)e^{x} - (e^{x})^{2}', '\\exponentialE^x'],
		['3e^{x}(e^{x}+1) - 3e^{2x}', '3 \\exponentialE^x']
	])('auto : %s → %s', (input, expected) => {
		expect(intentLatex(input, 'auto')).toBe(expected);
	});

	it.each([
		['(e^{x}+1)e^{x} - e^{2x}', '\\exponentialE^x'],
		['2e^{x}(e^{-x}+1)', '2 \\exponentialE^x + 2']
	])('developper : %s → %s', (input, expected) => {
		expect(intentLatex(input, 'developper')).toBe(expected);
	});

	it('normalize : (eˣ + 1)eˣ − e^{2x} a la forme normale de eˣ', () => {
		const form = normalize(parseLatex('(e^{x}+1)e^{x} - e^{2x}'));
		expect(toLatex(denormalize(form))).toBe('\\exponentialE^x');
		expect(form.hash).toBe(normalize(parseLatex('e^{x}')).hash);
	});
});
