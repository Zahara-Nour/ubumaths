/**
 * Composition, cas puissance : uⁿ (n entier constant) quand u tend vers ±∞,
 * ou vers 0 avec n < 0.
 *
 * La composition ne connaissait que xⁿ (variable nue) et les nœuds fonction
 * (ln, exp, √) ; la continuité (stratégie 2.45) ne vaut que pour une limite
 * FINIE de u. `(x-3)^2` en +∞ sortait « Je ne sais pas calculer cette limite »,
 * et `.variations (x-3)^2` n'avait pas de tableau (V66, 2026-10-26).
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { powerSign } from '../sign-tracking';
import { parseLatex } from '../../parser';
import { infinity, number } from '../../factory';
import { toLatex } from '../../latex-generator';
import type { LimitDirection } from '../types';

function valueOf(latex: string, at: string, direction: LimitDirection = 'both'): string | null {
	const point =
		at === '+∞' ? infinity('positive') : at === '-∞' ? infinity('negative') : number(at);
	const result = evaluateLimit(parseLatex(latex), 'x', point, direction);
	return result.value === null ? null : toLatex(result.value);
}

describe('uⁿ avec u → ±∞', () => {
	it.each([
		['(x-3)^2', '+∞', '+\\infty'],
		['(x-3)^2', '-∞', '+\\infty'],
		['(x+1)^2', '+∞', '+\\infty'],
		['(2x)^2', '-∞', '+\\infty'],
		['(1-x)^4', '+∞', '+\\infty'],
		['(x^2+1)^3', '-∞', '+\\infty'],
		['(x^2-x)^3', '+∞', '+\\infty'],
		['(x-3)^3', '+∞', '+\\infty'],
		['(x-3)^3', '-∞', '-\\infty'],
		['(-x)^3', '+∞', '-\\infty'],
		['(\\ln x)^2', '+∞', '+\\infty'],
		// base en forme indéterminée, levée par le moteur entier
		['(x-\\ln x)^2', '+∞', '+\\infty'],
		['(e^x-x)^3', '+∞', '+\\infty']
	])('%s en %s → %s', (latex, at, expected) => {
		expect(valueOf(latex, at)).toBe(expected);
	});

	it.each([
		['(x-3)^{-2}', '+∞'],
		['(x-3)^{-2}', '-∞'],
		['(x-3)^{-1}', '+∞'],
		['(x-3)^{-1}', '-∞']
	])('%s en %s → 0', (latex, at) => {
		expect(valueOf(latex, at)).toBe('0');
	});
});

describe('uⁿ avec u → ±∞ en un point fini', () => {
	it('(ln x)² en 0⁺ → +∞', () => {
		expect(valueOf('(\\ln x)^2', '0', 'right')).toBe('+\\infty');
	});

	it('(ln x)³ en 0⁺ → −∞', () => {
		expect(valueOf('(\\ln x)^3', '0', 'right')).toBe('-\\infty');
	});

	it('(ln x)⁻² en 0⁺ → 0', () => {
		expect(valueOf('(\\ln x)^{-2}', '0', 'right')).toBe('0');
	});
});

describe('ce qui marchait déjà ne change pas', () => {
	it.each([
		['(x-3)^2', '3', '0'],
		['(x-3)^{-2}', '3', '+\\infty'],
		['(e^x)^2', '-∞', '0'],
		['(\\frac{1}{x})^2', '+∞', '0'],
		['(x-3)^{\\frac{1}{3}}', '-∞', '-\\infty']
	])('%s en %s → %s', (latex, at, expected) => {
		expect(valueOf(latex, at)).toBe(expected);
	});

	it('(x−3)⁻³ en 3 : pas de limite (côtés différents)', () => {
		expect(valueOf('(x-3)^{-3}', '3')).toBeNull();
	});

	it('(ln x)² en −∞ : hors du domaine', () => {
		expect(valueOf('(\\ln x)^2', '-∞')).toBeNull();
	});
});

describe('formes indéterminées : la puissance ne conclut pas à tort', () => {
	it.each([
		['(x-3)^2-x^2', '+∞', '-\\infty'],
		['(x+1)^2-(x-1)^2', '+∞', '+\\infty'],
		['(x+1)^2-(x-1)^2', '-∞', '-\\infty'],
		['\\frac{(x-3)^2}{x^2}', '+∞', '1'],
		['\\frac{(2x+1)^3}{x^3}', '+∞', '8'],
		['\\frac{x^3}{(x-3)^2}', '+∞', '+\\infty'],
		['\\frac{e^x}{(x-3)^2}', '+∞', '+\\infty'],
		['\\frac{\\ln x}{(x-3)^2}', '+∞', '0']
	])('%s en %s → %s', (latex, at, expected) => {
		expect(valueOf(latex, at)).toBe(expected);
	});
});

describe('powerSign : exposant négatif', () => {
	it('u → 0⁺, n = −1 → +∞', () => {
		expect(powerSign({ type: 'zero-plus' }, -1)).toEqual({ type: 'pos-infinity' });
	});

	it('u → 0⁻, n = −1 → −∞', () => {
		expect(powerSign({ type: 'zero-minus' }, -1)).toEqual({ type: 'neg-infinity' });
	});

	it('u → 0 (signe inconnu), n = −2 → +∞', () => {
		expect(powerSign({ type: 'zero' }, -2)).toEqual({ type: 'pos-infinity' });
	});

	it('u → 0 (signe inconnu), n = −1 → inconnu', () => {
		expect(powerSign({ type: 'zero' }, -1)).toEqual({ type: 'unknown' });
	});

	it('u → −∞, n = −1 → 0⁻', () => {
		expect(powerSign({ type: 'neg-infinity' }, -1)).toEqual({ type: 'zero-minus' });
	});
});
