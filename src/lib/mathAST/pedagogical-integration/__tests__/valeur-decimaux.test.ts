/**
 * La valeur d'une intégrale bornée dont l'intégrande tape un décimal (Q49 —
 * David, 2026-10-25)
 *
 * Elle suit le registre de la primitive (R5) : décimal si son écriture est
 * finie (`∫₀¹ 0,5x dx = 0,25`), sinon fraction (`∫₀¹ 0,5x² dx = 1/6`). Une
 * valeur avec e ou ln : ses coefficients dans un seul registre
 * (`∫₀¹ 0,5eˣ dx = 0,5e − 0,5`). Sans décimal tapé, rien ne change.
 */
import { describe, expect, it } from 'vitest';
import { toLatex } from '../../latex-generator';
import { parseLatex } from '../../parser';
import { generatePedagogicalIntegrationSteps, PedagogicalIntegrationRenderer } from '..';

function definite(integrand: string, lower: string, upper: string) {
	return generatePedagogicalIntegrationSteps(parseLatex(integrand), {
		level: 'lycee',
		definite: { lower: parseLatex(lower), upper: parseLatex(upper) }
	});
}

function value(integrand: string, lower: string, upper: string): string {
	const result = definite(integrand, lower, upper).value;
	if (result === undefined) throw new Error(`∫ ${integrand} : pas de valeur`);
	return toLatex(result);
}

describe('Q49 : la valeur tombe juste → décimal', () => {
	it.each([
		['0{,}5x', '0', '1', '0.25'],
		['0{,}5x', '1', '2', '0.75'],
		['0{,}2x+1', '0', '1', '1.1'],
		['0{,}2x+1', '0', '2', '2.4'],
		['0{,}25x^3', '1', '2', '0.9375'],
		['2x+0{,}5', '0', '1', '1.5'],
		['x+0{,}1', '0', '1', '0.6'],
		['0{,}3x^2-0{,}1x', '0', '1', '0.05'],
		['0{,}5x', '0{,}5', '1', '0.1875'],
		['0{,}5e^x', '0', '1', '0.5 \\exponentialE - 0.5'],
		['\\dfrac{0{,}5}{x}', '1', '2', '0.5 \\ln\\left( 2 \\right)']
	])('∫ %s de %s à %s = %s', (integrand, lower, upper, expected) => {
		expect(value(integrand, lower, upper)).toBe(expected);
	});
});

describe('Q49 : la valeur entière reste entière', () => {
	it.each([
		['0{,}5x', '0', '2', '1'],
		['1{,}5x^2', '0', '2', '4'],
		['2x+0{,}5', '0', '2', '5']
	])('∫ %s de %s à %s = %s', (integrand, lower, upper, expected) => {
		expect(value(integrand, lower, upper)).toBe(expected);
	});
});

describe('Q49 : la valeur ne tombe pas juste → fraction', () => {
	it.each([
		['0{,}5x^2', '0', '1', '\\dfrac{1}{6}'],
		['0{,}5x^2', '1', '2', '\\dfrac{7}{6}'],
		['0{,}5x^2', '0', '2', '\\dfrac{4}{3}']
	])('∫ %s de %s à %s = %s', (integrand, lower, upper, expected) => {
		expect(value(integrand, lower, upper)).toBe(expected);
	});
});

describe('Q49 : sans décimal tapé, rien ne change', () => {
	it.each([
		['\\dfrac{1}{2}x', '0', '1', '\\dfrac{1}{4}'],
		['x', '0', '1', '\\dfrac{1}{2}'],
		['\\dfrac{1}{2}e^x', '0', '1', '\\dfrac{1}{2} \\exponentialE - \\dfrac{1}{2}']
	])('∫ %s de %s à %s = %s', (integrand, lower, upper, expected) => {
		expect(value(integrand, lower, upper)).toBe(expected);
	});
});

describe('Q49 : la correction affiche la valeur décimale', () => {
	it('∫₀¹ 0,5x dx : dernière ligne « = 0.25 » (virgule posée par l’affichage)', () => {
		const { steps } = definite('0{,}5x', '0', '1');
		const rendered = new PedagogicalIntegrationRenderer().renderAll(steps, {
			schoolLevel: 'lycee',
			verbosity: 'detailed'
		});
		const last = rendered.at(-1);
		expect(last?.expressionLatex?.replace(/\s/g, '')).toMatch(/&=0\.25\\end\{aligned\}$/);
	});
});
