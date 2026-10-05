/**
 * Limites d'expressions écrites avec la puissance `e^u`.
 *
 * Mesuré avant : le moteur ne reconnaissait que la fonction `exp(…)` — ses
 * règles de croissances comparées comprises. `x e^x` en −∞ rendait
 * `unsupported`, alors que `x exp(x)` rendait 0. La base d'Euler arrive sous
 * deux formes : la constante `euler` (parseur custom, atelier) et la lettre `e`
 * (parseur LaTeX).
 */

import { describe, it, expect } from 'vitest';
import { evaluateLimit } from '../evaluate';
import { parseCustom } from '../../parser/custom';
import { parseLatex } from '../../parser';
import { toLatex } from '../../latex-generator';
import { infinity, number } from '../../factory';
import type { MathNode } from '../../types';
import type { LimitDirection } from '../types';

const MINUS_INF = infinity('negative');
const PLUS_INF = infinity('positive');

function limitLatex(
	expr: MathNode,
	approach: MathNode,
	direction: LimitDirection,
	variable = 'x'
): string | null {
	const result = evaluateLimit(expr, variable, approach, direction);
	return result.value === null ? null : toLatex(result.value);
}

describe('e^u, constante d’Euler (parseur custom)', () => {
	it.each([
		['x e^x', MINUS_INF, 'right', '0'],
		['x e^x', PLUS_INF, 'left', '+\\infty'],
		['x e^(-x)', MINUS_INF, 'right', '-\\infty'],
		['x e^(-x)', PLUS_INF, 'left', '0'],
		// croissance comparée avec u = 2x : x e^{2x} = ½·(2x)e^{2x}
		['x e^(2x)', MINUS_INF, 'right', '0'],
		['x e^(2x)', PLUS_INF, 'left', '+\\infty'],
		['e^(-x^2)', MINUS_INF, 'right', '0'],
		['e^(-x^2)', PLUS_INF, 'left', '0'],
		['e^x/x', MINUS_INF, 'right', '0'],
		['e^x/x', PLUS_INF, 'left', '+\\infty'],
		['e^x/x', number('0'), 'left', '-\\infty'],
		['e^x/x', number('0'), 'right', '+\\infty']
	] as const)('lim %s en %o (%s)', (f, approach, direction, expected) => {
		expect(limitLatex(parseCustom(f), approach, direction)).toBe(expected);
	});
});

describe('e^u, lettre e (parseur LaTeX)', () => {
	it('x e^{x} en −∞ : 0', () => {
		expect(limitLatex(parseLatex('xe^{x}'), MINUS_INF, 'right')).toBe('0');
	});
	it('e^{-x^2} en +∞ : 0', () => {
		expect(limitLatex(parseLatex('e^{-x^{2}}'), PLUS_INF, 'left')).toBe('0');
	});
});

describe('Ce qui ne bouge pas', () => {
	it('une valeur finie par substitution garde son écriture : e^x en 1', () => {
		const result = evaluateLimit(parseCustom('e^x'), 'x', number('1'), 'both');
		expect(result.value).not.toBeNull();
		expect(toLatex(result.value!)).not.toMatch(/\\exp(?!onentialE)/);
	});
});
