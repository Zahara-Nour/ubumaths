/**
 * Repli numérique de `integrateDefinite` (primitive refusée, `allowNumeric`) :
 * la détection de singularité de #947 s'applique à f elle-même.
 *
 * Sans primitive, aucune F à contrôler : Simpson rendait une valeur à travers
 * un pôle de f (ou NaN, présenté comme une approximation). Une singularité
 * prolongeable (sin x / x en 0) reste calculée.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { integrateDefinite } from '../integrate';

// =============================================================================
// Outils
// =============================================================================

function definite(latex: string, lower: string, upper: string) {
	return integrateDefinite(parseLatex(latex), parseLatex(lower), parseLatex(upper), {
		variable: 'x'
	});
}

// =============================================================================
// Refus : pôle de f dans [a ; b]
// =============================================================================

describe('repli numérique : pôle de f dans [a ; b] → refus', () => {
	it.each([
		['\\frac{e^x}{x}', '-1', '1'],
		['\\frac{e^x}{x}', '0', '1'],
		['\\frac{\\sin x}{x^2}', '-1', '1'],
		['\\frac{\\sin x}{x^2}', '0', '1'],
		['\\frac{\\cos x}{x}', '0', '1'],
		['\\frac{\\cos x}{x-1}', '0', '2'],
		['\\frac{e^x}{x^2-1}', '0', '2'],
		['\\frac{\\cos x}{x-\\frac{1}{3}}', '0', '1'],
		['\\frac{1}{\\ln x}', '0', '2']
	])('%s sur [%s ; %s] : aucune valeur', (latex, lower, upper) => {
		const result = definite(latex, lower, upper);
		expect(result.value).toBeNull();
		expect(result.approximate).toBeUndefined();
		expect(result.status).toBe('unsupported');
		expect(result.error).toMatch(/^L'intégrale diverge ou n'est pas définie sur \[/);
	});
});

// =============================================================================
// Non-régressions : valeurs approchées justes
// =============================================================================

describe('repli numérique : f continue (ou prolongeable) sur [a ; b] → valeur', () => {
	it.each([
		// 2·Si(1) : sin x / x se prolonge par 1 en 0 (point de la grille et milieu de Simpson)
		['\\frac{\\sin x}{x}', '-1', '1', 1.892166140734366],
		// Si(1)
		['\\frac{\\sin x}{x}', '0', '1', 0.9460830703671831],
		// √π/2 · erf(1), e lue comme la constante d'Euler
		['e^{-x^2}', '0', '1', 0.7468241328124271],
		['e^{-x^2}', '-1', '1', 1.493648265624854],
		// Bornes non entières : π
		['\\frac{\\sin x}{x}', '0', '\\pi', 1.8519370519824663]
	])('%s sur [%s ; %s] ≈ %d', (latex, lower, upper, expected) => {
		const result = definite(latex, lower, upper);
		expect(result.status).toBe('approximate');
		expect(result.technique).toBe('numeric');
		expect(result.approximate).toBeCloseTo(expected, 6);
	});
});
