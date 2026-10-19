/**
 * Tests for quartic polynomial solving in preimage computation
 */

import { describe, it, expect } from 'vitest';
import { classifyExpression, findZeros, solveQuarticInequality } from '../preimage';
import { containsValue } from '../algebra';
import { power, variable, add, subtract, implicitMultiply, number } from '../../factory';
import { parseLatex } from '../../parser';

describe('quartic expression classification', () => {
	it('classifies x⁴ as quartic', () => {
		const x = variable('x');
		const x4 = power(x, number('4'));
		const result = classifyExpression(x4, 'x');

		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(0);
			expect(result.c).toBe(0);
			expect(result.d).toBe(0);
			expect(result.e).toBe(0);
		}
	});

	it('classifies (x+1)⁴ correctly', () => {
		const x = variable('x');
		const xPlus1 = add(x, number('1'));
		const fourth = power(xPlus1, number('4'));
		const result = classifyExpression(fourth, 'x');

		// (x+1)⁴ = x⁴ + 4x³ + 6x² + 4x + 1
		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(4);
			expect(result.c).toBe(6);
			expect(result.d).toBe(4);
			expect(result.e).toBe(1);
		}
	});

	it('classifies (2x-1)⁴ correctly', () => {
		const x = variable('x');
		const twoX = implicitMultiply(number('2'), x);
		const twoXMinus1 = subtract(twoX, number('1'));
		const fourth = power(twoXMinus1, number('4'));
		const result = classifyExpression(fourth, 'x');

		// (2x-1)⁴ = 16x⁴ - 32x³ + 24x² - 8x + 1
		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(16);
			expect(result.b).toBe(-32);
			expect(result.c).toBe(24);
			expect(result.d).toBe(-8);
			expect(result.e).toBe(1);
		}
	});

	it('classifies x⁴ + x² correctly', () => {
		const x = variable('x');
		const x4 = power(x, number('4'));
		const x2 = power(x, number('2'));
		const expr = add(x4, x2);
		const result = classifyExpression(expr, 'x');

		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(0);
			expect(result.c).toBe(1);
			expect(result.d).toBe(0);
			expect(result.e).toBe(0);
		}
	});

	it('classifies (x²)² as quartic', () => {
		const x = variable('x');
		const x2 = power(x, number('2'));
		const x4 = power(x2, number('2'));
		const result = classifyExpression(x4, 'x');

		// (x²)² = x⁴
		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(0);
			expect(result.c).toBe(0);
			expect(result.d).toBe(0);
			expect(result.e).toBe(0);
		}
	});

	it('classifies (x²+1)² correctly', () => {
		const x = variable('x');
		const x2 = power(x, number('2'));
		const x2Plus1 = add(x2, number('1'));
		const squared = power(x2Plus1, number('2'));
		const result = classifyExpression(squared, 'x');

		// (x²+1)² = x⁴ + 2x² + 1
		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(0);
			expect(result.c).toBe(2);
			expect(result.d).toBe(0);
			expect(result.e).toBe(1);
		}
	});

	it('classifies x(x+1)(x-1)(x+2) as quartic via multiplication', () => {
		const x = variable('x');
		// x * (x+1) = x² + x
		const xTimesXPlus1 = implicitMultiply(x, add(x, number('1')));
		// (x-1) * (x+2) = x² + x - 2
		const xMinus1TimesXPlus2 = implicitMultiply(subtract(x, number('1')), add(x, number('2')));
		// Product: (x² + x)(x² + x - 2) = x⁴ + 2x³ - x² - 2x
		const expr = implicitMultiply(xTimesXPlus1, xMinus1TimesXPlus2);
		const result = classifyExpression(expr, 'x');

		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(2);
			expect(result.c).toBe(-1);
			expect(result.d).toBe(-2);
			expect(Math.abs(result.e)).toBeLessThan(1e-10); // Allow -0 or +0
		}
	});

	it('classifies (x+1)(x³) as quartic', () => {
		const x = variable('x');
		const xPlus1 = add(x, number('1'));
		const x3 = power(x, number('3'));
		const expr = implicitMultiply(xPlus1, x3);
		const result = classifyExpression(expr, 'x');

		// (x+1) * x³ = x⁴ + x³
		expect(result.kind).toBe('quartic');
		if (result.kind === 'quartic') {
			expect(result.a).toBe(1);
			expect(result.b).toBe(1);
			expect(result.c).toBe(0);
			expect(result.d).toBe(0);
			expect(result.e).toBe(0);
		}
	});
});

