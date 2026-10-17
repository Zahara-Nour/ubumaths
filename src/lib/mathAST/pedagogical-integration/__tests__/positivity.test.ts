/**
 * `isCertainlyPositive` : u > 0 CERTAIN, sinon `false` (la valeur absolue reste).
 *
 * Revue du 2026-10-13 : `analyzeSign` ne liste pas tous les zéros d'une
 * fonction périodique et ne lève pas `zerosUnresolved` — cos x « positif » sur
 * [10.9 ; 12] alors qu'il s'annule en 7π/2 ≈ 10.9956. Seul un polynôme
 * (zéros résolus par le solveur) peut être déclaré positif.
 */
import { describe, expect, it } from 'vitest';
import { parseLatex } from '../../parser';
import { isCertainlyPositive } from '../positivity';

const on = (lower: string, upper: string) => ({
	lower: parseLatex(lower),
	upper: parseLatex(upper)
});

describe('isCertainlyPositive', () => {
	it('polynômes : x² + 1 partout, x sur [1 ; e] et [e ; 1]', () => {
		expect(isCertainlyPositive(parseLatex('x^2+1'), 'x')).toBe(true);
		expect(isCertainlyPositive(parseLatex('x'), 'x', on('1', 'e'))).toBe(true);
		expect(isCertainlyPositive(parseLatex('x'), 'x', on('e', '1'))).toBe(true);
	});

	it('polynômes : pas partout (2x + 1), ni sur un intervalle négatif', () => {
		expect(isCertainlyPositive(parseLatex('2x+1'), 'x')).toBe(false);
		expect(isCertainlyPositive(parseLatex('x'), 'x', on('-2', '-1'))).toBe(false);
	});

	it('cos x sur [10.9 ; 12] : s’annule en 7π/2, jamais « certain »', () => {
		expect(isCertainlyPositive(parseLatex('\\cos(x)'), 'x', on('10.9', '12'))).toBe(false);
	});

	it('non polynomiale : false, même vraiment positive (eˣ + 1)', () => {
		expect(isCertainlyPositive(parseLatex('e^x+1'), 'x')).toBe(false);
		expect(isCertainlyPositive(parseLatex('\\cos(x)+2'), 'x')).toBe(false);
	});
});
