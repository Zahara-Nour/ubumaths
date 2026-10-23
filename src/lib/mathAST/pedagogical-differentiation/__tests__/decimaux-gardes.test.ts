/**
 * Un décimal tapé reste décimal dans la dérivée (S1, chantier simplify-carte § 50, Q19).
 *
 * Défaut mesuré (2026-10-23) : `foldNumericSubtrees` repliait chaque sous-arbre
 * numérique par `evaluate` exact, un nombre seul compris : `0.5` devenait `1/2`
 * dès la dérivée brute, et la correction de `0,5x² − 1,5x` finissait sur
 * `x − 3/2`, celle de `−4,9t² + 20t` sur `20 − 49t/5`.
 */

import { describe, it, expect } from 'vitest';
import {
	generatePedagogicalDifferentiationSteps,
	PedagogicalDifferentiationRenderer,
	withTidyStep
} from '../index';
import { parseLatex } from '../../parser';
import type { MathNode } from '../../types';

function derivativeOf(latex: string, variable = 'x'): string {
	const f = parseLatex(latex) as MathNode;
	const result = generatePedagogicalDifferentiationSteps(f, {
		variable,
		schoolLevel: 'lycee',
		verbosity: 'detailed'
	});
	const steps = new PedagogicalDifferentiationRenderer().renderAll(result.steps, {
		schoolLevel: 'lycee',
		verbosity: 'detailed'
	});
	return withTidyStep(steps, result.derivative, f).derivativeLatex;
}

describe('dérivée : un décimal tapé reste décimal', () => {
	it.each([
		['0.5x^2-1.5x', 'x - 1.5'],
		['1.5x', '1.5'],
		['0.5x^3', '1.5 x^2'],
		['0.2e^{x}', '0.2 \\exponentialE^x'],
		['2.5x^2+0.3x-1', '5 x + 0.3']
	])('(%s)′ = %s', (input, expected) => {
		expect(derivativeOf(input)).toBe(expected);
	});

	it('(−4,9t² + 20t)′ = 20 − 9,8t (variable t, pas de − en tête)', () => {
		expect(derivativeOf('-4.9t^2+20t', 't')).toBe('20 - 9.8 t');
	});
});

describe('dérivée : une fraction tapée reste fraction', () => {
	it.each([
		['\\frac{1}{2}x^2+\\frac{3}{2}x', 'x + \\dfrac{3}{2}'],
		// Un opérande fraction l'emporte (S1)
		['0.5x^2+\\frac{1}{3}x', 'x + \\dfrac{1}{3}']
	])('(%s)′ = %s', (input, expected) => {
		expect(derivativeOf(input)).toBe(expected);
	});
});

describe('dérivée : une puissance numérique que `tidy` laisse est repliée quand même', () => {
	// Revue de #1655 : sans le repli par `evaluate`, `2x × 4^{1/2}`
	it('(4^{1/2} x²)′ = 4x', () => {
		expect(derivativeOf('4^{\\frac{1}{2}}x^2')).toBe('4 x');
	});
});