describe('findZeros for quartic expressions', () => {
	it('finds zeros of x⁴ = 0', () => {
		const x = variable('x');
		const x4 = power(x, number('4'));
		const zeros = findZeros(x4, 'x');

		expect(zeros).toHaveLength(1);
		expect(zeros[0]).toBeCloseTo(0, 8);
	});

	it('finds zeros of x⁴ - 1 = 0 (roots: ±1)', () => {
		const x = variable('x');
		const x4 = power(x, number('4'));
		const expr = subtract(x4, number('1'));
		const zeros = findZeros(expr, 'x');

		// Real roots are x = ±1 (the other two are complex: ±i)
		expect(zeros).toHaveLength(2);
		const sortedZeros = [...zeros].sort((a, b) => a - b);
		expect(sortedZeros[0]).toBeCloseTo(-1, 6);
		expect(sortedZeros[1]).toBeCloseTo(1, 6);
	});

	it('finds zeros of x⁴ - 5x² + 4 = 0 (roots: ±1, ±2)', () => {
		// x⁴ - 5x² + 4 = (x² - 1)(x² - 4) = (x-1)(x+1)(x-2)(x+2)
		const x = variable('x');
		const x4 = power(x, number('4'));
		const x2 = power(x, number('2'));
		const fiveX2 = implicitMultiply(number('5'), x2);
		const expr = add(subtract(x4, fiveX2), number('4'));
		const zeros = findZeros(expr, 'x');

		expect(zeros).toHaveLength(4);
		const sortedZeros = [...zeros].sort((a, b) => a - b);
		expect(sortedZeros[0]).toBeCloseTo(-2, 6);
		expect(sortedZeros[1]).toBeCloseTo(-1, 6);
		expect(sortedZeros[2]).toBeCloseTo(1, 6);
		expect(sortedZeros[3]).toBeCloseTo(2, 6);
	});

	it('finds zero of (x-1)⁴ = 0 (quadruple root)', () => {
		const x = variable('x');
		const xMinus1 = subtract(x, number('1'));
		const expr = power(xMinus1, number('4'));
		const zeros = findZeros(expr, 'x');

		expect(zeros.length).toBeGreaterThanOrEqual(1);
		expect(zeros[0]).toBeCloseTo(1, 6);
	});

	it('finds zeros of x⁴ + 1 = 0 (no real roots)', () => {
		const x = variable('x');
		const x4 = power(x, number('4'));
		const expr = add(x4, number('1'));
		const zeros = findZeros(expr, 'x');

		// All roots are complex (±(1±i)/√2)
		expect(zeros).toHaveLength(0);
	});

	it('finds zeros of x⁴ - 16 = 0 (roots: ±2)', () => {
		const x = variable('x');
		const x4 = power(x, number('4'));
		const expr = subtract(x4, number('16'));
		const zeros = findZeros(expr, 'x');

		expect(zeros).toHaveLength(2);
		const sortedZeros = [...zeros].sort((a, b) => a - b);
		expect(sortedZeros[0]).toBeCloseTo(-2, 6);
		expect(sortedZeros[1]).toBeCloseTo(2, 6);
	});

	it('finds zeros of (x² - 1)(x² - 4) = 0', () => {
		const x = variable('x');
		const x2 = power(x, number('2'));
		const x2Minus1 = subtract(x2, number('1'));
		const x2Minus4 = subtract(x2, number('4'));
		const expr = implicitMultiply(x2Minus1, x2Minus4);
		const zeros = findZeros(expr, 'x');

		expect(zeros).toHaveLength(4);
		const sortedZeros = [...zeros].sort((a, b) => a - b);
		expect(sortedZeros[0]).toBeCloseTo(-2, 6);
		expect(sortedZeros[1]).toBeCloseTo(-1, 6);
		expect(sortedZeros[2]).toBeCloseTo(1, 6);
		expect(sortedZeros[3]).toBeCloseTo(2, 6);
	});
});

describe('findZeros : quartique de Ferrari (B ≠ 0 une fois dépréciée)', () => {
	// Les cas ci-dessus sont bicarrés (B = 0) : ils ne passaient pas par la
	// factorisation de Ferrari, fausse jusqu'ici (m de Ferrari confondu avec m/2).
	it('x⁴ + x³ − 7x² − x + 6 : zéros −3, −1, 1, 2', () => {
		const zeros = findZeros(parseLatex('x^4+x^3-7x^2-x+6'), 'x').sort((a, b) => a - b);
		expect(zeros.map((z) => Math.round(z * 1e6) / 1e6)).toEqual([-3, -1, 1, 2]);
	});

	it('5x⁴ + 16x³ + 3x² − 20x − 4 : zéros −2, −1/5, 1', () => {
		const zeros = findZeros(parseLatex('5x^4+16x^3+3x^2-20x-4'), 'x').sort((a, b) => a - b);
		expect(zeros.map((z) => Math.round(z * 1e6) / 1e6)).toEqual([-2, -0.2, 1]);
	});
});

