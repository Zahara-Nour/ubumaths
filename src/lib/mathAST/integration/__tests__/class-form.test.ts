/**
 * Écriture de CLASSE des primitives (forme, jamais valeur) — décision de
 * David, 2026-10-07 : harmoniser l'écriture avec la classe.
 *
 * Convention d'ordre (forme terme à terme) : puissances positives de la
 * variable par degré décroissant, puis termes de degré 0 (ln, constantes),
 * puis puissances négatives (−1/x avant −1/x²).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '$lib/mathAST/parser';
import { integrate } from '$lib/mathAST/integration';
import { toLatex } from '$lib/mathAST/latex-generator';
import { checkForm } from '$lib/mathAST/cosmetic-transforms';

function primitive(input: string, variable = 'x'): string {
	const result = integrate(parseLatex(input), { variable });
	if (result.antiderivative === null) throw new Error(`${input} : ${result.status}`);
	return toLatex(result.antiderivative);
}

/** La primitive a la forme de classe attendue (même contrôle que l'oracle) */
function expectForm(input: string, expected: string): void {
	const rendered = primitive(input);
	expect({ input, rendered, ok: checkForm(rendered, expected, {}).status !== 'bad_form' }).toEqual({
		input,
		rendered,
		ok: true
	});
}

describe('termes semblables en ln|u| regroupés', () => {
	it('a/x + b/x → (a + b) ln|x|', () => {
		expect(primitive('\\frac{a}{x}+\\frac{b}{x}')).toBe(
			'\\left( a + b \\right) \\ln\\left( \\left| x \\right| \\right)'
		);
	});

	it('a/x − b/x → (a − b) ln|x|', () => {
		expect(primitive('\\frac{a}{x}-\\frac{b}{x}')).toBe(
			'\\left( a - b \\right) \\ln\\left( \\left| x \\right| \\right)'
		);
	});

	it('un seul terme en ln|x| reste tel quel : a ln|x|', () => {
		expect(primitive('\\frac{a}{x}')).toBe('a \\ln\\left( \\left| x \\right| \\right)');
	});
});

describe('ordre des termes : polynôme décroissant, puis ln, puis puissances négatives', () => {
	it('(x + 1)²/x² → x + 2 ln|x| − 1/x', () => {
		expect(primitive('\\frac{(x+1)^2}{x^2}')).toBe(
			'x + 2 \\ln\\left( \\left| x \\right| \\right) - \\dfrac{1}{x}'
		);
	});

	it('(x³ − 2x + 1)/x² → ½x² − 2 ln|x| − 1/x', () => {
		expect(primitive('\\frac{x^3-2x+1}{x^2}')).toBe(
			'\\dfrac{1}{2} x^2 - 2 \\ln\\left( \\left| x \\right| \\right) - \\dfrac{1}{x}'
		);
	});

	it('1/x² + 1/x³ : −1/x avant −1/(2x²)', () => {
		expect(primitive('\\frac{1}{x^2}+\\frac{1}{x^3}')).toBe('-\\dfrac{1}{x} - \\dfrac{1}{2 x^2}');
	});
});

describe('|u| superflu : aussi dans les ÉTAPES', () => {
	it('2x/(x² + 1) : aucune étape ne montre ln|x² + 1|', () => {
		const result = integrate(parseLatex('\\frac{2x}{x^2+1}'), {
			variable: 'x',
			verbosity: 'detailed'
		});
		const shown = result.steps.flatMap((step) => [toLatex(step.before), toLatex(step.after)]);
		expect(shown.filter((latex) => latex.includes('\\left| x^2 + 1'))).toEqual([]);
	});
});

describe('u′·uⁿ : primitive gardée en puissance de u, pas développée', () => {
	it.each([
		['(x+1)^2', '\\frac{1}{3}(x+1)^3'],
		['(3x-1)^3', '\\frac{1}{12}(3x-1)^4'],
		['(1-2x)^4', '-\\frac{1}{10}(1-2x)^5'],
		['2(x+5)^2', '\\frac{2}{3}(x+5)^3'],
		['2x(x^2+1)^3', '\\frac{1}{4}(x^2+1)^4'],
		['(2x+1)(x^2+x)^4', '\\frac{1}{5}(x^2+x)^5'],
		['3x^2(x^3-1)^5', '\\frac{1}{6}(x^3-1)^6'],
		['\\frac{1}{(3x+2)^3}', '-\\frac{1}{6(3x+2)^2}'],
		['\\frac{3}{(2x-1)^2}', '-\\frac{3}{2(2x-1)}'],
		['\\sqrt{x+3}', '\\frac{2}{3}(x+3)^{\\frac{3}{2}}'],
		['x\\sqrt{x^2+1}', '\\frac{1}{3}(x^2+1)^{\\frac{3}{2}}']
	])('%s → %s', (input, expected) => expectForm(input, expected));
});

describe('pas de constante parasite dans une primitive développée', () => {
	it('x(x + 1)² → ¼x⁴ + ⅔x³ + ½x², sans −1/12', () => {
		expect(primitive('x(x+1)^2')).toBe('\\dfrac{1}{4} x^4 + \\dfrac{2}{3} x^3 + \\dfrac{1}{2} x^2');
	});

	it('x ln(x² + 1) : sans −½', () => {
		expect(primitive('x\\ln(x^2+1)')).not.toMatch(/- \\dfrac\{1\}\{2\}$/);
	});

	it('une primitive constante n’est pas vidée : ∫0 dx reste écrite', () => {
		expect(primitive('0')).toBe('0');
	});
});
