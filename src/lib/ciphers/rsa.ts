/**
 * RSA de poche (Rivest, Shamir et Adleman, 1977), avec de petits nombres pour
 * voir chaque calcul : n = p·q, φ(n) = (p − 1)(q − 1), d = e⁻¹ mod φ(n) par
 * l'algorithme d'Euclide étendu, et l'exponentiation rapide.
 *
 * Les lettres sont codées par blocs de deux : m = 26·x₁ + x₂, entre 0 et 675,
 * d'où n > 675. Lettre par lettre, RSA ne serait qu'une substitution.
 *
 * @module lib/ciphers/rsa
 */
import {
	ALPHABET,
	ALPHABET_SIZE,
	formatNumber,
	indexToLetter,
	letterIndex,
	lettersOnly,
	type CipherResult,
	type CipherStep
} from './alphabet';
import { CipherInputError } from './errors';
import { gcd } from './modular';

// Types

export interface EuclidRow {
	r: number;
	/** Quotient de la division du reste précédent par celui-ci (absent sur la 1ʳᵉ ligne) */
	q: number | null;
	u: number;
	v: number;
}

export interface RsaKeys {
	p: number;
	q: number;
	n: number;
	phi: number;
	e: number;
	d: number;
	euclid: EuclidRow[];
	steps: string[];
}

export interface RsaResult extends CipherResult {
	/** Vrai quand un X a complété le dernier bloc */
	padded: boolean;
}

export interface SquareStep {
	/** Puissance de 2 : base^exponent mod n */
	exponent: number;
	value: number;
	/** Vrai quand le bit correspondant de l'exposant vaut 1 */
	used: boolean;
}

// Constantes

/** Deux lettres : m = 26·x₁ + x₂ va de 0 à 675 */
export const MAX_BLOCK = ALPHABET_SIZE * ALPHABET_SIZE - 1;
const MAX_EXPONENT = 97;
const SUPERSCRIPTS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

// Functions

export function isPrime(n: number): boolean {
	if (!Number.isInteger(n) || n < 2) return false;
	for (let divisor = 2; divisor * divisor <= n; divisor++) if (n % divisor === 0) return false;
	return true;
}

/** Les premiers proposés pour p et q */
export const RSA_PRIMES: readonly number[] = Array.from({ length: 87 }, (_, i) => i + 11).filter(
	isPrime
);

function superscript(n: number): string {
	return [...String(n)].map((digit) => SUPERSCRIPTS[Number(digit)]).join('');
}

/** Exposants e proposés : premiers avec φ, de 3 à 97 */
export function validExponents(phi: number): number[] {
	return Array.from({ length: MAX_EXPONENT - 2 }, (_, i) => i + 3).filter(
		(e) => e < phi && gcd(e, phi) === 1
	);
}

/**
 * Euclide étendu, en tableau : chaque ligne vérifie r = u·a + v·b ; la
 * dernière ligne non nulle donne le PGCD et les coefficients de Bézout.
 */
export function extendedEuclid(
	a: number,
	b: number
): { gcd: number; u: number; v: number; rows: EuclidRow[] } {
	const rows: EuclidRow[] = [{ r: a, q: null, u: 1, v: 0 }];
	let previous = rows[0];
	let current: EuclidRow = { r: b, q: null, u: 0, v: 1 };
	while (current.r !== 0) {
		rows.push(current);
		const quotient = Math.floor(previous.r / current.r);
		current.q = quotient;
		const next: EuclidRow = {
			r: previous.r - quotient * current.r,
			q: null,
			u: previous.u - quotient * current.u,
			v: previous.v - quotient * current.v
		};
		[previous, current] = [current, next];
	}
	const last = previous;
	return { gcd: last.r, u: last.u, v: last.v, rows };
}

/** Exponentiation rapide : les carrés successifs, et ceux que retiennent les bits de l'exposant */
export function modPow(
	base: number,
	exponent: number,
	modulus: number
): { result: number; binary: string; squares: SquareStep[]; multiplications: number } {
	if (!Number.isInteger(exponent) || exponent < 0) {
		throw new RangeError(`Exposant invalide : ${exponent}`);
	}
	const binary = exponent.toString(2);
	const squares: SquareStep[] = [];
	let square = base % modulus;
	let result = 1 % modulus;
	for (let bit = 0; bit < binary.length; bit++) {
		const used = binary[binary.length - 1 - bit] === '1';
		squares.push({ exponent: 2 ** bit, value: square, used });
		if (used) result = (result * square) % modulus;
		square = (square * square) % modulus;
	}
	// (bits − 1) élévations au carré, puis (bits à 1 − 1) produits des carrés retenus
	const ones = [...binary].filter((bit) => bit === '1').length;
	const multiplications = binary.length - 1 + Math.max(0, ones - 1);
	return { result, binary, squares, multiplications };
}

