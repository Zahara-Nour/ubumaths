/**
 * Analyse de fréquences : compter les lettres d'un message et les comparer à
 * celles du français. C'est l'arme de la cryptanalyse contre César et la
 * substitution, qui conservent les fréquences en les déplaçant.
 *
 * @module lib/ciphers/frequency
 */
import { ALPHABET, ALPHABET_SIZE, lettersOnly } from './alphabet';
import { caesarDecrypt } from './caesar';

// Types

export interface LetterFrequency {
	letter: string;
	count: number;
	/** Part du total des lettres, en % (0 quand le texte n'a aucune lettre) */
	percent: number;
}

export interface CaesarCandidate {
	/** Décalage qui aurait servi à chiffrer */
	shift: number;
	text: string;
	/** Écart au français (χ²) : plus il est petit, plus le texte ressemble à du français */
	score: number;
}

// Constantes

/**
 * Fréquences des lettres en français, en %. Source : Wikipédia, « Fréquence
 * d'apparition des lettres en français », corpus Wikipédia francophone (2008,
 * CLLE-ERSS, Toulouse). Les lettres accentuées y sont comptées à part ; comme
 * le Cabinet Noir les ramène à leur lettre de base, les 26 valeurs sont
 * renormalisées pour totaliser 100 %.
 */
const RAW_FRENCH_FREQUENCIES: Record<string, number> = {
	A: 7.11,
	B: 1.14,
	C: 3.18,
	D: 3.67,
	E: 12.1,
	F: 1.11,
	G: 1.23,
	H: 1.11,
	I: 6.59,
	J: 0.34,
	K: 0.29,
	L: 4.96,
	M: 2.62,
	N: 6.39,
	O: 5.02,
	P: 2.49,
	Q: 0.65,
	R: 6.07,
	S: 6.51,
	T: 5.92,
	U: 4.49,
	V: 1.11,
	W: 0.17,
	X: 0.38,
	Y: 0.46,
	Z: 0.15
};

const RAW_TOTAL = Object.values(RAW_FRENCH_FREQUENCIES).reduce((a, b) => a + b, 0);

export const FRENCH_FREQUENCIES: Readonly<Record<string, number>> = Object.fromEntries(
	Object.entries(RAW_FRENCH_FREQUENCIES).map(([letter, value]) => [
		letter,
		(value / RAW_TOTAL) * 100
	])
);

// Functions

export function letterFrequencies(text: string): { total: number; letters: LetterFrequency[] } {
	const letters = lettersOnly(text);
	const counts = new Map<string, number>();
	for (const letter of letters) counts.set(letter, (counts.get(letter) ?? 0) + 1);
	const total = letters.length;
	return {
		total,
		letters: [...ALPHABET].map((letter) => {
			const count = counts.get(letter) ?? 0;
			return { letter, count, percent: total === 0 ? 0 : (count / total) * 100 };
		})
	};
}

/** χ² entre les lettres du texte et le français : 0 = français parfait */
export function frenchScore(text: string): number {
	const { total, letters } = letterFrequencies(text);
	if (total === 0) return 0;
	return letters.reduce((sum, { letter, count }) => {
		const expected = (FRENCH_FREQUENCIES[letter] / 100) * total;
		return sum + (count - expected) ** 2 / expected;
	}, 0);
}

/** Les 26 déchiffrements possibles, du plus au moins français */
export function caesarBruteForce(text: string): CaesarCandidate[] {
	if (lettersOnly(text).length === 0) return [];
	return Array.from({ length: ALPHABET_SIZE }, (_, shift) => {
		const plain = caesarDecrypt(text, shift).text;
		return { shift, text: plain, score: frenchScore(plain) };
	}).sort((a, b) => a.score - b.score);
}
