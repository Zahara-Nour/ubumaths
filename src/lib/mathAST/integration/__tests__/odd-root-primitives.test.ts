/**
 * Primitives d'une racine d'indice IMPAIR (décision du 2026-10-07) : ⁿ√a est
 * définie sur ℝ (∛(−8) = −2), `a^{p/n}` seulement pour a > 0. La primitive de
 * ∛(2x+1) doit donc s'écrire en racines (⅜(2x+1)∛(2x+1)) et non en
 * (2x+1)^{4/3}, non définie pour x < −1/2. Indices pairs : inchangés.
 *
 * Tests de VALEUR aux points où u < 0 (F′ = f par différence finie) et de FORME.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { compile } from '../../eval/compile';
import { integrate, integrateDefinite } from '../integrate';
import { oddPowersAsRoots, oddRootsAsPowers } from '../odd-roots';

// =============================================================================
// Outils
// =============================================================================

function antiderivativeOf(latex: string) {
	const result = integrate(parseLatex(latex), { variable: 'x' });
	expect(result.status).toBe('exact');
	return result.antiderivative!;
}

/** F′(x) par différence finie centrée, comparée à f(x) en chaque point */
function expectDerivativeEqualsIntegrand(latex: string, points: readonly number[]): void {
	const F = compile(antiderivativeOf(latex));
	const f = compile(parseLatex(latex));
	for (const x of points) {
		const fx = f({ x });
		expect(Number.isFinite(fx), `f(${x}) définie`).toBe(true);
		const h = 1e-5 * Math.max(1, Math.abs(x));
		const slope = (F({ x: x + h }) - F({ x: x - h })) / (2 * h);
		expect(Math.abs(slope - fx), `F′(${x}) = ${slope}, f(${x}) = ${fx}`).toBeLessThan(
			1e-5 * Math.max(1, Math.abs(fx))
		);
	}
}

// =============================================================================
// Tests
// =============================================================================

describe('racine impaire : F′ = f là où le radicande est négatif', () => {
	it.each([
		['\\sqrt[3]{2x+1}', [-4.2, -1.3, -0.7, 0.4, 2.5]],
		['\\sqrt[3]{2x-5}', [-1.5, 0.7, 2.1, 3.3, 5.5]],
		['\\sqrt[3]{x+1}', [-3.5, -1.6, -0.2, 1.8]],
		['\\frac{1}{\\sqrt[3]{3x+1}}', [-2.4, -0.9, -0.5, 0.6, 3.1]],
		['\\sqrt[3]{x}', [-5.3, -0.8, 0.6, 2.7]],
		['x\\sqrt[3]{x}', [-4.1, -1.2, 0.5, 3.6]],
		['\\sqrt[5]{2x-1}', [-3.3, -0.6, 0.2, 1.7, 4.4]],
		['\\frac{1}{\\sqrt[3]{x^2}}', [-3.7, -0.4, 0.9, 2.2]],
		['\\sqrt[3]{(2x+1)^2}', [-2.6, -0.8, 0.3, 1.9]]
	] as const)('%s', (latex, points) => {
		expectDerivativeEqualsIntegrand(latex, points);
	});

	it('∫₋₁⁰ ∛x dx = −3/4 (bornes négatives)', () => {
		const result = integrateDefinite(
			parseLatex('\\sqrt[3]{x}'),
			parseLatex('-1'),
			parseLatex('0'),
			{
				variable: 'x'
			}
		);
		expect(result.status).toBe('exact');
		expect(compile(result.value!)({})).toBeCloseTo(-0.75, 10);
	});

	it('∫₋₁⁰ ∛(2x+1) dx = 0 (∛ impaire autour de −1/2)', () => {
		const result = integrateDefinite(
			parseLatex('\\sqrt[3]{2x+1}'),
			parseLatex('-1'),
			parseLatex('0'),
			{ variable: 'x' }
		);
		expect(result.status).toBe('exact');
		expect(compile(result.value!)({})).toBeCloseTo(0, 10);
	});
});

