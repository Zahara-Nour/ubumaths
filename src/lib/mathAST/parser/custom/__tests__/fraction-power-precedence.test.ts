/**
 * Priorité de la barre de fraction face à la puissance, en syntaxe maison.
 *
 * Relevé du 2026-09-20 §6.9. Le `/` se traite au niveau de l'**atome nu**
 * (`parseAtomWithFraction`), donc il ne voit ni exposant ni indice ni unité :
 *
 * - `x^2/x` était **refusé** (« Unexpected token: / »), comme `x^2/2`,
 *   `2^3/4`, `sin(x)^2/2`, `20[m]/2` ;
 * - `x/x^2` était lu `(x/x)^2`, donc **faux**.
 *
 * Le parseur LaTeX lit juste dans les deux cas. Touche le REPL et toute saisie
 * en syntaxe maison.
 */

import { describe, it, expect } from 'vitest';
import { parseCustomSafe, parseCustomRDSafe } from '../index';
import { toCustom } from '../../../custom-generator';
import type { MathNode } from '../../../types';

/** Ce que le parseur Pratt rend, ou `null` s'il refuse. */
const pratt = (input: string): MathNode | null => parseCustomSafe(input, { mode: 'tolerant' }).ast;

/** Ce que le parseur par descente récursive rend, ou `null` s'il refuse. */
const rd = (input: string): MathNode | null => parseCustomRDSafe(input, { mode: 'tolerant' }).ast;

describe('une puissance au numérateur', () => {
	// `toCustom` accole un numérateur composite entre accolades, comme pour
	// `{a/b}/c` et `{1/2}x` : c'est la convention linéaire, pas une parenthèse.
	it.each([
		['x^2/x', '{x^2}/x'],
		['x^2/2', '{x^2}/2'],
		['2^3/4', '{2^3}/4'],
		['sin(x)^2/2', '{sin(x)^2}/2'],
		['20[m]/2', '{20[m]}/2'],
		['x^2/y^3', '{x^2}/{y^3}']
	])('%s se lit comme une fraction dont le numérateur est la puissance', (input, expected) => {
		const ast = pratt(input);
		expect(ast).not.toBeNull();
		expect(ast?.type).toBe('division');
		expect(toCustom(ast as MathNode)).toBe(expected);
	});

	it('x^2/x : le numérateur est bien x^2, pas x', () => {
		const ast = pratt('x^2/x');
		expect(ast?.type).toBe('division');
		if (ast?.type !== 'division') return;
		expect(ast.numerator.type).toBe('superscript');
		expect(ast.denominator.type).toBe('variable');
	});
});

describe('une puissance au dénominateur', () => {
	it.each(['x/x^2', '1/x^2', '2/x^3', '1/sin(x)^2'])(
		'%s : la puissance est le dénominateur, pas la fraction entière',
		(input) => {
			const ast = pratt(input);
			expect(ast?.type).toBe('division');
			if (ast?.type !== 'division') return;
			expect(ast.denominator.type).toBe('superscript');
		}
	);
});

describe('les deux parseurs lisent pareil', () => {
	it.each(['x^2/x', 'x/x^2', '1/x^2', 'x^2/2', '2^3/4', '20[m]/2', 'sin(x)^2/2', 'x^2/y^3'])(
		'%s',
		(input) => {
			const a = pratt(input);
			const b = rd(input);
			expect(a).not.toBeNull();
			expect(b).not.toBeNull();
			expect(toCustom(b as MathNode)).toBe(toCustom(a as MathNode));
		}
	);
});

describe('ce qui marchait continue de marcher', () => {
	// Relevé avant correctif (2026-09-20) : la sortie de `toCustom` fait foi.
	it.each([
		['2+3/4+5', '2+3/4+5'],
		['2*3/4', '2*3/4'],
		['a/b', 'a/b'],
		['a/b/c', '{a/b}/c'],
		['1/2x', '{1/2}x'],
		['x/2y', '{x/2}y'],
		['x^2', 'x^2'],
		['x^2^3', 'x^2^3'],
		['2^3', '2^3'],
		['sqrt(2)/2', 'sqrt(2)/2'],
		['(a+b)/2', '(a+b)/2'],
		['a/(b+c)', 'a/(b+c)'],
		['1/2+1/3', '1/2+1/3'],
		['x/2*4', 'x/2*4'],
		['3/6', '3/6'],
		['2/4*6/8', '2/4*6/8'],
		['x[m]', 'x[m]'],
		// `x[m]^2` est refusé depuis le 2026-09-24 (docs/ref/notation-unites.md,
		// piège 2) : on y lisait (x m)² quand l'auteur voulait x m². La puissance
		// d'une grandeur s'écrit avec ses parenthèses.
		['(x[m])^2', '(x[m])^2'],
		['a:/b', 'a:/b'],
		['|x|/2', '|x|/2'],
		['x^2*y', 'x^2*y'],
		['2^3*4', '2^3*4']
	])('%s → %s', (input, expected) => {
		const ast = pratt(input);
		expect(ast).not.toBeNull();
		expect(toCustom(ast as MathNode)).toBe(expected);
	});

	it('x^-1 reste refusé (il faut parenthéser l’exposant négatif)', () => {
		expect(pratt('x^-1')).toBeNull();
	});
});
