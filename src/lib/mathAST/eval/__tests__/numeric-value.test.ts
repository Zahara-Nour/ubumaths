/**
 * Valeur approchée d'un nœud constant : fini ou `null`, et la variante qui
 * laisse passer ±∞ (bornes d'intervalles).
 */

import { describe, it, expect } from 'vitest';
import { computeNumericValue, computeNumericValueOrInfinity } from '../numeric-value';
import { parseLatex } from '../../parser';
import { infinity } from '../../factory';

describe('computeNumericValue', () => {
	it('évalue les constantes : fractions, racines, π', () => {
		expect(computeNumericValue(parseLatex('\\frac{2}{3}'))).toBeCloseTo(2 / 3, 12);
		expect(computeNumericValue(parseLatex('\\sqrt{2}'))).toBeCloseTo(Math.SQRT2, 12);
		expect(computeNumericValue(parseLatex('\\pi'))).toBeCloseTo(Math.PI, 12);
		expect(computeNumericValue(parseLatex('-0.01'))).toBe(-0.01);
	});

	it('rend null pour une variable, une division par 0 ou un infini', () => {
		expect(computeNumericValue(parseLatex('x+1'))).toBeNull();
		expect(computeNumericValue(parseLatex('\\frac{1}{0}'))).toBeNull();
		expect(computeNumericValue(infinity('positive'))).toBeNull();
	});
});

describe('computeNumericValueOrInfinity', () => {
	it('laisse passer ±∞', () => {
		expect(computeNumericValueOrInfinity(infinity('positive'))).toBe(Infinity);
		expect(computeNumericValueOrInfinity(infinity('negative'))).toBe(-Infinity);
	});

	it('rend la valeur finie, ou null pour une variable', () => {
		expect(computeNumericValueOrInfinity(parseLatex('\\frac{\\pi}{2}'))).toBeCloseTo(
			Math.PI / 2,
			12
		);
		expect(computeNumericValueOrInfinity(parseLatex('x'))).toBeNull();
	});
});
