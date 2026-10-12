/**
 * Écriture de la valeur rendue par `evaluateLimit` : le signe moins se place
 * DEVANT la fraction (`-\dfrac{\sqrt{2}}{2}`, jamais `\dfrac{-\sqrt{2}}{2}`),
 * et une valeur décimale reste décimale (décision de David, 2026-10-12).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { isLimit } from '../../guards';
import { evaluateLimitNode } from '../evaluate';

function valueOf(latex: string): string | null {
	const limit = parseLatex(latex);
	if (!isLimit(limit)) throw new Error(`pas une limite : ${latex}`);
	const result = evaluateLimitNode(limit);
	return result.value === null ? null : toLatex(result.value);
}

describe('valeur d’une limite — le signe devant la fraction', () => {
	it.each([
		['\\lim_{x\\to +\\infty}\\frac{x}{-\\sqrt{2}x}', '-\\dfrac{\\sqrt{2}}{2}'],
		['\\lim_{x\\to -\\infty}\\frac{x}{-\\sqrt{2}x}', '-\\dfrac{\\sqrt{2}}{2}'],
		['\\lim_{x\\to +\\infty}\\frac{-3x}{2x}', '-\\dfrac{3}{2}'],
		['\\lim_{x\\to +\\infty}\\frac{3x+1}{-2x}', '-\\dfrac{3}{2}']
	])('%s → %s', (latex, expected) => {
		expect(valueOf(latex)).toBe(expected);
	});
});

describe('valeur d’une limite — un décimal reste décimal', () => {
	it.each([
		// Énoncé décimal → valeur décimale
		['\\lim_{x\\to +\\infty}\\frac{0.5x+1}{x}', '0.5'],
		['\\lim_{x\\to +\\infty}\\frac{-1.5x}{x}', '-1.5'],
		// Valeur décimale calculée par la composée √ (sup-04 de l'oracle)
		['\\lim_{x\\to -\\infty}\\sqrt{\\frac{x^2+1}{4x^2}}', '0.5']
	])('%s → %s', (latex, expected) => {
		expect(valueOf(latex)).toBe(expected);
	});
});
