import { describe, expect, it } from 'vitest';
import { normalizeText } from '../alphabet';
import { CipherInputError } from '../errors';
import {
	keyFromKeyword,
	substitutionDecrypt,
	substitutionEncrypt,
	validateKey
} from '../substitution';
import { randomText, seededRandom } from './helpers';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function shuffledKey(rand: () => number): string {
	const letters = ALPHABET.split('');
	for (let i = letters.length - 1; i > 0; i--) {
		const j = Math.floor(rand() * (i + 1));
		[letters[i], letters[j]] = [letters[j], letters[i]];
	}
	return letters.join('');
}

describe('keyFromKeyword', () => {
	it('UBU ROI → UBROI puis les lettres restantes dans l’ordre', () => {
		expect(keyFromKeyword('UBU ROI')).toBe('UBROIACDEFGHJKLMNPQSTVWXYZ');
	});

	it('normalise le mot-clé : accents et ponctuation ignorés', () => {
		expect(keyFromKeyword('Père-Ubu !')).toBe(keyFromKeyword('PERUB'));
	});

	it('mot-clé vide → alphabet normal', () => {
		expect(keyFromKeyword('')).toBe(ALPHABET);
	});
});

describe('validateKey', () => {
	it('une permutation des 26 lettres est valide', () => {
		expect(validateKey('QWERTYUIOPASDFGHJKLZXCVBNM')).toEqual({
			ok: true,
			key: 'QWERTYUIOPASDFGHJKLZXCVBNM'
		});
	});

	it('nomme la lettre en double', () => {
		expect(validateKey('EBCDEFGHIJKLMNOPQRSTUVWXYZ')).toEqual({
			ok: false,
			message: 'La lettre E apparaît plusieurs fois.'
		});
	});

	it('nomme la lettre manquante', () => {
		expect(validateKey('ABCDEFGHIJKLMNOPRSTUVWXYZ')).toEqual({
			ok: false,
			message: 'Il manque la lettre Q.'
		});
	});

	it('nomme les lettres manquantes', () => {
		expect(validateKey('ABCDEFGHIJKLMNOPRSTUVXYZ')).toEqual({
			ok: false,
			message: 'Il manque les lettres Q, W.'
		});
	});
});

describe('substitution', () => {
	const key = keyFromKeyword('UBU ROI');

	it('chiffre lettre par lettre : A → U, B → B, C → R', () => {
		expect(substitutionEncrypt('abc, d', key).text).toBe('UBR, O');
	});

	it('aller-retour pour 300 clés et textes tirés', () => {
		const rand = seededRandom(2026);
		for (let i = 0; i < 300; i++) {
			const randomKey = shuffledKey(rand);
			const text = randomText(rand);
			const encrypted = substitutionEncrypt(text, randomKey).text;
			expect(substitutionDecrypt(encrypted, randomKey).text).toBe(normalizeText(text));
		}
	});

	it('étape : la lettre et son image, sans calcul', () => {
		expect(substitutionEncrypt('A', key).steps[0]).toEqual({ input: 'A', output: 'U', detail: '' });
	});

	it('clé invalide → erreur au message lisible', () => {
		expect(() => substitutionEncrypt('UBU', 'ABC')).toThrow(CipherInputError);
		expect(() => substitutionDecrypt('UBU', 'AACDEFGHIJKLMNOPQRSTUVWXYZ')).toThrow(
			'La lettre A apparaît plusieurs fois.'
		);
	});
});
