/**
 * Des termes qui s'annulent ne font pas perdre le domaine (S3 étendue aux
 * sommes, chantier simplify-carte, David 2026-10-24, journal § 65).
 *
 * `x/x` restait `x/x` (lot 4a), mais `ln(x) − ln(x)` devenait `0`, défini
 * partout : la même perte de domaine, par une soustraction. Des termes
 * semblables de somme nulle ne disparaissent que si leur domaine est ℝ, ou
 * acquis (hypothèse déclarée `typeCtx`, domaine `domain`).
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { areEquivalent } from '../../equivalence';
import type { TypeContext } from '../../numtype';

const t = (s: string, typeCtx?: TypeContext) => toCustom(tidy(parseCustom(s), { typeCtx }));
const written = (s: string) => toCustom(parseCustom(s));

const nonZero: TypeContext = { assumptions: new Map([['x', { sign: 'nonzero' as const }]]) };
const positive: TypeContext = { assumptions: new Map([['x', { sign: 'positive' as const }]]) };

describe('des termes à domaine restreint ne s’annulent pas', () => {
	it.each([
		'ln(x)-ln(x)',
		'1/x-1/x',
		'sqrt(x)-sqrt(x)',
		'x/x-x/x',
		'1/(x-1)-1/(x-1)',
		'x^(1/2)-x^(1/2)',
		'log(x)-log(x)',
		'arcsin(x)-arcsin(x)',
		'2ln(x)-ln(x)-ln(x)',
		'ln(x)+3-ln(x)',
		'sin(1/x)-sin(1/x)',
		'x^x-x^x'
	])('%s reste écrit', (input) => {
		const result = t(input);
		expect(result).not.toBe('0');
		expect(result).not.toBe('3');
		expect(areEquivalent(parseCustom(result), parseCustom(input))).toBe(true);
	});

	it.each([
		['ln(x)-ln(x)', 'ln(x)-ln(x)'],
		['1/x-1/x', '1/x-1/x'],
		['ln(x)+3-ln(x)', 'ln(x)+3-ln(x)']
	])('%s → %s (rien ne change)', (input, expected) => {
		expect(t(input)).toBe(written(expected));
	});

	// Un terme qui ne s'annule pas se regroupe toujours : le domaine reste dit
	it.each([
		['2ln(x)+3ln(x)', '5ln(x)'],
		['ln(x)-ln(x)+ln(x)', 'ln(x)'],
		['1/x+1/x', '2/x']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(written(expected));
	});
});

describe('des termes définis partout s’annulent', () => {
	it.each([
		'x-x',
		'x^2-x^2',
		'e^x-e^x',
		'2^x-2^x',
		'sin(x)-sin(x)',
		'abs(x)-abs(x)',
		'ln(2)-ln(2)',
		'ln(x^2+1)-ln(x^2+1)',
		'sqrt(x^2)-sqrt(x^2)',
		'sqrt(x^2+1)-sqrt(x^2+1)',
		'1/(x^2+1)-1/(x^2+1)',
		'1/e^x-1/e^x'
	])('%s → 0', (input) => {
		expect(t(input)).toBe('0');
	});

	// Un zéro absorbant n'est pas une annulation de termes : inchangé
	it.each([
		['0/x', '0'],
		['0*ln(x)', '0']
	])('%s → %s', (input, expected) => {
		expect(t(input)).toBe(expected);
	});

	it('x − x + 3 → 3', () => {
		expect(t('x-x+3')).toBe('3');
	});
});

describe('sous hypothèse ou sur un domaine acquis, ils s’annulent', () => {
	it('ln(x) − ln(x) → 0 pour x > 0', () => {
		expect(t('ln(x)-ln(x)', positive)).toBe('0');
	});

	it('1/x − 1/x → 0 pour x non nul', () => {
		expect(t('1/x-1/x', nonZero)).toBe('0');
	});

	it('ln(x) − ln(x) → 0 sur le domaine de ln(x)', () => {
		expect(toCustom(tidy(parseCustom('ln(x)-ln(x)'), { domain: [parseCustom('ln(x)')] }))).toBe(
			'0'
		);
	});

	it('1/x − 1/x → 0 sur le domaine de 1/x', () => {
		expect(toCustom(tidy(parseCustom('1/x-1/x'), { domain: [parseCustom('1/x')] }))).toBe('0');
	});
});
