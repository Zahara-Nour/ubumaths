import { describe, expect, it } from 'vitest';
import { lettersOnly } from '../alphabet';
import { CipherInputError } from '../errors';
import {
	hillCollision,
	hillDecrypt,
	hillEncrypt,
	hillInverse,
	hillKeyFromKeyword,
	hillRowAttack,
	knownPlaintextAttack,
	type HillKey
} from '../hill';
import { LONG_FRENCH_TEXT, randomText, seededRandom } from './helpers';

const M: HillKey = { a: 3, b: 3, c: 2, d: 5 };

describe('clé de Hill', () => {
	it('mot-clé de 4 lettres : HILL → (7 8 ; 11 11)', () => {
		expect(hillKeyFromKeyword('Hill')).toEqual({ a: 7, b: 8, c: 11, d: 11 });
	});

	it('mot-clé qui n’a pas 4 lettres → erreur', () => {
		expect(() => hillKeyFromKeyword('UBU')).toThrow(
			'Le mot-clé doit contenir exactement 4 lettres.'
		);
	});

	it('inverse de (3 3 ; 2 5) : les étapes, du déterminant à M⁻¹', () => {
		expect(hillInverse(M)).toEqual({
			ok: true,
			inverse: { a: 15, b: 17, c: 20, d: 9 },
			steps: [
				'det M = 3 × 5 − 3 × 2 = 9',
				'9 a pour inverse 3 modulo 26, car 9 × 3 = 27 = 1 × 26 + 1',
				'On échange a et d, on change le signe de b et c : (5 −3 ; −2 3) ≡ (5 23 ; 24 3)',
				'M⁻¹ = 3 × (5 23 ; 24 3) = (15 69 ; 72 9) ≡ (15 17 ; 20 9) (mod 26)'
			]
		});
	});

	it('déterminant négatif : réduit modulo 26', () => {
		const result = hillInverse(hillKeyFromKeyword('HILL'));
		expect(result.steps[0]).toBe('det M = 7 × 11 − 8 × 11 = −11 ≡ 15');
		expect(result.ok).toBe(true);
	});

	it('déterminant pas premier avec 26 : pas d’inverse, et on dit pourquoi', () => {
		const result = hillInverse({ a: 2, b: 0, c: 0, d: 1 });
		expect(result.ok).toBe(false);
		expect(result.steps.at(-1)).toBe(
			'2 n’est pas premier avec 26 : la matrice n’a pas d’inverse modulo 26.'
		);
	});
});

describe('chiffrement de Hill', () => {
	it('HE → (7, 4) → (33, 34) → (7, 8) → HI', () => {
		const result = hillEncrypt('He', M);
		expect(result.text).toBe('HI');
		expect(result.steps[0]).toEqual({
			input: 'HE',
			output: 'HI',
			detail: '(7, 4) → (3 × 7 + 3 × 4, 2 × 7 + 5 × 4) = (33, 34) ≡ (7, 8)'
		});
		expect(result.padded).toBe(false);
	});

	it('pas de réduction affichée quand les valeurs sont déjà entre 0 et 25', () => {
		expect(hillEncrypt('AB', M).steps[0].detail).toBe(
			'(0, 1) → (3 × 0 + 3 × 1, 2 × 0 + 5 × 1) = (3, 5)'
		);
	});

	it('seules les lettres sont chiffrées ; longueur impaire → un X ajouté, signalé', () => {
		const result = hillEncrypt("H'é, l !", M);
		expect(result.padded).toBe(true);
		expect(result.text).toBe(hillEncrypt('HELX', M).text);
		expect(result.text).toHaveLength(4);
		expect(hillEncrypt('HELP', M).padded).toBe(false);
	});

	it('déchiffre avec M⁻¹ : HI → HE', () => {
		const result = hillDecrypt('HI', M);
		expect(result.text).toBe('HE');
		expect(result.steps[0].detail).toBe(
			'(7, 8) → (15 × 7 + 17 × 8, 20 × 7 + 9 × 8) = (241, 212) ≡ (7, 4)'
		);
	});

	it('aller-retour pour 200 clés inversibles et textes tirés', () => {
		const rand = seededRandom(1929);
		let tested = 0;
		while (tested < 200) {
			const key = {
				a: Math.floor(rand() * 26),
				b: Math.floor(rand() * 26),
				c: Math.floor(rand() * 26),
				d: Math.floor(rand() * 26)
			};
			if (!hillInverse(key).ok) continue;
			const text = randomText(rand);
			const encrypted = hillEncrypt(text, key);
			const plain = lettersOnly(text) + (encrypted.padded ? 'X' : '');
			expect(hillDecrypt(encrypted.text, key).text).toBe(plain);
			tested++;
		}
	});

	it('déchiffrer avec une clé non inversible → erreur expliquée', () => {
		expect(() => hillDecrypt('AA', { a: 2, b: 0, c: 0, d: 1 })).toThrow(CipherInputError);
		expect(() => hillDecrypt('AA', { a: 2, b: 0, c: 0, d: 1 })).toThrow(
			'Le déterminant vaut 2 : il n’est pas premier avec 26, la matrice n’a pas d’inverse modulo 26 et on ne peut pas déchiffrer.'
		);
	});

	it('déchiffrer un nombre impair de lettres → erreur', () => {
		expect(() => hillDecrypt('HIX', M)).toThrow(
			'Nombre impair de lettres : un message de Hill se lit par paires.'
		);
	});

	it('valeurs non entières → erreur', () => {
		expect(() => hillEncrypt('HE', { a: 1.5, b: 0, c: 0, d: 1 })).toThrow(
			'Les quatre coefficients doivent être des nombres entiers.'
		);
	});
});

