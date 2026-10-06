/**
 * Développement de Taylor d'une expression qui contient un PARAMÈTRE littéral
 * (`a x^2`, `sin(a x)`) : la variable reste x, `a` reste une lettre.
 *
 * Avant : chaque dérivée était évaluée NUMÉRIQUEMENT au point ; `a` n'ayant
 * pas de valeur, l'évaluation échouait dès le terme 0 (« Unknown value type »).
 */

import { describe, it, expect } from 'vitest';
import { taylorExpand, TaylorError } from '../index';
import { parse } from '../../cli/core/pipeline';
import { toCustom } from '../../custom-generator';
import type { MathNode } from '../../types';

function ast(input: string): MathNode {
	const parsed = parse(input);
	if (parsed.ast === undefined || parsed.ast === null) throw new Error(`illisible : ${input}`);
	return parsed.ast;
}

function expand(input: string, terms: number, center = 0): string {
	return toCustom(taylorExpand(ast(input), { variable: 'x', center, terms }));
}

describe('Taylor avec un paramètre littéral', () => {
	it.each([
		['a*x^2', 3, 'ax^2'],
		['3a x^2', 3, '3ax^2'],
		['sin(a x)', 3, 'ax'],
		['sin(a x)', 4, 'ax-{{a^3}/6}x^3'],
		['a e^x', 3, 'a+ax+{a/2}x^2'],
		['e^(k x)', 3, '1+kx+{{k^2}/2}x^2']
	])('%s, %i termes → %s', (input, terms, expected) => {
		expect(expand(input, terms)).toBe(expected);
	});

	it('point différent de 0 : 3a x^2 en 1', () => {
		expect(expand('3a x^2', 3, 1)).toBe('3a+6a(x-1)+3a(x-1)^2');
	});

	it('sans paramètre, la forme numérique est inchangée', () => {
		expect(expand('3e^x', 3)).toBe('3+3x+{3/2}x^2');
	});

	it('un point où la fonction n’est pas définie reste refusé, paramètre ou non', () => {
		expect(() => taylorExpand(ast('ln(a x)'), { variable: 'x', terms: 3 })).toThrow(TaylorError);
	});
});
