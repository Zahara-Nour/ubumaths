/**
 * Quotients en −∞, domaine de u^{p/q} en ±∞, inverse d'une différence à
 * conjuguer (V67, V69 — 2026-10-26).
 *
 * - V67 : (x − 3)²/x² en −∞ rendait « non supportée » (1 en +∞) : l'évaluation
 *   exacte ne savait pas (−∞)ⁿ, la forme ∞/∞ n'était pas vue.
 * - V69 : (x − 3)^{3/2} en −∞ rendait « non supportée » au lieu de « n'existe
 *   pas » (convention q pair : base ≥ 0, comme √(x − 3)) ; 1/(√(x+1) − √x) en
 *   +∞ rendait « non supportée » au lieu de +∞ (pas de conjugué au
 *   dénominateur).
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { findConjugate } from '../algebraic';
import { parseLatex } from '../../parser';
import { infinity, number } from '../../factory';
import { toLatex } from '../../latex-generator';
import type { LimitResult } from '../types';

function limitAt(latex: string, at: string): LimitResult {
	const point =
		at === '+∞' ? infinity('positive') : at === '-∞' ? infinity('negative') : number(at);
	return evaluateLimit(parseLatex(latex), 'x', point);
}

function valueOf(latex: string, at: string): string | null {
	const result = limitAt(latex, at);
	return result.value === null ? null : toLatex(result.value);
}

describe('V67 : quotients en −∞', () => {
	it.each([
		['\\frac{(x-3)^2}{x^2}', '1'],
		['\\frac{(x-3)^3}{x^3}', '1'],
		['\\frac{x^2}{(x-3)^2}', '1'],
		['\\frac{(2x+1)^3}{x^3}', '8'],
		['\\frac{(x+1)^2}{x}', '-\\infty'],
		['\\frac{x^3+1}{x^2}', '-\\infty'],
		['\\frac{x^2+1}{x^3}', '0']
	])('%s en −∞ → %s', (latex, expected) => {
		expect(valueOf(latex, '-∞')).toBe(expected);
	});

	it.each([
		['\\frac{(x-3)^2}{x^2}', '1'],
		['\\frac{(2x+1)^3}{x^3}', '8'],
		['\\frac{(x+1)^2}{x}', '+\\infty']
	])('%s en +∞ → %s (inchangé)', (latex, expected) => {
		expect(valueOf(latex, '+∞')).toBe(expected);
	});
});

describe('ln u − ln v : signe de u, v démontré par leur limite (∞ − ∞ levé)', () => {
	it.each([
		['\\ln(x^2)-\\ln(x^2+x)', '-∞'],
		['\\ln(x^2)-\\ln(x^2-x)', '-∞'],
		['\\ln(x^2)-\\ln(x^2-x)', '+∞']
	])('%s en %s → 0', (latex, at) => {
		expect(valueOf(latex, at)).toBe('0');
	});
});

describe('V69 : u^{p/q}, q pair, hors du domaine en −∞', () => {
	it.each([
		'(x-3)^{\\frac{3}{2}}',
		'(x-3)^{3/2}',
		'(x-3)^{\\frac{1}{2}}',
		'x^{\\frac{3}{2}}',
		'x^{0.5}'
	])('%s en −∞ : n’existe pas, hors du domaine', (latex) => {
		const result = limitAt(latex, '-∞');
		expect(result.status).toBe('does-not-exist');
		expect(result.noLimitReason).toBe('outside-domain');
	});

	it.each([
		// q impair : défini sur ℝ (décision du 2026-10-08)
		['(x-3)^{\\frac{1}{3}}', '-∞', '-\\infty'],
		['x^{\\frac{2}{3}}', '-∞', '+\\infty'],
		// base > 0 au voisinage de −∞
		['(3-x)^{\\frac{3}{2}}', '-∞', '+\\infty'],
		['(x-3)^{\\frac{3}{2}}', '+∞', '+\\infty']
	])('%s en %s → %s', (latex, at, expected) => {
		expect(valueOf(latex, at)).toBe(expected);
	});
});

describe('V69 : inverse d’une différence à conjuguer', () => {
	it.each([
		['(\\sqrt{x+1}-\\sqrt{x})^{-1}', '+∞', '+\\infty'],
		['\\frac{1}{\\sqrt{x+1}-\\sqrt{x}}', '+∞', '+\\infty'],
		['(\\sqrt{x+1}-\\sqrt{x})^{-2}', '+∞', '+\\infty'],
		['\\frac{1}{\\sqrt{x+1}-\\sqrt{x+2}}', '+∞', '-\\infty'],
		['\\frac{2}{\\sqrt{x}-\\sqrt{x-1}}', '+∞', '+\\infty'],
		['\\frac{x}{\\sqrt{x^2+1}-x}', '+∞', '+\\infty'],
		['\\frac{1}{\\sqrt{x^2+1}+x}', '-∞', '+\\infty']
	])('%s en %s → %s', (latex, at, expected) => {
		expect(valueOf(latex, at)).toBe(expected);
	});

	it.each([
		['\\sqrt{x+1}-\\sqrt{x}', '+∞', '0'],
		['\\sqrt{x^2+x}-\\sqrt{x^2+1}', '+∞', '\\dfrac{1}{2}'],
		['\\sqrt{x^2+x}-\\sqrt{x^2+1}', '-∞', '-\\dfrac{1}{2}'],
		['\\frac{1}{\\sqrt{x^2+1}-x}', '-∞', '0'],
		['\\frac{\\sqrt{x+1}-\\sqrt{1-x}}{x}', '0', '1']
	])('%s en %s → %s (différence elle-même)', (latex, at, expected) => {
		expect(valueOf(latex, at)).toBe(expected);
	});

	// (∛A − ∛B)(∛A + ∛B) ≠ A − B : la réécriture rendait −1/4 (juste : −1/12)
	it.each(['\\sqrt[3]{x+7}-\\sqrt[3]{2x+6}', '\\sqrt[3]{x+7}-2'])(
		'%s : pas de conjugué en racine carrée (indice 3)',
		(latex) => {
			expect(findConjugate(parseLatex(latex))).toBeNull();
		}
	);
});
