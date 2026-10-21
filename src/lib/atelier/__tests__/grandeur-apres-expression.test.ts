/**
 * Une unité écrite après une espace porte sur tout le terme qui la précède
 * (décision de David du 2026-10-18, extension du lot C des grandeurs) :
 * `10^3 m` vaut 1000 m. Un terme fait de nombres (puissances, parenthèses,
 * racines, π) seulement : « l'utilisation des unités est censée se faire
 * uniquement avec des grandeurs numériques » (David). Une lettre, même une
 * valeur du panneau, reste de l'algèbre ; `2πr[m]` impose l'unité.
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

	// Revue : avec m = 70, `m g` répondait 70 grammes, `F = m a` des ares
	it('une valeur du panneau reste une lettre : de l’algèbre', () => {
		expect(read('2πr m', ['r'])).toBe('2πr m');
		expect(read('r^2 m^2', ['r'])).toBe('r^2 m^2');
		expect(read('f(2) m', ['f'])).toBe('f(2) m');
		expect(read('m g', ['m'])).toBe('m g');
		expect(read('m a', ['m', 'F'])).toBe('m a');
		expect(read('π r^2 h', ['r'])).toBe('π r^2 h');
		expect(read('2r h', ['r'])).toBe('2r h');
	});
});

describe('ce qui ne change pas', () => {
	it.each([
		['une lettre libre', 'x m'],
		['une lettre libre au-dessus', 'x/2 m'],
		['une lettre libre en facteur', 'x*2 m'],
		['une puissance d’une lettre libre', 'x^2 m'],
		['une lettre absente du panneau', '2πr m'],
		['une fonction inconnue', 'g(2) m'],
		['une lettre suit l’unité', '10^3 a b'],
		['une parenthèse suit l’unité', '10^3 h(3)'],
		['pas une unité', '10^3 zz'],
		['collé : un produit', '10^3m']
	])('%s : %s', (_, input) => {
		expect(read(input)).toBe(input);
	});

	it('des lettres posées gardent leur produit', () => {
		expect(read('s t', ['s', 't'])).toBe('s t');
	});

	it.each([
		['12 km + 300 m', '12[km] + 300[m]'],
		['2 h 30 min', '2[h] 30[min]'],
		['3 * 2 m', '3 * 2[m]'],
		['1/2 m', '(1/2)[m]']
	])('le lot C : %s → %s', (input, expected) => {
		expect(read(input)).toBe(expected);
	});
});

describe('les aides', () => {
	it('une unité qui est aussi le nom d’une valeur du panneau, comme `5 m`', () => {
		expect(readNaturalQuantities('10^3 m', ['m'])).toMatchObject({
			text: '(10^3)[m]',
			notes: ['m est aussi un nom du panneau : pour 10^3 × m, écris 10^3m.']
		});
	});

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

	it('2πr[m] avec r = 3 dans le panneau ; 2πr m reste un produit', () => {
		const s = session();
		runInput(s, 'r = 3');
		expect(latexOf(runInput(s, '2πr[m]'))).toBe('6 \\pi~\\mathrm{m}');
		expect(latexOf(runInput(s, '2πr m'))).toBe('2 \\pi r m');
	});

	it('m g avec m = 70 : un produit, pas des grammes', () => {
		const s = session();
		runInput(s, 'm = 70');
		runInput(s, 'g = 10');
		expect(runInput(s, 'm g')).toMatchObject({ kind: 'calcul', output: '700' });
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

	it('p = 2πr[m], avec r = 3 dans le panneau', () => {
		const s = session();
		runInput(s, 'r = 3');
		runInput(s, 'p = 2πr[m]');
		expect(latexOf(runInput(s, 'p'))).toBe('6 \\pi~\\mathrm{m}');
	});

	// Avant : « Ces grandeurs ne se combinent pas. » — le pré-contrôle ne
	// connaissait pas la valeur de r ; le moteur, qui la connaît, juge
	it('une valeur du panneau en grandeur s’ajoute à une grandeur écrite', () => {
		const s = session();
		runInput(s, 'r = 3[m]');
		expect(latexOf(runInput(s, 'r + 2 m'))).toBe('5~\\mathrm{m}');
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
