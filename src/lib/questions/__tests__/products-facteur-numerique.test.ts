/**
 * Contrainte `products` : un × n'est signalé que s'il est SUPERFLU.
 *
 * Devant un facteur qui commence par un nombre, le × est nécessaire : sans lui,
 * `3\times2^n` se lirait `32^n`. Ni signalement, ni retrait.
 */
import { describe, it, expect } from 'vitest';
import { specVerdicts } from './spec-verdicts.helper';
import { parseLatex, toLatex } from '$lib/mathAST';
import { removeMultOperatorAST } from '$lib/mathAST/cosmetic-transforms';

function removed(latex: string): string {
	return toLatex(removeMultOperatorAST(parseLatex(latex)));
}

describe('products : × nécessaire devant un facteur qui commence par un nombre', () => {
	it('3\\times2^n, 3\\cdot2^n, 500\\times1{,}05^n justes', () => {
		expect(specVerdicts('$u_n=?$', '3\\times2^n', ['3\\times2^n', '3\\cdot2^n'])).toEqual({
			'3\\times2^n': { status: 'correct', violations: [] },
			'3\\cdot2^n': { status: 'correct', violations: [] }
		});
		expect(specVerdicts('$u_n=?$', '500\\times1{,}05^n', ['500\\times1{,}05^n'])).toEqual({
			'500\\times1{,}05^n': { status: 'correct', violations: [] }
		});
	});

	it('le retrait du × ne colle jamais deux nombres : 3\\times2^n ne devient pas 32^n', () => {
		expect(removed('3\\times2^n')).not.toMatch(/32/);
		expect(removed('3\\times2^n')).toBe(toLatex(parseLatex('3\\times2^n')));
		expect(removed('500\\times1.05^n')).toBe(toLatex(parseLatex('500\\times1.05^n')));
		expect(removed('2\\times3x')).toBe(toLatex(parseLatex('2\\times3x')));
	});
});

describe('products : × superflu toujours signalé', () => {
	it('3\\times x, 2\\times(x+1), 3\\times\\sqrt2, 3\\times e^x, -3\\times x', () => {
		const cases: Array<[string, string]> = [
			['3x', '3\\times x'],
			['2(x+1)', '2\\times(x+1)'],
			['3\\sqrt{2}', '3\\times\\sqrt{2}'],
			['3e^{x}', '3\\times e^{x}'],
			['-3x', '-3\\times x'],
			['2^{n}x', '2^n\\times x'],
			// Facteur numérique écrit derrière : à mettre devant, le × disparaît
			['3e^{3x-2}', 'e^{3x-2}\\times3'],
			['3x^{2}', 'x^2\\times3']
		];
		for (const [expected, answer] of cases) {
			expect(specVerdicts('$?$', expected, [answer])[answer], answer).toEqual({
				status: 'unoptimal_form',
				violations: ['products']
			});
		}
	});
});

describe('products : facteur numérique derrière une puissance de nombre', () => {
	it("2^n\\times3 pour 3\\times2^n : à remettre dans l'ordre (½), jamais comparé comme 32^n", () => {
		expect(specVerdicts('$u_n=?$', '3\\times2^n', ['2^n\\times3'])).toEqual({
			'2^n\\times3': { status: 'unoptimal_form', violations: ['products'] }
		});
		expect(specVerdicts('$u_n=?$', '32^n', ['2^n\\times3'])['2^n\\times3'].status).toBe(
			'incorrect'
		);
	});
});
