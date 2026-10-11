/**
 * Le parseur LaTeX ne lit PAS la notation scientifique (décision de David,
 * 2026-10-10, suite de #1061).
 *
 * La lettre `e` est la constante d'Euler : un élève qui tape `3e-2` a écrit
 * 3e − 2, pas 0,03. Le tokenizer est partagé par les deux parseurs (pratt et
 * rd) : les deux sont testés. La syntaxe custom, elle, GARDE `1e5` = 100 000.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex, parseCustom } from '../../../index';
import { euler, multiply, number, subtract, variable } from '../../../factory';
import { evaluateNodeToApproximatedNumber } from '../../../eval/evaluate';
import type { MathNode } from '../../../types';

const approx = (node: MathNode): number => evaluateNodeToApproximatedNumber(node);

describe.each(['pratt', 'rd'] as const)('LaTeX sans notation scientifique (%s)', (parser) => {
	const parse = (s: string) => parseLatex(s, { parser });

	it("`3e-2` se lit 3e − 2 (constante d'Euler), pas 0,03", () => {
		expect(parse('3e-2')).toEqual(
			subtract(multiply(number('3'), euler(), 'implicit'), number('2'))
		);
	});

	it('`1.5e-3x` se lit 1,5e − 3x', () => {
		expect(parse('1.5e-3x')).toEqual(
			subtract(
				multiply(number('1.5'), euler(), 'implicit'),
				multiply(number('3'), variable('x'), 'implicit')
			)
		);
	});

	it('`3{,}5e-2` (virgule MathLive) se lit 3,5e − 2', () => {
		expect(parse('3{,}5e-2')).toEqual(
			subtract(multiply(number('3.5'), euler(), 'implicit'), number('2'))
		);
	});

	it('`3e+2` se lit 3e + 2', () => {
		const ast = parse('3e+2');
		expect(ast.type).toBe('addition');
	});

	it('`3E-2` : E majuscule est une variable, pas un exposant', () => {
		expect(parse('3E-2')).toEqual(
			subtract(multiply(number('3'), variable('E'), 'implicit'), number('2'))
		);
	});

	it('`2e3` est traité comme `2e 3` : un nombre écrit après un facteur', () => {
		// Même réponse que `2e 3` et `2x3` (le parseur refuse un nombre collé
		// derrière un facteur) : `e3` n'est plus un exposant.
		expect(() => parse('2e 3')).toThrow(/Nombre « 3 » écrit après un facteur/);
		expect(() => parse('2e3')).toThrow(/Nombre « 3 » écrit après un facteur/);
	});

	it('`3\\times10^{-2}` vaut toujours 0,03', () => {
		expect(approx(parse('3\\times10^{-2}'))).toBeCloseTo(0.03, 12);
	});
});

describe('la syntaxe custom garde la notation scientifique', () => {
	it('`1e5` = 100 000', () => {
		expect(approx(parseCustom('1e5'))).toBe(100000);
	});

	it('`2e-3` = 0,002', () => {
		expect(approx(parseCustom('2e-3'))).toBeCloseTo(0.002, 15);
	});
});
