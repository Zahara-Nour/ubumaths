/**
 * Nombre collé APRÈS un facteur en LaTeX : `x2`, `x2^x`, `(a)2`, `\sqrt{2}3` (2026-10-08)
 *
 * Refusé (décision existante, cf. `factorielle-binom-notation.test.ts`) : `x2` est
 * ambigu — x·2 ? x² (exposant oublié) ? x₂ (indice oublié) ? Lire `x2` comme 2x
 * accepterait en silence la réponse d'un élève qui voulait écrire x². Le refus
 * dit désormais QUOI écrire, au lieu de « Unexpected token: 2 ». Même message
 * dans les deux parseurs LaTeX (Pratt et RD).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../index';
import { MathAST } from '../../factory';

const latexParsers = {
	pratt: (s: string) => parseLatex(s),
	rd: (s: string) => parseLatex(s, { parser: 'rd' })
};

describe.each(Object.entries(latexParsers))('nombre après un facteur (%s)', (_name, parse) => {
	it.each(['x2', 'x2^x', '(a)2', '\\sqrt{2}3', '3x2+1', '\\frac{x2}{3}', '(x2+1)'])(
		'%s est refusé avec un message qui dit quoi écrire',
		(input) => {
			expect(() => parse(input)).toThrow(/écris le nombre devant/);
		}
	);

	it('le message nomme le nombre fautif', () => {
		expect(() => parse('\\sqrt{2}3')).toThrow(/« 3 ».*\(3x\).*x\\cdot 3/);
	});

	it('2x reste accepté', () => {
		expect(parse('2x')).toEqual(
			MathAST.multiply(MathAST.number('2'), MathAST.variable('x'), 'implicit')
		);
	});

	it('x\\cdot2^x est accepté (écriture conseillée)', () => {
		expect(() => parse('x\\cdot2^x')).not.toThrow();
	});

	it('x_2 (indice) reste accepté', () => {
		expect(() => parse('x_2')).not.toThrow();
	});

	it('3!27! reste accepté (nombre après une factorielle)', () => {
		expect(() => parse('3!27!')).not.toThrow();
	});
});
