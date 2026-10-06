import { describe, expect, it } from 'vitest';
import { lettersOnly, normalizeText } from '../alphabet';
import { caesarEncrypt } from '../caesar';
import { CipherInputError } from '../errors';
import {
	FRENCH_IC,
	averageIndexOfCoincidence,
	crackVigenere,
	indexOfCoincidence,
	kasiski,
	suggestKeyLength,
	vigenereDecrypt,
	vigenereEncrypt
} from '../vigenere';
import { FRENCH_SENTENCE, LONG_FRENCH_TEXT, randomText, seededRandom } from './helpers';

describe('Vigenère', () => {
	it('clé UBU : chaque lettre avance du rang de la lettre de clé', () => {
		// M + U (20) = G ; E + B (1) = F ; R + U (20) = L
		expect(vigenereEncrypt('MER', 'UBU').text).toBe('GFL');
	});

	it('étape : la lettre de clé et le calcul', () => {
		expect(vigenereEncrypt('M', 'U').steps[0]).toEqual({
			input: 'M',
			output: 'G',
			detail: 'clé U : 12 + 20 = 32 → 32 − 26 = 6'
		});
		expect(vigenereDecrypt('G', 'U').steps[0]).toEqual({
			input: 'G',
			output: 'M',
			detail: 'clé U : 6 − 20 = −14 → −14 + 26 = 12'
		});
	});

	it('la clé n’avance que sur les lettres', () => {
		expect(vigenereEncrypt('A A, A!', 'AB').text).toBe('A B, A!');
	});

	it('clé d’une lettre = César', () => {
		expect(vigenereEncrypt(FRENCH_SENTENCE, 'D').text).toBe(caesarEncrypt(FRENCH_SENTENCE, 3).text);
	});

	it('la clé est normalisée (accents, espaces)', () => {
		expect(vigenereEncrypt('MER', 'ubu !').text).toBe('GFL');
	});

	it('clé sans lettre → erreur', () => {
		expect(() => vigenereEncrypt('MER', '12 !')).toThrow(CipherInputError);
		expect(() => vigenereEncrypt('MER', '')).toThrow('La clé doit contenir au moins une lettre.');
	});

	it('aller-retour pour 300 clés et textes tirés', () => {
		const rand = seededRandom(1553);
		for (let i = 0; i < 300; i++) {
			const text = randomText(rand);
			const key = randomText(rand, 10) + 'K';
			expect(vigenereDecrypt(vigenereEncrypt(text, key).text, key).text).toBe(normalizeText(text));
		}
	});
});

describe('indice de coïncidence', () => {
	it('AABB : 2 × 1 + 2 × 1 sur 4 × 3 = 1/3', () => {
		expect(indexOfCoincidence('AABB')).toBeCloseTo(1 / 3, 10);
	});

	it('moins de deux lettres → 0', () => {
		expect(indexOfCoincidence('A')).toBe(0);
	});

	it('l’indice du français est proche de 0,078', () => {
		expect(FRENCH_IC).toBeGreaterThan(0.07);
		expect(FRENCH_IC).toBeLessThan(0.085);
	});

	it('un texte français est proche du français, un Vigenère s’en éloigne', () => {
		expect(indexOfCoincidence(LONG_FRENCH_TEXT)).toBeGreaterThan(0.065);
		expect(indexOfCoincidence(vigenereEncrypt(LONG_FRENCH_TEXT, 'PHYNANCE').text)).toBeLessThan(
			0.055
		);
	});

	it('moyenne par colonnes : élevée à la bonne longueur de clé', () => {
		const encrypted = vigenereEncrypt(LONG_FRENCH_TEXT, 'MERDRE').text;
		expect(averageIndexOfCoincidence(encrypted, 6)).toBeGreaterThan(0.065);
		expect(averageIndexOfCoincidence(encrypted, 5)).toBeLessThan(0.055);
	});
});

describe('Kasiski', () => {
	it('repère les répétitions, leurs distances et leur PGCD', () => {
		const result = kasiski('ABCDEFABCDEFABC');
		expect(result.repeats[0]).toEqual({
			sequence: 'ABC',
			positions: [0, 6, 12],
			distances: [6, 6]
		});
		expect(result.gcd).toBe(6);
	});

	it('compte les distances divisibles par chaque longueur', () => {
		const result = kasiski('ABCDEFABCDEFABC');
		expect(result.divisorCounts.find((d) => d.length === 3)?.count).toBe(result.distanceCount);
		expect(result.divisorCounts.find((d) => d.length === 4)?.count).toBe(0);
	});

	it('aucune répétition → PGCD absent', () => {
		expect(kasiski('ABCDEFGHIJ')).toMatchObject({ repeats: [], gcd: null, distanceCount: 0 });
	});
});

describe('décryptage complet', () => {
	it.each(['ROI', 'MERDRE', 'PHYNANCE'])(
		'sur un texte de plus de 400 lettres, retrouve la longueur puis la clé %s',
		(key) => {
			const encrypted = vigenereEncrypt(LONG_FRENCH_TEXT, key).text;
			expect(lettersOnly(LONG_FRENCH_TEXT).length).toBeGreaterThan(400);
			expect(suggestKeyLength(encrypted)).toBe(key.length);
			const cracked = crackVigenere(encrypted, key.length);
			expect(cracked.key).toBe(key);
			expect(cracked.text).toBe(normalizeText(LONG_FRENCH_TEXT));
		}
	);

	it('détaille chaque colonne : le décalage trouvé et sa lettre', () => {
		const encrypted = vigenereEncrypt(LONG_FRENCH_TEXT, 'ROI').text;
		expect(crackVigenere(encrypted, 3).columns).toEqual([
			{ index: 0, shift: 17, letter: 'R' },
			{ index: 1, shift: 14, letter: 'O' },
			{ index: 2, shift: 8, letter: 'I' }
		]);
	});

	it('texte sans lettre : longueur 1, clé vide', () => {
		expect(suggestKeyLength('2026 !')).toBe(1);
		expect(crackVigenere('2026 !', 3).key).toBe('');
	});
});
