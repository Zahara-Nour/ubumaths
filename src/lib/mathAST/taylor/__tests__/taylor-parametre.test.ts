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

function expand(input: string, order: number, center = 0): string {
	return toCustom(taylorExpand(ast(input), { variable: 'x', center, order }));
}

describe('Taylor avec un paramètre littéral', () => {
	it.each([
		['a*x^2', 2, 'ax^2'],
		['3a x^2', 2, '3ax^2'],
		['sin(a x)', 2, 'ax'],
		['sin(a x)', 3, 'ax-{{a^3}/6}x^3'],
		['a e^x', 2, 'a+ax+{a/2}x^2'],
		['e^(k x)', 2, '1+kx+{{k^2}/2}x^2']
	])('%s, ordre %i → %s', (input, order, expected) => {
		expect(expand(input, order)).toBe(expected);
	});

	it('point différent de 0 : 3a x^2 en 1', () => {
		expect(expand('3a x^2', 2, 1)).toBe('3a+6a(x-1)+3a(x-1)^2');
	});

	it('sans paramètre, la forme numérique est inchangée', () => {
		expect(expand('3e^x', 2)).toBe('3+3x+{3/2}x^2');
	});

	it('un point où la fonction n’est pas définie reste refusé, paramètre ou non', () => {
		expect(() => taylorExpand(ast('ln(a x)'), { variable: 'x', order: 2 })).toThrow(TaylorError);
	});

	it('i n’est pas un paramètre : a i x^2 est refusé, jamais rendu a x^2', () => {
		expect(() => taylorExpand(ast('a i x^2'), { variable: 'x', order: 2 })).toThrow(TaylorError);
	});

	it('un paramètre qui rend la fonction indéfinie pour UNE valeur d’essai ne suffit pas à refuser', () => {
		// √(a−1) est indéfini pour a = 0,7319 mais défini pour a = 2,31
		expect(expand('sqrt(a-1) x', 2)).toBe('sqrt(a-1)x');
	});

	it('ln(-a x) en 1 : ln(-a) + (x−1) − (x−1)²/2', () => {
		// f'(x) = 1/x → 1 en 1 ; f''(x) = −1/x² → −1, divisé par 2!
		expect(expand('ln(-a x)', 2, 1)).toBe('ln(-a)+(x-1)-{1/2}(x-1)^2');
	});

	it('ln(a x) en −1 : ln(-a) − (x+1) − (x+1)²/2', () => {
		// f'(−1) = 1/(−1) = −1 ; f''(−1) = −1/(−1)² = −1, divisé par 2!
		expect(expand('ln(a x)', 2, -1)).toBe('ln(-a)-(x+1)-{1/2}(x+1)^2');
	});
});
