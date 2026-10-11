/**
 * Puissance d'exposant rationnel de dénominateur IMPAIR (décision du
 * 2026-10-08) : x^{p/q}, p/q irréductible et q impair, vaut (ᵠ√x)^p et se
 * calcule donc pour x < 0, comme ∛x (#925). Dénominateur pair (x^{1/2},
 * x^{3/4}) et exposant décimal (x^{0.2}) : inchangés (base négative refusée).
 */
import { describe, it, expect } from 'vitest';
import { evaluateNodeToApproximatedNumber } from '../evaluate';
import { compile } from '../compile';
import { oddDenominatorExponent, realRationalPower } from '../real-root';
import { parseLatex } from '../../parser';

const value = (latex: string) => evaluateNodeToApproximatedNumber(parseLatex(latex));
const at = (latex: string, x: number) => compile(parseLatex(latex))({ x });

describe('oddDenominatorExponent — lecture de l’exposant', () => {
	it.each([
		['\\frac{1}{3}', 1n, 3n],
		['\\frac{2}{3}', 2n, 3n],
		['-\\frac{1}{3}', -1n, 3n],
		['\\frac{-1}{3}', -1n, 3n],
		['\\frac{4}{6}', 2n, 3n],
		['\\frac{5}{3}', 5n, 3n],
		['\\frac{2}{5}', 2n, 5n]
	])('%s → %s/%s', (latex, n, d) => {
		expect(oddDenominatorExponent(parseLatex(latex))).toEqual({ n, d });
	});

	it.each([
		'\\frac{1}{2}',
		'\\frac{3}{4}',
		'\\frac{2}{6}x',
		'0.2',
		'\\frac{1}{0.5}',
		'3',
		'\\frac{6}{3}',
		'x'
	])('%s → null', (latex) => {
		// \frac{2}{6}x n'est pas constant ; 0.2 est décimal ; 6/3 est entier
		expect(oddDenominatorExponent(parseLatex(latex))).toBeNull();
	});
});

describe('realRationalPower', () => {
	it('(−8)^{2/3} = 4, (−8)^{1/3} = −2, (−8)^{−1/3} = −1/2', () => {
		expect(realRationalPower(-8, 2, 3)).toBeCloseTo(4, 12);
		expect(realRationalPower(-8, 1, 3)).toBeCloseTo(-2, 12);
		expect(realRationalPower(-8, -1, 3)).toBeCloseTo(-0.5, 12);
	});

	it('0^{−1/3} : null (division par zéro)', () => {
		expect(realRationalPower(0, -1, 3)).toBeNull();
	});
});

describe('evaluate — base négative, dénominateur impair', () => {
	it.each([
		['(-8)^{\\frac{2}{3}}', 4],
		['(-8)^{\\frac{1}{3}}', -2],
		['(-8)^{-\\frac{1}{3}}', -0.5],
		['(-8)^{\\frac{4}{6}}', 4],
		['(-27)^{\\frac{5}{3}}', -243],
		['(-32)^{\\frac{2}{5}}', 4]
	])('%s = %s', (latex, expected) => {
		expect(value(latex)).toBeCloseTo(expected, 12);
	});

	it('(−2)^{1/3} ≈ −∛2 (non exact)', () => {
		expect(value('(-2)^{\\frac{1}{3}}')).toBeCloseTo(-Math.cbrt(2), 12);
	});

	it.each(['(-8)^{\\frac{1}{2}}', '(-16)^{\\frac{3}{4}}', '(-32)^{0.2}'])(
		'%s reste une erreur',
		(latex) => {
			expect(() => value(latex)).toThrow();
		}
	);
});

describe('compile — base négative, dénominateur impair', () => {
	it.each([
		['x^{\\frac{2}{3}}', -8, 4],
		['x^{\\frac{1}{3}}', -8, -2],
		['x^{-\\frac{1}{3}}', -8, -0.5],
		['x^{\\frac{4}{6}}', -8, 4],
		['(x-1)^{\\frac{5}{3}}', -7, -32],
		['(2x-1)^{\\frac{1}{3}}', -13, -3]
	])('%s en %s = %s', (latex, x, expected) => {
		expect(at(latex, x)).toBeCloseTo(expected, 12);
	});

	it.each([
		['x^{\\frac{1}{2}}', -4],
		['x^{\\frac{3}{4}}', -16],
		['x^{0.2}', -32]
	])('%s en %s reste NaN', (latex, x) => {
		expect(at(latex, x)).toBeNaN();
	});

	it('x^{−1/3} en 0 n’est pas un nombre fini', () => {
		expect(Number.isFinite(at('x^{-\\frac{1}{3}}', 0))).toBe(false);
	});
});
