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
 * Règle (décision de David, 2026-10-06) : la variable explicite se donne après
 * un POINT-VIRGULE de premier niveau (`expr ; t`) — en français la virgule est
 * décimale. Sans lui : `x`, toujours (seconde décision du 2026-10-06, qui
 * remplace « x s'il apparaît, sinon la seule variable libre » de #880) ; si x
 * n'apparaît pas, la sortie l'indique.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../../web/web-repl-engine';
import { bareFunctionName, splitVariableArgument } from '../../core/variable-argument';

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

describe('.diff : variable explicite après un point-virgule', () => {
	it.each([
		['t^2 + t ; t', 'd/dt(t^2+t) = 2t+1\nLaTeX: 2 t + 1'],
		['a x^2 + b x ; x', 'd/dx(ax^2+bx) = 2ax+b\nLaTeX: 2 a x + b'],
		['x^2 + y^2 ; y', 'd/dy(x^2+y^2) = 2y\nLaTeX: 2 y'],
		['x^2 y ; y', 'd/dy(x^2y) = x^2\nLaTeX: x^2']
	])('.diff %s', (input, expected) => {
		expect(diff(input)).toBe(expected);
	});
});

describe('.diff : variable par défaut — x, sauf « ; v » (plus de devinette)', () => {
	// ⚠️ Passés à la nouvelle règle : `t^3` et `e^{2t}` se dérivaient en t
	// (« la seule variable libre »), `a t^2 + b t` était refusé
	// (AMBIGUOUS_VARIABLE). Tous se dérivent désormais en x, avec l'indication.
	it('x n’apparaît pas : dérivée en x (0) et indication', () => {
		expect(diff('t^3')).toBe(
			'd/dx(t^3) = 0\nLaTeX: 0\nCalcul par rapport à x. Pour une autre variable, écris « ; t ».'
		);
	});

	it('e n’est pas proposée comme autre variable', () => {
		expect(diff('e^{2t}')).toBe(
			'd/dx(e^{2t}) = 0\nLaTeX: 0\nCalcul par rapport à x. Pour une autre variable, écris « ; t ».'
		);
	});

	it('une constante se dérive en x, sans indication', () => {
		expect(diff('5')).toBe('d/dx(5) = 0\nLaTeX: 0');
	});

	it('plusieurs variables sans x : plus de refus, en x avec l’indication', () => {
		expect(diff('a t^2 + b t')).toBe(
			'd/dx(at^2+bt) = 0\nLaTeX: 0\nCalcul par rapport à x. Pour une autre variable, écris « ; » suivi de son nom.'
		);
	});

	it('l’espace n’est pas un séparateur : `t^2 + t t ; t` est t² + t·t', () => {
		expect(diff('t^2 + t t ; t')).toBe('d/dt(t^2+tt) = 4t\nLaTeX: 4 t');
	});
});

describe('splitVariableArgument', () => {
	it.each([
		['x^2 y', { expression: 'x^2 y', variable: null }],
		['t^2 + t ; t', { expression: 't^2 + t', variable: 't' }],
		['a x^2 + b x ;x', { expression: 'a x^2 + b x', variable: 'x' }],
		['\\theta^2 ; \\theta', { expression: '\\theta^2', variable: '\\theta' }],
		['x_1^2 ; x_1', { expression: 'x_1^2', variable: 'x_1' }],
		// Virgule dans des parenthèses ou des accolades : pas un séparateur
		// Point-virgule dans des parenthèses ou des crochets : pas un séparateur
		['f(x ; y)', { expression: 'f(x ; y)', variable: null }],
		['[a ; b]', { expression: '[a ; b]', variable: null }],
		// Après le point-virgule, autre chose qu'un nom : pas un séparateur
		['x^2 ; 2', { expression: 'x^2 ; 2', variable: null }],
		// La virgule n'est PLUS un séparateur (décimale en français)
		['t^2 + t, t', { expression: 't^2 + t, t', variable: null }],
		['3,5x', { expression: '3,5x', variable: null }],
		['; x', { expression: '; x', variable: null }]
	])('%s', (input, expected) => {
		expect(splitVariableArgument(input)).toEqual(expected);
	});
});

describe('.diff : variable indicée (revue #880)', () => {
	// ⚠️ La variable tapée `x_1` ne correspondait pas au nœud `x_1` de
	// l'expression (un indice, de base `x`) : la dérivée valait 0.
	it.each([
		['x_1^2 ; x_1', 'd/dx_1(x_1^2) = 2x_1\nLaTeX: 2 x_1'],
		['x_{12}^2 ; x_{12}', 'd/dx_12(x_12^2) = 2x_12\nLaTeX: 2 x_{12}'],
		// Sans « ; » : en x (x_1 est une autre variable), avec l'indication
		[
			'x_1^2',
			'd/dx(x_1^2) = 0\nLaTeX: 0\nCalcul par rapport à x. Pour une autre variable, écris « ; x_1 ».'
		],
		// x apparaît seule : x_1 est une autre variable, constante en x
		['x^2 + x_1', 'd/dx(x^2+x_1) = 2x\nLaTeX: 2 x'],
		['x^2 + x_1^2 ; x_1', 'd/dx_1(x^2+x_1^2) = 2x_1\nLaTeX: 2 x_1']
	])('.diff %s', (input, expected) => {
		expect(diff(input)).toBe(expected);
	});

	it('la variable doit être une variable', () => {
		const result = new WebReplEngine().execute('.diff x^2 ; 2');
		expect(result.success).toBe(false);
	});
});

describe('.diff : une virgule hors groupe reste une erreur de lecture (comme sur main)', () => {
	it('.diff t^2 + t, t', () => {
		const result = new WebReplEngine().execute('.diff t^2 + t, t');
		expect(result.success).toBe(false);
		expect(result.error?.message).toBe('Unexpected token: ,');
	});
});

describe('.diff : pas de fonction usuelle sans parenthèses (décision de David)', () => {
	// ⚠️ `sin x + cos x` se lisait s·i·n·x + c·o·s·x : une dérivée fausse,
	// rendue sans erreur. On refuse, on n'interprète pas.
	it.each([
		['sin x + cos x', 'Écris sin(x) avec des parenthèses.'],
		['ln x', 'Écris ln(x) avec des parenthèses.'],
		['x^2 + cos x', 'Écris cos(x) avec des parenthèses.'],
		['2 sqrt x', 'Écris sqrt(x) avec des parenthèses.'],
		['exp x ; x', 'Écris exp(x) avec des parenthèses.']
	])('.diff %s', (input, message) => {
		const result = new WebReplEngine().execute(`.diff ${input}`);
		expect(result.success).toBe(false);
		expect(result.error?.message).toBe(message);
	});

	it.each([
		[
			'\\sin x + \\cos x',
			'd/dx(sin(x)+cos(x)) = cos(x)-sin(x)\nLaTeX: \\cos\\left( x \\right) - \\sin\\left( x \\right)'
		],
		[
			'sin(x)+cos(x)',
			'd/dx(sin(x)+cos(x)) = cos(x)-sin(x)\nLaTeX: \\cos\\left( x \\right) - \\sin\\left( x \\right)'
		],
		['sin (x)', 'd/dx(sin(x)) = cos(x)\nLaTeX: \\cos\\left( x \\right)'],
		['\\ln x', 'd/dx(ln(x)) = 1/x\nLaTeX: \\dfrac{1}{x}'],
		['\\sqrt{x}', 'd/dx(sqrt(x)) = 1/{2sqrt(x)}\nLaTeX: \\dfrac{1}{2 \\sqrt{x}}']
	])('.diff %s est accepté', (input, expected) => {
		expect(diff(input)).toBe(expected);
	});
});

describe('bareFunctionName', () => {
	it.each([
		['sin x', 'sin'],
		['x + cos', 'cos'],
		['sin(x)', null],
		['sin (x)', null],
		['\\sin x', null],
		['\\operatorname{sin} x', null],
		['sin^2(x)', null],
		['sin^{2} (x)', null],
		['sin^2 x', 'sin'],
		['2sin x', 'sin'],
		// Noms qui CONTIENNENT les lettres : pas des fonctions usuelles
		['cost + lnx', null],
		['\\arcsin x + \\cosh x', null],
		['x^2', null],
		// Logarithme de base donnée : `toCustom` écrit `log_2(x)` (revue #880)
		['log_2(x)', null],
		['log_{10}(x)+x', null],
		['log_2^3(x)', null],
		['log_2 x', 'log']
	])('%s', (input, expected) => {
		expect(bareFunctionName(input)).toBe(expected);
	});
});
