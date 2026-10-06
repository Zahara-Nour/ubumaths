/**
 * Chiffre de Hill (1929) : on chiffre les lettres par paires, en multipliant
 * le vecteur (x₁, x₂) par une matrice 2×2, modulo 26. On ne déchiffre que si
 * la matrice est inversible modulo 26, c'est-à-dire si son déterminant est
 * premier avec 26.
 *
 * Seules les lettres sont chiffrées ; une longueur impaire est complétée par X.
 *
 * @module lib/ciphers/hill
 */
import {
	ALPHABET_SIZE,
	formatNumber,
	indexToLetter,
	letterIndex,
	lettersOnly,
	mod,
	type CipherResult,
	type CipherStep
} from './alphabet';
import { CipherInputError } from './errors';
import { chiSquared } from './frequency';
import { inverseSearch } from './modular';

// Types

/** La matrice (a b ; c d) */
export interface HillKey {
	a: number;
	b: number;
	c: number;
	d: number;
}

export interface HillResult extends CipherResult {
	/** Vrai quand un X a complété la dernière paire */
	padded: boolean;
}

export type HillInverse =
	| { ok: true; inverse: HillKey; steps: string[] }
	| { ok: false; steps: string[] };

export interface HillRowCandidate {
	u: number;
	v: number;
	score: number;
}

export interface HillRowAttack {
	key: HillKey;
	inverse: HillKey;
	text: string;
	/** Les meilleures lignes candidates de M⁻¹, toutes positions confondues */
	candidates: HillRowCandidate[];
}

// Constantes

/** Paires de lettres les plus fréquentes du français : elles départagent l'ordre des lignes */
const FRENCH_BIGRAMS = [
	'ES',
	'LE',
	'DE',
	'EN',
	'RE',
	'NT',
	'ON',
	'ER',
	'TE',
	'SE',
	'ET',
	'EL',
	'QU',
	'NE',
	'OU',
	'AI',
	'EM',
	'IT',
	'ME',
	'IS'
];
const SHOWN_CANDIDATES = 6;

// Functions

export function formatMatrix({ a, b, c, d }: HillKey): string {
	return `(${[a, b].map(formatNumber).join(' ')} ; ${[c, d].map(formatNumber).join(' ')})`;
}

function reduceMatrix(key: HillKey): HillKey {
	return {
		a: mod(key.a, ALPHABET_SIZE),
		b: mod(key.b, ALPHABET_SIZE),
		c: mod(key.c, ALPHABET_SIZE),
		d: mod(key.d, ALPHABET_SIZE)
	};
}

function sameMatrix(x: HillKey, y: HillKey): boolean {
	return x.a === y.a && x.b === y.b && x.c === y.c && x.d === y.d;
}

/** « (15 69 ; 72 9) ≡ (15 17 ; 20 9) », ou la matrice seule quand rien ne se réduit */
function withReduction(raw: HillKey): string {
	const reduced = reduceMatrix(raw);
	return sameMatrix(raw, reduced)
		? formatMatrix(raw)
		: `${formatMatrix(raw)} ≡ ${formatMatrix(reduced)}`;
}

function checkKey(key: HillKey): HillKey {
	if (![key.a, key.b, key.c, key.d].every(Number.isInteger)) {
		throw new CipherInputError('Les quatre coefficients doivent être des nombres entiers.');
	}
	return reduceMatrix(key);
}

export function hillKeyFromKeyword(keyword: string): HillKey {
	const letters = lettersOnly(keyword);
	if (letters.length !== 4) {
		throw new CipherInputError('Le mot-clé doit contenir exactement 4 lettres.');
	}
	const [a, b, c, d] = [...letters].map(letterIndex);
	return { a, b, c, d };
}

