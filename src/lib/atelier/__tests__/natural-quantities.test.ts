/**
 * La lecture d'une grandeur écrite naturellement dans l'atelier (phase 0
 * `docs/archive/wip/grandeurs-lot-c-phase0.md`, validée par David le 2026-10-11) :
 * « un nombre, une espace, une unité » est une grandeur ; collé ou avec `*`,
 * c'est un produit.
 */

import { describe, it, expect } from 'vitest';
import { readNaturalQuantities } from '../natural-quantities';

const read = (text: string, names: readonly string[] = []) =>
	readNaturalQuantities(text, names).text;

describe('un nombre, une espace, une unité : une grandeur', () => {
	it.each([
		['5 km', '5[km]'],
		['12 km + 300 m', '12[km] + 300[m]'],
		['2.5 km * 4', '2.5[km] * 4'],
		['2,5 km', '2,5[km]'],
		['90 km/h * 2 h', '90[km/h] * 2[h]'],
		['9.81 m/s^2 * 2 kg', '9.81[m/s^2] * 2[kg]'],
		['20 °C', '20[°C]'],
		['3 * 2 m', '3 * 2[m]']
	])('%s → %s', (input, expected) => {
		expect(read(input)).toBe(expected);
	});

	// Décision de David : « 1/2 m se lit (1/2) m »
	it('l’unité porte sur la fraction de nombres qui la précède', () => {
		expect(read('1/2 m')).toBe('(1/2)[m]');
		expect(read('3/4 km + 1 km')).toBe('(3/4)[km] + 1[km]');
	});

	it('deux grandeurs collées s’ajoutent : une durée composée', () => {
		expect(read('2 h 30 min')).toBe('(2[h]+30[min])');
		expect(read('1 h 5 min 30 s')).toBe('(1[h]+5[min]+30[s])');
	});
});

describe('ce qui reste de l’algèbre', () => {
	it.each([
		['collé', '5m'],
		['collé, une somme', '2a+1'],
		['collé, un curseur t', '3t+2'],
		['pas une unité', '2 x'],
		['une lettre suit l’unité', '3 a b'],
		['une fonction', '2 h(3)'],
		['inconnu', '5 zz'],
		['déjà entre crochets', '5[km]'],
		['une variable avant la barre', 'x/2 m'],
		['un facteur collé avant', 'x*2 m']
	])('%s : %s', (_, input) => {
		expect(read(input)).toBe(input);
	});
});

describe('les aides', () => {
	it('collé, mais une unité : écrire avec une espace', () => {
		expect(readNaturalQuantities('5km', []).notes).toEqual([
			'Pour une grandeur, écris 5 km (avec une espace).'
		]);
	});

	it('pas d’aide quand les lettres collées sont des valeurs du panneau', () => {
		expect(readNaturalQuantities('5km', ['k', 'm']).notes).toEqual([]);
	});

	it('une unité qui est aussi le nom d’une valeur du panneau', () => {
		expect(readNaturalQuantities('5 m', ['m']).notes).toEqual([
			'm est aussi un nom du panneau : pour 5 × m, écris 5m.'
		]);
	});

	it('pas d’aide quand tout est clair', () => {
		expect(readNaturalQuantities('12 km + 300 m', ['f']).notes).toEqual([]);
	});

	// Gardée pour un refus de dimension (`3 t + 2`) : l'appelant la montre alors
	it('retient les unités d’une seule lettre lues comme unités', () => {
		expect(readNaturalQuantities('3 t + 2', []).singleLetters).toEqual([
			{ written: '3 t', letter: 't' }
		]);
	});
});