/** Générateur pseudo-aléatoire à graine fixe (LCG de Numerical Recipes). */
function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
		return state / 2 ** 32;
	};
}

/**
 * Quartiques à racines connues (entiers et demis de [−5 ; 5]) : quatre
 * simples, une double et deux simples, deux doubles, une double et un facteur
 * x² + 1 sans racine réelle. Coefficients développés, coefficient dominant ≠ 1.
 */
function quarticsWithKnownRoots(count: number): { coefficients: number[]; roots: number[] }[] {
	const random = seededRandom(20261019);
	const pick = () => Math.round(random() * 20 - 10) / 2;
	const cases: { coefficients: number[]; roots: number[] }[] = [];
	while (cases.length < count) {
		const shape = cases.length % 6;
		// Grande amplitude (jusqu'à ±2·10⁴) un lot sur deux : le bruit de calcul
		// doit suivre la borne de Horner, pas Σ|coefficients|·|x|⁴
		const magnitude = [1, 1000, 1, 4000][Math.floor(cases.length / 24) % 4];
		const [r1, r2, r3, r4] = [pick(), pick(), pick(), pick()].map((r) => r * magnitude);
		// Racines proches : écart de 1e-3 à 3e-3 (fusionnées à tort par une
		// tolérance sur le discriminant)
		const close = r1 + ((1 + Math.floor(random() * 3)) / 1000) * Math.max(1, Math.abs(r1));
		const factors: number[][] = [
			[
				[1, -r1],
				[1, -r2],
				[1, -r3],
				[1, -r4]
			],
			[
				[1, -r1],
				[1, -r1],
				[1, -r2],
				[1, -r3]
			],
			[
				[1, -r1],
				[1, -r1],
				[1, -r2],
				[1, -r2]
			],
			[
				[1, -r1],
				[1, -r1],
				[1, 0, 1]
			],
			[
				[1, -r1],
				[1, -r1],
				[1, -r1],
				[1, -r2]
			],
			[
				[1, -r1],
				[1, -close],
				[1, 0, 1]
			]
		][shape];
		const lead = [2, 3, -2, 4][Math.floor(cases.length / 6) % 4];
		const coefficients = factors.reduce(
			(acc, f) => {
				const out: number[] = Array.from({ length: acc.length + f.length - 1 }, () => 0);
				acc.forEach((a, i) => f.forEach((b, j) => (out[i + j] += a * b)));
				return out;
			},
			[lead]
		);
		const real = [[r1, r2, r3, r4], [r1, r2, r3], [r1, r2], [r1], [r1, r2], [r1, close]][shape];
		cases.push({
			coefficients,
			roots: [...new Set(real)].sort((a, b) => a - b)
		});
	}
	return cases;
}

