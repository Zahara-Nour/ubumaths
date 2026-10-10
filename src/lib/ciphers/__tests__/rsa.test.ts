import { describe, expect, it } from 'vitest';
import { lettersOnly } from '../alphabet';
import { CipherInputError } from '../errors';
import {
	RSA_PRIMES,
	extendedEuclid,
	factorize,
	isPrime,
	modPow,
	rsaCrack,
	rsaDecrypt,
	rsaEncrypt,
	rsaKeys,
	rsaLetterTable,
	validExponents
} from '../rsa';
import { randomText, seededRandom } from './helpers';

/** Calcul indépendant, en BigInt, pour vérifier l'exponentiation rapide */
function bigPow(base: number, exponent: number, modulus: number): number {
	return Number(BigInt(base) ** BigInt(exponent) % BigInt(modulus));
}

describe('nombres premiers', () => {
	it('isPrime', () => {
		expect([2, 3, 31, 37, 97].every(isPrime)).toBe(true);
		expect([0, 1, 4, 33, 91].some(isPrime)).toBe(false);
	});

	it('la liste proposée ne contient que des premiers, de 11 à 97', () => {
		expect(RSA_PRIMES[0]).toBe(11);
		expect(RSA_PRIMES.at(-1)).toBe(97);
		expect(RSA_PRIMES.every(isPrime)).toBe(true);
	});
});

describe('Euclide étendu', () => {
	it('φ = 1080, e = 7 : le tableau, puis 1 = −3 × 1080 + 463 × 7', () => {
		expect(extendedEuclid(1080, 7)).toEqual({
			gcd: 1,
			u: -3,
			v: 463,
			rows: [
				{ r: 1080, q: null, u: 1, v: 0 },
				{ r: 7, q: 154, u: 0, v: 1 },
				{ r: 2, q: 3, u: 1, v: -154 },
				{ r: 1, q: 2, u: -3, v: 463 }
			]
		});
	});

	it('u·a + v·b = pgcd, pour 300 couples tirés', () => {
		const rand = seededRandom(1977);
		for (let i = 0; i < 300; i++) {
			const a = 2 + Math.floor(rand() * 5000);
			const b = 1 + Math.floor(rand() * a);
			const { gcd, u, v } = extendedEuclid(a, b);
			expect(u * a + v * b).toBe(gcd);
			expect((a % gcd) + (b % gcd)).toBe(0);
		}
	});
});

describe('exponentiation rapide', () => {
	it('186⁷ mod 1147 : la valeur du calcul indépendant', () => {
		expect(modPow(186, 7, 1147).result).toBe(bigPow(186, 7, 1147));
	});

	it('7 = 111 en binaire : trois carrés successifs, tous utilisés', () => {
		const pow = modPow(186, 7, 1147);
		expect(pow.binary).toBe('111');
		expect(pow.squares.map((s) => s.exponent)).toEqual([1, 2, 4]);
		expect(pow.squares.every((s) => s.used)).toBe(true);
		expect(pow.squares[1].value).toBe(bigPow(186, 2, 1147));
	});

	it('463 = 111001111 en binaire : seuls les carrés des bits à 1 sont utilisés', () => {
		const pow = modPow(10, 463, 1147);
		expect(pow.binary).toBe('111001111');
		expect(pow.squares.filter((s) => s.used).map((s) => s.exponent)).toEqual([
			1, 2, 4, 8, 64, 128, 256
		]);
		expect(pow.result).toBe(bigPow(10, 463, 1147));
	});

	it('exposant négatif : refusé', () => {
		expect(() => modPow(3, -3, 7)).toThrow(RangeError);
	});

	it('nombre de multiplications : (bits − 1) carrés + (bits à 1 − 1) produits', () => {
		expect(modPow(186, 7, 1147).multiplications).toBe(4);
		expect(modPow(186, 3, 1147).multiplications).toBe(2);
		expect(modPow(10, 463, 1147).multiplications).toBe(14);
	});

	it('exactitude sur 500 cas tirés', () => {
		const rand = seededRandom(3);
		for (let i = 0; i < 500; i++) {
			const modulus = 2 + Math.floor(rand() * 9000);
			const base = Math.floor(rand() * modulus);
			const exponent = Math.floor(rand() * 3000);
			expect(modPow(base, exponent, modulus).result).toBe(bigPow(base, exponent, modulus));
		}
	});
});

describe('clés RSA', () => {
	it('p = 31, q = 37, e = 7 : n = 1147, φ = 1080, d = 463', () => {
		const keys = rsaKeys(31, 37, 7);
		expect(keys).toMatchObject({ n: 1147, phi: 1080, e: 7, d: 463 });
		expect(keys.steps).toEqual([
			'n = p × q = 31 × 37 = 1147',
			'φ(n) = (p − 1)(q − 1) = 30 × 36 = 1080',
			'e = 7 est premier avec 1080',
			'Euclide étendu : 1 = −3 × 1080 + 463 × 7, donc 463 × 7 ≡ 1 (mod 1080) : d = 463',
			'Clé publique (n, e) = (1147, 7) ; clé privée d = 463'
		]);
	});

	it('v négatif : d est ramené entre 0 et φ − 1', () => {
		const keys = rsaKeys(43, 47, 5);
		expect(keys.d).toBeGreaterThan(0);
		expect((keys.d * 5) % keys.phi).toBe(1);
	});

	it('exposants proposés : premiers avec φ, de 3 à 97', () => {
		const exponents = validExponents(1080);
		expect(exponents.slice(0, 4)).toEqual([7, 11, 13, 17]);
		expect(exponents.every((e) => e < 100)).toBe(true);
	});

	it.each([
		[33, 37, 7, 'p = 33 n’est pas premier.'],
		[31, 31, 7, 'p et q doivent être différents.'],
		[11, 13, 7, 'n = p × q = 143 doit dépasser 675 pour coder deux lettres.'],
		[31, 37, 9, 'e = 9 n’est pas premier avec φ(n) = 1080.'],
		// Revue du 2026-10-06 : e = 1 ou négatif recevait le message du PGCD, faux
		[31, 37, 1, 'e doit être un entier au moins égal à 2.'],
		[31, 37, -5, 'e doit être un entier au moins égal à 2.']
	])('p = %i, q = %i, e = %i → erreur', (p, q, e, message) => {
		expect(() => rsaKeys(p, q, e)).toThrow(CipherInputError);
		expect(() => rsaKeys(p, q, e)).toThrow(message);
	});
});

