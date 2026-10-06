/**
 * Atbash : l'alphabet retourné (A ↔ Z, B ↔ Y…). Chiffrer et déchiffrer sont
 * la même opération : appliqué deux fois, Atbash rend le texte de départ.
 *
 * @module lib/ciphers/atbash
 */
import { indexToLetter, letterIndex, mapLetters, type CipherResult } from './alphabet';

export function atbash(text: string): CipherResult {
	return mapLetters(text, (letter) => {
		const i = letterIndex(letter);
		return { input: letter, output: indexToLetter(25 - i), detail: `25 − ${i} = ${25 - i}` };
	});
}
