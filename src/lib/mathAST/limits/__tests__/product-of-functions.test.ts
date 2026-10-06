/**
 * Limite d'un produit de n facteurs non constants (n ≥ 2 ; décision de David,
 * 2026-10-06) : cas sûrs seulement — fini × fini → L₁·L₂ ; fini NON NUL × ±∞
 * → ±∞ selon les signes ; ±∞ × ±∞ → ±∞. La forme 0 × ∞ n'est jamais
 * tranchée par cette règle (croissances comparées, L'Hôpital…).
 *
 * Chaque cas asserte la VALEUR rendue (LaTeX), vérifiée numériquement.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { positiveInfinity, negativeInfinity } from '../../factory';
import { parseLatex } from '../../parser';
import { parseCustom } from '../../parser/custom';
import { toLatex } from '../../latex-generator';
import type { LimitDirection, LimitResult } from '../types';
import type { MathNode } from '../../types';

function target(at: string): MathNode {
	if (at === '+inf') return positiveInfinity();
	if (at === '-inf') return negativeInfinity();
	return parseLatex(at);
}

function describeLimit(result: LimitResult): string {
	if (result.value === null) return `${result.status} null`;
	if (result.value.type === 'infinity') {
		return `${result.status} ${result.value.sign === 'positive' ? '+inf' : '-inf'}`;
	}
	return `${result.status} ${toLatex(result.value)}`;
}

function latexResult(input: string, at: string, dir: LimitDirection = 'both'): LimitResult {
	return evaluateLimit(parseLatex(input), 'x', target(at), dir);
}

function customLimit(input: string, at: string): string {
	return describeLimit(evaluateLimit(parseCustom(input), 'x', target(at)));
}

describe('lim f·g : produit de deux fonctions non constantes', () => {
	it.each([
		// fini non nul × ±∞
		['x*(x^2/(3x^2+1))', '+inf', 'infinite +inf'],
		['x*(x^2/(3x^2+1))', '-inf', 'infinite -inf'],
		['(x+1)*(x/(x+1))', '+inf', 'infinite +inf'],
		['(x+1)*(-2x/(x+1))', '+inf', 'infinite -inf'],
		// fini × fini
		['x*(1/x)', '+inf', 'exact 1']
	])('%s en %s → %s', (input, at, expected) => {
		expect(customLimit(input, at)).toBe(expected);
	});

	it.each([
		['\\frac{x}{x+1}\\cdot\\frac{2x}{x-1}', '+inf', 'exact 2'],
		['\\frac{x}{x+1}\\cdot\\frac{2x}{3x-1}', '+inf', 'exact \\dfrac{2}{3}'],
		['e^{-x}\\cdot\\frac{x}{x+1}', '+inf', 'exact 0'],
		['\\frac{1}{x}\\cdot\\sin x', '0', 'exact 1'],
		['(x^2-1)\\cdot\\frac{1}{x-1}', '1', 'exact 2']
	])('%s en %s → %s', (input, at, expected) => {
		expect(describeLimit(latexResult(input, at))).toBe(expected);
	});

	it('x ln x en 0⁺ → 0, par une autre stratégie que la règle du produit', () => {
		const result = latexResult('x\\ln x', '0', 'right');
		expect(describeLimit(result)).toBe('exact 0');
		expect(result.technique).not.toBe('product');
	});

	it('limites unilatérales : (1/x)·(x+1) en 0⁺ → +∞, en 0⁻ → −∞', () => {
		expect(describeLimit(latexResult('\\frac{1}{x}\\cdot(x+1)', '0', 'right'))).toBe(
			'infinite +inf'
		);
		expect(describeLimit(latexResult('\\frac{1}{x}\\cdot(x+1)', '0', 'left'))).toBe(
			'infinite -inf'
		);
	});

	it('x e^{-x} en +∞ → 0, par une autre stratégie que la règle du produit', () => {
		const result = latexResult('x e^{-x}', '+inf');
		expect(describeLimit(result)).toBe('exact 0');
		expect(result.technique).not.toBe('product');
	});

	it('0·∞ : x²·(1/x) en +∞ n’est pas tranché à 0 par la règle', () => {
		const result = latexResult('x^2\\cdot\\frac{1}{x}', '+inf');
		expect(describeLimit(result)).not.toBe('exact 0');
	});

	it('s’abstient : facteur sans limite, x/(x+1)·sin x en +∞', () => {
		const result = latexResult('\\frac{x}{x+1}\\cdot\\sin x', '+inf');
		expect(result.value === null || result.status === 'approximate').toBe(true);
		expect(result.status).not.toBe('exact');
	});
});

describe('lim f·g bilatérale avec un facteur sans limite bilatérale', () => {
	// Chaque côté est calculé ; on ne conclut que s'ils concordent. Avant :
	// le quotient réécrit rendait « exact 100000000 » (x = ±10⁻⁸ évalué).
	it.each([
		['\\frac{x}{|x|}\\cdot\\frac{1}{x}', '0', 'infinite +inf'],
		['\\frac{|x|}{x}\\cdot\\frac{1}{x}', '0', 'infinite +inf'],
		['\\frac{|x-1|}{x-1}\\cdot\\frac{1}{x-1}', '1', 'infinite +inf'],
		['\\frac{|x|}{x}\\cdot x', '0', 'exact 0'],
		['\\frac{|2x|}{x}\\cdot x', '0', 'exact 0']
	])('%s en %s → %s', (input, at, expected) => {
		expect(describeLimit(latexResult(input, at))).toBe(expected);
	});

	it('côtés discordants : |x|/x · (x+1)/(x+1) en 0 n’a pas de limite, jamais un nombre', () => {
		const result = latexResult('\\frac{|x|}{x}\\cdot\\frac{x+1}{x+1}', '0');
		expect(result.value).toBeNull();
		expect(['does-not-exist', 'unsupported']).toContain(result.status);
	});
});