describe('chiffrement RSA', () => {
	const keys = rsaKeys(31, 37, 7);

	it('HE → m = 26 × 7 + 4 = 186 → c = 186⁷ mod 1147', () => {
		const result = rsaEncrypt('He', keys);
		const c = bigPow(186, 7, 1147);
		expect(result.text).toBe(String(c));
		expect(result.steps[0]).toEqual({
			input: 'HE',
			output: String(c),
			detail: `m = 26 × 7 + 4 = 186 ; 186⁷ mod 1147 = ${c}`
		});
	});

	it('longueur impaire : un X complète, et c’est signalé', () => {
		const result = rsaEncrypt('Hel', keys);
		expect(result.padded).toBe(true);
		expect(result.text.split(' ')).toHaveLength(2);
	});

	it('déchiffre : c → m = c⁴⁶³ mod 1147 → HE', () => {
		const c = bigPow(186, 7, 1147);
		const result = rsaDecrypt(String(c), keys);
		expect(result.text).toBe('HE');
		expect(result.steps[0].detail).toBe(`${c}⁴⁶³ mod 1147 = 186 = 26 × 7 + 4`);
	});

	it('aller-retour pour toutes les clés de la liste (e = premier exposant valide)', () => {
		const rand = seededRandom(1978);
		for (const p of RSA_PRIMES) {
			for (const q of RSA_PRIMES) {
				if (p >= q || p * q <= 675) continue;
				const phi = (p - 1) * (q - 1);
				const key = rsaKeys(p, q, validExponents(phi)[0]);
				const text = randomText(rand, 20);
				const encrypted = rsaEncrypt(text, key);
				const plain = lettersOnly(text) + (encrypted.padded ? 'X' : '');
				expect(rsaDecrypt(encrypted.text, key).text).toBe(plain);
			}
		}
	});

	it('nombre ≥ n → erreur', () => {
		expect(() => rsaDecrypt('1200', keys)).toThrow(
			'Le nombre 1200 dépasse n − 1 = 1146 : il ne vient pas de cette clé.'
		);
	});

	it('bloc déchiffré au-delà de 675 → mauvaise clé', () => {
		// 700 = m pour c = 700⁷ mod 1147 : aucune paire de lettres ne donne 700
		const c = bigPow(700, 7, 1147);
		expect(() => rsaDecrypt(String(c), keys)).toThrow(
			`Le bloc ${c} donne 700, qui ne correspond à aucune paire de lettres : est-ce la bonne clé ?`
		);
	});

	it('caractère inattendu → erreur', () => {
		expect(() => rsaDecrypt('12 a4', keys)).toThrow('Caractère inattendu « a » (position 4).');
	});
});

describe('décrypter RSA', () => {
	it('factorise n par divisions successives', () => {
		expect(factorize(1147)).toEqual({
			p: 31,
			q: 37,
			tried: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31]
		});
		expect(factorize(97)).toBeNull();
	});

	it('clé publique (2021, 5) : factorise, recalcule d et déchiffre', () => {
		const key = rsaKeys(43, 47, 5);
		const encrypted = rsaEncrypt('Merdre', key).text;
		const crack = rsaCrack(encrypted, 2021, 5);
		expect(crack.text).toBe('MERDRE');
		expect(crack.steps[0]).toBe(
			'On essaie les nombres premiers jusqu’à √2021 ≈ 44,96 : 2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43.'
		);
		expect(crack.steps[1]).toBe('2021 = 43 × 47');
	});

	it('n carré d’un premier : ce n’est pas une clé RSA', () => {
		expect(() => rsaCrack('1', 961, 7)).toThrow(
			'961 = 31² n’est pas une clé RSA : p et q doivent être différents.'
		);
	});

	it('e inférieur à 2 → message dédié', () => {
		expect(() => rsaCrack('1', 2021, 1)).toThrow('e doit être un entier au moins égal à 2.');
	});

	it('n premier ou e non premier avec φ → erreur', () => {
		expect(() => rsaCrack('1', 97, 5)).toThrow('97 est premier : ce n’est pas une clé RSA.');
		expect(() => rsaCrack('1', 2021, 7)).toThrow('e = 7 n’est pas premier avec φ(n) = 1932.');
	});
});

describe('RSA lettre par lettre', () => {
	it('chaque lettre a toujours la même image : c’est une substitution', () => {
		const table = rsaLetterTable(rsaKeys(31, 37, 7));
		expect(table).toHaveLength(26);
		expect(table[4]).toEqual({ letter: 'E', m: 4, c: bigPow(4, 7, 1147) });
		// A (0) et B (1) ne bougent même pas
		expect(table[0].c).toBe(0);
		expect(table[1].c).toBe(1);
	});
});
