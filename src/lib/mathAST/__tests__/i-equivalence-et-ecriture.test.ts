/**
 * La lettre `i` lue comme l'unité imaginaire (décision de David du 2026-10-11) :
 * l'équivalence calcule avec i² = −1, `toCustom` l'écrit `i` (aller-retour
 * custom), et `tidy` la range comme π et e, devant les lettres.
 */
import { describe, it, expect } from 'vitest';
import { parseLatex } from '../parser';
import { parseCustom } from '../parser/custom';
import { areEquivalent } from '../equivalence';
import { toCustom } from '../custom-generator';
import { toLatex } from '../latex-generator';
import { tidy } from '../tidy';
import { nodesEqual } from '../pattern/match';

const equivalent = (a: string, b: string) => areEquivalent(parseLatex(a), parseLatex(b));

describe('areEquivalent : i² = −1', () => {
	it.each([
		['i^2', '-1'],
		['(1+i)^2', '2i'],
		['\\dfrac{1}{i}', '-i'],
		['a i', 'i a'],
		['3i\\cdot 2i', '-6'],
		['2-3\\imaginaryI', '2-3i']
	])('%s ≡ %s', (a, b) => {
		expect(equivalent(a, b)).toBe(true);
	});

	it.each([
		['i^2', '1'],
		['a i', 'a'],
		['(1+i)^2', '2'],
		['u_i', 'u_1']
	])('%s ≢ %s', (a, b) => {
		expect(equivalent(a, b)).toBe(false);
	});
});

describe('toCustom écrit i, que parseCustom relit à l’identique', () => {
	it.each([
		['2i-3', '2i-3'],
		['i x', 'ix'],
		['x i', 'xi'],
		['3x i', '3xi'],
		['i^2', 'i^2'],
		['\\pi i', '\\pi i'],
		['e^{i\\pi}', 'e^{i\\pi}'],
		['\\frac{i}{2}', 'i/2'],
		['i_1', 'i_1'],
		['u_i', 'u_i']
	])('%s s’écrit %s et se relit à l’identique', (latex, custom) => {
		const node = parseLatex(latex);
		expect(toCustom(node)).toBe(custom);
		expect(nodesEqual(parseCustom(toCustom(node)), node)).toBe(true);
	});
});

// Ordre choisi : les constantes e, i, π, dans cet ordre, devant TOUTE lettre, latine
// (minuscule ou majuscule) ou grecque (`x\pi` → `\pi x`, `\alpha i` → `i\alpha`).
describe('tidy : e, i, π devant toutes les lettres', () => {
	it.each([
		['x i', '\\imaginaryI x'],
		['x\\pi', '\\pi x'],
		['3 x i', '3 \\imaginaryI x'],
		['i\\theta', '\\imaginaryI \\theta'],
		['i\\beta', '\\imaginaryI \\beta'],
		['i\\Delta', '\\imaginaryI \\Delta'],
		['iA', '\\imaginaryI A'],
		['e^{i\\alpha}', '\\exponentialE^{\\imaginaryI \\alpha}'],
		['\\alpha\\pi', '\\pi \\alpha'],
		['A\\pi', '\\pi A'],
		['\\pi i', '\\imaginaryI \\pi'],
		['i e', '\\exponentialE \\imaginaryI'],
		['\\pi e', '\\exponentialE \\pi']
	])('%s → %s', (input, expected) => {
		expect(toLatex(tidy(parseLatex(input)))).toBe(expected);
	});
});
