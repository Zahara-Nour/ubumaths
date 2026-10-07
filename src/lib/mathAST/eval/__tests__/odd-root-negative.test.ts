/**
 * Racine d'indice impair d'un négatif (décision du 2026-10-07) : ⁿ√a = −ⁿ√|a|
 * pour n impair (∛x définie sur ℝ, programme). Indice pair d'un négatif : non
 * défini (erreur / NaN). Les puissances fractionnaires `x^{1/3}` ne changent pas.
 */
import { describe, it, expect } from 'vitest';
import { evaluate, evaluateNodeToApproximatedNumber } from '../evaluate';
import { compile, createSafeEvaluator } from '../compile';
import { isEvalValue } from '../types';
import { parseLatex } from '../../parser';

function decimalValue(latex: string): number | 'unevaluable' {
	const result = evaluate(parseLatex(latex), { mode: 'decimal' });
	if (!isEvalValue(result)) return 'unevaluable';
	return typeof result.value === 'number' ? result.value : Number.NaN;
}

describe('evaluate — racine d’indice impair d’un négatif', () => {
	it('∛(−8) = −2', () => {
		expect(evaluateNodeToApproximatedNumber(parseLatex('\\sqrt[3]{-8}'))).toBe(-2);
		expect(decimalValue('\\sqrt[3]{-8}')).toBe(-2);
	});

	it('⁵√(−32) = −2', () => {
		expect(evaluateNodeToApproximatedNumber(parseLatex('\\sqrt[5]{-32}'))).toBe(-2);
	});

	it('∛(−2) ≈ −1,2599 (non entier)', () => {
		expect(evaluateNodeToApproximatedNumber(parseLatex('\\sqrt[3]{-2}'))).toBeCloseTo(
			-Math.cbrt(2),
			12
		);
	});

	it('∛x en x = −1 vaut −1', () => {
		expect(evaluateNodeToApproximatedNumber(parseLatex('\\sqrt[3]{-1}'))).toBe(-1);
	});

	it('⁴√(−16) reste une erreur', () => {
		expect(() => evaluateNodeToApproximatedNumber(parseLatex('\\sqrt[4]{-16}'))).toThrow();
	});

	it('√(−4) reste une erreur', () => {
		expect(() => evaluateNodeToApproximatedNumber(parseLatex('\\sqrt{-4}'))).toThrow();
	});

	it('(−8)^{1/3} inchangé : erreur', () => {
		expect(() => evaluateNodeToApproximatedNumber(parseLatex('(-8)^{\\frac{1}{3}}'))).toThrow();
	});
});

describe('compile — racine d’indice impair d’un négatif', () => {
	const cubeRoot = compile(parseLatex('\\sqrt[3]{x}'));

	it('∛(−8) = −2', () => {
		expect(cubeRoot({ x: -8 })).toBeCloseTo(-2, 12);
	});

	it('∛x en x = −1 vaut −1', () => {
		expect(cubeRoot({ x: -1 })).toBeCloseTo(-1, 12);
	});

	it('⁵√(−32) = −2', () => {
		expect(compile(parseLatex('\\sqrt[5]{x}'))({ x: -32 })).toBeCloseTo(-2, 12);
	});

	it('⁴√(−16) reste NaN', () => {
		expect(compile(parseLatex('\\sqrt[4]{x}'))({ x: -16 })).toBeNaN();
	});

	it('(−8)^{1/3} inchangé : NaN', () => {
		expect(compile(parseLatex('x^{\\frac{1}{3}}'))({ x: -8 })).toBeNaN();
	});

	it('tracé : ∛x a des valeurs pour x < 0 (createSafeEvaluator)', () => {
		const f = createSafeEvaluator(parseLatex('\\sqrt[3]{x}'));
		expect(f(-27)).toBeCloseTo(-3, 12);
		expect(f(-0.001)).toBeCloseTo(-0.1, 12);
	});
});
