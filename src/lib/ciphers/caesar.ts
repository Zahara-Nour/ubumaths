/**
 * Chiffre de César : chaque lettre avance de k rangs dans l'alphabet, en
 * repartant de A après Z (calcul modulo 26).
 *
 * @module lib/ciphers/caesar
 */
import {
	ALPHABET_SIZE,
	formatNumber,
	indexToLetter,
	letterIndex,
	mapLetters,
	mod,
	type CipherResult
} from './alphabet';
import { CipherInputError } from './errors';

// Functions

function checkShift(shift: number): number {
	if (!Number.isInteger(shift))
		throw new CipherInputError('Le décalage doit être un nombre entier.');
	return mod(shift, ALPHABET_SIZE);
}

export function caesarEncrypt(text: string, shift: number): CipherResult {
	const k = checkShift(shift);
	return mapLetters(text, (letter) => {
		const i = letterIndex(letter);
		const sum = i + k;
		const reduced = sum >= ALPHABET_SIZE ? ` → ${sum} − 26 = ${sum - ALPHABET_SIZE}` : '';
		return { input: letter, output: indexToLetter(sum), detail: `${i} + ${k} = ${sum}${reduced}` };
	});
}

export function caesarDecrypt(text: string, shift: number): CipherResult {
	const k = checkShift(shift);
	return mapLetters(text, (letter) => {
		const i = letterIndex(letter);
		const difference = i - k;
		const reduced =
			difference < 0 ? ` → ${formatNumber(difference)} + 26 = ${difference + ALPHABET_SIZE}` : '';
		return {
			input: letter,
			output: indexToLetter(difference),
			detail: `${i} − ${k} = ${formatNumber(difference)}${reduced}`
		};
	});
}
