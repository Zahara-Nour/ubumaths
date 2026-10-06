/**
 * Primitives fausses révélées par l'oracle (familles 1 à 7) : tests de VALEUR.
 *
 * Chaque primitive est vérifiée par F′ ≈ f (différence centrée), avec des
 * coefficients ≠ 1 — la classe d'erreur visée est le facteur 1/a oublié.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { integrate, integrateDefinite } from '..';
import { toLatex } from '../../latex-generator';
import { compile } from '../../eval/compile';
import type { MathNode } from '../../types';

// =============================================================================
// Helpers
// =============================================================================

const H = 1e-5;

/** F′ ≈ f aux points donnés (différence centrée) */
function expectDerivativeMatches(
	F: MathNode,
	integrandLatex: string,
	points: readonly number[],
	variable = 'x',
	params: Record<string, number> = {}
): void {
	const Fc = compile(F);
	const fc = compile(parseLatex(integrandLatex));
	for (const p of points) {
		const at = (v: number) => ({ ...params, [variable]: v });
		const derivative = (Fc(at(p + H)) - Fc(at(p - H))) / (2 * H);
		const expected = fc(at(p));
		expect(
			Math.abs(derivative - expected),
			`F′(${p}) = ${derivative} ≠ f(${p}) = ${expected}`
		).toBeLessThan(1e-4 * Math.max(1, Math.abs(expected)));
	}
}

function primitiveOf(latex: string, variable = 'x'): MathNode {
	const result = integrate(parseLatex(latex), { variable });
	expect(result.status).toBe('exact');
	expect(result.antiderivative).not.toBeNull();
	return result.antiderivative!;
}

// =============================================================================
// Famille 1 : ∫ trig(ax+b) dx = F(ax+b)/a
// =============================================================================

describe('famille 1 — facteur 1/a pour sin/cos(ax+b)', () => {
	it.each([
		['\\sin(2x)'],
		['\\cos(3x)'],
		['\\sin(2x+1)'],
		['-2\\sin(4x-1)'],
		['5\\cos(2x)-\\sin(x)']
	])('∫ %s', (latex) => {
		expectDerivativeMatches(primitiveOf(latex), latex, [-2.7, -0.4, 0.9, 2.3]);
	});

	it('∫ sin(3t) dt = −cos(3t)/3', () => {
		expectDerivativeMatches(primitiveOf('\\sin(3t)', 't'), '\\sin(3t)', [-2.7, 0.9], 't');
	});

	it('∫₀^{π/2} sin(2x) dx = 1 (et non 2)', () => {
		const result = integrateDefinite(
			parseLatex('\\sin(2x)'),
			parseLatex('0'),
			parseLatex('\\frac{\\pi}{2}'),
			{ variable: 'x' }
		);
		expect(result.value).not.toBeNull();
		expect(toLatex(result.value!)).toBe('1');
	});
});

// =============================================================================
// Famille 2 : u′ constant dans le changement de variable
// =============================================================================

describe('famille 2 — u′ = a constant : facteur 1/a', () => {
	it.each([['(3x-1)^3'], ['\\exponentialE^{3x+1}'], ['\\ln(2x)']])('∫ %s', (latex) => {
		expectDerivativeMatches(primitiveOf(latex), latex, [0.3, 0.9, 2.3]);
	});
});

// =============================================================================
// Famille 3 : (ax+b)^p, racines
// =============================================================================

describe('famille 3 — (ax+b)^p et racines : coefficient et exposant calculés', () => {
	it.each([
		['\\sqrt{2x+3}'],
		['3\\sqrt{4x+12}'],
		['(2x+6)^{\\frac{1}{2}}'],
		['(3x+9)^{\\frac{3}{2}}'],
		['\\sqrt[3]{2x+1}']
	])('∫ %s', (latex) => {
		const F = primitiveOf(latex);
		expect(toLatex(F)).not.toContain('+ 1}');
		expectDerivativeMatches(F, latex, [-0.45, 0.4, 1.7]);
	});

	it('∫ x^{0.5} garde un exposant décimal calculé', () => {
		expect(toLatex(primitiveOf('x^{0.5}'))).toBe('\\dfrac{2}{3} x^{1.5}');
	});
});

