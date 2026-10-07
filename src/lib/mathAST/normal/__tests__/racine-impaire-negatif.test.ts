/**
 * Une racine d'indice IMPAIR d'un entier négatif se réduit : `∛(−8) = −2`,
 * `⁵√(−32) = −2`, et `∛(−16) = −2∛2`.
 *
 * ## Le trou, mesuré le 2026-10-07
 *
 * `simplify(∛(−8))` rendait `∛(−8)` tel quel, et la limite de `∛x` en `−8`
 * ne se réduisait pas : la normalisation ne lisait qu'un radicande entier
 * POSITIF, et rendait tout autre nombre opaque (cf. le garde `rootIndex !== 2n`
 * de `normalizeSqrt`).
 *
 * Une racine d'indice impair est définie sur ℝ entier et impaire :
 * `ⁿ√(−m) = −ⁿ√m`. Une racine d'indice PAIR d'un négatif, elle, ne se réduit
 * pas — `√(−4)` reste ce qu'il est.
 *
 * ⚠️ L'évaluation numérique (`eval/`) n'est pas concernée : décision de David
 * en attente.
 */

import { describe, it, expect } from 'vitest';
import { simplify } from '../../simplify/simplify';
import { areEquivalent } from '../../equivalence';
import { evaluateLimit } from '../../limits/evaluate';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';

const simplified = (latex: string) => toLatex(simplify(parseLatex(latex)).result);

describe('racine d’indice impair d’un entier négatif', () => {
	it.each([
		['\\sqrt[3]{-8}', '-2'],
		['\\sqrt[5]{-32}', '-2'],
		['\\sqrt[3]{-27}', '-3'],
		['\\sqrt[3]{-1}', '-1'],
		['\\sqrt[3]{-(-8)}', '2'],
		['2\\sqrt[3]{-8}', '-4']
	])('simplify(%s) = %s', (input, expected) => {
		expect(simplified(input)).toBe(expected);
	});

	it('∛(−16) = −2∛2 (racine non entière : le facteur sort quand même)', () => {
		expect(areEquivalent(parseLatex('\\sqrt[3]{-16}'), parseLatex('-2\\sqrt[3]{2}'))).toBe(true);
	});

	it.each([
		['\\sqrt[3]{-8}', '-2'],
		['\\sqrt[5]{-32}', '-2']
	])('%s ≡ %s', (a, b) => {
		expect(areEquivalent(parseLatex(a), parseLatex(b))).toBe(true);
	});

	it('la limite de ∛x en −8 vaut −2', () => {
		const result = evaluateLimit(parseLatex('\\sqrt[3]{x}'), 'x', parseLatex('-8'));
		expect(result.value === null ? null : toLatex(result.value)).toBe('-2');
	});
});

describe('aucun faux positif', () => {
	it('∛(−8) n’est pas 2', () => {
		expect(areEquivalent(parseLatex('\\sqrt[3]{-8}'), parseLatex('2'))).toBe(false);
	});

	it('une racine PAIRE d’un négatif ne se réduit pas', () => {
		expect(simplified('\\sqrt[4]{-16}')).not.toBe('-2');
		expect(simplified('\\sqrt{-4}')).not.toBe('-2');
		expect(areEquivalent(parseLatex('\\sqrt[4]{-16}'), parseLatex('-2'))).toBe(false);
	});
});
