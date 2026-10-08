/**
 * Écriture des primitives — décisions de David (2026-10-08), valeurs inchangées :
 *
 * 1. Terme positif EN TÊTE quand un seul terme est négatif et qu'un terme
 *    transcendant (tan, ln, arctan, eˣ…) est présent : tan x − x, et non
 *    −x + tan x (cohérent avec `tidy` : les négatifs derrière). Un polynôme
 *    seul garde l'ordre décroissant des degrés (−4,9t² + 5t).
 * 2. arctan à coefficient irrationnel : MÊME √ dans le coefficient et
 *    l'argument, 2/√3 · arctan((2x + 1)/√3), et non ⅔√3.
 * 3. Facteur exponentiel mis en évidence : x·2ˣ → 2ˣ(x/ln 2 − 1/(ln 2)²) ;
 *    (ax + b)eᵏˣ → (Px + Q)eᵏˣ quand P, Q sont entiers (x eˣ → (x − 1)eˣ).
 *
 * Chaque primitive est aussi vérifiée numériquement (F′ = f).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { integrate } from '../integrate';
import { compile } from '../../eval/compile';
import { toLatex } from '../../latex-generator';

// =============================================================================
// Constantes
// =============================================================================

const POINTS: readonly number[] = [-0.9, -0.4, 0.3, 0.7, 1.1];

// =============================================================================
// Outils
// =============================================================================

/** Primitive rendue (LaTeX) après contrôle F′ = f aux points où f est définie */
function primitive(latex: string): string {
	const result = integrate(parseLatex(latex), { variable: 'x' });
	if (result.status !== 'exact' || result.antiderivative === null) {
		throw new Error(`statut ${result.status}`);
	}
	const F = compile(result.antiderivative);
	const f = compile(parseLatex(latex));
	for (const x of POINTS) {
		const fx = f({ x });
		if (!Number.isFinite(fx)) continue;
		const h = 1e-5;
		const slope = (F({ x: x + h }) - F({ x: x - h })) / (2 * h);
		expect(Math.abs(slope - fx)).toBeLessThan(1e-5 * Math.max(1, Math.abs(fx)));
	}
	return toLatex(result.antiderivative);
}

// =============================================================================
// 1. Terme positif en tête
// =============================================================================

describe('un seul terme négatif : le positif en tête', () => {
	it.each([
		['\\tan^2(x)', '\\tan\\left( x \\right) - x'],
		['-x+\\frac{1}{\\cos^2 x}', '\\tan\\left( x \\right) - \\dfrac{1}{2} x^2']
	])('∫ %s = %s', (input, expected) => {
		expect(primitive(input)).toBe(expected);
	});

	it.each([
		// polynôme seul : ordre décroissant des degrés
		['5-9.8x', '-\\dfrac{49}{10} x^2 + 5 x'],
		// déjà positif en tête
		['\\sin^2(x)', '\\dfrac{1}{2} x - \\dfrac{1}{4} \\sin\\left( 2 x \\right)']
	])('témoin : ∫ %s = %s', (input, expected) => {
		expect(primitive(input)).toBe(expected);
	});
});

// =============================================================================
// 2. arctan : même √ dans le coefficient et l'argument
// =============================================================================

describe('arctan à coefficient irrationnel', () => {
	it.each([
		[
			'\\frac{1}{x^2+x+1}',
			'\\dfrac{2}{\\sqrt{3}} \\arctan\\left( \\dfrac{2 x + 1}{\\sqrt{3}} \\right)'
		],
		[
			'\\frac{2x-1}{x^2+x+1}',
			'\\ln\\left( x^2 + x + 1 \\right) - \\dfrac{4}{\\sqrt{3}} \\arctan\\left( \\dfrac{2 x + 1}{\\sqrt{3}} \\right)'
		],
		['\\frac{1}{x^2+2}', '\\dfrac{1}{\\sqrt{2}} \\arctan\\left( \\dfrac{x}{\\sqrt{2}} \\right)'],
		['\\frac{1}{2x^2+3}', '\\dfrac{1}{\\sqrt{6}} \\arctan\\left( \\dfrac{2 x}{\\sqrt{6}} \\right)']
	])('∫ %s = %s', (input, expected) => {
		expect(primitive(input)).toBe(expected);
	});

	it.each([
		['\\frac{1}{x^2+2x+5}', '\\dfrac{1}{2} \\arctan\\left( \\dfrac{x + 1}{2} \\right)'],
		['\\frac{1}{x^2+4}', '\\dfrac{1}{2} \\arctan\\left( \\dfrac{1}{2} x \\right)']
	])('témoin rationnel : ∫ %s = %s', (input, expected) => {
		expect(primitive(input)).toBe(expected);
	});
});

// =============================================================================
// 3. Facteur exponentiel mis en évidence
// =============================================================================

describe('facteur exponentiel en évidence', () => {
	it.each([
		[
			'x\\cdot2^x',
			'2^x \\left( \\dfrac{x}{\\ln\\left( 2 \\right)} - \\dfrac{1}{\\ln\\left( 2 \\right)^2} \\right)'
		],
		[
			'x\\cdot3^x',
			'3^x \\left( \\dfrac{x}{\\ln\\left( 3 \\right)} - \\dfrac{1}{\\ln\\left( 3 \\right)^2} \\right)'
		],
		['x\\exponentialE^{x}', '\\left( x - 1 \\right) \\exponentialE^x'],
		['(2x-1)\\exponentialE^{x}', '\\left( 2 x - 3 \\right) \\exponentialE^x'],
		['(x+1)\\exponentialE^{-x}', '-\\left( x + 2 \\right) \\exponentialE^{-x}']
	])('∫ %s = %s', (input, expected) => {
		expect(primitive(input)).toBe(expected);
	});

	it.each([
		// coefficients non entiers : forme développée gardée
		[
			'x\\exponentialE^{2x}',
			'\\dfrac{1}{2} x \\exponentialE^{2 x} - \\dfrac{1}{4} \\exponentialE^{2 x}'
		]
	])('témoin : ∫ %s = %s', (input, expected) => {
		expect(primitive(input)).toBe(expected);
	});
});
