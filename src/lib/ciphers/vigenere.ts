/**
 * Chiffre de Vigenère : un César dont le décalage change à chaque lettre,
 * donné par les lettres d'un mot-clé répété. La clé n'avance que sur les
 * lettres du message.
 *
 * Décryptage en trois temps : Kasiski (les répétitions trahissent la longueur
 * de la clé), l'indice de coïncidence (qui la confirme), puis un César par
 * colonne.
 *
 * @module lib/ciphers/vigenere
 */
import {
	ALPHABET_SIZE,
	indexToLetter,
	isLetter,
	letterIndex,
	lettersOnly,
	normalizeText,
	type CipherResult,
	type CipherStep
} from './alphabet';
import { shiftStep, unshiftStep } from './caesar';
import { CipherInputError } from './errors';
import { FRENCH_FREQUENCIES, caesarBruteForce, letterFrequencies } from './frequency';
import { gcd } from './modular';

// Types

export interface KasiskiRepeat {
	sequence: string;
	positions: number[];
	/** Écarts entre deux apparitions successives */
	distances: number[];
}

export interface KasiskiResult {
	repeats: KasiskiRepeat[];
	/** PGCD de toutes les distances (null sans répétition) */
	gcd: number | null;
	distanceCount: number;
	/** Pour chaque longueur de 2 à 12 : combien de distances elle divise */
	divisorCounts: { length: number; count: number }[];
}

export interface VigenereCrack {
	key: string;
	text: string;
	columns: { index: number; shift: number; letter: string }[];
}

// Constantes

/** Probabilité que deux lettres prises au hasard dans un texte français soient égales */
export const FRENCH_IC = Object.values(FRENCH_FREQUENCIES).reduce(
	(sum, p) => sum + (p / 100) ** 2,
	0
);
/** La même chose pour des lettres tirées au hasard : 1/26 */
export const RANDOM_IC = 1 / ALPHABET_SIZE;
export const MAX_KEY_LENGTH = 12;
/**
 * Une longueur est retenue si ses colonnes approchent la meilleure à 10 % près.
 * Un seuil absolu se faisait piéger par une longueur « à moitié juste » (2 pour
 * MERDRE : chaque colonne ne mélange que deux alphabets).
 */
const CLOSE_TO_BEST = 0.9;

// Functions

function checkKey(rawKey: string): string {
	const key = lettersOnly(rawKey);
	if (key === '') throw new CipherInputError('La clé doit contenir au moins une lettre.');
	return key;
}

function mapWithKey(
	text: string,
	rawKey: string,
	step: (letter: string, k: number, prefix: string) => CipherStep
): CipherResult {
	const key = checkKey(rawKey);
	const steps: CipherStep[] = [];
	let output = '';
	for (const char of normalizeText(text)) {
		if (!isLetter(char)) {
			output += char;
			continue;
		}
		const keyLetter = key[steps.length % key.length];
		const current = step(char, letterIndex(keyLetter), `clé ${keyLetter} : `);
		steps.push(current);
		output += current.output;
	}
	return { text: output, steps };
}

export function vigenereEncrypt(text: string, key: string): CipherResult {
	return mapWithKey(text, key, shiftStep);
}

export function vigenereDecrypt(text: string, key: string): CipherResult {
	return mapWithKey(text, key, unshiftStep);
}

/** Σ n(n − 1) / N(N − 1) : 0 quand le texte a moins de deux lettres */
export function indexOfCoincidence(text: string): number {
	const { total, letters } = letterFrequencies(text);
	if (total < 2) return 0;
	return letters.reduce((sum, { count }) => sum + count * (count - 1), 0) / (total * (total - 1));
}

/** Les lettres du message, distribuées en `length` colonnes (une par lettre de clé) */
export function columns(text: string, length: number): string[] {
	const result = Array.from({ length }, () => '');
	[...lettersOnly(text)].forEach((letter, i) => (result[i % length] += letter));
	return result;
}

/** Moyenne des indices des colonnes : proche du français quand la longueur est la bonne */
export function averageIndexOfCoincidence(text: string, length: number): number {
	const usable = columns(text, length).filter((column) => column.length >= 2);
	if (usable.length === 0) return 0;
	return usable.reduce((sum, column) => sum + indexOfCoincidence(column), 0) / usable.length;
}

/**
 * Plus petite longueur dont les colonnes valent presque la meilleure : un
 * multiple de la bonne longueur marche aussi bien, d'où la plus petite.
 */
export function suggestKeyLength(text: string, max = MAX_KEY_LENGTH): number {
	if (lettersOnly(text).length < 2) return 1;
	const scores = Array.from({ length: max }, (_, i) => averageIndexOfCoincidence(text, i + 1));
	const best = Math.max(...scores);
	return scores.findIndex((score) => score >= best * CLOSE_TO_BEST) + 1;
}

export function kasiski(text: string, sequenceLength = 3): KasiskiResult {
	const letters = lettersOnly(text);
	const positions = new Map<string, number[]>();
	for (let i = 0; i + sequenceLength <= letters.length; i++) {
		const sequence = letters.slice(i, i + sequenceLength);
		positions.set(sequence, [...(positions.get(sequence) ?? []), i]);
	}
	const repeats = [...positions]
		.filter(([, found]) => found.length > 1)
		.map(([sequence, found]) => ({
			sequence,
			positions: found,
			distances: found.slice(1).map((p, i) => p - found[i])
		}));
	const distances = repeats.flatMap((repeat) => repeat.distances);
	return {
		repeats,
		gcd: distances.length === 0 ? null : distances.reduce(gcd),
		distanceCount: distances.length,
		divisorCounts: Array.from({ length: MAX_KEY_LENGTH - 1 }, (_, i) => i + 2).map((length) => ({
			length,
			count: distances.filter((d) => d % length === 0).length
		}))
	};
}

/** Chaque colonne est un César : on le casse par les fréquences, puis on assemble la clé */
export function crackVigenere(text: string, length: number): VigenereCrack {
	if (lettersOnly(text).length === 0) return { key: '', text: normalizeText(text), columns: [] };
	const found = columns(text, length).map((column, index) => {
		const shift = caesarBruteForce(column)[0]?.shift ?? 0;
		return { index, shift, letter: indexToLetter(shift) };
	});
	const key = found.map((column) => column.letter).join('');
	return { key, text: vigenereDecrypt(text, key).text, columns: found };
}
