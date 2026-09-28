/**
 * Forme exigée : soustraction lue comme somme signée, coefficient implicite
 * ========================================================================
 *
 * #609 « forme canonique lue sur une parabole », motif `u*($x+v)^2+w` (décision de David) :
 * - une soustraction `a − b` se lit `a + (−b)` (ordre des termes libre) ;
 * - un coefficient libre `u` dans `u*T` peut rester implicite : `T` (u = 1), `−T` (u = −1) ;
 * - un terme libre `w` dans `T + w` peut être absent (w = 0).
 * La valeur est vérifiée avant : le motif ne juge que la FORME.
 *
 * `$x` : dans un motif, une lettre est un joker ; `$x` est LA variable x. Avec `x` libre, le
 * joker x devrait valoir un nombre simple : les formes canoniques échouent — test en bas.
 * Relecture #489 : sur ce troisième essai, chaque joker doit valoir un NOMBRE SIMPLE.
 */

import { describe, it, expect } from 'vitest';
import { requiredFormVerdict } from '../required-form-validator';
import type { RequiredForm } from '../types';

const CANONICAL: RequiredForm = { pattern: 'u*($x+v)^2+w' };

describe('forme canonique u*($x+v)^2+w', () => {
	it.each([
		'-\\frac{1}{2}(x+2)^2-1',
		'\\frac{3}{4}(x+2)^2-1',
		'-(x+1)^2+3',
		'(x-1)^2-3',
		'3(x+1)^2-2',
		'-2+3(x+1)^2',
		'-1-\\frac{1}{2}(x+2)^2',
		'3(x-1)^2',
		'-(x-1)^2',
		'(x+2)^2'
	])('accepté : %s', (answer) => {
		expect(requiredFormVerdict(answer, CANONICAL)).toBe('ok');
	});

	it.each([
		['forme développée', '-\\frac{1}{2}x^2-2x-3'],
		['forme factorisée', '3(x-1)(x+2)'],
		['coefficient de x ≠ 1 dans le carré', '(-x-2)^2'],
		['coefficient de x ≠ 1 dans le carré', '(2x+1)^2-3']
	])('refusé (%s) : %s', (_label, answer) => {
		expect(requiredFormVerdict(answer, CANONICAL)).toBe('violated');
	});

	// Relecture #489 : à valeur égale, écritures NON canoniques — chaque joker doit valoir un
	// nombre simple (entier, décimal, fraction d'entiers, signe éventuel), sans zéro ajouté.
	it.each([
		'2(x+1)^2-3(x+1)^2',
		'(x+1)^2-(x+1)^2+(x+1)^2',
		'(x+2)^2-(2x+6)',
		'-(x+1)^2-2\\times3',
		'-2\\cdot3-(x+1)^2',
		'(x+0)^2+1',
		'(x+1)^2+(-3)',
		'(x+1)^2-(-3)'
	])('refusé (calcul non effectué) : %s', (answer) => {
		expect(requiredFormVerdict(answer, CANONICAL)).toBe('violated');
	});

	it('x libre (sans $) : x devrait valoir un nombre, donc (x-1)^2-3 échoue — le motif doit écrire $x', () => {
		expect(requiredFormVerdict('(x-1)^2-3', { pattern: 'u*(x+v)^2+w' })).toBe('violated');
		expect(requiredFormVerdict('(-x-2)^2', { pattern: 'u*(x+v)^2+w' })).toBe('violated');
	});
});

