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
	formatNumber,
	indexToLetter,
	letterIndex,
	mapLetters,
	mod,
	type CipherResult
} from './alphabet';
import { CipherInputError } from './errors';
import { chiSquared, letterFrequencies } from './frequency';
import { gcd, modInverse, reduceDetail } from './modular';

// Types

export interface AffineKey {
	a: number;
	b: number;
}

export interface RankedAffineKey extends AffineKey {
	score: number;
}

export interface AffineCandidate extends RankedAffineKey {
	text: string;
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

/**
 * Les 312 clés valides, de la plus à la moins « française ». Le score se
 * calcule sur les seuls comptes de lettres du message (une clé ne fait que les
 * permuter) : 312 × 26 opérations, quelle que soit la longueur du texte.
 */
export function rankAffineKeys(text: string): RankedAffineKey[] {
	const { total, letters } = letterFrequencies(text);
	if (total === 0) return [];
	const cipherCounts = letters.map((l) => l.count);
	const ranked: RankedAffineKey[] = [];
	for (const a of VALID_A) {
		const inverse = modInverse(a, ALPHABET_SIZE) as number;
		for (let b = 0; b < ALPHABET_SIZE; b++) {
			const plainCounts = new Array<number>(ALPHABET_SIZE).fill(0);
			cipherCounts.forEach((count, y) => {
				plainCounts[mod(inverse * (y - b), ALPHABET_SIZE)] += count;
			});
			ranked.push({ a, b, score: chiSquared(plainCounts, total) });
		}
	}
	return ranked.sort((x, y) => x.score - y.score);
}

/** Les meilleures clés (toutes par défaut), avec le texte qu'elles déchiffrent */
export function affineBruteForce(
	text: string,
	limit = VALID_A.length * ALPHABET_SIZE
): AffineCandidate[] {
	return rankAffineKeys(text)
		.slice(0, limit)
		.map((key) => ({ ...key, text: affineDecrypt(text, key.a, key.b).text }));
}

/** « 4a + b », « a + b », « b » : comme on l'écrit au tableau */
function equationLeft(p: number): string {
	if (p === 0) return 'b';
	return `${coefficient(p)} + b`;
}

function coefficient(n: number): string {
	if (n === 1) return 'a';
	if (n === -1) return '−a';
	return `${formatNumber(n)}a`;
}

function listA(values: number[]): string {
	if (values.length === 2) return `a = ${values[0]} ou a = ${values[1]}`;
	return `a = ${values.join(', ')}`;
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
		`${first.plain} (${p1}) devient ${first.cipher} (${c1}) : ${equationLeft(p1)} ≡ ${c1} (mod 26)`,
		`${second.plain} (${p2}) devient ${second.cipher} (${c2}) : ${equationLeft(p2)} ≡ ${c2} (mod 26)`
	];

	// Soustraction : (p₁ − p₂)a ≡ c₁ − c₂, chaque membre réduit sous les yeux de l'élève
	const rawD = p1 - p2;
	const d = mod(rawD, ALPHABET_SIZE);
	const left =
		rawD === d ? coefficient(d) : `(${p1} − ${p2})a = ${coefficient(rawD)} ≡ ${coefficient(d)}`;
	const rawDifference = c1 - c2;
	const difference = mod(rawDifference, ALPHABET_SIZE);
	const right =
		rawDifference === difference
			? `${difference}`
			: `${formatNumber(rawDifference)} ≡ ${difference}`;
	steps.push(`On soustrait : ${left} ≡ ${right} (mod 26)`);

	const bStep = (a: number) => {
		const raw = c2 - a * p2;
		return `Puis b ≡ ${c2} − ${a} × ${p2} = ${formatNumber(raw)}${reduceDetail(raw)} (mod 26)`;
	};
	const keyOf = (a: number) => ({ a, b: mod(c2 - a * p2, ALPHABET_SIZE) });

	let solutions: AffineKey[] = [];
	const inverse = modInverse(d, ALPHABET_SIZE);
	if (inverse !== null) {
		const product = difference * inverse;
		const a = mod(product, ALPHABET_SIZE);
		steps.push(
			`${d} a pour inverse ${inverse} modulo 26 : a ≡ ${difference} × ${inverse} = ${product}${reduceDetail(product)} (mod 26)`
		);
		if (gcd(a, ALPHABET_SIZE) === 1) {
			steps.push(bStep(a));
			solutions = [keyOf(a)];
		} else {
			steps.push(`a = ${a} n’est pas premier avec 26 : ce n’est pas une clé affine.`);
		}
	} else {
		steps.push(`${d} n’est pas premier avec 26 : pas d’inverse, on essaie les 26 valeurs de a.`);
		const roots = Array.from({ length: ALPHABET_SIZE }, (_, a) => a).filter(
			(a) => mod(d * a, ALPHABET_SIZE) === difference
		);
		if (roots.length === 0) {
			steps.push(`${coefficient(d)} ≡ ${difference} n’a aucune solution modulo 26.`);
		} else {
			steps.push(`${roots.length === 1 ? 'Solution' : 'Solutions'} : ${listA(roots)}.`);
			const rejected = roots.filter((a) => gcd(a, ALPHABET_SIZE) !== 1);
			const valid = roots.filter((a) => gcd(a, ALPHABET_SIZE) === 1);
			if (rejected.length > 0) {
				steps.push(`Rejeté, car pas premier avec 26 : ${listA(rejected)}.`);
			}
			// Au-delà de trois clés, le calcul de b se lit dans la liste finale
			if (valid.length <= 3) valid.forEach((a) => steps.push(bStep(a)));
			solutions = valid.map(keyOf);
		}
	}

	if (solutions.length === 0) {
		steps.push('Aucune clé valide : l’hypothèse est donc fausse.');
	} else if (solutions.length === 1) {
		steps.push(`Une seule clé valide : a = ${solutions[0].a}, b = ${solutions[0].b}.`);
	} else {
		const list = solutions.map(({ a, b }) => `(${a}, ${b})`).join(', ');
		steps.push(`Plusieurs clés possibles : ${list}. Une troisième lettre permettrait de trancher.`);
	}
	return { solutions, steps };
}
