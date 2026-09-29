/**
 * Hypothèses de l'énoncé (ADR 0012) : « Soit x > 0 », « n entier ».
 *
 * Le décideur compare sur l'intersection des domaines ∩ le domaine DÉCLARÉ.
 * Sans hypothèse, rien ne change (convention du 2026-09-20). Les numéros
 * renvoient à la spécification validée (`docs/wip/hypotheses-enonce-progress.md`,
 * sections C et D).
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent } from '../../equivalence';
import { parseLatex } from '../../parser';
import type { AnswerAssumptions } from '../../assumptions';

const eq = (a: string, b: string, assumptions?: AnswerAssumptions) =>
	areEquivalent(parseLatex(a), parseLatex(b), assumptions ? { assumptions } : undefined);

const X_POSITIVE: AnswerAssumptions = { x: 'positive' };
const X_NONNEGATIVE: AnswerAssumptions = { x: 'nonnegative' };
const X_NONZERO: AnswerAssumptions = { x: 'nonzero' };
const N_INTEGER: AnswerAssumptions = { n: 'integer' };
const N_NATURAL: AnswerAssumptions = { n: 'natural' };

// Les paires que les hypothèses rendent justes (section C).
const POSITIVE_PAIRS: [string, string][] = [
	['x^{a}\\times x^{b}', 'x^{a+b}'],
	['x^{a+2}', 'x^{2}\\times x^{a}'],
	['x\\times x^{a}', 'x^{a+1}'],
	['\\frac{x^{a}}{x^{b}}', 'x^{a-b}'],
	['\\left(x^{a}\\right)^{b}', 'x^{ab}'],
	['2^{x}\\times x^{x}', '(2x)^{x}'],
	['\\sqrt{x^{2}}', 'x'],
	['|x|', 'x']
];
const NONNEGATIVE_PAIRS: [string, string][] = [
	['\\sqrt{x^{2}}', 'x'],
	['|x|', 'x'],
	['\\sqrt{4x^{2}}', '2x']
];
const INTEGER_PAIRS: [string, string][] = [
	['(-2)^{2n}', '4^{n}'],
	['(-1)^{2n}', '1'],
	['(-1)^{n}\\times(-1)^{n}', '1'],
	['\\left((-2)^{n}\\right)^{2}', '4^{n}'],
	['(-2)^{2n+1}', '-2\\times 4^{n}'],
	['3\\times(-1)^{2n}', '3']
];

describe('sans hypothèse, les verdicts actuels (13)', () => {
	it.each([...POSITIVE_PAIRS, ...NONNEGATIVE_PAIRS, ...INTEGER_PAIRS])('%s ≢ %s', (a, b) => {
		expect(eq(a, b)).toBe(false);
	});

	it('un objet vide ne change rien', () => {
		expect(eq('x^{a}\\times x^{b}', 'x^{a+b}', {})).toBe(false);
		expect(eq('(-2)^{2n}', '4^{n}', {})).toBe(false);
	});

	it('ce qui était juste le reste', () => {
		expect(eq('2^{x+1}', '2\\times 2^{x}')).toBe(true);
		expect(eq('\\sqrt{x^{2}}', '|x|')).toBe(true);
		expect(eq('5\\times(-2)^{n}', '-10\\times(-2)^{n-1}')).toBe(true);
	});
});

describe('x > 0 (8)', () => {
	it.each(POSITIVE_PAIRS)('%s ≡ %s', (a, b) => {
		expect(eq(a, b, X_POSITIVE)).toBe(true);
	});

	it('ce qui était juste le reste', () => {
		expect(eq('2^{x+1}', '2\\times 2^{x}', X_POSITIVE)).toBe(true);
		expect(eq('\\sqrt{x^{2}}', '|x|', X_POSITIVE)).toBe(true);
		expect(eq('x^{2}\\times x^{3}', 'x^{5}', X_POSITIVE)).toBe(true);
	});
});

describe('x ≥ 0 (9)', () => {
	it.each(NONNEGATIVE_PAIRS)('%s ≡ %s', (a, b) => {
		expect(eq(a, b, X_NONNEGATIVE)).toBe(true);
	});

	it('PAS x^a·x^b ≡ x^{a+b} (0^a indéfini ou nul selon a)', () => {
		expect(eq('x^{a}\\times x^{b}', 'x^{a+b}', X_NONNEGATIVE)).toBe(false);
		expect(eq('x^{a+2}', 'x^{2}\\times x^{a}', X_NONNEGATIVE)).toBe(false);
	});
});

describe('x ≠ 0 (10) : aucun gain attendu, garde', () => {
	it('ce qui était juste le reste', () => {
		expect(eq('x^{0}', '1', X_NONZERO)).toBe(true);
		expect(eq('\\frac{x^{3}}{x^{3}}', '1', X_NONZERO)).toBe(true);
	});

	it('rien de nouveau', () => {
		expect(eq('x^{a}\\times x^{b}', 'x^{a+b}', X_NONZERO)).toBe(false);
		expect(eq('|x|', 'x', X_NONZERO)).toBe(false);
		expect(eq('\\sqrt{x^{2}}', 'x', X_NONZERO)).toBe(false);
	});
});

describe('n entier (11) et n entier naturel (12)', () => {
	it.each(INTEGER_PAIRS)('n ∈ ℤ : %s ≡ %s', (a, b) => {
		expect(eq(a, b, N_INTEGER)).toBe(true);
	});

	it.each(INTEGER_PAIRS)('n ∈ ℕ : %s ≡ %s', (a, b) => {
		expect(eq(a, b, N_NATURAL)).toBe(true);
	});
});

describe('gardes anti faux positif (14-17)', () => {
	it('14. une hypothèse sur une AUTRE variable ne change rien', () => {
		expect(eq('x^{a}\\times x^{b}', 'x^{a+b}', { y: 'positive' })).toBe(false);
		expect(eq('|x|', 'x', { y: 'nonnegative' })).toBe(false);
		expect(eq('(-2)^{2n}', '4^{n}', { m: 'integer' })).toBe(false);
		expect(eq('(-2)^{2n}', '4^{n}', { x: 'positive' })).toBe(false);
	});

	it('15. x > 0 ne donne pas x^a ≡ x^b', () => {
		expect(eq('x^{a}', 'x^{b}', X_POSITIVE)).toBe(false);
		expect(eq('x^{a}\\times x^{b}', 'x^{ab}', X_POSITIVE)).toBe(false);
	});

	it('15. x > 0 ne donne pas (−x)^a·(−x)^b ≡ (−x)^{a+b}', () => {
		expect(eq('(-x)^{a}\\times(-x)^{b}', '(-x)^{a+b}', X_POSITIVE)).toBe(false);
	});

	it('15. l’exposant n’est pas concerné : x > 0 ne dit rien de a', () => {
		expect(eq('a^{x}\\times a^{y}', 'a^{x+y}', X_POSITIVE)).toBe(false);
		expect(eq('|a|', 'a', X_POSITIVE)).toBe(false);
	});

	it('16. n entier ne donne pas 2^n ≡ 3^n, ni (−2)^n ≡ 2^n', () => {
		expect(eq('2^{n}', '3^{n}', N_INTEGER)).toBe(false);
		expect(eq('(-2)^{n}', '2^{n}', N_INTEGER)).toBe(false);
		expect(eq('(-2)^{3n}', '8^{n}', N_INTEGER)).toBe(false);
		expect(eq('(-1)^{n}', '1', N_INTEGER)).toBe(false);
		expect(eq('(-2)^{n}\\times(-2)^{n}', '(-4)^{n}', N_NATURAL)).toBe(false);
	});

	it('16. n entier ne dit rien d’un exposant non entier', () => {
		expect(eq('(-2)^{n}', '4^{\\frac{n}{2}}', N_INTEGER)).toBe(false);
		expect(eq('(-2)^{2x}', '4^{x}', N_INTEGER)).toBe(false);
	});

	it('un signe moins sous la valeur absolue ne fait rien perdre', () => {
		expect(eq('|-x|', '|x|', X_POSITIVE)).toBe(true);
		expect(eq('|-x|', 'x', X_POSITIVE)).toBe(true);
		expect(eq('|-x|', 'x', X_NONNEGATIVE)).toBe(true);
		expect(eq('|-x|', '-x', X_POSITIVE)).toBe(false);
		expect(eq('4\\left|-x\\right|', '4\\sqrt{x^{2}}', X_POSITIVE)).toBe(true);
	});

	it('17. x > 0 déclaré : |x| pour x juste, −x pour x faux', () => {
		expect(eq('|x|', 'x', X_POSITIVE)).toBe(true);
		expect(eq('-x', 'x', X_POSITIVE)).toBe(false);
		expect(eq('|x-1|', 'x-1', X_POSITIVE)).toBe(false);
	});
});

describe('les options existantes cohabitent', () => {
	it('un budget épuisé reste prudent, hypothèses ou non', () => {
		const controller = new AbortController();
		controller.abort();
		expect(
			areEquivalent(parseLatex('x^{a}\\times x^{b}'), parseLatex('x^{a+b}'), {
				signal: controller.signal,
				assumptions: X_POSITIVE
			})
		).toBe(false);
	});
});