// Décision de David : le coefficient peut s'écrire SOUS la fraction, `\frac{c·T}{d}` ≡ `\frac{c}{d}·T`
// (c, d nombres simples, d ≠ 0). Seulement au troisième essai.
describe('forme canonique : coefficient sous la fraction', () => {
	it.each([
		'-\\frac{(x+2)^2}{2}-1',
		'\\frac{(x+2)^2}{2}-1',
		'\\frac{3(x+2)^2}{4}-1',
		'-\\frac{3(x+2)^2}{4}-1',
		'\\frac{-(x+2)^2}{2}-1',
		'-1-\\frac{(x+2)^2}{2}'
	])('accepté : %s', (answer) => {
		expect(requiredFormVerdict(answer, CANONICAL)).toBe('ok');
	});

	it.each([
		["numérateur qui n'est pas u·carré", '\\frac{(x+2)^2-2}{2}'],
		['dénominateur non numérique', '\\frac{(x+2)^2}{x}'],
		['calcul non effectué au dénominateur', '\\frac{(x+2)^2}{2+1}'],
		['dénominateur nul', '\\frac{(x+2)^2}{0}'],
		['calcul non effectué au numérateur', '\\frac{2\\times3(x+2)^2}{4}-1'],
		['somme sur la fraction', '\\frac{(x+2)^2-4}{2}+1']
	])('refusé (%s) : %s', (_label, answer) => {
		expect(requiredFormVerdict(answer, CANONICAL)).toBe('violated');
	});

	it('quotient 9 / 3 (#226) inchangé : \\frac{9}{3} juste, \\frac{3}{1} refusé', () => {
		expect(requiredFormVerdict('\\frac{9}{3}', { pattern: '9 / 3' })).toBe('ok');
		expect(requiredFormVerdict('\\frac{3}{1}', { pattern: '9 / 3' })).toBe('violated');
	});
});

// Resserrement de #490 (décision de David) : coefficient fraction IRRÉDUCTIBLE, d'entiers,
// dénominateur ≥ 2 ; coefficient 1 écrit refusé ; réécriture « sous la fraction » réservée
// à un terme dont la partie non numérique est une PUISSANCE.
describe('coefficient fraction : irréductible, entiers, dénominateur ≥ 2', () => {
	it.each([
		'\\frac{(x+2)^2}{1}-1',
		'\\frac{2(x+2)^2}{2}-1',
		'\\frac{(x+2)^2}{0.5}-1',
		'\\frac{(x+2)^2}{2.5}-1',
		'\\frac{2}{2}(x+2)^2-1',
		'\\frac{1}{1}(x+2)^2-1',
		'\\frac{1}{0.5}(x+2)^2-1',
		'\\frac{1(x+2)^2}{2}-1',
		'\\frac{-1(x+2)^2}{2}-1'
	])('refusé : %s', (answer) => {
		expect(requiredFormVerdict(answer, CANONICAL)).toBe('violated');
	});

	it.each([
		['\\frac{x}{2}', 'a*$x'],
		['\\frac{3x}{4}+1', 'a*$x+b'],
		['\\frac{x+4}{2}', 'k*($x+a)']
	])('réécriture réservée aux puissances : %s refusé pour %s', (answer, pattern) => {
		expect(requiredFormVerdict(answer, { pattern })).toBe('violated');
	});
});

describe('soustraction lue comme somme signée', () => {
	// Le troisième essai n'accepte que des jokers valant un nombre simple : u = z n'en est pas
	// un, donc (z-7)^2 reste refusé pour (u+v)^2 — comportement de main, conséquence acceptée.
	it("(u+v)^2 : (z-7)^2 reste refusé (u = z n'est pas un nombre), (-7+z)^2 accepté comme sur main", () => {
		expect(requiredFormVerdict('(z-7)^2', { pattern: '(u+v)^2' })).toBe('violated');
		expect(requiredFormVerdict('(-7+z)^2', { pattern: '(u+v)^2' })).toBe('ok');
	});

	it('coefficient implicite seulement pour un joker libre écrit UNE fois devant une structure', () => {
		// u*v : deux jokers nus, aucun coefficient implicite (sinon tout passerait)
		expect(requiredFormVerdict('7', { pattern: 'u*v' })).toBe('violated');
		// devant un littéral non plus (acceptable `u*{{a}}` → `u*7`)
		expect(requiredFormVerdict('7', { pattern: 'u*7' })).toBe('violated');
		// structure sans élément fixé : (a + b)*c n'accepte pas une somme quelconque (c = 1)
		expect(requiredFormVerdict('2\\times 4+3\\times 4', { pattern: '(a + b) * c' })).toBe(
			'violated'
		);
		// typé : pas de coefficient implicite
		expect(requiredFormVerdict('(x+1)^2', { pattern: 'u:integer*($x+v)^2' })).toBe('violated');
	});
});

