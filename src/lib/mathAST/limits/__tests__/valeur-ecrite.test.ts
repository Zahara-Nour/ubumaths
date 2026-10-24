/**
 * Écriture de la valeur rendue par `evaluateLimit` : le signe moins se place
 * DEVANT la fraction (`-\dfrac{\sqrt{2}}{2}`, jamais `\dfrac{-\sqrt{2}}{2}`),
 * et une limite d'un énoncé décimal s'écrit en décimal (décision de David, 2026-10-12).
 */

import { describe, it, expect } from 'vitest';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { isLimit } from '../../guards';
import { evaluateLimitNode } from '../evaluate';
import { analyzeContinuity } from '../../analysis/continuity';

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
		['\\lim_{x\\to +\\infty}\\frac{-1.5x}{x}', '-1.5']
	])('%s → %s', (latex, expected) => {
		expect(valueOf(latex)).toBe(expected);
	});

	// Défaut connu V33 (docs/wip/ecarts-a-trier.md) : énoncé exact, valeur en
	// flottant (`0.5`, `0.333…`, `1.414…`) par la composée √ du suivi de signe.
	// Rien n'est verrouillé ici : l'attendu est `\\dfrac{1}{2}`, pas `0.5`.
	it.todo('V33 : \\lim_{x\\to -\\infty}\\sqrt{\\frac{x^2+1}{4x^2}} → \\dfrac{1}{2} (rend 0.5)');
});

describe('discontinuité — limite et valeur au point comparées sous la même écriture', () => {
	// La limite `0.5` (décimal de l'énoncé) et la valeur au point `\\dfrac{1}{2}`
	// (évaluation exacte) sont le même nombre : la fonction est continue.
	it.each(['|x|+0.5', '|x|+1.5', '\\frac{|x|}{2}+0.25', '|2x|-0.75'])(
		'%s est continue en 0',
		(latex) => {
			const result = analyzeContinuity(parseLatex(latex), 'x', { verbosity: 'result' });
			const atZero = result.discontinuities.filter((d) => toLatex(d.point) === '0');
			expect(atZero).toEqual([]);
		}
	);
});

// Lot 5c : la valeur exacte à afficher commune (`eval/exact-value.ts`)
describe('valeur d’une limite — la valeur exacte à afficher commune', () => {
	it.each([
		// Q23 : une seule fraction sur un dénominateur commun
		[
			'\\lim_{x\\to +\\infty}\\left(\\frac{1}{2}+\\frac{\\sqrt{5}}{2}+\\frac{1}{x}\\right)',
			'\\dfrac{1 + \\sqrt{5}}{2}'
		],
		[
			'\\lim_{x\\to 0}\\left(\\frac{1}{2}-\\frac{\\sqrt{5}}{2}+x\\right)',
			'\\dfrac{1 - \\sqrt{5}}{2}'
		]
	])('%s → %s', (latex, expected) => {
		expect(valueOf(latex)).toBe(expected);
	});
});