describe('findZeros : racine double à côté de racines simples', () => {
	// La factorisation de Ferrari n'a que ~1e-8 de précision sur une racine
	// double : le discriminant du facteur du second degré sort légèrement
	// négatif, et la racine disparaissait.
	it('3x⁴ − 11x³ − 2x² + 44x − 40 = 3(x + 2)(x − 5/3)(x − 2)² : zéros −2, 5/3, 2', () => {
		const zeros = findZeros(parseLatex('3x^4-11x^3-2x^2+44x-40'), 'x').sort((a, b) => a - b);
		expect(zeros.map((z) => Math.round(z * 1e6) / 1e6)).toEqual([-2, 1.666667, 2]);
	});

	it('4x⁴ + 6x³ − 19x² − 43,5x − 22,5 : zéros −1,5 (double), −1, 2,5', () => {
		const zeros = findZeros(parseLatex('4x^4+6x^3-19x^2-43.5x-22.5'), 'x').sort((a, b) => a - b);
		expect(zeros.map((z) => Math.round(z * 1e6) / 1e6)).toEqual([-1.5, -1, 2.5]);
	});

	it('2(x − 3)(x − 3,002)(x² + 1) : deux zéros proches, pas aucun', () => {
		const zeros = findZeros(parseLatex('2x^4-12.004x^3+20.012x^2-12.004x+18.012'), 'x');
		expect(zeros.map((z) => Math.round(z * 1e6) / 1e6).sort((a, b) => a - b)).toEqual([3, 3.002]);
	});

	it('(x − 10)(x − 10,001)(x² + 1) : deux zéros, pas une racine double en 10,0005', () => {
		const zeros = findZeros(parseLatex('x^4-20.001x^3+101.01x^2-20.001x+100.01'), 'x');
		expect(zeros.map((z) => Math.round(z * 1e6) / 1e6).sort((a, b) => a - b)).toEqual([10, 10.001]);
	});

	it('(3x − 5)³(x + 1) : racine triple 5/3 rendue une seule fois', () => {
		const zeros = findZeros(parseLatex('27x^4-108x^3+90x^2+100x-125'), 'x');
		expect(zeros.map((z) => Math.round(z * 1e4) / 1e4).sort((a, b) => a - b)).toEqual([-1, 1.6667]);
	});

	it('(x − 3)(x − 5000)(x − 10000)(x + 20000) : quatre zéros, pas de racine fausse en 7500', () => {
		// x⁴ + 4997x³ − 250015000x² + 1000750000000x − 3000000000000
		const zeros = findZeros(
			parseLatex('x^4+4997x^3-250015000x^2+1000750000000x-3000000000000'),
			'x'
		).sort((a, b) => a - b);
		expect(sameRoots(zeros, [-20000, 3, 5000, 10000])).toBe(true);
	});

	it('(x − 1)(x − 10)(x − 1000)(x − 1001) : 1000 et 1001, pas 1000,5', () => {
		// x⁴ − 2012x³ + 1023021x² − 11031010x + 10010000
		const zeros = findZeros(parseLatex('x^4-2012x^3+1023021x^2-11031010x+10010000'), 'x').sort(
			(a, b) => a - b
		);
		expect(sameRoots(zeros, [1, 10, 1000, 1001])).toBe(true);
	});

	it('200 quartiques tirées (graine fixe) : toutes les racines réelles, aucune de trop', () => {
		const wrong: string[] = [];
		for (const { coefficients, roots } of quarticsWithKnownRoots(200)) {
			const [a, b, c, d, e] = coefficients;
			const latex = `${a}x^4+${b}x^3+${c}x^2+${d}x+${e}`.replace(/\+-/g, '-');
			const zeros = findZeros(parseLatex(latex), 'x').sort((p, q) => p - q);
			if (!sameRoots(zeros, roots)) {
				wrong.push(`${latex} : ${zeros.join(' ; ')} au lieu de ${roots.join(' ; ')}`);
			}
		}
		expect(wrong).toEqual([]);
	});
});

