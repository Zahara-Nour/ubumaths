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

describe('simplify garde i dans un produit', () => {
	it.each([
		['a i', 'a i'],
		['i a', 'a i'],
		['a i b', 'a b i'],
		['x i', 'i x'],
		['i x^2', 'i x^2'],
		['-a i', '-a i'],
		['\\frac{2ai}{2}', 'a i'],
		['a(i)', 'a i'],
		['e i', '\\exponentialE i'],
		['\\pi i', '\\pi i'],
		['2 a i', '2 a i'],
		['a i + a i', '2 a i'],
		['3 i', '3 i'],
		['\\frac{i}{2}', '\\dfrac{i}{2}'],
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
