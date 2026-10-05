/**
 * `tidy()` et le logarithme d'une puissance de e.
 *
 * Le contrat (docs/wip/tidy-phase0.md, §A) EXCLUT `ln(eˣ) → x` de `tidy` :
 * « appliquer une identité […] reste aux règles de motif et à `normalize` ».
 * Conséquence mesurée (2026-10-05) : le minimum de x² ln x s'affiche
 * `ln(e^{−1/2})·(e^{−1/2})²` au lieu de −1/(2e). Décision de David (option A,
 * 2026-10-05) : l'exclusion est MAINTENUE, tidy garde son contrat, et c'est
 * `normalize` qui réduit ln(eᵃ) → a.
 */

import { describe, it, expect } from 'vitest';
import { tidy } from '../index';
import { normalize, denormalize } from '../../normal';
import { toLatex } from '../../latex-generator';
import { divide, euler, func, number, opposite, superscript, variable } from '../../factory';

describe('ln(e^a) : hors du contrat de tidy', () => {
	it.each([
		[
			'ln(e^{−1/2})',
			func('ln', [superscript(euler(), opposite(divide(number('1'), number('2'), 'fraction')))])
		],
		['ln(e^x)', func('ln', [superscript(euler(), variable('x'))])],
		['ln(e^x), lettre e', func('ln', [superscript(variable('e'), variable('x'))])]
	] as const)('%s reste écrit', (_label, node) => {
		expect(toLatex(tidy(node))).toBe(toLatex(node));
	});

	// Option A (David, 2026-10-05) : l'exclusion est MAINTENUE dans tidy ;
	// c'est `normalize` qui réduit ln(e^a) → a (normal/__tests__/euler-identites-ecriture).
	it.each([
		[
			'ln(e^{−1/2})',
			func('ln', [superscript(euler(), opposite(divide(number('1'), number('2'), 'fraction')))]),
			'-\\dfrac{1}{2}'
		],
		['ln(e^x)', func('ln', [superscript(euler(), variable('x'))]), 'x'],
		['ln(e^x), lettre e', func('ln', [superscript(variable('e'), variable('x'))]), 'x']
	] as const)('%s → a : normalize le fait, pas tidy', (_label, node, expected) => {
		expect(toLatex(denormalize(normalize(node)))).toBe(expected);
	});
});