// =============================================================================
// Famille 4 : primitive rendue égale à 0
// =============================================================================

describe('famille 4 — ln au lieu de 0', () => {
	it('∫ x^{-1} dx = ln|x|', () => {
		expect(toLatex(primitiveOf('x^{-1}'))).toBe('\\ln\\left( \\left| x \\right| \\right)');
	});

	it('∫ a/(x−b) dx = a ln|x−b|', () => {
		expectDerivativeMatches(
			primitiveOf('\\frac{a}{x-b}'),
			'\\frac{a}{x-b}',
			[-2.7, 0.4, 3.1],
			'x',
			{
				a: 2.5,
				b: -1.5
			}
		);
	});
});

// =============================================================================
// Famille 5 : 1/e^u, ln(ax)
// =============================================================================

describe('famille 5 — 1/e^u et ln(ax)', () => {
	it('∫ 1/eˣ (lettre e) n’est plus ln|eˣ|', () => {
		const result = integrate(parseLatex('\\frac{1}{e^{x}}'), { variable: 'x' });
		if (result.status === 'exact') {
			expectDerivativeMatches(result.antiderivative!, '\\frac{1}{e^{x}}', [-1.3, 0.7]);
		} else {
			expect(result.status).toBe('unsupported');
		}
	});

	it('∫ 1/\\exponentialE^{2x} = −e^{−2x}/2', () => {
		const latex = '\\frac{3}{\\exponentialE^{2x}}';
		expectDerivativeMatches(primitiveOf(latex), latex, [-1.3, 0.7]);
	});
});

// =============================================================================
// Famille 6 : coefficients rationnels exacts
// =============================================================================

describe('famille 6 — coefficients rationnels exacts, jamais issus de flottants', () => {
	it.each([
		['\\frac{5}{3x}'],
		['\\frac{1}{3x-1}'],
		['\\frac{x^2}{x^3+1}'],
		['\\frac{1}{(3x+2)^3}']
	])('∫ %s', (latex) => {
		const F = primitiveOf(latex);
		expect(toLatex(F)).not.toMatch(/\d{8,}/);
		expectDerivativeMatches(F, latex, [0.4, 1.7, 3.1]);
	});

	it('∫ 1/(3x−1) = (1/3) ln|3x−1|', () => {
		expect(toLatex(primitiveOf('\\frac{1}{3x-1}'))).toBe(
			'\\dfrac{1}{3} \\ln\\left( \\left| 3 x - 1 \\right| \\right)'
		);
	});
});

// =============================================================================
// Famille 7 : intégrales définies
// =============================================================================

describe('famille 7 — intégrales définies', () => {
	it.each([['\\frac{1}{x}'], ['\\ln(x)']])('∫₁ᵉ %s dx = 1 (borne e lue comme Euler)', (latex) => {
		const result = integrateDefinite(parseLatex(latex), parseLatex('1'), parseLatex('e'), {
			variable: 'x'
		});
		expect(result.value).not.toBeNull();
		expect(toLatex(result.value!)).toBe('1');
	});

	it('bornes littérales : valeur symbolique, jamais « exact » sans valeur', () => {
		const result = integrateDefinite(parseLatex('x^2'), parseLatex('0'), parseLatex('a'), {
			variable: 'x'
		});
		expect(result.status).toBe('exact');
		expect(result.value).not.toBeNull();
		expect(compile(result.value!)({ a: 3 })).toBeCloseTo(9);
	});

	it('primitive littérale : ∫₀² ax dx = 2a', () => {
		const result = integrateDefinite(parseLatex('ax'), parseLatex('0'), parseLatex('2'), {
			variable: 'x'
		});
		expect(result.value).not.toBeNull();
		expect(compile(result.value!)({ a: 1.5 })).toBeCloseTo(3);
	});
});
