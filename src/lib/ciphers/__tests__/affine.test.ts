import { describe, expect, it } from 'vitest';
import { normalizeText } from '../alphabet';
import { atbash } from '../atbash';
import { caesarEncrypt } from '../caesar';
import { CipherInputError } from '../errors';
import {
	VALID_A,
	affineBruteForce,
	affineCollisions,
	affineDecrypt,
	affineEncrypt,
	twoLetterAttack
} from '../affine';
import { FRENCH_SENTENCE, randomText, seededRandom } from './helpers';

describe('chiffre affine', () => {
	it('les 12 valeurs de a premières avec 26', () => {
		expect(VALID_A).toEqual([1, 3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]);
	});

	it('(5, 8) : A → I, UBU → ENE', () => {
		expect(affineEncrypt('A', 5, 8).text).toBe('I');
		expect(affineEncrypt('Ubu !', 5, 8).text).toBe('ENE !');
	});

	it('étapes : le calcul et sa réduction modulo 26', () => {
		expect(affineEncrypt('A', 5, 8).steps[0]).toEqual({
			input: 'A',
			output: 'I',
			detail: '5 × 0 + 8 = 8'
		});
		expect(affineEncrypt('U', 5, 8).steps[0]).toEqual({
			input: 'U',
			output: 'E',
			detail: '5 × 20 + 8 = 108 → 108 − 4 × 26 = 4'
		});
	});

	it('déchiffre avec l’inverse : E → U par 21 × (4 − 8)', () => {
		expect(affineDecrypt('E', 5, 8).steps[0]).toEqual({
			input: 'E',
			output: 'U',
			detail: '21 × (4 − 8) = −84 → −84 + 4 × 26 = 20'
		});
		expect(affineDecrypt('ENE !', 5, 8).text).toBe('UBU !');
	});

	it('aller-retour pour les 312 clés valides', () => {
		const rand = seededRandom(312);
		for (const a of VALID_A) {
			for (let b = 0; b < 26; b++) {
				const text = randomText(rand, 30);
				expect(affineDecrypt(affineEncrypt(text, a, b).text, a, b).text).toBe(normalizeText(text));
			}
		}
	});

	it('a = 1 : c’est César ; (25, 25) : c’est Atbash', () => {
		expect(affineEncrypt(FRENCH_SENTENCE, 1, 3).text).toBe(caesarEncrypt(FRENCH_SENTENCE, 3).text);
		expect(affineEncrypt(FRENCH_SENTENCE, 25, 25).text).toBe(atbash(FRENCH_SENTENCE).text);
	});

	it('a et b sont pris modulo 26', () => {
		expect(affineEncrypt('UBU', 31, -18).text).toBe(affineEncrypt('UBU', 5, 8).text);
	});

	it('a invalide : on chiffre quand même, mais le déchiffrement est refusé et expliqué', () => {
		expect(affineEncrypt('AN', 2, 8).text).toBe('II');
		expect(() => affineDecrypt('II', 2, 8)).toThrow(CipherInputError);
		expect(() => affineDecrypt('II', 2, 8)).toThrow(
			'a = 2 n’est pas premier avec 26 : il n’a pas d’inverse modulo 26, on ne peut pas déchiffrer.'
		);
	});

	it('clé non entière → erreur', () => {
		expect(() => affineEncrypt('A', 1.5, 0)).toThrow('a et b doivent être des nombres entiers.');
	});
});

describe('affineCollisions', () => {
	it('a = 2, b = 8 : A et N donnent tous deux I', () => {
		const collisions = affineCollisions(2, 8);
		expect(collisions).toHaveLength(13);
		expect(collisions[0]).toEqual({ letters: ['A', 'N'], image: 'I' });
	});

	it('a = 13 : treize lettres sur la même image', () => {
		expect(affineCollisions(13, 0).map((c) => c.letters.length)).toEqual([13, 13]);
	});

	it('a valide : aucune collision', () => {
		expect(affineCollisions(5, 8)).toEqual([]);
	});
});

describe('affineBruteForce', () => {
	it('312 candidats, la bonne clé en tête sur une phrase française', () => {
		const candidates = affineBruteForce(affineEncrypt(FRENCH_SENTENCE, 7, 3).text);
		expect(candidates).toHaveLength(312);
		expect(candidates[0]).toMatchObject({ a: 7, b: 3, text: normalizeText(FRENCH_SENTENCE) });
	});

	it('texte sans lettre → aucun candidat', () => {
		expect(affineBruteForce('2026')).toEqual([]);
	});
});

describe('twoLetterAttack', () => {
	// (5, 8) : E (4) → C (2) ; A (0) → I (8)
	it('E → C et A → I : une seule clé, (5, 8), avec les étapes du système', () => {
		const attack = twoLetterAttack({ cipher: 'C', plain: 'E' }, { cipher: 'I', plain: 'A' });
		expect(attack.solutions).toEqual([{ a: 5, b: 8 }]);
		expect(attack.steps).toEqual([
			'E (4) devient C (2) : 4a + b ≡ 2 (mod 26)',
			'A (0) devient I (8) : 0a + b ≡ 8 (mod 26)',
			'On soustrait : 4a ≡ −6 ≡ 20 (mod 26)',
			'4 n’est pas premier avec 26 : on essaie les 26 valeurs de a.',
			'Une seule clé valide : a = 5, b = 8.'
		]);
	});

	it('différence inversible : on divise par l’inverse', () => {
		// (5, 8) : B (1) → N (13) ; A (0) → I (8)
		const attack = twoLetterAttack({ cipher: 'N', plain: 'B' }, { cipher: 'I', plain: 'A' });
		expect(attack.solutions).toEqual([{ a: 5, b: 8 }]);
		expect(attack.steps).toContain('1 a pour inverse 1 modulo 26 : a ≡ 5 × 1 ≡ 5 (mod 26)');
	});

	it('hypothèse fausse : aucune clé valide, et on le dit', () => {
		// 2a ≡ 1 (mod 26) n'a pas de solution
		const attack = twoLetterAttack({ cipher: 'B', plain: 'C' }, { cipher: 'A', plain: 'A' });
		expect(attack.solutions).toEqual([]);
		expect(attack.steps.at(-1)).toBe('Aucune clé valide : l’hypothèse est sans doute fausse.');
	});

	it('plusieurs clés possibles : on les liste', () => {
		// 13a ≡ 13 : toutes les valeurs impaires de a conviennent
		const attack = twoLetterAttack({ cipher: 'N', plain: 'N' }, { cipher: 'A', plain: 'A' });
		expect(attack.solutions.length).toBeGreaterThan(1);
		expect(attack.steps.at(-1)).toMatch(/^Plusieurs clés possibles/);
	});

	it('deux fois la même lettre → erreur', () => {
		expect(() => twoLetterAttack({ cipher: 'C', plain: 'E' }, { cipher: 'I', plain: 'E' })).toThrow(
			'Choisissez deux lettres claires différentes et deux lettres chiffrées différentes.'
		);
	});
});
