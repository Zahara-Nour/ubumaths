/**
 * Forme indéterminée ∞ − ∞ levée par croissances comparées.
 *
 * Régression : lim_{x→+∞} (e^x − x) rendait −∞ au lieu de +∞.
 * Chaque cas asserte la VALEUR exacte (signe de l'infini), pas seulement
 * le statut.
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { positiveInfinity, negativeInfinity } from '../../factory';
import { parseLatex } from '../../parser';
import { parseCustom } from '../../parser/custom';
import { toLatex } from '../../latex-generator';
import { computeVariations } from '../../variations/compute';

type Expected = 'positive' | 'negative';

function limitSign(latex: string, at: 'plus' | 'minus'): string {
	const target = at === 'plus' ? positiveInfinity() : negativeInfinity();
	const result = evaluateLimit(parseLatex(latex), 'x', target);
	if (result.value?.type === 'infinity') return result.value.sign;
	return `${result.status}:${result.value?.type ?? 'null'}`;
}

const CASES: Array<[string, 'plus' | 'minus', Expected]> = [
	['e^x - x', 'plus', 'positive'],
	['\\exp(x) - x', 'plus', 'positive'],
	['-x + e^x', 'plus', 'positive'],
	['e^x - x', 'minus', 'positive'],
	['x - e^x', 'plus', 'negative'],
	['e^x - x^2', 'plus', 'positive'],
	['x^2 - e^x', 'plus', 'negative'],
	['e^x - x^5', 'plus', 'positive'],
	['e^{2x} - e^x', 'plus', 'positive'],
	['\\ln(x) - x', 'plus', 'negative'],
	['x - \\ln(x)', 'plus', 'positive'],
	['\\sqrt{x} - \\ln(x)', 'plus', 'positive'],
	['x - \\sqrt{x}', 'plus', 'positive'],
	['e^x - e^{-x}', 'plus', 'positive'],
	['x^2 - x', 'plus', 'positive'],
	['e^x + x', 'plus', 'positive']
];

describe('∞ − ∞ : le terme dominant fixe le signe', () => {
	it.each(CASES)('lim (%s) en %s∞ = %s∞', (latex, at, expected) => {
		expect(limitSign(latex, at)).toBe(expected);
	});
});

describe('.variations e^x − x : minimum global 1 en 0, +∞ aux deux bornes', () => {
	function study() {
		return computeVariations(parseCustom('e^x - x'), {
			variable: 'x',
			includeBoundaryLimits: true
		});
	}

	function limitAt(result: ReturnType<typeof study>, point: string): string {
		const found = (result.boundaryLimits ?? []).find((bl) => toLatex(bl.point) === point);
		if (found === undefined) throw new Error(`pas de limite en ${point}`);
		return typeof found.limit === 'string' ? found.limit : toLatex(found.limit);
	}

	it('limites +∞ en −∞ et en +∞', () => {
		const result = study();
		expect(limitAt(result, '-\\infty')).toBe('infinity');
		expect(limitAt(result, '+\\infty')).toBe('infinity');
	});

	it('minimum GLOBAL 1 atteint en 0', () => {
		const result = study();
		expect(result.extrema).toHaveLength(1);
		const extremum = result.extrema[0];
		expect(extremum.type).toBe('global_minimum');
		expect(toLatex(extremum.x)).toBe('0');
		expect(toLatex(extremum.y)).toBe('1');
	});
});

describe('Polynômes : les monômes de même degré se cumulent', () => {
	it.each([
		['x - 2x', 'plus', 'negative'],
		['x - 2x', 'minus', 'positive'],
		['x^2 + x - 3x^2', 'plus', 'negative'],
		['3x^3 - x^2 - 3x^3', 'plus', 'negative']
	] as const)('lim (%s) en %s∞ = %s∞', (latex, at, expected) => {
		expect(limitSign(latex, at)).toBe(expected);
	});
});
