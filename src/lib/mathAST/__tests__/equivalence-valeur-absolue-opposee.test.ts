/**
 * |u| = |−u| pour toute expression u (outil n° 79, chantier
 * `outil-valeur-absolue-distance`, décision de David du 2026-11-28) : une
 * distance écrite à l'envers, `|3 − x|` pour `|x − 3|`, est juste.
 * Avant : seul un argument aux termes tous négatifs (`|−x − 1|`) était
 * retourné ; un argument aux signes mélangés restait opaque, et `|3 − x|`
 * était refusé.
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../parser';
import { areEquivalent } from '../equivalence';

const equivalent = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('areEquivalent : valeur absolue de deux opposés', () => {
	it.each([
		['|3-x|', '|x-3|'],
		['\\left|3-x\\right|', '\\left|x-3\\right|'],
		['|a-b|', '|b-a|'],
		['|x-\\pi|', '|\\pi-x|'],
		['|1-x^2|', '|x^2-1|'],
		['|2-3x|', '|3x-2|'],
		['|x-y+1|', '|y-x-1|'],
		['\\left|\\dfrac{1-x}{2}\\right|', '\\left|\\dfrac{x-1}{2}\\right|'],
		['\\left|\\dfrac{3-x}{x+1}\\right|', '\\left|\\dfrac{x-3}{x+1}\\right|'],
		['|3-x|+|x-3|', '2|x-3|'],
		['|3-x|-|x-3|', '0'],
		// déjà justes avant, à garder
		['|-x-1|', '|x+1|'],
		['|-x|', '|x|'],
		['|5-(-2)|', '|-2-5|']
	])('%s ≡ %s', (a, b) => {
		expect(equivalent(a, b)).toBe(true);
	});

	it.each([
		['|x+3|', '|x-3|'],
		['x-3', '|x-3|'],
		['3-x', '|x-3|'],
		['|x-3|', '|x-2|'],
		['|3-x|', '-|x-3|'],
		['|a-b|', '|a+b|']
	])('%s ≢ %s', (a, b) => {
		expect(equivalent(a, b)).toBe(false);
	});
});
