/**
 * `normalize` réduit les identités exponentielle / logarithme pour l'écriture
 * `e^{…}` comme il le fait déjà pour `exp(…)`.
 *
 * Décision de David (option A, 2026-10-05) : `tidy` garde son contrat et
 * n'applique aucune identité (docs/systeme/mathast/tidy-spec.md §A) ; c'est `normalize`
 * qui réduit `ln(eᵃ)`, `e^{ln a}`, `(eᵃ)ⁿ`, `eᵃ·eᵇ`, `e⁰`. Mesuré avant :
 * `ln(\exp(x))` rendait `x`, mais `ln(e^{x})` restait écrit.
 *
 * La base d'Euler a deux écritures : la constante `\exponentialE` (MathLive)
 * et la lettre `e`. La notation de l'élève est gardée : on ne réécrit pas
 * `e^{x}` en `\exp(x)`.
 */

import { describe, it, expect } from 'vitest';
import { normalize, denormalize } from '../index';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';

/** La forme normale, réécrite et rendue en LaTeX. */
function normalLatex(latex: string): string {
	return toLatex(denormalize(normalize(parseLatex(latex))));
}

function sameNormalForm(a: string, b: string): boolean {
	return normalize(parseLatex(a)).hash === normalize(parseLatex(b)).hash;
}

describe('Identités de la base d’Euler, écriture e^{…}', () => {
	it.each([
		// entrée, forme normale attendue
		['\\ln(\\exponentialE^{x})', 'x'],
		['\\ln(e^{x})', 'x'],
		['\\ln(\\exponentialE^{-\\frac{1}{2}})', '-\\dfrac{1}{2}'],
		['\\ln(\\exponentialE^{3x+1})', '3 x + 1'],
		['\\exponentialE^{\\ln(x)}', 'x'],
		['e^{\\ln(x)}', 'x'],
		['\\left(\\exponentialE^{x}\\right)^{2}', '\\exponentialE^{2 x}'],
		['\\left(e^{x}\\right)^{3}', 'e^{3 x}'],
		['\\exponentialE^{x}\\exponentialE^{2x}', '\\exponentialE^{3 x}'],
		['e^{x}e^{2x}', 'e^{3 x}'],
		['\\exponentialE^{x}\\exponentialE^{-x}', '1'],
		['3\\exponentialE^{x}\\exponentialE^{2x}', '3 \\exponentialE^{3 x}'],
		['\\exponentialE^{0}', '1']
	] as const)('%s → %s', (input, expected) => {
		expect(normalLatex(input)).toBe(expected);
	});

	it('(e^{−1/2})² a la forme normale de e^{−1}', () => {
		expect(
			sameNormalForm('\\left(\\exponentialE^{-\\frac{1}{2}}\\right)^{2}', '\\exponentialE^{-1}')
		).toBe(true);
	});

	it('le minimum de x² ln x, ln(e^{−1/2})·(e^{−1/2})², a la forme normale de −e^{−1}/2', () => {
		expect(
			sameNormalForm(
				'\\ln\\left(\\exponentialE^{-\\frac{1}{2}}\\right)\\left(\\exponentialE^{-\\frac{1}{2}}\\right)^{2}',
				'-\\frac{1}{2}\\exponentialE^{-1}'
			)
		).toBe(true);
	});
});

describe('Témoins : forme normale inchangée (mesurée avant le correctif)', () => {
	it.each([
		['\\exponentialE^{x}', '\\exponentialE^x'],
		['e^{x}', 'e^x'],
		['\\exponentialE^{x}+1', '\\exponentialE^x + 1'],
		['x^{2}\\ln(x)', 'x^2 \\ln\\left( x \\right)'],
		// ln(x²) = 2 ln|x| sur ℝ* (décision du 2026-10-08 ; 2 ln x avant)
		['\\ln(x^{2})', '2 \\ln\\left( \\left| x \\right| \\right)'],
		['\\exp(x)\\exp(2x)', '\\exp\\left( 3 x \\right)'],
		['\\ln(\\exp(x))', 'x'],
		['\\exponentialE^{2}', '\\exponentialE^2'],
		['\\exponentialE^{-1}', '\\exp\\left( -1 \\right)'],
		['2\\exponentialE^{x}-3x', '-3 x + 2 \\exponentialE^x'],
		['\\ln(2)+\\ln(3)', '\\ln\\left( 2 \\right) + \\ln\\left( 3 \\right)'],
		['\\exponentialE^{x+1}', '\\exponentialE^{x + 1}'],
		['x\\exponentialE^{-x}', 'x \\exponentialE^{-x}']
	] as const)('%s → %s', (input, expected) => {
		expect(normalLatex(input)).toBe(expected);
	});
});
