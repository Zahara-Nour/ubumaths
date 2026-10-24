/**
 * La forme factorisée d'une expression à décimaux (R6, Q44 a et Q44-bis —
 * David, 2026-10-24)
 *
 * Le coefficient décimal de tête sort devant : `1,5x² − 3x → 1,5x(x − 2)`,
 * `0,3x² − 0,3 → 0,3(x − 1)(x + 1)`, `0,2x³ − 0,6x → 0,2x(x − √3)(x + √3)`.
 * Avant : `x(3x/2 − 3)` (mélange), ou rien. Même règle pour la forme demandée
 * par l'énoncé (D4) et le tableau de variations (D2). Sans coefficient de tête
 * décimal, un facteur garde ses décimaux, sans fraction (`x(2x − 0,5)`).
 */
import { describe, expect, it } from 'vitest';
import { differentiate } from '../../differentiation';
import { toLatex } from '../../latex-generator';
import { parseLatex } from '../../parser';
import { requestedForm } from '../../requested-form';
import { generatePedagogicalIntegrationSteps } from '../../pedagogical-integration';
import { displayedDerivatives } from '../display';

function asked(expression: string): string {
	const node = parseLatex(expression);
	return toLatex(requestedForm(node, 'factorisee', { f: node, kind: 'derivative' }));
}

function variationsFactored(f: string): string {
	const node = parseLatex(f);
	return toLatex(displayedDerivatives(differentiate(node, { variable: 'x' }), node).factored);
}

describe('Q44 a : forme demandée (D4), le coefficient décimal de tête sort', () => {
	it.each([
		['1{,}5x^2-3x', '1.5 x \\left( x - 2 \\right)'],
		['0{,}3x^2-0{,}3', '0.3 \\left( x - 1 \\right) \\left( x + 1 \\right)'],
		['0{,}2x^3-0{,}6x', '0.2 x \\left( x - \\sqrt{3} \\right) \\left( x + \\sqrt{3} \\right)'],
		['0{,}25x^2-1', '0.25 \\left( x - 2 \\right) \\left( x + 2 \\right)'],
		['0{,}5x^2-2x+1{,}5', '0.5 \\left( x - 1 \\right) \\left( x - 3 \\right)'],
		['-0{,}5x^2+2x', '-0.5 x \\left( x - 4 \\right)']
	])('%s → %s', (expression, expected) => {
		expect(asked(expression)).toBe(expected);
	});

	it('0,3 × (x² + x/3) : le décimal devant se regroupe, sans mélange', () => {
		expect(asked('0{,}3x^2+0{,}1x')).toBe('0.1 x \\left( 3 x + 1 \\right)');
	});

	it.each([
		['3x^2-6x', '3 x \\left( x - 2 \\right)'],
		['2x^2-0{,}5x', 'x \\left( 2 x - 0.5 \\right)']
	])('coefficient de tête entier : %s → %s (inchangé)', (expression, expected) => {
		expect(asked(expression)).toBe(expected);
	});
});

describe('Q44-bis : tableau de variations (D2), même règle', () => {
	it.each([
		['0{,}5x^3-1{,}5x^2', '1.5 x \\left( x - 2 \\right)'],
		['0{,}1x^3-0{,}3x', '0.3 \\left( x - 1 \\right) \\left( x + 1 \\right)'],
		['0{,}2x^3-0{,}9x^2+1{,}2x', '0.6 \\left( x - 1 \\right) \\left( x - 2 \\right)'],
		['x^3-3x', '3 \\left( x - 1 \\right) \\left( x + 1 \\right)']
	])('f = %s : f′ factorisée → %s', (f, expected) => {
		expect(variationsFactored(f)).toBe(expected);
	});
});

describe('Q44 a : primitive demandée factorisée', () => {
	it('∫(0,6x² − 0,6) factorisée → 0,2x(x − √3)(x + √3)', () => {
		const result = generatePedagogicalIntegrationSteps(parseLatex('0{,}6x^2-0{,}6'), {
			level: 'lycee',
			finalForm: 'factorisee'
		});
		expect(toLatex(result.antiderivative)).toBe(
			'0.2 x \\left( x - \\sqrt{3} \\right) \\left( x + \\sqrt{3} \\right)'
		);
	});
});
