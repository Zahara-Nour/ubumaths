/**
 * Décryptage manuel d'une substitution : l'élève propose « la lettre chiffrée
 * X cache un E » et voit le message se reconstruire.
 *
 * @module lib/ciphers/solver
 */
import { isLetter, lettersOnly, normalizeText } from './alphabet';

// Types

/** Lettre chiffrée → lettre claire proposée */
export type Guesses = Readonly<Partial<Record<string, string>>>;

export interface GuessedChar {
	char: string;
	/** Vrai quand le caractère vient d'une proposition de l'élève */
	guessed: boolean;
}

// Functions

export function applyGuesses(cipherText: string, guesses: Guesses): GuessedChar[] {
	return [...normalizeText(cipherText)].map((char) => {
		const guess = isLetter(char) ? guesses[char] : undefined;
		return guess ? { char: guess, guessed: true } : { char, guessed: false };
	});
}

/**
 * Lettres claires proposées pour plusieurs lettres chiffrées (impossible en
 * substitution). Avec `cipherText`, seules comptent les lettres du message :
 * une hypothèse laissée sur une lettre disparue n'a plus de champ pour être corrigée.
 */
export function guessConflicts(guesses: Guesses, cipherText?: string): string[] {
	const present = cipherText === undefined ? null : new Set(lettersOnly(cipherText));
	const counts = new Map<string, number>();
	for (const [cipher, plain] of Object.entries(guesses)) {
		if (plain && (present === null || present.has(cipher))) {
			counts.set(plain, (counts.get(plain) ?? 0) + 1);
		}
	}
	return [...counts]
		.filter(([, count]) => count > 1)
		.map(([plain]) => plain)
		.sort();
}
