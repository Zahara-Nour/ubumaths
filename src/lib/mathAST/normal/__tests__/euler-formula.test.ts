/**
 * Formule d'Euler sur le chemin de l'équivalence : e^{iθ} = cos θ + i sin θ
 * (décision de David du 2026-10-05). Avant : `2e^{i\frac{\pi}{3}}` et `1+i\sqrt{3}`
 * n'étaient pas reconnus égaux, ni `e^{i\pi}` et −1.
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '$lib/mathAST/parser';
import { areEquivalent } from '$lib/mathAST/equivalence';

function eq(a: string, b: string): boolean {
	return areEquivalent(parseLatex(a), parseLatex(b));
}

describe('formule d’Euler (argument constant)', () => {
	it('forme exponentielle ≡ forme algébrique', () => {
		expect(eq('2e^{i\\frac{\\pi}{3}}', '1+i\\sqrt{3}')).toBe(true);
		expect(eq('2e^{\\frac{i\\pi}{3}}', '1+i\\sqrt{3}')).toBe(true);
		expect(eq('2e^{\\frac{\\pi}{3}i}', '1+i\\sqrt{3}')).toBe(true);
		expect(eq('\\sqrt{2}e^{-i\\frac{\\pi}{4}}', '1-i')).toBe(true);
		expect(eq('3e^{i\\frac{\\pi}{2}}', '3i')).toBe(true);
	});

	it('e^{iπ} = −1, e^{2iπ} = 1, \\exponentialE^{\\imaginaryI\\pi} = −1, \\exp(i\\pi) = −1', () => {
		expect(eq('e^{i\\pi}', '-1')).toBe(true);
		expect(eq('e^{2i\\pi}', '1')).toBe(true);
		expect(eq('\\exponentialE^{\\imaginaryI\\pi}', '-1')).toBe(true);
		expect(eq('\\exp(i\\pi)', '-1')).toBe(true);
	});

	it('argument à 2π près : même valeur', () => {
		expect(eq('2e^{i\\frac{7\\pi}{3}}', '2e^{i\\frac{\\pi}{3}}')).toBe(true);
		expect(eq('2e^{-i\\frac{5\\pi}{3}}', '2e^{i\\frac{\\pi}{3}}')).toBe(true);
		expect(eq('-2e^{i\\frac{4\\pi}{3}}', '2e^{i\\frac{\\pi}{3}}')).toBe(true);
	});

	it('forme trigonométrique ≡ forme exponentielle', () => {
		expect(
			eq('2\\left(\\cos\\frac{\\pi}{3}+i\\sin\\frac{\\pi}{3}\\right)', '2e^{i\\frac{\\pi}{3}}')
		).toBe(true);
		// Argument quelconque : les deux membres s'écrivent cos 1 + i sin 1
		expect(eq('e^{i}', '\\cos(1)+i\\sin(1)')).toBe(true);
	});

	it('partie réelle dans l’exposant : e^{1+i\\pi} = −e', () => {
		expect(eq('e^{1+i\\pi}', '-e')).toBe(true);
	});

	it('valeurs fausses restent fausses', () => {
		expect(eq('2e^{i\\frac{\\pi}{6}}', '1+i\\sqrt{3}')).toBe(false);
		expect(eq('2e^{i\\frac{\\pi}{3}}', '1-i\\sqrt{3}')).toBe(false);
		expect(eq('e^{i\\pi}', '1')).toBe(false);
		expect(eq('e^{i}', '\\cos(2)+i\\sin(2)')).toBe(false);
	});

	it('exponentielle réelle inchangée', () => {
		expect(eq('e^{x}e^{2x}', 'e^{3x}')).toBe(true);
		expect(eq('e^{2}', 'e^{2}')).toBe(true);
		expect(eq('e^{x}', 'e^{2x}')).toBe(false);
	});
});
