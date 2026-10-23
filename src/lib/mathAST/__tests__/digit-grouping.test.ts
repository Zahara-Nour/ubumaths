/**
 * Groupement des chiffres par trois (E2, chantier simplify-carte § 15) : une seule
 * règle pour le juge, l'affichage des formules et l'Atelier. Usage du BIPM : à
 * 4 chiffres l'espace est facultative et on ne l'écrit pas ; dès 5 chiffres on
 * l'écrit. Chaque côté de la virgule est compté à part.
 */

import { describe, it, expect } from 'vitest';
import {
	MIN_DIGITS_FOR_GROUPING,
	groupIntegerDigits,
	groupDecimalDigits,
	groupNumberText
} from '../digit-grouping';

describe('groupement des chiffres (règle du BIPM)', () => {
	it('le seuil est de 5 chiffres', () => {
		expect(MIN_DIGITS_FOR_GROUPING).toBe(5);
	});

	it.each([
		['123', '123'],
		['1024', '1024'],
		['30000', '30 000'],
		['1048576', '1 048 576']
	])('partie entière %s → %s (depuis la droite)', (digits, written) => {
		expect(groupIntegerDigits(digits, ' ')).toBe(written);
	});

	it.each([
		['123', '123'],
		['1234', '1234'],
		['12345', '123 45'],
		['14159265', '141 592 65']
	])('partie décimale %s → %s (depuis la virgule)', (digits, written) => {
		expect(groupDecimalDigits(digits, ' ')).toBe(written);
	});

	it('le séparateur est celui de l’appelant', () => {
		expect(groupIntegerDigits('30000', '\\,')).toBe('30\\,000');
		expect(groupIntegerDigits('30000', ' ')).toBe('30 000');
	});

	it.each([
		['1024', '1024'],
		['100000', '100 000'],
		['-1048576', '-1 048 576'],
		['1234,5678', '1234,5678'],
		['12345,6', '12 345,6'],
		['0,12345', '0,123 45'],
		['12,50 €', '12,50 €'],
		['12345,5 %', '12 345,5 %']
	])('un nombre écrit en texte : %s → %s', (text, written) => {
		expect(groupNumberText(text, ' ')).toBe(written);
	});
});
