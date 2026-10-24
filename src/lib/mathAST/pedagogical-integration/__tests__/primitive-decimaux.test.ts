/**
 * Les décimaux d'une primitive (R5, Q42 b — David, 2026-10-24)
 *
 * Quand l'intégrande tape un décimal, la primitive s'écrit dans UN registre :
 * tous ses coefficients en décimal si chacun a une écriture décimale finie
 * (`0,3x² + 1,2x`, `0,1x³`), sinon tous en fraction (`x³/6 − 3x²/4`). Plus de
 * mélange (`3x²/10 + 1,2x`). Sans décimal tapé, rien ne change.
 *
 * VALEUR : F′ = f (aucune réécriture ne change la primitive).
 */
import { describe, expect, it } from 'vitest';
import { differentiate } from '../../differentiation';
import { areEquivalent } from '../../equivalence';
import { toLatex } from '../../latex-generator';
import { parseLatex } from '../../parser';
import { generatePedagogicalIntegrationSteps } from '..';

function primitive(integrand: string) {
	return generatePedagogicalIntegrationSteps(parseLatex(integrand), { level: 'lycee' });
}

describe('R5 : tous les coefficients tombent juste → tous en décimal', () => {
	it.each([
		['0{,}6x+1{,}2', '0.3 x^2 + 1.2 x'],
		['0{,}3x^2', '0.1 x^3'],
		['0{,}6x^2-0{,}6', '0.2 x^3 - 0.6 x'],
		['0{,}2x^3-0{,}6x', '0.05 x^4 - 0.3 x^2'],
		['1{,}5x^2', '0.5 x^3'],
		['0{,}5x', '0.25 x^2'],
		['2{,}4x^2+0{,}5', '0.8 x^3 + 0.5 x'],
		['0{,}4x+3', '0.2 x^2 + 3 x'],
		['0{,}6e^{2x}', '0.3 \\exponentialE^{2 x}'],
		['0{,}5e^{2x}+x', '0.25 \\exponentialE^{2 x} + 0.5 x^2'],
		['\\dfrac{0{,}5}{x}', '0.5 \\ln\\left( \\left| x \\right| \\right)'],
		['0{,}2x+\\dfrac{1}{x}', '0.1 x^2 + \\ln\\left( \\left| x \\right| \\right)'],
		['0{,}5\\cos(2x)', '0.25 \\sin\\left( 2 x \\right)']
	])('∫ %s → %s', (integrand, expected) => {
		expect(toLatex(primitive(integrand).antiderivative)).toBe(expected);
	});
});

describe('R5 : un coefficient ne tombe pas juste → tous en fraction', () => {
	it.each([
		['0{,}5x^2-1{,}5x', '\\dfrac{x^3}{6} - \\dfrac{3 x^2}{4}'],
		['x^2+0{,}5x', '\\dfrac{x^3}{3} + \\dfrac{x^2}{4}'],
		['x^2+0{,}5', '\\dfrac{x^3}{3} + \\dfrac{x}{2}'],
		['0{,}5x^2-x', '\\dfrac{x^3}{6} - \\dfrac{x^2}{2}'],
		['0{,}5(x+1)^2', '\\dfrac{\\left( x + 1 \\right)^3}{6}']
	])('∫ %s → %s', (integrand, expected) => {
		expect(toLatex(primitive(integrand).antiderivative)).toBe(expected);
	});
});

describe('R5 : sans décimal tapé, rien ne change', () => {
	it.each([
		['\\dfrac{3}{5}x', '\\dfrac{3 x^2}{10}'],
		['x+\\dfrac{1}{2}', '\\dfrac{x^2}{2} + \\dfrac{x}{2}'],
		['e^{2x}', '\\dfrac{1}{2} \\exponentialE^{2 x}']
	])('∫ %s → %s', (integrand, expected) => {
		expect(toLatex(primitive(integrand).antiderivative)).toBe(expected);
	});
});

describe('R5 : la réécriture est une étape « On simplifie », F′ = f', () => {
	it('∫ 0,6e^{2x} : une étape mène de 3/10 à 0,3', () => {
		const { steps } = primitive('0{,}6e^{2x}');
		const last = steps.filter((s) => s.rule === 'simplify-result').at(-1);
		expect(last && toLatex(last.after)).toBe('0.3 \\exponentialE^{2 x}');
	});

	it.each(['0{,}6x+1{,}2', '0{,}2x^3-0{,}6x', 'x^2+0{,}5', '0{,}5e^{2x}+x', '0{,}5\\cos(2x)'])(
		'∫ %s : F′ = f',
		(integrand) => {
			const f = parseLatex(integrand);
			const F = primitive(integrand).antiderivative;
			expect(areEquivalent(differentiate(F, 'x'), f)).toBe(true);
		}
	);
});
