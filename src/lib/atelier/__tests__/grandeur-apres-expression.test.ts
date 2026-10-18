/**
 * Une unité écrite après une espace porte sur tout le terme qui la précède
 * (décision de David du 2026-10-18, extension du lot C des grandeurs) :
 * `10^3 m` vaut 1000 m. Un terme fait de nombres (puissances, parenthèses,
 * racines, π) ou de valeurs du panneau ; une lettre libre reste de l'algèbre
 * (`x m`), et `x[m]` reste la seule façon d'imposer l'unité.
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { Atelier } from '../atelier.svelte';
import { runInput, type CalcResult } from '../calcul';
import { readNaturalQuantities } from '../natural-quantities';

const read = (text: string, names: readonly string[] = []) =>
	readNaturalQuantities(text, names).text;

function session() {
	return { atelier: new Atelier(), engine: new WebReplEngine() };
}

const latexOf = (result: CalcResult) =>
	result.kind === 'calcul' || result.kind === 'commande' ? result.latex : undefined;

describe('l’unité porte sur le terme qui la précède', () => {
	it.each([
		['10^3 m', '(10^3)[m]'],
		['2.5*10^3 m', '(2.5*10^3)[m]'],
		['2,5*10^3 m', '(2,5*10^3)[m]'],
		['3*10^8 m/s', '(3*10^8)[m/s]'],
		['3 * 10^8 m/s', '(3 * 10^8)[m/s]'],
		['10^-3 m', '(10^-3)[m]'],
		['(1+2) m', '(1+2)[m]'],
		['sqrt(2) m', '(sqrt(2))[m]'],
		['2π m', '(2π)[m]'],
		['10/2^3 m', '(10/2^3)[m]'],
		['2^10 o', '(2^10)[o]'],
		['x + 10^3 m', 'x + (10^3)[m]'],
		['-10^3 m', '-(10^3)[m]'],
		['10^3 km/h * 2 h', '(10^3)[km/h] * 2[h]'],
		['max(10^3 m; 2 km)', 'max((10^3)[m]; 2[km])']
	])('%s → %s', (input, expected) => {
		expect(read(input)).toBe(expected);
	});

	it('une valeur du panneau compte comme un nombre', () => {
		expect(read('2πr m', ['r'])).toBe('(2πr)[m]');
		expect(read('r^2 m^2', ['r'])).toBe('(r^2)[m^2]');
		expect(read('f(2) m', ['f'])).toBe('(f(2))[m]');
	});
});

describe('ce qui ne change pas', () => {
	it.each([
		['une lettre libre', 'x m'],
		['une lettre libre au-dessus', 'x/2 m'],
		['une lettre libre en facteur', 'x*2 m'],
		['une puissance d’une lettre libre', 'x^2 m'],
		['une valeur absente du panneau', '2πr m'],
		['une fonction inconnue', 'g(2) m'],
		['une lettre suit l’unité', '10^3 a b'],
		['une parenthèse suit l’unité', '10^3 h(3)'],
		['pas une unité', '10^3 zz'],
		['collé : un produit', '10^3m']
	])('%s : %s', (_, input) => {
		expect(read(input)).toBe(input);
	});

	// `s t` avec s et t du panneau : un produit, pas des tonnes
	it('une unité qui est un nom du panneau reste ce nom', () => {
		expect(read('s t', ['s', 't'])).toBe('s t');
		expect(read('10^3 m', ['m'])).toBe('10^3 m');
	});

	it.each([
		['12 km + 300 m', '12[km] + 300[m]'],
		['2 h 30 min', '(2[h]+30[min])'],
		['3 * 2 m', '3 * 2[m]'],
		['1/2 m', '(1/2)[m]']
	])('le lot C : %s → %s', (input, expected) => {
		expect(read(input)).toBe(expected);
	});
});

describe('les aides', () => {
	it('retient une unité d’une seule lettre lue comme unité', () => {
		expect(readNaturalQuantities('10^3 t + 2', []).singleLetters).toEqual([
			{ written: '10^3 t', letter: 't' }
		]);
	});
});

describe('dans Calcul', () => {
	it.each([
		['10^3 m', '1000~\\mathrm{m}'],
		['2,5*10^3 m', '2500~\\mathrm{m}'],
		['(1+2) m', '3~\\mathrm{m}'],
		['sqrt(2) m', '\\sqrt{2}~\\mathrm{m}'],
		['10/2^3 m', '1{,}25~\\mathrm{m}'],
		['2^10 o', '1024~\\mathrm{o}'],
		['2π m', '2 \\pi~\\mathrm{m}'],
		['2π[m]', '2 \\pi~\\mathrm{m}'],
		['sqrt(π) m', '\\sqrt{\\pi}~\\mathrm{m}'],
		// Lue par le parseur maison : les crochets y restent (revue)
		['sqrt(π)*3[m]', '3 \\sqrt{\\pi}~\\mathrm{m}']
	])('%s', (input, latex) => {
		expect(latexOf(runInput(session(), input))).toBe(latex);
	});

	it('2πr m avec r = 3 dans le panneau', () => {
		const s = session();
		runInput(s, 'r = 3');
		expect(latexOf(runInput(s, '2πr m'))).toBe('6 \\pi~\\mathrm{m}');
	});

	it('une valeur définie ainsi garde son unité', () => {
		const s = session();
		runInput(s, 'd = 10^3 m');
		expect(latexOf(runInput(s, 'd'))).toBe('1000~\\mathrm{m}');
		runInput(s, 'c = 2π m');
		expect(latexOf(runInput(s, 'c'))).toBe('2 \\pi~\\mathrm{m}');
		runInput(s, 'k = 2π[m]');
		expect(latexOf(runInput(s, 'k'))).toBe('2 \\pi~\\mathrm{m}');
	});

	it('p = 2πr m, avec r = 3 dans le panneau', () => {
		const s = session();
		runInput(s, 'r = 3');
		runInput(s, 'p = 2πr m');
		expect(latexOf(runInput(s, 'p'))).toBe('6 \\pi~\\mathrm{m}');
	});

	it('une valeur du panneau ne masque pas une erreur de dimension', () => {
		const s = session();
		runInput(s, 'r = 3[s]');
		const result = runInput(s, '10^3 m + r');
		expect(result.kind === 'refus' && result.message).toBe(
			'On ne peut pas ajouter une longueur et une durée.'
		);
	});

	it('x m reste un produit', () => {
		expect(latexOf(runInput(session(), 'x m'))).toBe('x m');
	});
});
