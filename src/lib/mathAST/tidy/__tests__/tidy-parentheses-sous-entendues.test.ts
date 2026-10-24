/**
 * Les parenthèses que la priorité impose, même sans nœud de parenthèse (R2,
 * lot 5f-1 du chantier simplify-carte, Q40 tranchée par David le 2026-10-24,
 * journal § 71-72).
 *
 * Un arbre construit par le moteur (règle du quotient, substitution) porte
 * `a − (b + c)` sans nœud `delimiter` : `tidy` y distribuait le signe
 * (`x(2x+1) − x² − x − 1`), ce que son contrat interdit pour `−(x+2)` écrit.
 * Il le traite désormais comme écrit. `tidyTerms` garde « ouvrir si ça
 * regroupe » : `x − 1 − (x + 1) → −2`.
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { tidyTerms } from '../terms';
import { parseCustom } from '../../parser/custom';
import { toCustom } from '../../custom-generator';
import { areEquivalent } from '../../equivalence';
import { func, number, opposite, power, subtract } from '../../factory';
import type { MathNode } from '../../types';

const p = parseCustom;

/** Chaque cas : l'arbre sans nœud de parenthèse, et son écriture avec. */
const CASES: [string, MathNode, string][] = [
	['x(2x+1) − (x²+x+1)', subtract(p('x(2x+1)'), p('x^2+x+1')), 'x(2x+1)-(x^2+x+1)'],
	['3 − (x+2)', subtract(number(3), p('x+2')), '3-(x+2)'],
	['−(x+2)', opposite(p('x+2')), '-(x+2)'],
	['x² − (x − 1)', subtract(p('x^2'), p('x-1')), 'x^2-(x-1)'],
	['ln(3 − (x+2))', func('ln', [subtract(number(3), p('x+2'))]), 'ln(3-(x+2))'],
	['(1 − (x+1))²', power(subtract(number(1), p('x+1')), number(2)), '(1-(x+1))^2']
];

describe('tidy — a − (b + c) sans nœud de parenthèse se lit comme écrit', () => {
	it.each(CASES)('%s : défaut', (_label, node, written) => {
		expect(toCustom(tidy(node))).toBe(toCustom(tidy(p(written))));
	});

	it.each(CASES)("%s : order: 'kept'", (_label, node, written) => {
		expect(toCustom(tidy(node, { order: 'kept' }))).toBe(
			toCustom(tidy(p(written), { order: 'kept' }))
		);
	});

	it('x(2x+1) − (x²+x+1) garde ses parenthèses', () => {
		expect(toCustom(tidy(CASES[0][1]))).toBe('x(2x+1)-(x^2+x+1)');
	});

	it.each(CASES)('%s : valeur conservée, idempotent', (_label, node) => {
		const once = tidy(node);
		expect(areEquivalent(once, node)).toBe(true);
		expect(toCustom(tidy(once))).toBe(toCustom(once));
	});
});

describe('tidyTerms — ouvrir si ça regroupe', () => {
	it.each([
		['x − 1 − (x + 1)', subtract(p('x-1'), p('x+1')), '-2'],
		['x(2x+1) − (x²+x+1)', subtract(p('x(2x+1)'), p('x^2+x+1')), 'x(2x+1)-(x^2+x+1)'],
		['−(x+2)', opposite(p('x+2')), '-(x+2)']
	])('%s', (_label, node, expected) => {
		expect(toCustom(tidyTerms(node))).toBe(expected);
	});
});
