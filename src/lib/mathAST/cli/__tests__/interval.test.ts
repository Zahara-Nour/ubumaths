/**
 * L'encadrement rigoureux d'une expression (lot « défauts des grandes fractions », 2026-10-12) :
 * une comparaison dont un membre est trop long à calculer exactement se tranche sur des
 * encadrements, arrondis VERS L'EXTÉRIEUR à chaque opération — la valeur exacte est toujours
 * dedans. Revue : une marge relative sur une valeur arrondie ne tenait pas une soustraction qui
 * annule presque tout (`(1+1/20000)^{20000}×10^{16} − 27182138745278831 < 0` répondait `false`).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '$lib/mathAST/parser';
import { enclosure, compareEnclosures } from '../interval';

/** Le signe de l'encadrement : −1, 1, ou null s'il contient 0. */
function sign(latex: string): number | null {
	const box = enclosure(parseLatex(latex));
	if (box === null) throw new Error('pas d’encadrement');
	return compareEnclosures(box, enclosure(parseLatex('0'))!);
}

describe('un encadrement contient toujours la valeur exacte', () => {
	// Partie entière exacte de (20001/20000)^20000 × 10^16, calculée en BigInt
	const floor = (20001n ** 20000n * 10n ** 16n) / 20000n ** 20000n;

	it('une soustraction qui annule presque tout', () => {
		expect(floor).toBe(27182138745278830n);
		expect(sign(`\\left(1+\\frac{1}{20000}\\right)^{20000}\\times10^{16}-${floor + 1n}`)).toBe(-1);
		expect(sign(`\\left(1+\\frac{1}{20000}\\right)^{20000}\\times10^{16}-${floor}`)).toBe(1);
	});

	it('10^{24}, la partie entière plus un', () => {
		const big = (20001n ** 20000n * 10n ** 24n) / 20000n ** 20000n;
		expect(sign(`\\left(1+\\frac{1}{20000}\\right)^{20000}\\times10^{24}-${big + 1n}`)).toBe(-1);
		expect(sign(`\\left(1+\\frac{1}{20000}\\right)^{20000}\\times10^{24}-${big}`)).toBe(1);
	});

	it.each([
		['\\frac{1}{3}-\\frac{333333}{1000000}', 1],
		['\\frac{1}{3}-\\frac{333334}{1000000}', -1],
		['-\\left(\\frac{3}{2}\\right)^{1001}+\\left(\\frac{3}{2}\\right)^{1001}', null],
		['2^{100000}-3^{60000}', 1],
		['\\left(-\\frac{1}{2}\\right)^{3}+\\frac{1}{8}', 0],
		['\\left(-\\frac{1}{2}\\right)^{3}+\\frac{1}{9}', -1],
		['\\frac{1}{\\left(1+\\frac{1}{20000}\\right)^{20000}}-\\frac{3678}{10000}', 1],
		['1.0001^{30000}-20', 1],
		['\\left(\\frac{2}{3}\\right)^{60000}', 1]
	])('%s : signe %s', (latex, expected) => {
		expect(sign(latex)).toBe(expected);
	});

	it('une égalité exacte entre deux points', () => {
		const a = enclosure(parseLatex('2^{10}'))!;
		const b = enclosure(parseLatex('1024'))!;
		expect(compareEnclosures(a, b)).toBe(0);
	});

	it('ce qui ne s’encadre pas', () => {
		for (const latex of ['\\pi', 'x+1', '\\sqrt{2}', '\\frac{1}{0}', '2^{\\frac{1}{2}}']) {
			expect(enclosure(parseLatex(latex))).toBeNull();
		}
	});

	it('vite, même pour de grands exposants', () => {
		const start = performance.now();
		sign('\\left(1+\\frac{1}{100000}\\right)^{100000000}-3');
		expect(performance.now() - start).toBeLessThan(100);
	});

	// Rigueur : pour E de valeur exacte v (fractions BigInt), l'encadrement de E − v contient 0
	it('200 expressions aléatoires : l’encadrement de E − v contient toujours 0', () => {
		let seed = 12345;
		const next = (max: number) => {
			seed = (seed * 1103515245 + 12345) % 2 ** 31;
			return seed % max;
		};
		const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
		for (let i = 0; i < 200; i++) {
			const [a, b, c, d] = [next(50) + 1, next(50) + 1, next(50) + 1, next(50) + 1].map(BigInt);
			const k = next(200) + 2;
			const sign = next(2) === 0 ? 1n : -1n;
			// (a/b)^k ± c/d
			const n = a ** BigInt(k) * d + sign * c * b ** BigInt(k);
			const den = b ** BigInt(k) * d;
			const g = gcd(n, den);
			const latex = `\\left(\\frac{${a}}{${b}}\\right)^{${k}}${sign > 0n ? '+' : '-'}\\frac{${c}}{${d}}-\\frac{${n / g}}{${den / g}}`;
			const box = enclosure(parseLatex(latex));
			expect(box).not.toBeNull();
			expect([0, null]).toContain(compareEnclosures(box!, enclosure(parseLatex('0'))!));
		}
	});
});
