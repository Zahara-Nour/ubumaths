/**
 * Continuité de 1/(f(ax + b) − c), f = exp ou ln : la valeur interdite est
 * une discontinuité infinie, à sa valeur EXACTE.
 *
 * Mesuré avant le correctif : 1/(eˣ − 2) n'avait aucune discontinuité,
 * 1/(ln x − 1) seulement 0 (essentielle) — le domaine oubliait ln 2 et e.
 */

import { describe, it, expect } from 'vitest';
import { analyzeContinuity } from '../continuity';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { compile } from '../../eval/compile';

function infinitePoints(latex: string): { latex: string; value: number }[] {
	const result = analyzeContinuity(parseLatex(latex), 'x');
	return result.discontinuities
		.filter((d) => d.type === 'infinite')
		.map((d) => ({ latex: toLatex(d.point), value: compile(d.point)({}) }));
}

describe('la valeur interdite est une discontinuité infinie', () => {
	it.each([
		['\\frac{1}{e^{x}-2}', Math.LN2],
		['\\frac{1}{\\ln(x)-1}', Math.E],
		['\\frac{1}{\\ln(x)+2}', Math.exp(-2)],
		['\\frac{1}{2\\ln(x)-4}', Math.exp(2)],
		['\\frac{1}{e^{2x+1}-3}', (Math.log(3) - 1) / 2]
	])('%s en %f', (latex, root) => {
		const points = infinitePoints(latex);
		expect(points).toHaveLength(1);
		expect(points[0].value).toBeCloseTo(root, 12);
		expect(points[0].latex).not.toMatch(/\d\.\d/);
	});

	it('1/(e^x + 2) : aucune discontinuité', () => {
		const result = analyzeContinuity(parseLatex('\\frac{1}{e^{x}+2}'), 'x');
		expect(result.discontinuities).toEqual([]);
	});
});
