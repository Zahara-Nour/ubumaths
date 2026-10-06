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
	type CipherResult,
	type CipherStep
} from './alphabet';
import { CipherInputError } from './errors';
import { reduceDetail } from './modular';

// Functions

function checkShift(shift: number): number {
	if (!Number.isInteger(shift))
		throw new CipherInputError('Le décalage doit être un nombre entier.');
	return mod(shift, ALPHABET_SIZE);
}

/** Une lettre avancée de k rangs, avec son calcul (sert aussi à Vigenère) */
export function shiftStep(letter: string, k: number, prefix = ''): CipherStep {
	const i = letterIndex(letter);
	const sum = i + k;
	return {
		input: letter,
		output: indexToLetter(sum),
		detail: `${prefix}${i} + ${k} = ${sum}${reduceDetail(sum)}`
	};
}

/** Une lettre reculée de k rangs, avec son calcul */
export function unshiftStep(letter: string, k: number, prefix = ''): CipherStep {
	const i = letterIndex(letter);
	const difference = i - k;
	return {
		input: letter,
		output: indexToLetter(difference),
		detail: `${prefix}${i} − ${k} = ${formatNumber(difference)}${reduceDetail(difference)}`
	};
}

export function caesarEncrypt(text: string, shift: number): CipherResult {
	const k = checkShift(shift);
	return mapLetters(text, (letter) => shiftStep(letter, k));
}

export function caesarDecrypt(text: string, shift: number): CipherResult {
	const k = checkShift(shift);
	return mapLetters(text, (letter) => unshiftStep(letter, k));
}