/** Inverse modulo 26, avec les étapes : déterminant, son inverse, comatrice, produit */
export function hillInverse(rawKey: HillKey, name = 'M'): HillInverse {
	const { a, b, c, d } = checkKey(rawKey);
	const det = a * d - b * c;
	const detMod = mod(det, ALPHABET_SIZE);
	const steps = [
		`det ${name} = ${a} × ${d} − ${b} × ${c} = ${formatNumber(det)}${det === detMod ? '' : ` ≡ ${detMod}`}`
	];
	const search = inverseSearch(detMod);
	if (search === null) {
		steps.push(`${detMod} n’est pas premier avec 26 : la matrice n’a pas d’inverse modulo 26.`);
		return { ok: false, steps };
	}
	steps.push(`${detMod} a pour inverse ${search.inverse} modulo 26, car ${search.detail}`);
	const adjugate = { a: d, b: -b, c: -c, d: a };
	steps.push(`On échange a et d, on change le signe de b et c : ${withReduction(adjugate)}`);
	const reducedAdjugate = reduceMatrix(adjugate);
	const k = search.inverse;
	const product = {
		a: k * reducedAdjugate.a,
		b: k * reducedAdjugate.b,
		c: k * reducedAdjugate.c,
		d: k * reducedAdjugate.d
	};
	steps.push(
		`${name}⁻¹ = ${k} × ${formatMatrix(reducedAdjugate)} = ${withReduction(product)} (mod 26)`
	);
	return { ok: true, inverse: reduceMatrix(product), steps };
}

function pairStep(pair: string, { a, b, c, d }: HillKey): CipherStep {
	const [x1, x2] = [...pair].map(letterIndex);
	const y1 = a * x1 + b * x2;
	const y2 = c * x1 + d * x2;
	const [r1, r2] = [mod(y1, ALPHABET_SIZE), mod(y2, ALPHABET_SIZE)];
	const reduced = r1 === y1 && r2 === y2 ? '' : ` ≡ (${r1}, ${r2})`;
	return {
		input: pair,
		output: indexToLetter(r1) + indexToLetter(r2),
		detail: `(${x1}, ${x2}) → (${a} × ${x1} + ${b} × ${x2}, ${c} × ${x1} + ${d} × ${x2}) = (${y1}, ${y2})${reduced}`
	};
}

function pairs(letters: string): string[] {
	return letters.match(/../g) ?? [];
}

function applyMatrix(letters: string, key: HillKey): CipherResult {
	const steps = pairs(letters).map((pair) => pairStep(pair, key));
	return { text: steps.map((step) => step.output).join(''), steps };
}

/** Chiffre même avec une matrice non inversible : la page montre alors une collision */
export function hillEncrypt(text: string, rawKey: HillKey): HillResult {
	const key = checkKey(rawKey);
	const letters = lettersOnly(text);
	const padded = letters.length % 2 === 1;
	return { ...applyMatrix(padded ? `${letters}X` : letters, key), padded };
}

export function hillDecrypt(text: string, rawKey: HillKey): HillResult {
	const key = checkKey(rawKey);
	const inverse = hillInverse(key);
	if (!inverse.ok) {
		const det = mod(key.a * key.d - key.b * key.c, ALPHABET_SIZE);
		throw new CipherInputError(
			`Le déterminant vaut ${det} : il n’est pas premier avec 26, la matrice n’a pas d’inverse modulo 26 et on ne peut pas déchiffrer.`
		);
	}
	const letters = lettersOnly(text);
	if (letters.length % 2 === 1) {
		throw new CipherInputError('Nombre impair de lettres : un message de Hill se lit par paires.');
	}
	return { ...applyMatrix(letters, inverse.inverse), padded: false };
}

/** Deux paires claires qui donnent la même paire chiffrée (null si la matrice est inversible) */
export function hillCollision(rawKey: HillKey): { pairs: [string, string]; image: string } | null {
	const key = checkKey(rawKey);
	const seen = new Map<string, string>();
	for (let x1 = 0; x1 < ALPHABET_SIZE; x1++) {
		for (let x2 = 0; x2 < ALPHABET_SIZE; x2++) {
			const pair = indexToLetter(x1) + indexToLetter(x2);
			const image = pairStep(pair, key).output;
			const previous = seen.get(image);
			if (previous !== undefined) return { pairs: [previous, pair], image };
			seen.set(image, pair);
		}
	}
	return null;
}

function multiply(x: HillKey, y: HillKey): HillKey {
	return {
		a: x.a * y.a + x.b * y.c,
		b: x.a * y.b + x.b * y.d,
		c: x.c * y.a + x.d * y.c,
		d: x.c * y.b + x.d * y.d
	};
}