// Motifs en base : comportement mesuré AVANT la modification, figé ici.
describe('non-régression des motifs existants', () => {
	const cases: [string, RequiredForm, [string, string][]][] = [
		[
			'quotient {{a}} / {{b}} (#226/#227)',
			{ pattern: '9 / 3' },
			[
				['9:3', 'ok'],
				['\\frac{9}{3}', 'ok'],
				['9\\div3', 'ok'],
				['3', 'violated'],
				['\\frac{12-3}{3}', 'violated'],
				['(10-1):3', 'violated'],
				['9:(4-1)', 'violated'],
				['-9:(-3)', 'violated'],
				['\\frac{-9}{-3}', 'violated']
			]
		],
		[
			'quotient à nombre tiré négatif',
			{ pattern: '9 / (-3)' },
			[
				['9:(-3)', 'ok'],
				['\\frac{9}{-3}', 'violated'],
				['-\\frac{9}{3}', 'violated'],
				['-9:3', 'violated'],
				['-3', 'violated']
			]
		],
		[
			'fractions décimales a + b/10 + c/100 (#239/#241)',
			{ pattern: '5 + 8/10 + 1/100' },
			[
				['5+\\frac{8}{10}+\\frac{1}{100}', 'ok'],
				['\\frac{1}{100}+5+\\frac{8}{10}', 'ok'],
				['6-\\frac{2}{10}+\\frac{1}{100}', 'violated'],
				['5+\\frac{9}{10}-\\frac{9}{100}', 'violated'],
				['5+\\frac{81}{100}', 'violated'],
				['5{,}81', 'violated'],
				['5+0{,}8+\\frac{1}{100}', 'violated']
			]
		],
		[
			'carré (u-v)^2, acceptable u*v (#553)',
			{ pattern: '(u-v)^2', acceptable: 'u*v' },
			[
				['(z-7)^2', 'ok'],
				['(7-z)^2', 'ok'],
				['(-7+z)^2', 'ok'],
				['(-z+7)^2', 'ok'],
				['(-z-7)^2', 'ok'],
				['(z+(-7))^2', 'violated'],
				['(z-7)(z-7)', 'acceptable'],
				['(7-z)(z-7)', 'acceptable'],
				['z^2-14z+49', 'violated'],
				['(z+7)^2', 'violated'],
				['-(7-z)^2', 'violated'],
				['(z-7)^2+0', 'violated'],
				['7^2-z', 'violated']
			]
		],
		[
			'0 - a',
			{ pattern: '0 - a' },
			[
				['0-5', 'ok'],
				['0-(-5)', 'ok'],
				['0+(-5)', 'violated'],
				['-5', 'violated']
			]
		],
		[
			'a:multipleOf(10)+b:inN* & lt(10)',
			{ pattern: 'a:multipleOf(10)+b:inN* & lt(10)' },
			[
				['50+3', 'ok'],
				['53', 'violated'],
				['50-3', 'violated'],
				['60-7', 'violated'],
				['-3+50', 'violated']
			]
		],
		[
			'n:integer + p:integer / q:integer',
			{ pattern: 'n:integer + p:integer / q:integer' },
			[
				['2+\\frac{3}{4}', 'ok'],
				['2-\\frac{3}{4}', 'violated'],
				['3-\\frac{1}{4}', 'violated']
			]
		]
	];

	for (const [label, form, answers] of cases) {
		it.each(answers)(`${label} — %s → %s`, (answer, verdict) => {
			expect(requiredFormVerdict(answer, form)).toBe(verdict);
		});
	}
});
