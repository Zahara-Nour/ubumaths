/**
 * Substitution monoalphabétique : la clé est une permutation des 26 lettres
 * (A devient la 1ʳᵉ lettre de la clé, B la 2ᵉ…). Elle se fabrique souvent à
 * partir d'un mot-clé : UBU ROI → UBROI puis les lettres restantes.
 *
 * @module lib/ciphers/substitution
 */
import { ALPHABET, letterIndex, lettersOnly, mapLetters, type CipherResult } from './alphabet';
import { CipherInputError } from './errors';

// Types

export type KeyValidation = { ok: true; key: string } | { ok: false; message: string };

// Functions

/** Lettres du mot-clé sans doublon, puis les autres lettres dans l'ordre */
export function keyFromKeyword(keyword: string): string {
	const letters = new Set(lettersOnly(keyword) + ALPHABET);
	return [...letters].join('');
}

export function validateKey(rawKey: string): KeyValidation {
	const key = lettersOnly(rawKey);
	const seen = new Set<string>();
	for (const letter of key) {
		if (seen.has(letter))
			return { ok: false, message: `La lettre ${letter} apparaît plusieurs fois.` };
		seen.add(letter);
	}
	const missing = [...ALPHABET].filter((letter) => !seen.has(letter));
	if (missing.length === 1) return { ok: false, message: `Il manque la lettre ${missing[0]}.` };
	if (missing.length > 1) {
		return { ok: false, message: `Il manque les lettres ${missing.join(', ')}.` };
	}
	return { ok: true, key };
}

function checkedKey(rawKey: string): string {
	const validation = validateKey(rawKey);
	if (!validation.ok) throw new CipherInputError(validation.message);
	return validation.key;
}

export function substitutionEncrypt(text: string, rawKey: string): CipherResult {
	const key = checkedKey(rawKey);
	return mapLetters(text, (letter) => ({
		input: letter,
		output: key[letterIndex(letter)],
		detail: ''
	}));
}

export function substitutionDecrypt(text: string, rawKey: string): CipherResult {
	const key = checkedKey(rawKey);
	return mapLetters(text, (letter) => ({
		input: letter,
		output: ALPHABET[key.indexOf(letter)],
		detail: ''
	}));
}
