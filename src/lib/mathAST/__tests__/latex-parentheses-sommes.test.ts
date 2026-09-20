/**
 * Une somme doit être parenthésée là où l'omettre change le sens.
 *
 * ## Le défaut
 *
 * Le générateur LaTeX ne parenthèse pas par priorité : il s'appuie sur la
 * présence d'un nœud **délimiteur**, que le parseur pose mais qu'une
 * construction interne — `differentiate`, `normalize`, `tidy` — ne pose pas.
 * Une somme se retrouve donc nue là où elle ne devrait pas.
 *
 * Mesuré sur `main` à `56c2820b1`, nœuds construits par la fabrique :
 *
 * | expression | rendu | se relit |
 * | --- | --- | --- |
 * | `(x+1)·y` | `x + 1 y` | `x + y` |
 * | `y·(x+1)` | `y x + 1` | `xy + 1` |
 * | `2·(x−1)` | `2 x - 1` | `2x − 1` |
 * | `y − (x+1)` | `y - x + 1` | `y − x + 1` |
 *
 * ## Où ça se voyait
 *
 * Dans les étapes de dérivation montrées à l'élève. La dérivée de
 * `(x²+1)/(x−1)` affichait son numérateur `2x(x−1) − (x²+1)` sous la forme
 * `2 x x - 1 - x^2 + 1`.
 *
 * ## Ce qui n'a PAS besoin de parenthèses
 *
 * `y + (x+1)` se rend `y + x + 1`, et c'est juste : l'addition est associative.
 * `(x+1) − y` se rend `x + 1 - y`, juste aussi — seul l'opérande **droit** d'une
 * soustraction change de sens. Le correctif ne pose donc des parenthèses que là
 * où elles sont nécessaires, pour ne pas alourdir ce que lit l'élève.
 */

import { describe, it, expect } from 'vitest';
import {
	add,
	divide,
	multiply,
	number,
	opposite,
	subtract,
	superscript,
	variable
} from '../factory';
import { toLatex } from '../index';
import { parseLatex } from '../parser';
import { differentiate } from '../differentiation';

const somme = () => add(variable('x'), number('1'));
const difference = () => subtract(variable('x'), number('1'));
const y = () => variable('y');

describe('une somme sous un produit est parenthésée', () => {
	it.each([
		['à gauche', multiply(somme(), y(), 'implicit'), '\\left( x + 1 \\right) y'],
		['à droite', multiply(y(), somme(), 'implicit'), 'y \\left( x + 1 \\right)'],
		['un coefficient', multiply(number('2'), difference(), 'implicit'), '2 \\left( x - 1 \\right)'],
		[
			'des deux côtés',
			multiply(somme(), difference(), 'implicit'),
			'\\left( x + 1 \\right) \\left( x - 1 \\right)'
		],
		['avec un point', multiply(y(), somme(), 'dot'), 'y \\cdot \\left( x + 1 \\right)'],
		['avec une croix', multiply(y(), somme(), 'cross'), 'y \\times \\left( x + 1 \\right)']
	])('%s', (_titre, node, attendu) => {
		expect(toLatex(node)).toBe(attendu);
	});
});

describe('une somme à droite d’une soustraction est parenthésée', () => {
	it.each([
		['une somme', subtract(y(), somme()), 'y - \\left( x + 1 \\right)'],
		['une différence', subtract(y(), difference()), 'y - \\left( x - 1 \\right)']
	])('%s', (_titre, node, attendu) => {
		expect(toLatex(node)).toBe(attendu);
	});
});

describe('une somme dans une division en ligne est parenthésée', () => {
	it.each([
		['au numérateur', divide(somme(), y(), 'inline'), '\\left( x + 1 \\right) / y'],
		['au dénominateur', divide(y(), somme(), 'inline'), 'y / \\left( x + 1 \\right)']
	])('%s', (_titre, node, attendu) => {
		expect(toLatex(node)).toBe(attendu);
	});
});

describe('là où elles sont inutiles, on ne les pose pas', () => {
	it.each([
		['une addition est associative', add(y(), somme()), 'y + x + 1'],
		['à gauche d’une soustraction', subtract(somme(), y()), 'x + 1 - y'],
		['une fraction groupe déjà', divide(somme(), y(), 'fraction'), '\\dfrac{x + 1}{y}'],
		['un produit de facteurs simples', multiply(variable('x'), y(), 'implicit'), 'x y']
	])('%s', (_titre, node, attendu) => {
		expect(toLatex(node)).toBe(attendu);
	});

	it('et ce qui était déjà juste le reste', () => {
		expect(toLatex(opposite(somme()))).toBe('-\\left( x + 1 \\right)');
		expect(toLatex(superscript(somme(), number('2')))).toBe('\\left( x + 1 \\right)^2');
	});
});

describe('ce que l’élève voit dans une dérivée', () => {
	it('le numérateur de la dérivée d’un quotient est lisible', () => {
		const rendu = toLatex(differentiate(parseLatex('\\frac{x^2+1}{x-1}'), 'x'));
		expect(rendu).not.toContain('2 x x - 1');
		expect(rendu).toContain('\\left( x - 1 \\right)');
	});
});

describe('l’aller-retour reste fidèle', () => {
	it.each(['(x+1)y', 'y(x+1)', '2(x-1)', 'y-(x+1)', '(x+1)(x-1)', 'x+1', '\\frac{x+1}{y}'])(
		'%s se relit comme lui-même',
		(source) => {
			const node = parseLatex(source);
			const rendu = toLatex(node);
			expect(toLatex(parseLatex(rendu))).toBe(rendu);
		}
	);
});
