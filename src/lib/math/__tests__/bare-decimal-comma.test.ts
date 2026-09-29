/**
 * Virgule décimale NUE (`3,14`, collée, frappe au clavier physique, auteur de
 * gabarit) : lue comme la virgule de MathLive (`3{,}14`) là où un nombre est
 * attendu. Une virgule SÉPARATRICE (couple, ensemble, intervalle, liste,
 * arguments, virgule suivie d'une espace) n'est jamais relue en virgule décimale.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent, evaluateExpression } from '$lib/math';
import { bareDecimalCommaToPoint } from '$lib/mathAST/decimal-comma';
import { isQuantityValueLatex, isSimpleNumberLatex } from '$lib/mathAST/cosmetic-transforms';

describe('bareDecimalCommaToPoint', () => {
	it.each([
		['3,14', '3.14'],
		['-0,5', '-0.5'],
		['12,5\\unit{cm}', '12.5\\unit{cm}'],
		['1\\,200,5', '1\\,200.5']
	])('%s → %s', (latex, expected) => {
		expect(bareDecimalCommaToPoint(latex)).toBe(expected);
	});

	it.each(['(3,14)', '\\{1,2,3\\}', '[3,14]', ']3,14[', 'f(x,y)', '3, 4', '1,2,3', '3{,}14'])(
		'virgule séparatrice ou déjà MathLive : %s inchangé',
		(latex) => {
			expect(bareDecimalCommaToPoint(latex)).toBe(latex);
		}
	);
});

describe('forme « nombre simple »', () => {
	it.each(['3,14', '-0,5', '1\\,200,5'])('%s est un nombre simple', (latex) => {
		expect(isSimpleNumberLatex(latex)).toBe(true);
		expect(isQuantityValueLatex(latex)).toBe(true);
	});

	it.each(['(3,14)', '[3,14]', '\\{1,2,3\\}', '3, 4', '1,2,3'])(
		'%s n’est pas un nombre simple',
		(latex) => {
			expect(isSimpleNumberLatex(latex)).toBe(false);
			expect(isQuantityValueLatex(latex)).toBe(false);
		}
	);
});

describe('équivalence et évaluation', () => {
	it('3,14 équivaut à 3.14 et vaut 3,14', () => {
		expect(areEquivalent('3,14', '3.14')).toBe(true);
		expect(evaluateExpression('-0,5')).toBe(-0.5);
	});

	it('un couple (3,14) n’est pas le décimal 3,14', () => {
		expect(areEquivalent('(3,14)', '3.14')).toBe(false);
		expect(areEquivalent('(3,14)', '(3.14)')).toBe(false);
	});

	it('un couple collé (1,5) reste un couple : égal à lui-même, pas à 1,5', () => {
		expect(areEquivalent('(1,5)', '(1,5)')).toBe(true);
		expect(areEquivalent('(1,5)', '1.5')).toBe(false);
	});

	it('un ensemble \\{1,2,3\\} reste égal à lui-même', () => {
		expect(areEquivalent('\\{1,2,3\\}', '\\{1,2,3\\}')).toBe(true);
	});
});
