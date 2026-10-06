/**
 * `order` : le degré maximal du développement (convention des développements
 * limités), décision de David du 2026-10-06 — plus un nombre de termes.
 */

import { describe, it, expect } from 'vitest';
import { taylorExpand, maclaurin, TaylorError, MAX_TAYLOR_ORDER } from '../index';
import { parse } from '../../cli/core/pipeline';
import { toCustom } from '../../custom-generator';
import type { MathNode } from '../../types';

function ast(input: string): MathNode {
	const parsed = parse(input);
	if (parsed.ast === undefined || parsed.ast === null) throw new Error(`illisible : ${input}`);
	return parsed.ast;
}

function expand(input: string, order: number, center = 0, variable = 'x'): string {
	return toCustom(taylorExpand(ast(input), { variable, center, order }));
}

describe('taylorExpand : order = degré maximal', () => {
	it.each([
		['e^x', 4, 0, 'x', '1+x+{1/2}x^2+{1/6}x^3+{1/24}x^4'],
		['sin(x)', 5, 0, 'x', 'x-{1/6}x^3+{1/120}x^5'],
		['cos(x)', 4, 0, 'x', '1-{1/2}x^2+{1/24}x^4'],
		['e^x', 0, 0, 'x', '1'],
		['ln(x)', 2, 1, 'x', '(x-1)-{1/2}(x-1)^2'],
		['a x^2', 2, 0, 'x', 'ax^2'],
		['e^t', 2, 0, 't', '1+t+{1/2}t^2']
	])('%s, ordre %i en %d (variable %s) → %s', (input, order, center, variable, expected) => {
		expect(expand(input, order, center, variable)).toBe(expected);
	});

	it('maclaurin prend un ordre (4 par défaut)', () => {
		expect(toCustom(maclaurin(ast('sin(x)'), 5))).toBe('x-{1/6}x^3+{1/120}x^5');
		expect(toCustom(maclaurin(ast('e^x')))).toBe('1+x+{1/2}x^2+{1/6}x^3+{1/24}x^4');
	});

	it('limite : ordre 19 accepté, 20 refusé (20 termes au plus, comme avant)', () => {
		expect(MAX_TAYLOR_ORDER).toBe(19);
		expect(() => taylorExpand(ast('e^x'), { order: 19 })).not.toThrow();
		expect(() => taylorExpand(ast('e^x'), { order: 20 })).toThrow(TaylorError);
	});

	it('ordre négatif ou non entier : refusé', () => {
		expect(() => taylorExpand(ast('e^x'), { order: -1 })).toThrow(TaylorError);
		expect(() => taylorExpand(ast('e^x'), { order: 1.5 })).toThrow(TaylorError);
	});
});

/**
 * Découpe un développement rendu (`toCustom`) en coefficients par degré.
 * Un `+`/`-` sépare deux termes hors parenthèses et hors exposant décimal
 * (`1.8e-7`).
 */
function renderedCoefficients(rendered: string): Map<number, number> {
	const terms: string[] = [];
	let depth = 0;
	let current = '';
	for (let i = 0; i < rendered.length; i++) {
		const ch = rendered[i];
		if (ch === '(') depth++;
		if (ch === ')') depth--;
		const isSeparator =
			(ch === '+' || ch === '-') && depth === 0 && current !== '' && !/\de$/.test(current);
		if (isSeparator) {
			terms.push(current);
			current = '';
		}
		current += ch;
	}
	terms.push(current);

	const coefficients = new Map<number, number>();
	for (const term of terms) {
		const m =
			/^([+-]?)(?:\{(\d+)\/(\d+)\}|(\d+(?:\.\d+)?(?:e[+-]?\d+)?))?(\(x-1\)|x)?(?:\^(\d+))?$/.exec(
				term
			);
		if (m === null) throw new Error(`terme illisible : ${term}`);
		const [, sign, num, den, decimal, base, exponent] = m;
		const magnitude =
			num !== undefined ? Number(num) / Number(den) : decimal !== undefined ? Number(decimal) : 1;
		const degree = base === undefined ? 0 : exponent === undefined ? 1 : Number(exponent);
		coefficients.set(degree, sign === '-' ? -magnitude : magnitude);
	}
	return coefficients;
}

function factorialNumber(n: number): number {
	let result = 1;
	for (let i = 2; i <= n; i++) result *= i;
	return result;
}

describe('taylorExpand : chaque coefficient rendu vaut f⁽ⁿ⁾(a)/n!', () => {
	// f(x) = sign·e^(k x), f⁽ⁿ⁾(a)/n! = sign·kⁿ·e^(k a)/n!
	it.each([
		['e^(3x)', 3, 1, 19, 1],
		['-e^(4x)', 4, -1, 12, 1],
		['e^(2x)', 2, 1, 19, 1],
		['e^(3x)', 3, 1, 19, 0]
	])('%s (k=%i, signe %i), ordre %i en %d', (input, k, sign, order, center) => {
		const coefficients = renderedCoefficients(expand(input, order, center));
		expect(coefficients.size).toBe(order + 1);
		for (let n = 0; n <= order; n++) {
			const expected = (sign * k ** n * Math.exp(k * center)) / factorialNumber(n);
			const actual = coefficients.get(n);
			expect(actual, `degré ${n}`).toBeDefined();
			expect(
				Math.abs((actual as number) - expected) / Math.abs(expected),
				`degré ${n}`
			).toBeLessThan(1e-9);
		}
	});

	it('pas de fraction exacte inventée pour un coefficient irrationnel (e³·3¹¹/11!)', () => {
		expect(expand('e^(3x)', 19, 1)).not.toMatch(/\{/);
		expect(expand('-e^(4x)', 12, 1)).not.toMatch(/\{/);
	});

	it('un coefficient en notation scientifique garde son exposant', () => {
		// e²·2¹⁸/18! ≈ 3,025e-10
		expect(expand('e^(2x)', 19, 1)).toContain('3.02543527e-10(x-1)^18');
	});

	it('non-régression : fractions exactes conservées', () => {
		expect(expand('sin(x)', 5)).toBe('x-{1/6}x^3+{1/120}x^5');
		expect(expand('e^x', 19)).toContain('{1/121645100408832000}x^19');
		expect(expand('e^(3x)', 19)).toContain('{177147/18540634112000}x^19');
	});
});
