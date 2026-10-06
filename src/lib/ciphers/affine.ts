/**
 * Chiffre affine : la lettre de rang x devient celle de rang a·x + b (mod 26).
 * On ne déchiffre que si a est premier avec 26 : il faut alors multiplier
 * par l'inverse de a. Sinon, deux lettres claires tombent sur la même lettre
 * chiffrée, et plus rien ne permet de les distinguer.
 *
 * @module lib/ciphers/affine
 */
import {
	ALPHABET,
	ALPHABET_SIZE,
	indexToLetter,
	letterIndex,
	lettersOnly,
	mapLetters,
	mod,
	type CipherResult
} from './alphabet';
import { CipherInputError } from './errors';
import { frenchScore } from './frequency';
import { formatNumber } from './alphabet';
import { gcd, modInverse, reduceDetail } from './modular';

// Types

export interface AffineKey {
	a: number;
	b: number;
}

export interface AffineCandidate extends AffineKey {
	text: string;
	score: number;
}

/** Une hypothèse de l'attaque : la lettre chiffrée `cipher` cache la lettre `plain` */
export interface LetterHypothesis {
	cipher: string;
	plain: string;
}

// Constantes

/** Les valeurs de a premières avec 26 : les seules qui se déchiffrent */
export const VALID_A: readonly number[] = Array.from({ length: ALPHABET_SIZE }, (_, a) => a).filter(
	(a) => gcd(a, ALPHABET_SIZE) === 1
);

// Functions

function checkKey(a: number, b: number): AffineKey {
	if (!Number.isInteger(a) || !Number.isInteger(b)) {
		throw new CipherInputError('a et b doivent être des nombres entiers.');
	}
	return { a: mod(a, ALPHABET_SIZE), b: mod(b, ALPHABET_SIZE) };
}

/** Chiffre même avec un a invalide : la page montre alors les collisions */
export function affineEncrypt(text: string, rawA: number, rawB: number): CipherResult {
	const { a, b } = checkKey(rawA, rawB);
	return mapLetters(text, (letter) => {
		const x = letterIndex(letter);
		const value = a * x + b;
		return {
			input: letter,
			output: indexToLetter(value),
			detail: `${a} × ${x} + ${b} = ${value}${reduceDetail(value)}`
		};
	});
}

export function affineDecrypt(text: string, rawA: number, rawB: number): CipherResult {
	const { a, b } = checkKey(rawA, rawB);
	const inverse = modInverse(a, ALPHABET_SIZE);
	if (inverse === null) {
		throw new CipherInputError(
			`a = ${a} n’est pas premier avec 26 : il n’a pas d’inverse modulo 26, on ne peut pas déchiffrer.`
		);
	}
	return mapLetters(text, (letter) => {
		const y = letterIndex(letter);
		const value = inverse * (y - b);
		return {
			input: letter,
			output: indexToLetter(value),
			detail: `${inverse} × (${y} − ${b}) = ${formatNumber(value)}${reduceDetail(value)}`
		};
	});
}

/** Lettres claires qui tombent sur la même lettre chiffrée (vide quand a est valide) */
export function affineCollisions(
	rawA: number,
	rawB: number
): { letters: string[]; image: string }[] {
	const { a, b } = checkKey(rawA, rawB);
	const byImage = new Map<string, string[]>();
	for (const letter of ALPHABET) {
		const image = indexToLetter(a * letterIndex(letter) + b);
		byImage.set(image, [...(byImage.get(image) ?? []), letter]);
	}
	return [...byImage]
		.filter(([, letters]) => letters.length > 1)
		.map(([image, letters]) => ({ letters, image }));
}

/** Les 312 clés valides, de la plus à la moins « française » */
export function affineBruteForce(text: string): AffineCandidate[] {
	if (lettersOnly(text).length === 0) return [];
	const candidates: AffineCandidate[] = [];
	for (const a of VALID_A) {
		for (let b = 0; b < ALPHABET_SIZE; b++) {
			const plain = affineDecrypt(text, a, b).text;
			candidates.push({ a, b, text: plain, score: frenchScore(plain) });
		}
	}
	return candidates.sort((x, y) => x.score - y.score);
}

/**
 * Attaque par deux lettres : « la lettre chiffrée c₁ cache p₁, c₂ cache p₂ ».
 * On résout a·p₁ + b ≡ c₁ et a·p₂ + b ≡ c₂ (mod 26), étapes comprises.
 */
export function twoLetterAttack(
	first: LetterHypothesis,
	second: LetterHypothesis
): { solutions: AffineKey[]; steps: string[] } {
	if (first.plain === second.plain || first.cipher === second.cipher) {
		throw new CipherInputError(
			'Choisissez deux lettres claires différentes et deux lettres chiffrées différentes.'
		);
	}
	const [p1, c1, p2, c2] = [first.plain, first.cipher, second.plain, second.cipher].map(
		letterIndex
	);
	const steps = [
		`${first.plain} (${p1}) devient ${first.cipher} (${c1}) : ${p1}a + b ≡ ${c1} (mod 26)`,
		`${second.plain} (${p2}) devient ${second.cipher} (${c2}) : ${p2}a + b ≡ ${c2} (mod 26)`
	];
	const d = mod(p1 - p2, ALPHABET_SIZE);
	const rawDifference = c1 - c2;
	const difference = mod(rawDifference, ALPHABET_SIZE);
	const shown =
		rawDifference === difference
			? `${difference}`
			: `${formatNumber(rawDifference)} ≡ ${difference}`;
	steps.push(`On soustrait : ${d}a ≡ ${shown} (mod 26)`);

	const solveB = (a: number) => mod(c2 - a * p2, ALPHABET_SIZE);
	let solutions: AffineKey[];
	const inverse = modInverse(d, ALPHABET_SIZE);
	if (inverse !== null) {
		const a = mod(difference * inverse, ALPHABET_SIZE);
		steps.push(
			`${d} a pour inverse ${inverse} modulo 26 : a ≡ ${difference} × ${inverse} ≡ ${a} (mod 26)`
		);
		steps.push(`Puis b ≡ ${c2} − ${a} × ${p2} ≡ ${solveB(a)} (mod 26)`);
		solutions = gcd(a, ALPHABET_SIZE) === 1 ? [{ a, b: solveB(a) }] : [];
	} else {
		steps.push(`${d} n’est pas premier avec 26 : on essaie les 26 valeurs de a.`);
		solutions = VALID_A.filter((a) => mod(d * a, ALPHABET_SIZE) === difference).map((a) => ({
			a,
			b: solveB(a)
		}));
	}

	if (solutions.length === 0) {
		steps.push('Aucune clé valide : l’hypothèse est sans doute fausse.');
	} else if (solutions.length === 1) {
		steps.push(`Une seule clé valide : a = ${solutions[0].a}, b = ${solutions[0].b}.`);
	} else {
		const list = solutions.map(({ a, b }) => `(${a}, ${b})`).join(', ');
		steps.push(`Plusieurs clés possibles : ${list}. Une troisième lettre permettrait de trancher.`);
	}
	return { solutions, steps };
}
