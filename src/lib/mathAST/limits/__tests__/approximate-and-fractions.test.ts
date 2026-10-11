/**
 * Revue #871 : deux défauts du moteur de limites.
 *
 * 1. Une approximation prise pour une limite : lim_{x→+∞} x/√x rendait
 *    « 200000 » avec le statut 'exact' (repli numérique de L'Hôpital). Les
 *    quotients de puissances (degrés généralisés) se traitent exactement, et
 *    un repli numérique ne porte plus jamais le statut 'exact'.
 * 2. ∞ − ∞ avec des fractions : x² − x³/(x+1) sortait « non supportée ».
 *    Recours : réduction au même dénominateur (développement), quantité
 *    conjuguée pour √A − B.
 *
 * Chaque cas asserte la VALEUR exacte.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { positiveInfinity, negativeInfinity, number } from '../../factory';
import { parseLatex } from '../../parser';
import { parseCustom } from '../../parser/custom';
import { toLatex } from '../../latex-generator';
import { computeVariations } from '../../variations/compute';
import { convertLimitResult } from '../../variations/boundary-limits';
import type { LimitResult } from '../types';

function limitAt(latex: string, at: 'plus' | 'minus'): LimitResult {
	const target = at === 'plus' ? positiveInfinity() : negativeInfinity();
	return evaluateLimit(parseLatex(latex), 'x', target);
}

/** `+inf`, `-inf`, ou le LaTeX de la valeur finie ; sinon `statut:null`. */
function describeLimit(result: LimitResult): string {
	if (result.value === null) return `${result.status}:null`;
	if (result.value.type === 'infinity') {
		return result.value.sign === 'positive' ? '+inf' : '-inf';
	}
	return toLatex(result.value);
}

describe('Quotients de puissances en ±∞ : degrés généralisés, valeur exacte', () => {
	it.each([
		['\\frac{x}{\\sqrt{x}}', 'plus', '+inf'],
		['\\frac{x^{3/2}}{x}', 'plus', '+inf'],
		['\\frac{\\sqrt{x}}{x}', 'plus', '0'],
		['\\frac{x}{\\sqrt[3]{x}}', 'plus', '+inf'],
		['\\frac{x}{x^{1/3}}', 'plus', '+inf'],
		['\\frac{x+1}{\\sqrt{x}}', 'plus', '+inf'],
		['\\frac{x\\sqrt{x}}{x}', 'plus', '+inf'],
		['\\frac{x^2}{\\sqrt{x}}', 'plus', '+inf'],
		['\\frac{-3x}{\\sqrt{x}}', 'plus', '-inf'],
		['\\frac{\\sqrt{x}}{\\sqrt{x}+1}', 'plus', '1'],
		['\\frac{2\\sqrt{x}+1}{3\\sqrt{x}}', 'plus', '\\dfrac{2}{3}'],
		['\\frac{x}{\\sqrt{x^2+1}}', 'minus', '-1'],
		['\\frac{x}{\\sqrt{4x^2+1}}', 'plus', '\\dfrac{1}{2}']
	] as const)('lim (%s) en %s∞ = %s', (latex, at, expected) => {
		expect(describeLimit(limitAt(latex, at))).toBe(expected);
	});

	it('x/√x en +∞ : jamais une valeur finie déclarée exacte', () => {
		const result = limitAt('\\frac{x}{\\sqrt{x}}', 'plus');
		expect(result.status).not.toBe('exact');
		expect(result.value?.type).toBe('infinity');
	});
});

describe("Repli numérique de L'Hôpital : statut 'approximate', jamais 'exact'", () => {
	it("une valeur approchée n'est pas présentée comme limite par les variations", () => {
		const approximate: LimitResult = {
			variable: 'x',
			approach: positiveInfinity(),
			direction: 'both',
			status: 'approximate',
			value: number('200000'),
			indeterminateForm: '∞/∞',
			technique: 'lhopital',
			steps: []
		};
		expect(convertLimitResult(approximate)).toBe('indeterminate');
	});

	it('x/(√x + ln x) en +∞ : +∞ (le repli numérique non confirmé est écarté, 2026-10-08)', () => {
		// La valeur approchée de L'Hôpital doit être confirmée par f près de la
		// borne ; écartée, une autre stratégie conclut exactement.
		const result = limitAt('\\frac{x}{\\sqrt{x}+\\ln(x)}', 'plus');
		expect(result.status).toBe('infinite');
		expect(convertLimitResult(result)).toBe('infinity');
	});

	it("valeur négative lue exactement après L'Hôpital : (1 − e^x)/x en 0 = −1", () => {
		const result = evaluateLimit(parseLatex('\\frac{1-e^x}{x}'), 'x', number('0'));
		expect(result.status).toBe('exact');
		expect(describeLimit(result)).toBe('-1');
	});

	it('.variations x/√x : +∞ en +∞, pas 200000', () => {
		const result = computeVariations(parseCustom('x/sqrt(x)'), {
			variable: 'x',
			includeBoundaryLimits: true
		});
		const atPlus = (result.boundaryLimits ?? []).find((bl) => toLatex(bl.point) === '+\\infty');
		expect(atPlus?.limit).toBe('infinity');
	});

	it('(x+1)/√x en 0⁺ reste +∞ (limite juste inchangée)', () => {
		const result = evaluateLimit(parseLatex('\\frac{x+1}{\\sqrt{x}}'), 'x', number('0'), 'right');
		expect(describeLimit(result)).toBe('+inf');
	});
});

describe('∞ − ∞ avec fractions : même dénominateur, développement, conjugué', () => {
	it.each([
		['x^2 - \\frac{x^3}{x+1}', 'plus', '+inf'],
		['x - \\frac{3x^2}{x+1}', 'plus', '-inf'],
		['\\frac{x^2}{x+1} - x', 'plus', '-1'],
		['\\frac{x^2+1}{x} - x', 'plus', '0'],
		['x - \\frac{x^2}{x+1}', 'plus', '1'],
		['\\frac{x^2+x}{x} - x', 'plus', '1'],
		['(x+1)^2 - x^2', 'plus', '+inf'],
		['(x+1)^2 - x^2', 'minus', '-inf'],
		['(x-1)(x+2) - x^2', 'plus', '+inf'],
		['\\sqrt{x^2+1} - x', 'plus', '0'],
		['\\sqrt{x^2+2x} - x', 'plus', '1'],
		['\\frac{x}{\\sqrt{x}} - \\sqrt{x}', 'plus', '0']
	] as const)('lim (%s) en %s∞ = %s', (latex, at, expected) => {
		expect(describeLimit(limitAt(latex, at))).toBe(expected);
	});
});

describe('Fraction rationnelle en −∞ : le signe suit la parité de deg P − deg Q', () => {
	it.each([
		['\\frac{x^3}{x+1}', '+inf'],
		['\\frac{x^3}{x}', '+inf'],
		['\\frac{-x^3}{x+1}', '-inf'],
		['\\frac{x^2}{x+1}', '-inf'],
		['\\frac{x^4}{x+1}', '-inf']
	] as const)('lim (%s) en −∞ = %s', (latex, expected) => {
		expect(describeLimit(limitAt(latex, 'minus'))).toBe(expected);
	});
});
