/**
 * La réciproque `f^{-1}` et la dérivée `f'` ne sont pas `f`.
 *
 * Mesuré sur `main` à `0d4d80e9b` : `areEquivalent(f^{-1}(x), f(x))` valait
 * `true`. Le nœud fonction porte `isInverse` / `derivativeOrder`, mais
 * l'empreinte (`hashMathNode`) ne les lisait pas : deux appels de même nom et
 * mêmes arguments recevaient la même empreinte, et une réponse d'élève fausse
 * (f au lieu de f⁻¹) était ACCEPTÉE.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../equivalence';
import { parseLatex } from '../parser';
import { hashMathNode } from '../normal/hash';
import { equivalenceForm } from '../normal/normalize';

const eq = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));
const formHash = (s: string) => equivalenceForm(parseLatex(s)).hash;

describe('réciproque f^{-1} : un objet distinct de f', () => {
	it.each([
		['f^{-1}(x)', 'f(x)'],
		['f^{-1}(2x)', 'f^{-1}(x)'],
		['g^{-1}(x)', 'f^{-1}(x)'],
		['\\sin^{-1}(x)', '\\sin(x)']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
		expect(eq(b, a)).toBe(false);
	});

	it.each([
		['f^{-1}(x)', 'f^{-1}(x)'],
		['f^{-1}(2x)', 'f^{-1}(x+x)'],
		['\\sin^{-1}(x)', '\\arcsin(x)'],
		['\\sin(x)^{-1}', '\\frac{1}{\\sin(x)}']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
		expect(eq(b, a)).toBe(true);
	});
});

describe('dérivée et puissance de fonction : distinctes de f', () => {
	it.each([
		["f'(x)", 'f(x)'],
		["f''(x)", "f'(x)"],
		['f^2(x)', 'f(x)'],
		['\\sin^2(x)', '\\sin(x)']
	])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
		expect(eq(b, a)).toBe(false);
	});

	// `f^2(x)` est lu par le parseur comme le PRODUIT `f²·x` (une variable `f`),
	// pas comme une puissance de fonction : seul `\sin^2(x)` (fonction nommée)
	// porte `power`. Choix du parseur, hors du décideur d'équivalence.
	it.each([
		["f'(x)", "f'(x)"],
		['\\sin^2(x)', '\\sin(x)^2']
	])('%s ≡ %s', (a, b) => {
		expect(eq(a, b)).toBe(true);
	});
});

describe('empreinte : deux expressions non équivalentes, deux empreintes', () => {
	it.each([
		['f^{-1}(x)', 'f(x)'],
		["f'(x)", 'f(x)'],
		["f''(x)", "f'(x)"]
	])('hashMathNode(%s) ≠ hashMathNode(%s)', (a, b) => {
		expect(hashMathNode(parseLatex(a))).not.toBe(hashMathNode(parseLatex(b)));
	});

	it.each([
		['f^{-1}(x)', 'f(x)'],
		["f'(x)", 'f(x)'],
		['f^{-1}(2x)', 'f^{-1}(x)']
	])('forme d’équivalence : hash(%s) ≠ hash(%s)', (a, b) => {
		expect(formHash(a)).not.toBe(formHash(b));
	});

	it('deux réciproques identiques : même empreinte', () => {
		expect(hashMathNode(parseLatex('f^{-1}(x)'))).toBe(hashMathNode(parseLatex('f^{-1}(x)')));
		expect(formHash('f^{-1}(x)')).toBe(formHash('f^{-1}(x)'));
	});
});
