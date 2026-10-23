/**
 * `tidy` ne perd pas le domaine (S3, lot 4a du chantier simplify-carte,
 * décision de David du 2026-10-23, journal § 35).
 *
 * Une base ne se simplifie entre numérateur et dénominateur que si elle reste
 * au dénominateur, ou si elle ne peut pas s'annuler. Sinon `x/x` resterait
 * défini en 0 une fois écrit `1`. Avec une hypothèse déclarée (ADR 0012),
 * « x non nul » ou « x > 0 », la simplification redevient permise.
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { areEquivalent } from '../../equivalence';
import type { TypeContext } from '../../numtype';

const t = (s: string, typeCtx?: TypeContext) => toCustom(tidy(parseCustom(s), { typeCtx }));

const nonZero: TypeContext = { assumptions: new Map([['x', { sign: 'nonzero' as const }]]) };
const positive: TypeContext = { assumptions: new Map([['x', { sign: 'positive' as const }]]) };

describe('tidy — une base qui peut s’annuler ne quitte pas le dénominateur', () => {
	it.each([
		['x/x', 'x/x'],
		['3x/x', '{3x}/x'],
		['x^2/x', 'x^2/x'],
		['x^3/x', 'x^3/x'],
		['(x*y)/(x*z)', '{xy}/{xz}'],
		['x*x^(-1)', 'x/x'],
		['(x+1)/(x+1)', '{x+1}/{x+1}'],
		['sqrt(x)/sqrt(x)', 'sqrt(x)/sqrt(x)']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});

	it('(2x)/(4x) : le nombre se simplifie, pas la lettre', () => {
		expect(t('(2x)/(4x)')).toBe('x/{2x}');
	});

	it('(−x−1)/(x+1) : le signe sort, la somme reste des deux côtés', () => {
		expect(t('(-x-1)/(x+1)')).toBe('-{x+1}/{x+1}');
	});
});

describe('tidy — simplifications qui gardent le domaine', () => {
	it.each([
		['x/x^2', '1/x'],
		['x^2/x^3', '1/x'],
		['(x+1)^2/(x+1)^3', '1/{x+1}'],
		['e^x/e^x', '1'],
		['exp(x)/exp(x)', '1'],
		['2^x/2^x', '1'],
		['(x^2+1)/(x^2+1)', '1'],
		['(x^2+1)^2/(x^2+1)', 'x^2+1'],
		['π*x/π', 'x'],
		// Q1 (David, 2026-10-23) : `x⁰ → 1` gardé, convention des polynômes.
		['x^0', '1']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});
});

describe('tidy — avec une hypothèse déclarée (ADR 0012)', () => {
	it.each([
		['x/x', '1'],
		['3x/x', '3'],
		['x^2/x', 'x'],
		['(2x)/(4x)', '1/2']
	])('x non nul : %s → %s', (input, expected) => {
		expect(t(input, nonZero)).toBe(expected);
	});

	it('x > 0 : x²/x → x', () => {
		expect(t('x^2/x', positive)).toBe('x');
	});

	it('l’hypothèse sur x ne dit rien de y : y/y reste', () => {
		expect(t('y/y', nonZero)).toBe('y/y');
	});

	it('l’hypothèse atteint les arguments d’une fonction', () => {
		expect(t('sin(x/x)', nonZero)).toBe('sin(1)');
	});
});

describe('tidy — invariants sur les formes gardées', () => {
	const cases = [
		'x/x',
		'3x/x',
		'x^2/x',
		'(2x)/(4x)',
		'(-x-1)/(x+1)',
		'x*x^(-1)',
		'sqrt(x)/sqrt(x)'
	];

	it.each(cases)('idempotent : %s', (input) => {
		const once = tidy(parseCustom(input));
		expect(toCustom(tidy(once))).toBe(toCustom(once));
	});

	it.each(cases)('valeur conservée : %s', (input) => {
		const node = parseCustom(input);
		expect(areEquivalent(tidy(node), node)).toBe(true);
	});
});
