import { describe, expect, it } from 'vitest';
import { lettersOnly } from '../alphabet';
import { CipherInputError } from '../errors';
import { POLYBIUS_GRID, polybiusDecrypt, polybiusEncrypt } from '../polybius';
import { randomText, seededRandom } from './helpers';

describe('carré de Polybe', () => {
	it('la grille a 25 cases, sans J', () => {
		expect(POLYBIUS_GRID.join('')).toBe('ABCDEFGHIKLMNOPQRSTUVWXYZ');
	});

	it('chiffre en paires ligne-colonne : UBU → 45 12 45', () => {
		expect(polybiusEncrypt('Ubu !').text).toBe('45 12 45');
	});

	it('J est chiffré comme I', () => {
		expect(polybiusEncrypt('J').text).toBe(polybiusEncrypt('I').text);
		expect(polybiusEncrypt('J').steps[0]).toEqual({
			input: 'J',
			output: '24',
			detail: 'J partage la case de I : ligne 2, colonne 4'
		});
	});

	it('étape : B → ligne 1, colonne 2', () => {
		expect(polybiusEncrypt('B').steps[0]).toEqual({
			input: 'B',
			output: '12',
			detail: 'ligne 1, colonne 2'
		});
	});

	it('déchiffre : 11 12 → AB, avec ou sans espaces', () => {
		expect(polybiusDecrypt('11 12').text).toBe('AB');
		expect(polybiusDecrypt('1112').text).toBe('AB');
	});

	it('aller-retour : perd seulement le J (JOUR → IOUR)', () => {
		expect(polybiusDecrypt(polybiusEncrypt('Jour').text).text).toBe('IOUR');
		const rand = seededRandom(5);
		for (let i = 0; i < 300; i++) {
			const text = randomText(rand);
			const back = polybiusDecrypt(polybiusEncrypt(text).text).text;
			expect(back).toBe(lettersOnly(text).replaceAll('J', 'I'));
		}
	});

	it('chiffre hors de 1..5 → erreur qui donne la position', () => {
		expect(() => polybiusDecrypt('11 17')).toThrow(CipherInputError);
		expect(() => polybiusDecrypt('11 17')).toThrow(
			'Le chiffre 7 (position 5) n’existe pas dans la grille : seuls 1 à 5 sont possibles.'
		);
		expect(() => polybiusDecrypt('01')).toThrow('Le chiffre 0 (position 1)');
	});

	it('nombre impair de chiffres → erreur', () => {
		expect(() => polybiusDecrypt('11 1')).toThrow(
			'Nombre impair de chiffres : la dernière paire est incomplète.'
		);
	});

	it('autre caractère → erreur qui le nomme', () => {
		expect(() => polybiusDecrypt('11 A2')).toThrow('Caractère inattendu « A » (position 4).');
	});

	it('vide → vide', () => {
		expect(polybiusDecrypt('  ').text).toBe('');
	});
});
