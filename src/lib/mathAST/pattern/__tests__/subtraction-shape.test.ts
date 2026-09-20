/**
 * Un motif `P.sub(a, b)` apparie aussi `−b + a` et `a + (−b)`.
 *
 * `denormalize` pose le premier terme d'une somme tel quel et n'émet une
 * soustraction que pour les suivants : `1 − sin²(x)` ressort `−sin²(x) + 1`,
 * un nœud addition. Les règles écrites avec `P.sub` (`1 − sin² → cos²`, …)
 * ne voyaient donc jamais la sortie de `normalizePass`. Relevé du 2026-09-20,
 * §6.6.
 */

import { describe, it, expect } from 'vitest';
import { P } from '../builder';
import { tryMatch, matches } from '../match';
import { getBindingNode as get } from '../types';
import { parseCustom } from '../../parser/custom';
import { parseLatex } from '../../parser';
import { toCustom } from '../../custom-generator';
import { toLatex } from '../../latex-generator';
import { simplify } from '../../simplify';
import { add, opposite, variable } from '../../factory';

const custom = (s: string) => toCustom(simplify(parseCustom(s)).result);
const latex = (s: string) => toLatex(simplify(parseLatex(s)).result);

describe('P.sub — les deux écritures d’une différence', () => {
	const diff = P.sub(P._('a'), P._('b'));

	it('apparie une soustraction, dans l’ordre', () => {
		const b = tryMatch(diff, parseCustom('x-y'));
		expect(b).toBeDefined();
		expect(toCustom(get(b!, 'a'))).toBe('x');
		expect(toCustom(get(b!, 'b'))).toBe('y');
	});

	it('apparie −b + a comme a − b', () => {
		const b = tryMatch(diff, parseCustom('-x+1'));
		expect(b).toBeDefined();
		expect(toCustom(get(b!, 'a'))).toBe('1');
		expect(toCustom(get(b!, 'b'))).toBe('x');
	});

	it('apparie a + (−b) comme a − b', () => {
		// Construit par la fabrique : `x+(-y)` parsé porte un delimiter autour de
		// l'opposé, et l'appariement est strict sur les délimiteurs (preprocess les
		// retire avant les règles). La forme nue est celle qu'une règle peut produire.
		const b = tryMatch(diff, add(variable('x'), opposite(variable('y'))));
		expect(b).toBeDefined();
		expect(toCustom(get(b!, 'a'))).toBe('x');
		expect(toCustom(get(b!, 'b'))).toBe('y');
	});

	it('n’apparie pas une addition sans opposé', () => {
		expect(matches(diff, parseCustom('x+1'))).toBe(false);
	});

	it('n’apparie pas −a − b (ce n’est pas une différence de deux termes positifs)', () => {
		expect(matches(P.sub(P.num(1), P._('b')), parseCustom('-x-1'))).toBe(false);
	});
});

describe('simplify — les règles « 1 − f² » tirent après normalizePass', () => {
	it('1 − sin²(x) → cos²(x) (syntaxe maison)', () => {
		expect(custom('1-sin(x)^2')).toBe('cos(x)^2');
	});

	it('1 − cos²(x) → sin²(x) (syntaxe maison)', () => {
		expect(custom('1-cos(x)^2')).toBe('sin(x)^2');
	});

	it('1 − \\sin^2(x) → \\cos^2(x) (LaTeX)', () => {
		expect(latex('1-\\sin^2(x)')).toBe('\\cos\\left( x \\right)^2');
	});

	it('cosh²(x) − sinh²(x) reste hors de portée (règle masquée par diff-squares-symbolic, §6.5)', () => {
		// Garde-fou : ce test documente l'état, il ne le valide pas.
		expect(custom('cosh(x)^2-sinh(x)^2')).not.toBe('1');
	});
});
