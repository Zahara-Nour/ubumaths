/**
 * Virgule décimale NUE (`3,14`, collée, frappe au clavier physique, auteur de
 * gabarit) : lue comme la virgule de MathLive (`3{,}14`) là où un nombre est
 * attendu. Une virgule SÉPARATRICE (couple, ensemble, intervalle, liste,
 * arguments, virgule suivie d'une espace) n'est jamais relue en virgule décimale.
 */

import { describe, it, expect } from 'vitest';
import { areEquivalent, evaluateExpression } from '$lib/math';
import { bareDecimalCommaToPoint, expectsSeparatorComma } from '$lib/mathAST/decimal-comma';
import { isQuantityValueLatex, isSimpleNumberLatex } from '$lib/mathAST/cosmetic-transforms';

describe('bareDecimalCommaToPoint (contexte NOMBRE : toute virgule entre chiffres)', () => {
	it.each([
		['3,14', '3.14'],
		['-0,5', '-0.5'],
		['12,5\\unit{cm}', '12.5\\unit{cm}'],
		['1\\,200,5', '1\\,200.5'],
		['1,5x+2,5', '1.5x+2.5'],
		['(-3,5)', '(-3.5)']
	])('%s → %s', (latex, expected) => {
		expect(bareDecimalCommaToPoint(latex)).toBe(expected);
	});

	it.each(['f(x,y)', '3, 4', '3{,}14'])(
		'virgule hors chiffres ou MathLive : %s inchangé',
		(latex) => {
			expect(bareDecimalCommaToPoint(latex)).toBe(latex);
		}
	);
});

describe('expectsSeparatorComma (mode décidé par la réponse attendue)', () => {
	it.each(['(3,14)', '[3,14]', ']3,14[', '\\{1,2,3\\}', '1,2,3', 'f(x,y)', '3, 4', '(a,b)'])(
		'%s : virgule séparatrice',
		(latex) => {
			expect(expectsSeparatorComma(latex)).toBe(true);
		}
	);

	it.each([
		'3,14',
		'1,5x+2,5',
		'y=0,5x+1,5',
		'2(x+1,5)',
		'\\frac{1,5}{2,5}',
		'(1,5;2)',
		'x\\in[1,5;2]',
		'3{,}14',
		'1\\,200,5'
	])('%s : virgule décimale (ou aucune virgule nue)', (latex) => {
		expect(expectsSeparatorComma(latex)).toBe(false);
	});
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

	it('attendu couple (3,14) : ni 3,14 ni 3.14 ni (3.14) ne l’égalent', () => {
		expect(areEquivalent('3.14', '(3,14)')).toBe(false);
		expect(areEquivalent('3,14', '(3,14)')).toBe(false);
		expect(areEquivalent('(3.14)', '(3,14)')).toBe(false);
		expect(areEquivalent('(3,14)', '(3,14)')).toBe(true);
	});

	it('attendu couple (1,5) : 1,5 ne l’égale pas', () => {
		expect(areEquivalent('1,5', '(1,5)')).toBe(false);
	});

	it('attendu ensemble \\{1,2,3\\} : \\{1.2,3\\} ne l’égale pas', () => {
		expect(areEquivalent('\\{1.2,3\\}', '\\{1,2,3\\}')).toBe(false);
	});

	// Relecture #520 : réponses justes à virgule nue, attendu à point décimal
	it.each([
		['1,5x+2,5', '1.5x+2.5'],
		['y=0,5x+1,5', 'y=0.5x+1.5'],
		['(-3,5)', '-3.5'],
		['1,5\\times 2,5', '3.75'],
		['2(x+1,5)', '2x+3'],
		['\\left(1,5\\right)', '1.5'],
		['-(1,5)', '-1.5'],
		['\\frac{1,5}{2,5}', '0.6'],
		['0,5\\times 2,4', '1.2'],
		['(1,5;2)', '(1{,}5;2)'],
		['x\\in[1,5;2]', 'x\\in[1{,}5;2]']
	])('%s ≡ %s', (user, expected) => {
		expect(areEquivalent(user, expected)).toBe(true);
	});

	it('point-virgule : (1,5;2) attendu ≡ (1{,}5;2) tapé', () => {
		expect(areEquivalent('(1{,}5;2)', '(1,5;2)')).toBe(true);
	});

	it('un ensemble \\{1,2,3\\} reste égal à lui-même', () => {
		expect(areEquivalent('\\{1,2,3\\}', '\\{1,2,3\\}')).toBe(true);
	});
});