export function rsaKeys(p: number, q: number, e: number): RsaKeys {
	for (const [name, value] of [
		['p', p],
		['q', q]
	] as const) {
		if (!isPrime(value)) throw new CipherInputError(`${name} = ${value} n’est pas premier.`);
	}
	if (p === q) throw new CipherInputError('p et q doivent être différents.');
	const n = p * q;
	if (n <= MAX_BLOCK) {
		throw new CipherInputError(
			`n = p × q = ${n} doit dépasser ${MAX_BLOCK} pour coder deux lettres.`
		);
	}
	const phi = (p - 1) * (q - 1);
	if (!Number.isInteger(e) || e < 2) {
		throw new CipherInputError('e doit être un entier au moins égal à 2.');
	}
	if (gcd(e, phi) !== 1) {
		throw new CipherInputError(`e = ${e} n’est pas premier avec φ(n) = ${phi}.`);
	}
	const euclid = extendedEuclid(phi, e);
	const d = ((euclid.v % phi) + phi) % phi;
	const bezout = `1 = ${formatNumber(euclid.u)} × ${phi} + ${formatNumber(euclid.v)} × ${e}`;
	const conclusion =
		euclid.v === d
			? `donc ${d} × ${e} ≡ 1 (mod ${phi}) : d = ${d}`
			: `donc ${formatNumber(euclid.v)} × ${e} ≡ 1 (mod ${phi}) : d = ${formatNumber(euclid.v)} + ${phi} = ${d}`;
	return {
		p,
		q,
		n,
		phi,
		e,
		d,
		euclid: euclid.rows,
		steps: [
			`n = p × q = ${p} × ${q} = ${n}`,
			`φ(n) = (p − 1)(q − 1) = ${p - 1} × ${q - 1} = ${phi}`,
			`e = ${e} est premier avec ${phi}`,
			`Euclide étendu : ${bezout}, ${conclusion}`,
			`Clé publique (n, e) = (${n}, ${e}) ; clé privée d = ${d}`
		]
	};
}

export function rsaEncrypt(text: string, { n, e }: Pick<RsaKeys, 'n' | 'e'>): RsaResult {
	const letters = lettersOnly(text);
	const padded = letters.length % 2 === 1;
	const blocks = (padded ? `${letters}X` : letters).match(/../g) ?? [];
	const steps: CipherStep[] = blocks.map((pair) => {
		const [x1, x2] = [...pair].map(letterIndex);
		const m = ALPHABET_SIZE * x1 + x2;
		const c = modPow(m, e, n).result;
		return {
			input: pair,
			output: String(c),
			detail: `m = 26 × ${x1} + ${x2} = ${m} ; ${m}${superscript(e)} mod ${n} = ${c}`
		};
	});
	return { text: steps.map((step) => step.output).join(' '), steps, padded };
}

/** Les nombres d'un message chiffré, avec leur position pour les messages d'erreur */
function parseNumbers(code: string): number[] {
	const numbers: number[] = [];
	let current = '';
	[...code].forEach((char, i) => {
		if (/[0-9]/.test(char)) current += char;
		else if (/[\s,;]/.test(char)) {
			if (current) numbers.push(Number(current));
			current = '';
		} else throw new CipherInputError(`Caractère inattendu « ${char} » (position ${i + 1}).`);
	});
	if (current) numbers.push(Number(current));
	return numbers;
}

export function rsaDecrypt(code: string, { n, d }: Pick<RsaKeys, 'n' | 'd'>): RsaResult {
	const steps: CipherStep[] = parseNumbers(code).map((c) => {
		if (c >= n) {
			throw new CipherInputError(
				`Le nombre ${c} dépasse n − 1 = ${n - 1} : il ne vient pas de cette clé.`
			);
		}
		const m = modPow(c, d, n).result;
		if (m > MAX_BLOCK) {
			throw new CipherInputError(
				`Le bloc ${c} donne ${m}, qui ne correspond à aucune paire de lettres : est-ce la bonne clé ?`
			);
		}
		const [x1, x2] = [Math.floor(m / ALPHABET_SIZE), m % ALPHABET_SIZE];
		return {
			input: String(c),
			output: indexToLetter(x1) + indexToLetter(x2),
			detail: `${c}${superscript(d)} mod ${n} = ${m} = 26 × ${x1} + ${x2}`
		};
	});
	return { text: steps.map((step) => step.output).join(''), steps, padded: false };
}

/** Divisions successives par les nombres premiers jusqu'à √n */
export function factorize(n: number): { p: number; q: number; tried: number[] } | null {
	const tried: number[] = [];
	for (let divisor = 2; divisor * divisor <= n; divisor++) {
		if (!isPrime(divisor)) continue;
		tried.push(divisor);
		if (n % divisor === 0) return { p: divisor, q: n / divisor, tried };
	}
	return null;
}

/** Décrypter sans la clé privée : factoriser n, recalculer φ puis d */
export function rsaCrack(code: string, n: number, e: number): { text: string; steps: string[] } {
	if (!Number.isInteger(n) || n < 4)
		throw new CipherInputError('n doit être un entier d’au moins 4.');
	const factors = factorize(n);
	if (factors === null) throw new CipherInputError(`${n} est premier : ce n’est pas une clé RSA.`);
	const { p, q, tried } = factors;
	if (p === q) {
		throw new CipherInputError(
			`${n} = ${p}² n’est pas une clé RSA : p et q doivent être différents.`
		);
	}
	if (!isPrime(q)) {
		throw new CipherInputError(`${n} = ${p} × ${q} n’est pas le produit de deux nombres premiers.`);
	}
	const root = Math.sqrt(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 });
	// rsaKeys vérifie e (entier ≥ 2, premier avec φ) et calcule d
	const keys = rsaKeys(p, q, e);
	return {
		text: rsaDecrypt(code, keys).text,
		steps: [
			`On essaie les nombres premiers jusqu’à √${n} ≈ ${root} : ${tried.join(', ')}.`,
			`${n} = ${p} × ${q}`,
			...keys.steps.slice(1)
		]
	};
}

/** RSA lettre par lettre : chaque lettre a toujours la même image, comme une substitution */
export function rsaLetterTable({
	n,
	e
}: Pick<RsaKeys, 'n' | 'e'>): { letter: string; m: number; c: number }[] {
	return [...ALPHABET].map((letter, m) => ({ letter, m, c: modPow(m, e, n).result }));
}
