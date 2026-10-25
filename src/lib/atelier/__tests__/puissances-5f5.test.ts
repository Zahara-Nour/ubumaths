/**
 * Puissances et `.simplifier` (lot 5f-5 du chantier simplify-carte, R9-R10,
 * Q47-Q48 tranchées par David le 2026-10-24, journal § 71-72).
 *
 * Mesuré sur `main` avant le lot :
 *
 *   2^{0,5}            → 2^{1/2}          (2^{1/2} → √2, lui)
 *   8^{1/2}, 2^{3/2}   → restent écrits   (`evaluate` rend 2√2, la saisie gagnait)
 *   2^{0,5}x           → x × 2^{1/2}
 *   .simplifier e^{2x}/e^x → reste ; .simplifier e^x·e → e·e^x
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { runInput } from '../calcul';

function run(input: string) {
	return runInput({ atelier: new Atelier(), engine: new WebReplEngine() }, input);
}

function lineOf(input: string): string {
	const result = run(input);
	if (result.kind !== 'calcul' && result.kind !== 'commande') {
		throw new Error(`${input} : ${result.kind}`);
	}
	return result.latex ?? result.output;
}

function titlesOf(input: string): readonly string[] {
	const result = run(input);
	if (result.kind !== 'commande') throw new Error(`${input} : ${result.kind}`);
	return (result.steps ?? []).map((step) => step.title);
}

describe('R9 (Q47) : exposant de dénominateur 2 → racine carrée, ligne de calcul', () => {
	it.each([
		['2^{1/2}', '\\sqrt{2}'],
		['2^{0,5}', '\\sqrt{2}'],
		['4^{0,5}', '2'],
		['9^{0,5}', '3'],
		['8^{1/2}', '2 \\sqrt{2}'],
		['2^{3/2}', '2 \\sqrt{2}'],
		['2^{1,5}', '2 \\sqrt{2}'],
		['3^{5/2}', '9 \\sqrt{3}'],
		['2^{0,5}x', '\\sqrt{2} x'],
		['27^{2/3}', '9']
	])('%s → %s', (input, expected) => {
		expect(lineOf(input)).toBe(expected);
	});

	it('2^{1/3} reste écrit', () => {
		expect(lineOf('2^{1/3}')).toBe('2^{\\dfrac{1}{3}}');
	});
});

describe('R9 (Q47) : .simplifier', () => {
	it.each([
		['.simplifier 2^{0,5}', '\\sqrt{2}'],
		['.simplifier 8^{1/2}', '2 \\sqrt{2}'],
		['.simplifier 2^{3/2}', '2 \\sqrt{2}'],
		['.simplifier 2^{0,5}x', '\\sqrt{2} x']
	])('%s → %s', (input, expected) => {
		expect(lineOf(input)).toBe(expected);
	});

	it('.simplifier 2^{0,5} dit le geste', () => {
		expect(titlesOf('.simplifier 2^{0,5}')).toEqual([
			'On écrit la puissance avec une racine carrée'
		]);
	});
});

describe('R10 (Q48) : .simplifier, quotient et produit de puissances de même base', () => {
	it.each([
		['.simplifier e^{2x}/e^x', '\\exponentialE^x'],
		['.simplifier e^{3x}/e^{-x}', '\\exponentialE^{4 x}'],
		['.simplifier e^x/e', '\\exponentialE^{x - 1}'],
		['.simplifier e/e^x', '\\exponentialE^{1 - x}'],
		['.simplifier 2^{3x}/2^x', '2^{2 x}'],
		['.simplifier e^x*e', '\\exponentialE^{x + 1}'],
		['.simplifier e*e^{2x}', '\\exponentialE^{2 x + 1}']
	])('%s → %s', (input, expected) => {
		expect(lineOf(input)).toBe(expected);
	});

	it('e^{2x}/e^x : l’étape aᵐ/aⁿ = aᵐ⁻ⁿ', () => {
		expect(titlesOf('.simplifier e^{2x}/e^x')).toEqual(['aᵐ / aⁿ = aᵐ⁻ⁿ']);
	});

	it('e^x·e : l’étape aᵐ · aⁿ = aᵐ⁺ⁿ', () => {
		expect(titlesOf('.simplifier e^x*e')).toEqual(['aᵐ · aⁿ = aᵐ⁺ⁿ']);
	});

	it('déjà vrai, inchangé : e^x·e^{2x} et e^x·e^{−x}', () => {
		expect(lineOf('.simplifier e^x*e^{2x}')).toBe('\\exponentialE^{3 x}');
		expect(lineOf('.simplifier e^x*e^{-x}')).toBe('1');
	});

	// x³/x² → x passe par la réduction de fraction, qui dit « pour x ≠ 0 » (Q4) :
	// aᵐ/aⁿ le ferait sans condition
	it('une base qui peut s’annuler ne passe pas par aᵐ/aⁿ (domaine)', () => {
		expect(titlesOf('.simplifier x^3/x^2')).not.toContain('aᵐ / aⁿ = aᵐ⁻ⁿ');
	});

	it('la ligne de calcul ne regroupe pas deux exposants différents (Q31)', () => {
		expect(lineOf('e^{2x}/e^x')).toBe('\\dfrac{\\exponentialE^{2 x}}{\\exponentialE^x}');
		expect(lineOf('e^x*e^{2x}')).toBe('\\exponentialE^x \\exponentialE^{2 x}');
	});
});