/** Les deux paires de 4 lettres, en colonnes : (p₁ p₃ ; p₂ p₄) */
function columnsMatrix(letters: string): HillKey {
	const [a, c, b, d] = [...letters].map(letterIndex);
	return { a, b, c, d };
}

/**
 * Attaque à clair connu : 4 lettres claires et leurs 4 lettres chiffrées
 * donnent C = M·P, donc M = C·P⁻¹ quand P est inversible.
 */
export function knownPlaintextAttack(
	cipherText: string,
	plainText: string
): { key: HillKey | null; steps: string[] } {
	const cipher = lettersOnly(cipherText);
	const plain = lettersOnly(plainText);
	if (cipher.length !== 4 || plain.length !== 4) {
		throw new CipherInputError(
			'Il faut 4 lettres claires et les 4 lettres chiffrées correspondantes.'
		);
	}
	const P = columnsMatrix(plain);
	const C = columnsMatrix(cipher);
	const [plainPairs, cipherPairs] = [pairs(plain), pairs(cipher)];
	const steps = [
		`P = ${formatMatrix(P)} : les paires claires ${plainPairs.join(' et ')}, en colonnes`,
		`C = ${formatMatrix(C)} : les paires chiffrées ${cipherPairs.join(' et ')}, en colonnes`
	];
	const inverseP = hillInverse(P, 'P');
	steps.push(...inverseP.steps);
	if (!inverseP.ok) {
		steps.push('P n’est pas inversible : choisissez un autre passage connu.');
		return { key: null, steps };
	}
	const product = multiply(C, inverseP.inverse);
	steps.push(`M = C·P⁻¹ = ${withReduction(product)} (mod 26)`);
	const key = reduceMatrix(product);
	if (!hillInverse(key).ok) {
		steps.push('La matrice trouvée n’est pas inversible : l’hypothèse est donc fausse.');
		return { key: null, steps };
	}
	return { key, steps };
}

function bigramScore(text: string): number {
	return FRENCH_BIGRAMS.reduce((sum, bigram) => sum + (text.split(bigram).length - 1), 0);
}

/**
 * Attaque ligne par ligne : chaque ligne (u, v) de M⁻¹ donne à elle seule une
 * lettre claire sur deux, u·c₁ + v·c₂. On classe les 676 lignes possibles par
 * χ², on assemble les deux meilleures en une matrice inversible, et l'ordre
 * des lignes se tranche par les paires de lettres fréquentes du français.
 */
export function hillRowAttack(text: string): HillRowAttack | null {
	const letters = lettersOnly(text);
	const cipherPairs = pairs(letters).map((pair) => [...pair].map(letterIndex));
	if (cipherPairs.length < 2) return null;

	const ranked: HillRowCandidate[] = [];
	for (let u = 0; u < ALPHABET_SIZE; u++) {
		for (let v = 0; v < ALPHABET_SIZE; v++) {
			const counts = new Array<number>(ALPHABET_SIZE).fill(0);
			for (const [c1, c2] of cipherPairs) counts[mod(u * c1 + v * c2, ALPHABET_SIZE)]++;
			ranked.push({ u, v, score: chiSquared(counts, cipherPairs.length) });
		}
	}
	ranked.sort((x, y) => x.score - y.score);
	const candidates = ranked.slice(0, SHOWN_CANDIDATES);

	let best: { inverse: HillKey; total: number; bigrams: number; text: string } | null = null;
	for (const first of candidates) {
		for (const second of candidates) {
			if (first === second) continue;
			const inverse = { a: first.u, b: first.v, c: second.u, d: second.v };
			const key = hillInverse(inverse);
			if (!key.ok) continue;
			const plain = applyMatrix(letters, inverse).text;
			const total = first.score + second.score;
			const bigrams = bigramScore(plain);
			const better =
				best === null ||
				total < best.total - 1e-9 ||
				(Math.abs(total - best.total) < 1e-9 && bigrams > best.bigrams);
			if (better) best = { inverse, total, bigrams, text: plain };
		}
	}
	if (best === null) return null;
	const key = hillInverse(best.inverse);
	if (!key.ok) return null;
	return { key: key.inverse, inverse: best.inverse, text: best.text, candidates };
}
