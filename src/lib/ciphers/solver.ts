/**
 * Décryptage manuel d'une substitution : l'élève propose « la lettre chiffrée
 * X cache un E » et voit le message se reconstruire.
 *
 * @module lib/ciphers/solver
 */
import { isLetter, normalizeText } from './alphabet';

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

/** Lettres claires proposées pour plusieurs lettres chiffrées (impossible en substitution) */
export function guessConflicts(guesses: Guesses): string[] {
	const counts = new Map<string, number>();
	for (const plain of Object.values(guesses)) {
		if (plain) counts.set(plain, (counts.get(plain) ?? 0) + 1);
	}
	return [...counts]
		.filter(([, count]) => count > 1)
		.map(([plain]) => plain)
		.sort();
}
