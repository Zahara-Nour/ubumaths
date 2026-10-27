/**
 * Exponentielle d'une forme indéterminée, produit polynôme × exponentielle
 * (V68 — 2026-10-27).
 *
 * - e^{x² − x} en +∞ rendait « non supportée » : la composition classe la
 *   limite de l'exposant en arithmétique exacte, qui ne lève pas +∞ − ∞.
 * - (x − 3)²·e^{−x} en +∞ rendait « non supportée » : la forme 0 × ∞ n'était
 *   réécrite en quotient que si un facteur en était déjà un ; seule la limite
 *   connue xⁿ·e^{−x} concluait.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { parseLatex } from '../../parser';
import { infinity } from '../../factory';
import { toLatex } from '../../latex-generator';

function valueOf(latex: string, at: '+∞' | '-∞'): string | null {
	const point = infinity(at === '+∞' ? 'positive' : 'negative');
	const result = evaluateLimit(parseLatex(latex), 'x', point);
	return result.value === null ? null : toLatex(result.value);
}

describe('V68 : a^u, u forme indéterminée en ±∞', () => {
	it.each([
		['e^{x^2-x}', '+∞', '+\\infty'],
		['e^{x-x^2}', '+∞', '0'],
		['e^{-x^2+3x}', '+∞', '0'],
		['e^{x^3-x^2}', '+∞', '+\\infty'],
		['e^{x^3-x^2}', '-∞', '0'],
		['\\exp(x^2-x)', '+∞', '+\\infty'],
		['2^{x^2-x}', '+∞', '+\\infty'],
		['\\left(\\frac{1}{2}\\right)^{x^2-x}', '+∞', '0']
	] as const)('%s en %s → %s', (latex, at, expected) => {
		expect(valueOf(latex, at)).toBe(expected);
	});

	it.each([
		['e^{x^2-x}', '-∞', '+\\infty'],
		['e^{x-x^2}', '-∞', '0'],
		['e^{(x-3)^2}', '+∞', '+\\infty']
	] as const)('%s en %s → %s (inchangé)', (latex, at, expected) => {
		expect(valueOf(latex, at)).toBe(expected);
	});

	it('e^{x sin x} en +∞ : pas de limite inventée', () => {
		expect(valueOf('e^{x\\sin x}', '+∞')).toBeNull();
	});
});

describe('V68 : polynôme × exponentielle qui tend vers 0 (0 × ∞)', () => {
	it.each([
		['(x-3)^2e^{-x}', '+∞', '0'],
		['(x^2-6x+9)e^{-x}', '+∞', '0'],
		['(x-3)e^{-x}', '+∞', '0'],
		['(x+1)^2e^{-2x}', '+∞', '0'],
		['(x-3)^2e^{x}', '-∞', '0'],
		['(x-3)^3e^{x}', '-∞', '0'],
		['(x-3)^2\\exp(-x)', '+∞', '0'],
		['e^{-x}(x-3)^2', '+∞', '0']
	] as const)('%s en %s → %s', (latex, at, expected) => {
		expect(valueOf(latex, at)).toBe(expected);
	});

	it.each([
		['x^2e^{-x}', '+∞', '0'],
		['x^2e^{x}', '-∞', '0'],
		['\\frac{(x-3)^2}{e^x}', '+∞', '0'],
		['(x-3)^2e^{-x}', '-∞', '+\\infty'],
		['(x-3)^2e^{x}', '+∞', '+\\infty']
	] as const)('%s en %s → %s (inchangé)', (latex, at, expected) => {
		expect(valueOf(latex, at)).toBe(expected);
	});
});
