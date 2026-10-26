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
		['\\left(e^{x}\\right)^{3}', '\\exponentialE^{3 x}'],
		['\\exponentialE^{x}\\exponentialE^{2x}', '\\exponentialE^{3 x}'],
		['e^{x}e^{2x}', '\\exponentialE^{3 x}'],
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
		['e^{x}', '\\exponentialE^x'],
		['\\exponentialE^{x}+1', '\\exponentialE^x + 1'],
		['x^{2}\\ln(x)', 'x^2 \\ln\\left( x \\right)'],
		// ln(x²) = 2 ln|x| sur ℝ* (décision du 2026-10-08 ; 2 ln x avant)
		['\\ln(x^{2})', '2 \\ln\\left( \\left| x \\right| \\right)'],
		['\\exp(x)\\exp(2x)', '\\exp\\left( 3 x \\right)'],
		['\\ln(\\exp(x))', 'x'],
		['\\exponentialE^{2}', '\\exponentialE^2'],
		// Seul témoin qui bouge, voulu (2026-10-10) : `1/e` ne devient plus `exp(-1)`
		// sans vraie exponentielle à combiner (solution de `ex = 1`, `x ln x + x = 0`).
		['\\exponentialE^{-1}', '\\dfrac{1}{\\exponentialE}'],
		['2\\exponentialE^{x}-3x', '-3 x + 2 \\exponentialE^x'],
		['\\ln(2)+\\ln(3)', '\\ln\\left( 2 \\right) + \\ln\\left( 3 \\right)'],
		['\\exponentialE^{x+1}', '\\exponentialE^{x + 1}'],
		['x\\exponentialE^{-x}', 'x \\exponentialE^{-x}']
	] as const)('%s → %s', (input, expected) => {
		expect(normalLatex(input)).toBe(expected);
	});
});

// tidy-conditions, 2ᵉ revue du § 4.2 : ln d'un nombre ≤ 0 n'existe pas,
// `e^{ln a} = a` ne vaut que pour a > 0 (`e^{ln(−3)}` donnait −3)
describe('e^{ln a} : a nombre négatif ou nul, rien ne se réduit', () => {
	it.each([
		'\\exponentialE^{\\ln(-\\frac{1}{2})}',
		'\\exponentialE^{\\ln(1-\\sqrt{2})}',
		'\\exponentialE^{\\ln(-3)}',
		'\\exp(\\ln(-3))',
		'\\exponentialE^{2\\ln(-3)}',
		'\\exponentialE^{\\ln(0)}'
	])('%s garde son ln', (latex) => {
		expect(normalLatex(latex)).toContain('\\ln');
		expect(sameNormalForm(latex, '-3')).toBe(false);
	});

	it.each([
		['\\exponentialE^{\\ln(3)}', '3'],
		['\\exp(\\ln(3))', '3'],
		['\\exponentialE^{\\ln(\\frac{1}{2})}', '\\frac{1}{2}'],
		['\\exponentialE^{\\ln(\\sqrt{2}-1)}', '\\sqrt{2}-1']
	])('%s = %s : un nombre positif se réduit encore', (latex, value) => {
		expect(sameNormalForm(latex, value)).toBe(true);
	});
});

// tidy-conditions, L6 (§ 5) : `e^{k ln a + c}` (k rationnel, a > 0 rationnel)
// devient `aᵏ e^{c}`, comme `exp(k ln a + c)` ; avant, seul `e^{ln a}` se
// réduisait et `e^{2 ln 3}` gardait une forme normale distincte de `9`.
describe('e^{k ln a + c} : a rationnel positif, la puissance se calcule', () => {
	it.each([
		['\\exponentialE^{2\\ln(3)}', '9'],
		['e^{2\\ln 3}', '9'],
		['\\exponentialE^{3\\ln(2)}', '8'],
		['\\exponentialE^{-\\ln(2)}', '\\frac{1}{2}'],
		['\\exponentialE^{\\frac{\\ln(2)}{2}}', '\\sqrt{2}'],
		['\\exponentialE^{\\frac{1}{2}\\ln(2)}', '\\sqrt{2}'],
		['\\exponentialE^{\\ln(2)+\\ln(3)}', '6'],
		['\\exponentialE^{1+\\ln(2)}', '2\\exponentialE'],
		['\\exponentialE^{x+\\ln(2)}', '2\\exponentialE^{x}'],
		['\\exponentialE^{\\ln(9)}', '9'],
		['\\exponentialE^{2\\ln(\\frac{1}{3})}', '\\frac{1}{9}'],
		['\\exponentialE^{1000\\ln(2)-999\\ln(2)}', '2']
	] as const)('%s → %s', (input, expected) => {
		expect(sameNormalForm(input, expected)).toBe(true);
		expect(normalLatex(input)).not.toContain('\\ln');
	});

	it.each([
		// lettre sous le ln : hors de L6, l'écriture reste
		'\\exponentialE^{2\\ln(x)}',
		'\\exponentialE^{\\ln(x)+1}',
		// ln d'un nombre négatif : n'existe pas
		'\\exponentialE^{2\\ln(-3)+1}',
		// ln d'un irrationnel : hors de L6
		'\\exponentialE^{2\\ln(\\pi)}',
		// |k| > 1000 : la puissance n'est pas calculée (revue de #1834)
		'\\exponentialE^{10000000\\ln(2)}',
		'\\exponentialE^{-1001\\ln(2)}'
	])('%s garde son ln', (latex) => {
		expect(normalLatex(latex)).toContain('\\ln');
	});

	// Sans lettre : `e^{x}` et `\\exp(x)` gardent deux formes normales (#382)
	it.each(['\\exponentialE^{2\\ln(3)}', '\\exponentialE^{1+\\ln(2)}'])(
		'%s : même forme normale que \\exp(…)',
		(latex) => {
			const exp = latex.replace('\\exponentialE^', '\\exp');
			expect(sameNormalForm(latex, exp.replace(/^\\exp\{(.*)\}$/, '\\exp($1)'))).toBe(true);
		}
	);
});
