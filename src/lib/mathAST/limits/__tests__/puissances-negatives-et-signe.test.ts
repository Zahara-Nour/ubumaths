/**
 * Puissance négative d'une base qui s'annule, signe d'un facteur oscillant
 * (V70, V71 — 2026-10-27).
 *
 * - (cos x − 1)^{−1} en 0 rendait « 1/0 » en valeur exacte : la substitution
 *   directe ne voyait de dénominateur nul que dans une fraction, pas dans une
 *   puissance négative.
 * - 1/(x sin(1/x)) en 0 rendait −∞ : trois points d'échantillonnage tombés du
 *   même côté de 0 faisaient de x sin(1/x) un « 0⁻ », alors que son signe
 *   change à chaque zéro du sinus. Une limite fausse est pire qu'un refus.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { parseLatex } from '../../parser';
import { infinity } from '../../factory';
import { toLatex } from '../../latex-generator';
import type { LimitDirection, LimitResult } from '../types';

function limitOf(latex: string, at: string, direction: LimitDirection = 'both'): LimitResult {
	const point = at === '+∞' ? infinity('positive') : parseLatex(at);
	return evaluateLimit(parseLatex(latex), 'x', point, direction);
}

function valueOf(latex: string, at: string, direction: LimitDirection = 'both'): string | null {
	const result = limitOf(latex, at, direction);
	return result.value === null ? null : toLatex(result.value);
}

describe('V70 : u^{−n}, u → 0, se lit 1/uⁿ', () => {
	it.each([
		['(\\cos x-1)^{-1}', '0', 'both', '-\\infty'],
		['(x-\\sin x)^{-1}', '0', 'right', '+\\infty'],
		['(x-\\sin x)^{-1}', '0', 'left', '-\\infty'],
		['(x-\\sin x)^{-2}', '0', 'both', '+\\infty'],
		['(\\sin x-x)^{-1}', '0', 'right', '-\\infty'],
		['(e^x-1)^{-1}', '0', 'right', '+\\infty'],
		['(\\ln x)^{-1}', '1', 'right', '+\\infty'],
		['(x^2-1)^{-3}', '1', 'left', '-\\infty'],
		['(x\\sin x)^{-1}', '0', 'both', '+\\infty'],
		['(\\sin x)^{-2}', '0', 'both', '+\\infty']
	] as const)('%s en %s (%s) → %s', (latex, at, direction, expected) => {
		expect(valueOf(latex, at, direction)).toBe(expected);
	});

	it.each([
		['(x-\\sin x)^{-1}', '0'],
		['(e^x-1)^{-1}', '0']
	] as const)('%s en %s : pas de limite (−∞ à gauche, +∞ à droite)', (latex, at) => {
		const result = limitOf(latex, at);
		expect(result.status).toBe('does-not-exist');
		expect(result.noLimitReason).toBe('sides-differ');
	});

	it.each([
		['x^{-1}', '0', 'both', null],
		['x^{-2}', '0', 'both', '+\\infty'],
		['(x-2)^{-2}', '2', 'both', '+\\infty'],
		['(x-2)^{-2}', '3', 'both', '1'],
		['(x-1)^{-1}', '0', 'both', '-1'],
		['(\\cos x)^{-1}', '0', 'both', '1'],
		['\\frac{1}{\\cos x-1}', '0', 'both', '-\\infty'],
		['e^{x^{-1}}', '0', 'right', '+\\infty'],
		['e^{x^{-1}}', '0', 'left', '0']
	] as const)('%s en %s (%s) → %s (inchangé)', (latex, at, direction, expected) => {
		expect(valueOf(latex, at, direction)).toBe(expected);
	});

	it('jamais « 1/0 » en valeur exacte', () => {
		for (const latex of ['(\\cos x-1)^{-1}', '(x-\\sin x)^{-1}', '(x-\\sin x)^{-2}']) {
			expect(valueOf(latex, '0') ?? '').not.toContain('\\dfrac{1}{0}');
		}
	});

	// sin x/(1 − cos x) ≈ 2/x → +∞ : « 0 » sur main (0 × 1/0 avalé)
	it('\\sin x\\,(1-\\cos x)^{-1} en 0⁺ : pas de valeur fausse', () => {
		const value = valueOf('(1-\\cos x)^{-1}\\sin x', '0', 'right');
		expect(value === null || value === '+\\infty').toBe(true);
	});
});

describe('V71 : signe non établi d’un facteur sin / cos d’argument non borné', () => {
	it.each([
		['\\frac{1}{x\\sin\\frac{1}{x}}', '0', 'both'],
		['\\frac{1}{x\\sin\\frac{1}{x}}', '0', 'right'],
		['(x\\sin\\frac{1}{x})^{-1}', '0', 'right'],
		['\\frac{1}{x\\cos\\frac{1}{x}}', '0', 'right'],
		// revue de la PR 3 : argument lent (1/√x, ln x), tan — −∞ sur main
		['\\frac{1}{x\\sin\\frac{1}{\\sqrt{x}}}', '0', 'right'],
		['\\frac{1}{x\\sin(\\ln x)}', '0', 'right'],
		['\\frac{1}{x\\tan\\frac{1}{x}}', '0', 'right']
	] as const)(
		'%s en %s (%s) : refus honnête, pas de ±∞ ni « pas de limite »',
		(latex, at, direction) => {
			const result = limitOf(latex, at, direction);
			expect(result.value).toBeNull();
			expect(result.status).toBe('unsupported');
		}
	);

	it.each([
		['x\\sin\\frac{1}{x}', '0', 'both', '0'],
		['x^2\\sin\\frac{1}{x}', '0', 'right', '0'],
		['\\frac{1}{x(2+\\sin\\frac{1}{x})}', '0', 'right', '+\\infty'],
		['\\frac{1}{x^2(2+\\cos\\frac{1}{x})}', '0', 'both', '+\\infty'],
		['\\frac{\\sin x}{x}', '0', 'both', '1'],
		['\\frac{1}{\\sin x}', '0', 'right', '+\\infty'],
		['\\frac{1}{x+x^2\\sin\\frac{1}{x}}', '0', 'right', '+\\infty'],
		['\\frac{1}{x^3(2+\\sin\\frac{1}{x})}', '0', 'left', '-\\infty'],
		// argument grand mais borné : pas d'oscillation au point
		['\\frac{1}{x\\sin(10^{15}x)}', '0', 'right', '+\\infty'],
		['\\frac{1}{x^2\\sin(10^{7}x)}', '0', 'right', '+\\infty']
	] as const)('%s en %s (%s) → %s (inchangé)', (latex, at, direction, expected) => {
		expect(valueOf(latex, at, direction)).toBe(expected);
	});

	it('\\frac{x}{\\sin x} en +∞ : inchangé, non supportée', () => {
		expect(limitOf('\\frac{x}{\\sin x}', '+∞').status).toBe('unsupported');
	});
});
