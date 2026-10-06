/**
 * Limites FAUSSES relevées en revue (2026-10-06) : le moteur rendait une
 * valeur là où il n'y en a pas, ou une valeur fausse. Règle : mieux vaut
 * « non supportée » qu'une valeur fausse. Chaque attendu est vérifié
 * numériquement (commentaire au-dessus du cas).
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { positiveInfinity } from '../../factory';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import type { LimitDirection, LimitResult } from '../types';
import type { MathNode } from '../../types';

function target(at: string): MathNode {
	if (at === '+inf') return positiveInfinity();
	return parseLatex(at);
}

function describeLimit(result: LimitResult): string {
	if (result.value === null) return `${result.status} null`;
	if (result.value.type === 'infinity') {
		return `${result.status} ${result.value.sign === 'positive' ? '+inf' : '-inf'}`;
	}
	return `${result.status} ${toLatex(result.value)}`;
}

function limitOf(input: string, at: string, dir: LimitDirection = 'both'): string {
	return describeLimit(evaluateLimit(parseLatex(input), 'x', target(at), dir));
}

/** Aucune valeur : ni exacte, ni infinie, ni approchée. */
function hasNoValue(result: string): boolean {
	return /^(does-not-exist|unsupported|indeterminate) null$/.test(result);
}

describe('borne ∞ écrite par le parseur (`\\infty`, `+\\infty`) : pas de substitution directe', () => {
	// x/eˣ, x²/eˣ, x⁵/eˣ → 0 ; eˣ/x³ → +∞ ; ln x / x → 0 (croissances comparées ;
	// en x = 50 : 1e-20, 7e-19, 6e-14, 6e16, 0.078 → 0)
	it.each([
		['\\frac{x}{e^x}', 'exact 0'],
		['\\frac{x^2}{e^x}', 'exact 0'],
		['\\frac{x^5}{e^x}', 'exact 0'],
		['\\frac{e^x}{x^3}', '+inf'],
		['\\frac{\\ln x}{x}', 'exact 0']
	])('%s en +∞ → %s', (input, expected) => {
		for (const at of ['+\\infty', '\\infty']) {
			const result = limitOf(input, at);
			expect(result.endsWith(expected), `${input} en ${at} : ${result}`).toBe(true);
			expect(result).not.toContain('\\infty');
		}
	});

	it('la limite écrite \\lim_{x\\to+\\infty} est calculée, pas substituée', () => {
		const result = describeLimit(evaluateLimit(parseLatex('\\lim_{x\\to+\\infty}\\frac{x}{e^x}')));
		expect(result).toBe('exact 0');
	});
});

describe('produit infini en un point : gauche ≠ droite → pas de limite bilatérale', () => {
	// (x+1)/x : 0⁻ → −∞, 0⁺ → +∞ ; 1/(x(x−1)) : 0⁻ → +∞, 0⁺ → −∞ ; x·(1/x)·(1/x) = 1/x
	it.each([
		['\\frac{1}{x}\\cdot(x+1)'],
		['\\frac{1}{x}\\cdot\\frac{1}{x-1}'],
		['x\\cdot\\frac{1}{x}\\cdot\\frac{1}{x}']
	])('%s en 0 → aucune valeur', (input) => {
		const result = limitOf(input, '0');
		expect(hasNoValue(result), result).toBe(true);
	});

	it('les limites latérales restent justes', () => {
		expect(limitOf('\\frac{1}{x}\\cdot(x+1)', '0', 'left')).toBe('infinite -inf');
		expect(limitOf('\\frac{1}{x}\\cdot(x+1)', '0', 'right')).toBe('infinite +inf');
		expect(limitOf('\\frac{1}{x}\\cdot\\frac{1}{x-1}', '0', 'right')).toBe('infinite -inf');
	});
});

describe('facteur oscillant : jamais de valeur', () => {
	// x·sin x, x²·sin x en +∞ ; sin(1/x)/x en 0 : oscillent entre −∞ et +∞
	it.each([
		['\\sin x\\cdot x', '+inf', 'both'],
		['x\\cdot\\sin x\\cdot x', '+inf', 'both'],
		['\\sin(\\frac{1}{x})\\cdot\\frac{1}{x}', '0', 'both'],
		['\\sin(\\frac{1}{x})\\cdot\\frac{1}{x}', '0', 'right'],
		['\\sin(\\frac{1}{x})\\cdot\\frac{1}{x}', '0', 'left']
	] as const)('%s en %s (%s) → aucune valeur', (input, at, dir) => {
		const result = limitOf(input, at, dir);
		expect(hasNoValue(result), result).toBe(true);
	});
});

describe('pôle sous la substitution directe', () => {
	// (x−π)·tan(x/2) en π : −2 (π ± 1e-5 → −2.0000000000) ; jamais 0
	it('(x−π)·tan(x/2) en π → −2 ou aucune valeur, jamais 0', () => {
		const result = limitOf('(x-\\pi)\\cdot\\tan(\\frac{x}{2})', '\\pi');
		expect(result === 'exact -2' || hasNoValue(result), result).toBe(true);
	});

	// tan(x/2)(x−π)/x en π : −2/π ≈ −0.63662 ; jamais « 0/π »
	it('tan(x/2)·(x−π)·(1/x) en π → −2/π ou aucune valeur', () => {
		const result = limitOf('\\tan(x/2)(x-\\pi)\\frac{1}{x}', '\\pi');
		expect(
			result === 'exact -\\dfrac{2}{\\pi}' ||
				result === 'exact \\dfrac{-2}{\\pi}' ||
				hasNoValue(result),
			result
		).toBe(true);
	});

	// tan x en π/2⁻ : tan(π/2 − 1e-6) = 1e6 → +∞
	it('tan x en π/2⁻ → +∞, pas « tan(π/2) »', () => {
		expect(limitOf('\\tan x', '\\frac{\\pi}{2}', 'left')).toBe('infinite +inf');
	});
});

describe('limites justes inchangées', () => {
	it.each([
		['\\frac{\\sin x}{x}', '0', 'both', 'exact 1'],
		['x e^{-x}', '+inf', 'both', 'exact 0'],
		['\\frac{1}{x}', '0', 'right', 'exact +inf'],
		['\\frac{1}{x}', '0', 'both', 'does-not-exist null'],
		['3', '0', 'both', 'exact 3'],
		['x^2+2x-1', '1', 'both', 'exact 2'],
		['x^3-x', '+inf', 'both', 'infinite +inf'],
		['\\frac{x^2-1}{x-1}', '1', 'both', 'exact 2'],
		['\\frac{1}{x^2}', '0', 'both', 'infinite +inf']
	] as const)('%s en %s (%s) → %s', (input, at, dir, expected) => {
		expect(limitOf(input, at, dir)).toBe(expected);
	});
});
