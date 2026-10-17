/**
 * Le mode décimal d'`evaluate` quand la fraction calculée a des termes géants.
 *
 * `evaluateToRational` calcule en fractions exactes (BigInt) ; π et e y entrent
 * par leur flottant (π = 3141592653589793 / 10¹⁵). π²⁰ porte alors 310 chiffres
 * en haut et 301 en bas, (1001/1000)¹⁰⁰⁰ en porte 3001 : la conversion finale
 * `Number(n) / Number(d)` rendait Infinity ou NaN (mesuré le 2026-10-11).
 */

import { describe, it, expect } from 'vitest';
import { evaluate, evaluateNodeToApproximatedNumber, evaluateNodeToRational } from '../evaluate';
import { parseLatex } from '../../parser';

function relativeGap(actual: number, expected: number): number {
	return Math.abs(actual / expected - 1);
}

describe('le mode décimal sur des fractions aux termes géants', () => {
	it.each([
		['\\pi^{20}', 8769956796.082693],
		['e^{30}', 10686474581524.445],
		['\\left(1+\\frac{1}{1000}\\right)^{1000}', 2.7169239322358925],
		['1.01^{365}', 37.78343433288716],
		['\\sqrt{2}^{40}', 1048576]
	])('%s → %d', (latex, expected) => {
		const value = evaluateNodeToApproximatedNumber(parseLatex(latex));

		expect(relativeGap(value, expected)).toBeLessThan(1e-12);
	});

	it('evaluate rend une valeur, pas Infinity', () => {
		const result = evaluate(parseLatex('\\pi^{20}'), { mode: 'decimal' });

		expect(result.status).toBe('value');
		expect(result.status === 'value' && Number.isFinite(result.value)).toBe(true);
	});
});

// Décision d de David (2026-10-12) : jamais « 0 » ni « Cannot convert Infinity » pour une
// valeur qui sort du flottant. Plafond des puissances exactes gardé à 1000 (décision du même
// jour, revue : à 10 000, `.variations e^{-2x^2}` prenait 5,7 s)
describe('les puissances entières au-delà de 1000', () => {
	it('1,5^1000 se calcule exactement ; 1,5^2000, en mode décimal, passe par le flottant', () => {
		const exact = evaluateNodeToRational(parseLatex('1.5^{1000}'));
		const beyond = evaluate(parseLatex('1.5^{2000}'), { mode: 'decimal' });

		expect(exact.n).toBe(3n ** 1000n);
		expect(exact.d).toBe(2n ** 1000n);
		expect(beyond.status === 'unevaluable' && beyond.reason).toMatch(/hors d’échelle/);
	});

	// Le cas de la revue : rapide, et la même valeur qu'avant
	it('e^{-2x^2} en x = 70 : refusé vite (la valeur sort du flottant)', () => {
		const start = performance.now();
		const result = evaluate(parseLatex('-4 \\cdot 70 \\cdot e^{-2 \\cdot 70^2}'), {
			mode: 'decimal'
		});

		expect(performance.now() - start).toBeLessThan(1000);
		expect(result.status).not.toBe('value');
	});

	it('au-delà du plafond, une valeur hors du flottant est refusée en français', () => {
		for (const latex of ['0.5^{20000}', '1.5^{20000}']) {
			const result = evaluate(parseLatex(latex), { mode: 'decimal' });

			expect(result.status).toBe('unevaluable');
			expect(result.status === 'unevaluable' && result.reason).toMatch(/hors d’échelle/);
		}
	});

	it('au-delà du plafond, une valeur dans le flottant reste calculée', () => {
		const value = evaluateNodeToApproximatedNumber(parseLatex('1.00001^{20000}'));

		expect(relativeGap(value, 1.2214015367677653)).toBeLessThan(1e-9);
	});
});

describe('les refus du calcul décimal', () => {
	// Revue : Math.pow(0, -π) = Infinity était annoncé « hors d'échelle »
	it('0 à une puissance négative : une division par zéro', () => {
		const result = evaluate(parseLatex('0^{-\\pi}'), { mode: 'decimal' });

		expect(result.status === 'unevaluable' && result.reason).toBe('Division by zero');
	});

	it('un pôle de tan est refusé, pas une valeur', () => {
		for (const latex of ['\\tan(\\pi/2)', '\\tan(3\\pi/2)', '\\tan(101\\pi/2)']) {
			const result = evaluate(parseLatex(latex), { mode: 'decimal' });

			expect(result.status === 'unevaluable' && result.reason).toMatch(/n’est pas définie/);
		}
	});
});

// Lot « lenteur des grandes fractions » (phase 0 validée par David, 2026-10-12) : la lecture de
// l'arrondi d'une écriture gardée (`evaluateNodeToRational`) calcule exactement tant que le
// résultat reste dans un budget de taille ; le calcul décimal général ne change pas
describe('evaluateNodeToRational : un budget de taille au-delà de l’exposant 1000', () => {
	it('une puissance au-delà de 1000, dans le budget : exacte', () => {
		const value = evaluateNodeToRational(parseLatex('1.5^{2000}'));
		const whole = evaluateNodeToRational(parseLatex('2^{100000}'));

		expect(value.n).toBe(3n ** 2000n);
		expect(value.d).toBe(2n ** 2000n);
		expect(whole.n).toBe(2n ** 100000n);
	});

	it('hors du budget : par le flottant, vite (e et π n’en profitent pas)', () => {
		const start = performance.now();
		const value = evaluateNodeToRational(parseLatex('\\left(1+\\frac{1}{100000}\\right)^{100000}'));

		expect(performance.now() - start).toBeLessThan(500);
		expect(Number(value.n) / Number(value.d)).toBeCloseTo(2.718268237, 8);
		expect(() => evaluateNodeToRational(parseLatex('e^{-9800}'))).toThrow(/hors d’échelle/);
	});

	it('une factorielle dans le budget : exacte (le calcul décimal reste borné)', () => {
		const value = evaluateNodeToRational(parseLatex('1000!'));

		expect(value.d).toBe(1n);
		expect(value.n.toString().length).toBe(2568);
		expect(evaluate(parseLatex('1000!'), { mode: 'decimal' }).status).toBe('unevaluable');
	});
});