describe('racine impaire : primitive écrite en racines', () => {
	it.each([
		['\\sqrt[3]{2x+1}', '\\dfrac{3}{8} \\left( 2 x + 1 \\right) \\sqrt[3]{2 x + 1}'],
		['\\sqrt[3]{x+1}', '\\dfrac{3}{4} \\left( x + 1 \\right) \\sqrt[3]{x + 1}'],
		['\\frac{1}{\\sqrt[3]{3x+1}}', '\\dfrac{1}{2} \\sqrt[3]{\\left( 3 x + 1 \\right)^2}'],
		['\\sqrt[3]{x}', '\\dfrac{3}{4} x \\sqrt[3]{x}'],
		['x\\sqrt[3]{x}', '\\dfrac{3}{7} x^2 \\sqrt[3]{x}'],
		['\\sqrt[5]{2x-1}', '\\dfrac{5}{12} \\left( 2 x - 1 \\right) \\sqrt[5]{2 x - 1}'],
		['\\frac{1}{\\sqrt[3]{x^2}}', '3 \\sqrt[3]{x}']
	])('%s → %s', (latex, expected) => {
		expect(toLatex(antiderivativeOf(latex))).toBe(expected);
	});

	it('indice pair inchangé : ∫√(2x+1) garde sa forme', () => {
		expect(toLatex(antiderivativeOf('\\sqrt{2x+1}'))).toBe(
			'\\dfrac{2}{3} x \\sqrt{2 x + 1} + \\dfrac{1}{3} \\sqrt{2 x + 1}'
		);
	});

	it('puissance tapée : (1−x)^{2/3} reste en puissance (définie pour 1 − x > 0)', () => {
		expect(toLatex(antiderivativeOf('(1-x)^{\\frac{2}{3}}'))).toContain('^{\\dfrac{5}{3}}');
	});
});

describe('odd-roots : réécritures', () => {
	const at = (latex: string, x: number) => compile(oddPowersAsRoots(parseLatex(latex)))({ x });

	it('u^{2/3} → ∛(u²) : positive pour u < 0', () => {
		expect(toLatex(oddPowersAsRoots(parseLatex('(x-1)^{\\frac{2}{3}}')))).toBe(
			'\\sqrt[3]{\\left( x - 1 \\right)^2}'
		);
		expect(at('(x-1)^{\\frac{2}{3}}', -7)).toBeCloseTo(4, 12);
	});

	it('u^{4/3} → u·∛u ; u^{−1/3} → 1/∛u ; u^{7/3} → u²·∛u', () => {
		expect(at('x^{\\frac{4}{3}}', -8)).toBeCloseTo(16, 12);
		expect(at('x^{-\\frac{1}{3}}', -8)).toBeCloseTo(-0.5, 12);
		expect(at('x^{\\frac{7}{3}}', -8)).toBeCloseTo(-128, 12);
		expect(toLatex(oddPowersAsRoots(parseLatex('x^{-\\frac{1}{3}}')))).toBe(
			'\\dfrac{1}{\\sqrt[3]{x}}'
		);
	});

	it('dénominateur pair ou exposant entier : inchangé', () => {
		for (const latex of ['x^{\\frac{3}{2}}', 'x^{\\frac{5}{4}}', 'x^3']) {
			expect(toLatex(oddPowersAsRoots(parseLatex(latex)))).toBe(toLatex(parseLatex(latex)));
		}
	});

	it('ⁿ√ impaire → puissance ; √ et ⁴√ laissées', () => {
		expect(toLatex(oddRootsAsPowers(parseLatex('\\frac{1}{\\sqrt[3]{x^2}}')))).toBe(
			'x^{-\\dfrac{2}{3}}'
		);
		expect(toLatex(oddRootsAsPowers(parseLatex('\\sqrt{x}+\\sqrt[4]{x}')))).toBe(
			'\\sqrt{x} + \\sqrt[4]{x}'
		);
	});
});
