import { describe, expect, it } from 'vitest';
import { normalizeText } from '../alphabet';
import { CipherInputError } from '../errors';
import { caesarDecrypt, caesarEncrypt } from '../caesar';
import { randomText, seededRandom } from './helpers';

describe('César', () => {
	it('UBU décalé de 3 → XEX', () => {
		expect(caesarEncrypt('UBU', 3).text).toBe('XEX');
	});

	it('repart au début de l’alphabet : XYZ → ABC', () => {
		expect(caesarEncrypt('XYZ', 3).text).toBe('ABC');
	});

	it('normalise et laisse passer ce qui n’est pas une lettre', () => {
		expect(caesarEncrypt("L'été 2026 !", 1).text).toBe("M'FUF 2026 !");
	});

	it('un décalage hors de 0..25 est réduit modulo 26', () => {
		expect(caesarEncrypt('PATAPHYSIQUE', 29).text).toBe(caesarEncrypt('PATAPHYSIQUE', 3).text);
		expect(caesarEncrypt('PATAPHYSIQUE', -1).text).toBe(caesarEncrypt('PATAPHYSIQUE', 25).text);
	});

	it('décalage 0 ou 26 : texte inchangé (normalisé)', () => {
		expect(caesarEncrypt('Merdre', 0).text).toBe('MERDRE');
		expect(caesarEncrypt('Merdre', 26).text).toBe('MERDRE');
	});

	it('déchiffre : XEX décalé de 3 → UBU', () => {
		expect(caesarDecrypt('XEX', 3).text).toBe('UBU');
	});

	it('aller-retour : déchiffrer(chiffrer(x, k), k) = normaliser(x), pour 500 cas tirés', () => {
		const rand = seededRandom(42);
		for (let i = 0; i < 500; i++) {
			const text = randomText(rand);
			const shift = Math.floor(rand() * 200) - 100;
			const encrypted = caesarEncrypt(text, shift).text;
			expect(caesarDecrypt(encrypted, shift).text).toBe(normalizeText(text));
		}
	});

	it('étapes : H avec k = 3 → 7 + 3 = 10 → K', () => {
		const [step] = caesarEncrypt('H', 3).steps;
		expect(step).toEqual({ input: 'H', output: 'K', detail: '7 + 3 = 10' });
	});

	it('étapes : la réduction modulo 26 est visible (Y + 3)', () => {
		const [step] = caesarEncrypt('Y', 3).steps;
		expect(step).toEqual({ input: 'Y', output: 'B', detail: '24 + 3 = 27 → 27 − 26 = 1' });
	});

	it('étapes du déchiffrement : B − 3 repasse par + 26', () => {
		const [step] = caesarDecrypt('B', 3).steps;
		expect(step).toEqual({ input: 'B', output: 'Y', detail: '1 − 3 = −2 → −2 + 26 = 24' });
	});

	it('une étape par lettre, aucune pour le reste', () => {
		expect(caesarEncrypt('A B!', 1).steps.map((s) => s.input)).toEqual(['A', 'B']);
	});

	it('décalage non entier → erreur explicite', () => {
		expect(() => caesarEncrypt('UBU', 1.5)).toThrow(CipherInputError);
		expect(() => caesarEncrypt('UBU', 1.5)).toThrow('Le décalage doit être un nombre entier.');
	});
});