describe('hillCollision', () => {
	it('(2 0 ; 0 1) : AA et NA donnent tous deux AA', () => {
		expect(hillCollision({ a: 2, b: 0, c: 0, d: 1 })).toEqual({ pairs: ['AA', 'NA'], image: 'AA' });
	});

	it('clé inversible : aucune collision', () => {
		expect(hillCollision(M)).toBeNull();
	});
});

describe('attaque à clair connu', () => {
	// (3 3 ; 2 5) : HELP → HIAT
	it('HELP → HIAT : M = C·P⁻¹ retrouve (3 3 ; 2 5)', () => {
		expect(hillEncrypt('HELP', M).text).toBe('HIAT');
		const attack = knownPlaintextAttack('HIAT', 'HELP');
		expect(attack.key).toEqual(M);
		expect(attack.steps).toEqual([
			'P = (7 11 ; 4 15) : les paires claires HE et LP, en colonnes',
			'C = (7 0 ; 8 19) : les paires chiffrées HI et AT, en colonnes',
			'det P = 7 × 15 − 11 × 4 = 61 ≡ 9',
			'9 a pour inverse 3 modulo 26, car 9 × 3 = 27 = 1 × 26 + 1',
			'On échange a et d, on change le signe de b et c : (15 −11 ; −4 7) ≡ (15 15 ; 22 7)',
			'P⁻¹ = 3 × (15 15 ; 22 7) = (45 45 ; 66 21) ≡ (19 19 ; 14 21) (mod 26)',
			'M = C·P⁻¹ = (133 133 ; 418 551) ≡ (3 3 ; 2 5) (mod 26)'
		]);
	});

	it('P non inversible : on le dit, sans clé', () => {
		const attack = knownPlaintextAttack('HIAT', 'AAAB');
		expect(attack.key).toBeNull();
		expect(attack.steps.at(-1)).toBe('P n’est pas inversible : choisissez un autre passage connu.');
	});

	it('clé trouvée non inversible : l’hypothèse est donc fausse', () => {
		// C = (0 0 ; 0 0) : M = 0, pas une clé
		const attack = knownPlaintextAttack('AAAA', 'HELP');
		expect(attack.key).toBeNull();
		expect(attack.steps.at(-1)).toBe(
			'La matrice trouvée n’est pas inversible : l’hypothèse est donc fausse.'
		);
	});

	it('il faut exactement 4 lettres de chaque côté', () => {
		expect(() => knownPlaintextAttack('HIA', 'HELP')).toThrow(
			'Il faut 4 lettres claires et les 4 lettres chiffrées correspondantes.'
		);
	});
});

describe('attaque ligne par ligne', () => {
	it('sur un texte de plus de 400 lettres, retrouve la clé et le message', () => {
		const encrypted = hillEncrypt(LONG_FRENCH_TEXT, M);
		const attack = hillRowAttack(encrypted.text);
		expect(attack.ok).toBe(true);
		if (!attack.ok) return;
		expect(attack.key).toEqual(M);
		expect(attack.text).toBe(lettersOnly(LONG_FRENCH_TEXT) + (encrypted.padded ? 'X' : ''));
	});

	it('les lignes retenues sont celles de M⁻¹, à l’ordre près', () => {
		const attack = hillRowAttack(hillEncrypt(LONG_FRENCH_TEXT, M).text);
		if (!attack.ok) throw new Error('attaque échouée');
		expect(attack.inverse).toEqual({ a: 15, b: 17, c: 20, d: 9 });
	});

	// Revue du 2026-10-06 : l'écran surlignait toujours les deux premières lignes
	it('désigne les lignes réellement retenues, même quand ce ne sont pas les deux premières', () => {
		const letters = lettersOnly(LONG_FRENCH_TEXT);
		const keys: HillKey[] = [M, { a: 5, b: 17, c: 4, d: 15 }, { a: 7, b: 8, c: 11, d: 11 }];
		for (const key of keys) {
			for (const length of [40, 60, 80, 120, 200]) {
				const attack = hillRowAttack(hillEncrypt(letters.slice(0, length), key).text);
				if (!attack.ok) continue;
				const [first, second] = attack.chosen.map((i) => attack.candidates[i]);
				expect([first.u, first.v, second.u, second.v]).toEqual([
					attack.inverse.a,
					attack.inverse.b,
					attack.inverse.c,
					attack.inverse.d
				]);
			}
		}
	});

	it('moins de 20 paires : trop court pour une attaque statistique', () => {
		expect(hillRowAttack('AB')).toEqual({ ok: false, reason: 'too-short' });
		expect(hillRowAttack(hillEncrypt('RAPPORTDU', M).text)).toEqual({
			ok: false,
			reason: 'too-short'
		});
	});

	it('aucune combinaison inversible parmi les meilleures lignes : on le dit', () => {
		expect(hillRowAttack('A'.repeat(60))).toEqual({ ok: false, reason: 'no-invertible' });
	});
});