describe('solveQuarticInequality', () => {
	describe('no real roots cases', () => {
		it('solves x⁴ + 1 >= 0 (always true)', () => {
			const domain = solveQuarticInequality(1, 0, 0, 0, 1, '>=', 0, false, 'x');
			// x⁴ + 1 > 0 for all x
			expect(domain.kind).toBe('universal');
		});

		it('solves x⁴ + 1 <= 0 (never true)', () => {
			const domain = solveQuarticInequality(1, 0, 0, 0, 1, '<=', 0, false, 'x');
			// x⁴ + 1 > 0 for all x, never <= 0
			expect(domain.kind).toBe('empty');
		});

		it('solves -x⁴ - 1 >= 0 (never true)', () => {
			const domain = solveQuarticInequality(-1, 0, 0, 0, -1, '>=', 0, false, 'x');
			// -x⁴ - 1 < 0 for all x
			expect(domain.kind).toBe('empty');
		});

		it('solves -x⁴ - 1 <= 0 (always true)', () => {
			const domain = solveQuarticInequality(-1, 0, 0, 0, -1, '<=', 0, false, 'x');
			// -x⁴ - 1 < 0 for all x
			expect(domain.kind).toBe('universal');
		});
	});

	describe('two roots cases (x⁴ - 1)', () => {
		it('solves x⁴ - 1 >= 0 (|x| >= 1)', () => {
			const domain = solveQuarticInequality(1, 0, 0, 0, -1, '>=', 0, false, 'x');
			// x⁴ - 1 >= 0 when |x| >= 1
			expect(containsValue(domain, -2)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(true);
			expect(containsValue(domain, 0)).toBe(false);
			expect(containsValue(domain, 0.5)).toBe(false);
			expect(containsValue(domain, -0.5)).toBe(false);
		});

		it('solves x⁴ - 1 <= 0 (|x| <= 1)', () => {
			const domain = solveQuarticInequality(1, 0, 0, 0, -1, '<=', 0, false, 'x');
			// x⁴ - 1 <= 0 when |x| <= 1
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, 0.5)).toBe(true);
			expect(containsValue(domain, -0.5)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(false);
			expect(containsValue(domain, -2)).toBe(false);
		});

		it('solves x⁴ - 1 > 0 (strict)', () => {
			const domain = solveQuarticInequality(1, 0, 0, 0, -1, '>=', 0, true, 'x');
			// x⁴ - 1 > 0 when |x| > 1
			expect(containsValue(domain, 1)).toBe(false);
			expect(containsValue(domain, -1)).toBe(false);
			expect(containsValue(domain, 2)).toBe(true);
			expect(containsValue(domain, -2)).toBe(true);
		});
	});

	describe('four roots cases (x⁴ - 5x² + 4)', () => {
		it('solves x⁴ - 5x² + 4 >= 0 (|x| <= 1 or |x| >= 2)', () => {
			// x⁴ - 5x² + 4 = (x² - 1)(x² - 4) = (x-1)(x+1)(x-2)(x+2)
			// >= 0 when x <= -2 or -1 <= x <= 1 or x >= 2
			const domain = solveQuarticInequality(1, 0, -5, 0, 4, '>=', 0, false, 'x');

			expect(containsValue(domain, -3)).toBe(true);
			expect(containsValue(domain, -2)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(true);
			expect(containsValue(domain, 3)).toBe(true);

			expect(containsValue(domain, -1.5)).toBe(false);
			expect(containsValue(domain, 1.5)).toBe(false);
		});

		it('solves x⁴ - 5x² + 4 <= 0 (-2 <= x <= -1 or 1 <= x <= 2)', () => {
			const domain = solveQuarticInequality(1, 0, -5, 0, 4, '<=', 0, false, 'x');

			expect(containsValue(domain, -2)).toBe(true);
			expect(containsValue(domain, -1.5)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, 1.5)).toBe(true);
			expect(containsValue(domain, 2)).toBe(true);

			expect(containsValue(domain, 0)).toBe(false);
			expect(containsValue(domain, -3)).toBe(false);
			expect(containsValue(domain, 3)).toBe(false);
		});
	});

	describe('with non-zero bounds', () => {
		it('solves x⁴ >= 1', () => {
			const domain = solveQuarticInequality(1, 0, 0, 0, 0, '>=', 1, false, 'x');
			// x⁴ >= 1 when |x| >= 1
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(true);
			expect(containsValue(domain, 0)).toBe(false);
		});

		it('solves x⁴ <= 16', () => {
			const domain = solveQuarticInequality(1, 0, 0, 0, 0, '<=', 16, false, 'x');
			// x⁴ <= 16 when |x| <= 2
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(true);
			expect(containsValue(domain, -2)).toBe(true);
			expect(containsValue(domain, 3)).toBe(false);
			expect(containsValue(domain, -3)).toBe(false);
		});
	});

	describe('negative leading coefficient', () => {
		it('solves -x⁴ + 1 >= 0 (|x| <= 1)', () => {
			const domain = solveQuarticInequality(-1, 0, 0, 0, 1, '>=', 0, false, 'x');
			// -x⁴ + 1 >= 0 when x⁴ <= 1, i.e., |x| <= 1
			expect(containsValue(domain, 0)).toBe(true);
			expect(containsValue(domain, 0.5)).toBe(true);
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(false);
			expect(containsValue(domain, -2)).toBe(false);
		});

		it('solves -x⁴ + 1 <= 0 (|x| >= 1)', () => {
			const domain = solveQuarticInequality(-1, 0, 0, 0, 1, '<=', 0, false, 'x');
			// -x⁴ + 1 <= 0 when x⁴ >= 1, i.e., |x| >= 1
			expect(containsValue(domain, 1)).toBe(true);
			expect(containsValue(domain, -1)).toBe(true);
			expect(containsValue(domain, 2)).toBe(true);
			expect(containsValue(domain, 0)).toBe(false);
		});
	});
});

/** Mêmes racines, à 1e-6 près en valeur relative. */
function sameRoots(found: readonly number[], expected: readonly number[]): boolean {
	return (
		found.length === expected.length &&
		found.every((r, i) => Math.abs(r - expected[i]) <= 1e-6 * Math.max(1, Math.abs(expected[i])))
	);
}
