/**
 * `evaluateNumeric` : évaluation flottante en un point, utilisée par le moteur
 * des limites (sign-tracking, indeterminate). Conventions : `null` si
 * l'expression n'a pas de valeur réelle, ±∞ gardés (pôles).
 */

import { describe, expect, it } from 'vitest';
import { evaluateNumeric } from '../numeric';
import { parseLatex } from '../../parser';

describe('evaluateNumeric', () => {
	it('évalue un polynôme', () => {
		expect(evaluateNumeric(parseLatex('x^2+2x+1'), 'x', 3)).toBeCloseTo(16);
	});

	it('rend ±∞ à un pôle, selon le signe du numérateur', () => {
		expect(evaluateNumeric(parseLatex('\\frac{1}{x-2}'), 'x', 2)).toBe(Infinity);
		expect(evaluateNumeric(parseLatex('\\frac{-1}{x-2}'), 'x', 2)).toBe(-Infinity);
	});

	it('rend null pour 0/0, une racine ou un ln hors domaine, une autre variable', () => {
		expect(evaluateNumeric(parseLatex('\\frac{x-2}{x-2}'), 'x', 2)).toBeNull();
		expect(evaluateNumeric(parseLatex('\\sqrt{x}'), 'x', -1)).toBeNull();
		expect(evaluateNumeric(parseLatex('\\ln(x)'), 'x', -1)).toBeNull();
		expect(evaluateNumeric(parseLatex('x+y'), 'x', 1)).toBeNull();
	});

	it('rend −∞ pour ln(0)', () => {
		expect(evaluateNumeric(parseLatex('\\ln(x)'), 'x', 0)).toBe(-Infinity);
	});

	// Lot 6a (simplify-carte § 25) : la puissance et la réciproque d'une
	// fonction, π et e étaient ignorés
	it('évalue la puissance d’une fonction : sin²(x) en 1', () => {
		expect(evaluateNumeric(parseLatex('\\sin^2(x)'), 'x', 1)).toBeCloseTo(Math.sin(1) ** 2);
	});

	it('évalue la réciproque : cos⁻¹(x) en 0,5 = arccos(0,5)', () => {
		expect(evaluateNumeric(parseLatex('\\cos^{-1}(x)'), 'x', 0.5)).toBeCloseTo(Math.acos(0.5));
	});

	it('évalue π et e', () => {
		expect(evaluateNumeric(parseLatex('\\pi x'), 'x', 2)).toBeCloseTo(2 * Math.PI);
		expect(evaluateNumeric(parseLatex('e^{x}'), 'x', 1)).toBeCloseTo(Math.E);
	});
});
