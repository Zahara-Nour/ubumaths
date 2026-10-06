/**
 * `.diff` : la variable de dérivation ne se devine plus d'après le dernier mot.
 *
 * Défaut relevé en revue de #876 (2026-10-06) : `DiffCommand.parseInput`
 * prenait le DERNIER mot de la saisie pour la variable. Or l'espace est aussi
 * un produit implicite (`x^2 y`) et le dernier mot est souvent l'argument
 * d'une fonction (`\sin x + \cos x`). Résultats faux, sans erreur :
 * `\sin x + \cos x` → « Unexpected token: EOF » (le `x` final arraché),
 * `x^2 y` → `d/dy(x^2) = 0`, `a x^2 + b x` → `2ax`.
 *
 * Règle : la variable explicite se donne après une VIRGULE de premier niveau
 * (`expr, t`). Sans elle : `x` si elle apparaît, sinon la seule variable libre.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../../web/web-repl-engine';
import { splitVariableArgument } from '../../core/variable-argument';

function diff(input: string): string {
	const result = new WebReplEngine().execute(`.diff ${input}`);
	expect(result.error?.message).toBeUndefined();
	expect(result.success).toBe(true);
	return result.output;
}

describe('.diff : le dernier mot fait partie de l’expression', () => {
	it.each([
		[
			'\\sin x + \\cos x',
			'd/dx(sin(x)+cos(x)) = cos(x)-sin(x)\nLaTeX: \\cos\\left( x \\right) - \\sin\\left( x \\right)'
		],
		['x^2 y', 'd/dx(x^2y) = 2xy\nLaTeX: 2 x y'],
		['a x^2 + b x', 'd/dx(ax^2+bx) = 2ax+b\nLaTeX: 2 a x + b']
	])('.diff %s', (input, expected) => {
		expect(diff(input)).toBe(expected);
	});
});

describe('.diff : variable explicite après une virgule', () => {
	it.each([
		['t^2 + t, t', 'd/dt(t^2+t) = 2t+1\nLaTeX: 2 t + 1'],
		['a x^2 + b x, x', 'd/dx(ax^2+bx) = 2ax+b\nLaTeX: 2 a x + b'],
		['x^2 + y^2, y', 'd/dy(x^2+y^2) = 2y\nLaTeX: 2 y'],
		['x^2 y, y', 'd/dy(x^2y) = x^2\nLaTeX: x^2']
	])('.diff %s', (input, expected) => {
		expect(diff(input)).toBe(expected);
	});
});

describe('.diff : variable par défaut', () => {
	it('la seule variable libre, quand x n’apparaît pas', () => {
		expect(diff('t^3')).toBe('d/dt(t^3) = 3t^2\nLaTeX: 3 t^2');
	});

	it('e n’est pas une variable candidate', () => {
		expect(diff('e^{2t}')).toBe('d/dt(e^{2t}) = 2e^{2t}\nLaTeX: 2 e^{2 t}');
	});

	it('une constante se dérive toujours en x', () => {
		expect(diff('5')).toBe('d/dx(5) = 0\nLaTeX: 0');
	});

	it('plusieurs variables sans x : on demande laquelle, on ne devine pas', () => {
		const result = new WebReplEngine().execute('.diff a t^2 + b t');
		expect(result.success).toBe(false);
		expect(result.error?.message).toBe(
			'Plusieurs variables possibles (a, b, t) : précise laquelle après une virgule, par exemple « a t^2 + b t, t ».'
		);
	});

	it('l’espace n’est plus un séparateur : `t^2 + t t` est t² + t·t', () => {
		expect(diff('t^2 + t t')).toBe('d/dt(t^2+tt) = 4t\nLaTeX: 4 t');
	});
});

describe('splitVariableArgument', () => {
	it.each([
		['x^2 y', { expression: 'x^2 y', variable: null }],
		['t^2 + t, t', { expression: 't^2 + t', variable: 't' }],
		['a x^2 + b x ,x', { expression: 'a x^2 + b x', variable: 'x' }],
		['\\theta^2, \\theta', { expression: '\\theta^2', variable: '\\theta' }],
		['x_1^2, x_1', { expression: 'x_1^2', variable: 'x_1' }],
		// Virgule dans des parenthèses ou des accolades : pas un séparateur
		['f(x, y)', { expression: 'f(x, y)', variable: null }],
		['3{,}5x', { expression: '3{,}5x', variable: null }],
		// Après la virgule, autre chose qu'un nom : pas un séparateur
		['3,5x', { expression: '3,5x', variable: null }],
		[', x', { expression: ', x', variable: null }]
	])('%s', (input, expected) => {
		expect(splitVariableArgument(input)).toEqual(expected);
	});
});

describe('.diff : variable indicée (revue #880)', () => {
	// ⚠️ La variable tapée `x_1` ne correspondait pas au nœud `x_1` de
	// l'expression (un indice, de base `x`) : la dérivée valait 0.
	it.each([
		['x_1^2, x_1', 'd/dx_1(x_1^2) = 2x_1\nLaTeX: 2 x_1'],
		['x_{12}^2, x_{12}', 'd/dx_12(x_12^2) = 2x_12\nLaTeX: 2 x_{12}'],
		// Seule variable libre : x_1, pas x
		['x_1^2', 'd/dx_1(x_1^2) = 2x_1\nLaTeX: 2 x_1'],
		// x apparaît seule : x_1 est une autre variable, constante en x
		['x^2 + x_1', 'd/dx(x^2+x_1) = 2x\nLaTeX: 2 x'],
		['x^2 + x_1^2, x_1', 'd/dx_1(x^2+x_1^2) = 2x_1\nLaTeX: 2 x_1']
	])('.diff %s', (input, expected) => {
		expect(diff(input)).toBe(expected);
	});

	it('la variable doit être une variable', () => {
		const result = new WebReplEngine().execute('.diff x^2, 2');
		expect(result.success).toBe(false);
	});
});
