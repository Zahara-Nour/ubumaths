/**
 * L'unité imaginaire `i` ne disparaît pas d'un produit (bug trouvé en revue de #898).
 *
 * Cause : un terme de coefficient `i` (rationnel 1, sans radical, drapeau
 * `hasImaginaryUnit`) était pris pour un coefficient 1 — par le hash de la forme
 * normale (`a i` et `a` avaient le même hash : `areEquivalent` les disait égaux) et
 * par `denormalize` (`a i` → `a`, `-a i` → `-a`).
 */

import { describe, it, expect } from 'vitest';
import { simplify } from '../simplify';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { normalize, denormalize } from '../../normal';
import { areEquivalent } from '../../equivalence';

const simp = (s: string) => toLatex(simplify(parseLatex(s)).result);
const norm = (s: string) => toLatex(denormalize(normalize(parseLatex(s))));
const hash = (s: string) => normalize(parseLatex(s)).hash;

// La lettre `i` est lue `complex(0, 1)` et s'écrit `\\imaginaryI` (décision de David du
// 2026-10-11) ; elle se range comme π et e, devant les lettres (`\\pi a`).
describe('simplify garde i dans un produit', () => {
	it.each([
		['a i', '\\imaginaryI a'],
		['i a', '\\imaginaryI a'],
		['a i b', '\\imaginaryI a b'],
		['x i', '\\imaginaryI x'],
		['i x^2', '\\imaginaryI x^2'],
		['-a i', '-\\imaginaryI a'],
		['\\frac{2ai}{2}', '\\imaginaryI a'],
		['a(i)', '\\imaginaryI a'],
		['e i', '\\exponentialE \\imaginaryI'],
		['\\pi i', '\\imaginaryI \\pi'],
		['2 a i', '2 \\imaginaryI a'],
		['a i + a i', '2 \\imaginaryI a'],
		['3 i', '3 \\imaginaryI'],
		['\\frac{i}{2}', '\\dfrac{\\imaginaryI}{2}'],
		['i^2', '-1']
	])('%s → %s', (input, expected) => {
		expect(simp(input)).toBe(expected);
	});
});

// La constante d'Euler se range devant les lettres, comme π (`a\pi` → `\pi a`).
describe('e (Euler) reste dans un produit', () => {
	it.each([
		['a e', '\\exponentialE a'],
		['e a', '\\exponentialE a'],
		['x e', '\\exponentialE x'],
		['a\\pi', '\\pi a']
	])('%s → %s', (input, expected) => {
		expect(simp(input)).toBe(expected);
	});
});

describe('normalize : i dans le hash et à la dénormalisation', () => {
	it('a i et a n’ont pas le même hash', () => {
		expect(hash('a i')).not.toBe(hash('a'));
	});

	it('-a i et -a n’ont pas le même hash', () => {
		expect(hash('-a i')).not.toBe(hash('-a'));
	});

	it('a/i et a n’ont pas le même hash', () => {
		expect(hash('\\frac{a}{i}')).not.toBe(hash('a'));
	});

	it('denormalize(normalize(a i)) garde i', () => {
		expect(norm('a i')).toMatch(/i/);
	});

	it('denormalize(normalize(-a i)) garde i', () => {
		expect(norm('-a i')).toMatch(/i/);
	});
});

describe('areEquivalent : i compte', () => {
	it.each([
		['a i', 'a', false],
		['-a i', '-a', false],
		['x i', 'x', false],
		['a i', 'i a', true],
		['-a i', 'a i \\cdot (-1)', true],
		['\\frac{a}{i}', '-a i', true],
		['a i \\cdot i', '-a', true],
		['\\sqrt{a i}', '\\sqrt{a}', false],
		['(a i)^{3}', 'a^{3}', false],
		['(a i)^{\\frac{1}{3}}', 'a^{\\frac{1}{3}}', false]
	])('%s ≡ %s : %s', (a, b, expected) => {
		expect(areEquivalent(parseLatex(a), parseLatex(b))).toBe(expected);
	});
});
