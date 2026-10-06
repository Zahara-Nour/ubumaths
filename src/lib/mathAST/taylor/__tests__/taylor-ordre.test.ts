/**
 * `order` : le degré maximal du développement (convention des développements
 * limités), décision de David du 2026-10-06 — plus un nombre de termes.
 */

import { describe, it, expect } from 'vitest';
import { taylorExpand, maclaurin, TaylorError, MAX_TAYLOR_ORDER } from '../index';
import { parse } from '../../cli/core/pipeline';
import { toCustom } from '../../custom-generator';
import type { MathNode } from '../../types';

function ast(input: string): MathNode {
	const parsed = parse(input);
	if (parsed.ast === undefined || parsed.ast === null) throw new Error(`illisible : ${input}`);
	return parsed.ast;
}

function expand(input: string, order: number, center = 0, variable = 'x'): string {
	return toCustom(taylorExpand(ast(input), { variable, center, order }));
}

describe('taylorExpand : order = degré maximal', () => {
	it.each([
		['e^x', 4, 0, 'x', '1+x+{1/2}x^2+{1/6}x^3+{1/24}x^4'],
		['sin(x)', 5, 0, 'x', 'x-{1/6}x^3+{1/120}x^5'],
		['cos(x)', 4, 0, 'x', '1-{1/2}x^2+{1/24}x^4'],
		['e^x', 0, 0, 'x', '1'],
		['ln(x)', 2, 1, 'x', '(x-1)-{1/2}(x-1)^2'],
		['a x^2', 2, 0, 'x', 'ax^2'],
		['e^t', 2, 0, 't', '1+t+{1/2}t^2']
	])('%s, ordre %i en %d (variable %s) → %s', (input, order, center, variable, expected) => {
		expect(expand(input, order, center, variable)).toBe(expected);
	});

	it('maclaurin prend un ordre (4 par défaut)', () => {
		expect(toCustom(maclaurin(ast('sin(x)'), 5))).toBe('x-{1/6}x^3+{1/120}x^5');
		expect(toCustom(maclaurin(ast('e^x')))).toBe('1+x+{1/2}x^2+{1/6}x^3+{1/24}x^4');
	});

	it('limite : ordre 19 accepté, 20 refusé (20 termes au plus, comme avant)', () => {
		expect(MAX_TAYLOR_ORDER).toBe(19);
		expect(() => taylorExpand(ast('e^x'), { order: 19 })).not.toThrow();
		expect(() => taylorExpand(ast('e^x'), { order: 20 })).toThrow(TaylorError);
	});

	it('ordre négatif ou non entier : refusé', () => {
		expect(() => taylorExpand(ast('e^x'), { order: -1 })).toThrow(TaylorError);
		expect(() => taylorExpand(ast('e^x'), { order: 1.5 })).toThrow(TaylorError);
	});
});
