/**
 * Scytale spartiate : une bande enroulée autour d'un bâton. On écrit le
 * message le long du bâton, une ligne par face ; déroulée, la bande porte une
 * lettre de chaque ligne à chaque tour. « n lettres par tour » = n faces.
 *
 * Pas de bourrage : quand la longueur n'est pas un multiple de n, les
 * premières lignes ont une lettre de plus que les dernières (c'est ainsi
 * qu'une bande réelle se termine). Seules les lettres sont transportées.
 *
 * @module lib/ciphers/scytale
 */
import { lettersOnly } from './alphabet';
import { CipherInputError } from './errors';

// Types

export interface ScytaleResult {
	text: string;
	/** Les lignes écrites le long du bâton (le texte clair, découpé) */
	rows: string[];
	/** Vrai quand le bâton a au moins autant de faces que de lettres : rien ne bouge */
	unchanged: boolean;
}

// Functions

function checkTurns(lettersPerTurn: number): void {
	if (!Number.isInteger(lettersPerTurn) || lettersPerTurn < 2) {
		throw new CipherInputError('Il faut un nombre entier de lettres par tour, au moins 2.');
	}
}

/** Longueur de chaque ligne (face) pour `length` lettres sur `faces` faces */
function rowLengths(length: number, faces: number): number[] {
	const turns = Math.ceil(length / faces);
	const fullRows = length % faces || faces;
	return Array.from({ length: faces }, (_, f) => (f < fullRows ? turns : turns - 1));
}

/** Découpe le texte clair en lignes successives */
function splitRows(plain: string, faces: number): string[] {
	const rows: string[] = [];
	let start = 0;
	for (const size of rowLengths(plain.length, faces)) {
		rows.push(plain.slice(start, start + size));
		start += size;
	}
	return rows.filter((row) => row.length > 0);
}

export function scytaleEncrypt(text: string, lettersPerTurn: number): ScytaleResult {
	checkTurns(lettersPerTurn);
	const plain = lettersOnly(text);
	const rows = splitRows(plain, lettersPerTurn);
	// Bande déroulée : tour après tour, une lettre de chaque ligne
	let cipher = '';
	for (let turn = 0; turn < (rows[0]?.length ?? 0); turn++) {
		for (const row of rows) if (turn < row.length) cipher += row[turn];
	}
	return { text: cipher, rows, unchanged: plain.length > 0 && lettersPerTurn >= plain.length };
}

export function scytaleDecrypt(text: string, lettersPerTurn: number): ScytaleResult {
	checkTurns(lettersPerTurn);
	const cipher = lettersOnly(text);
	const lengths = rowLengths(cipher.length, lettersPerTurn);
	const rows: string[] = lengths.map(() => '');
	// On réenroule la bande : la lettre p va sur la face p mod n
	for (let p = 0; p < cipher.length; p++) rows[p % lettersPerTurn] += cipher[p];
	const nonEmpty = rows.filter((row) => row.length > 0);
	return {
		text: nonEmpty.join(''),
		rows: nonEmpty,
		unchanged: cipher.length > 0 && lettersPerTurn >= cipher.length
	};
}

/** Décryptage sans la clé : on essaie tous les bâtons de 2 à `maxTurns` lettres par tour */
export function scytaleCandidates(
	text: string,
	maxTurns = 12
): { lettersPerTurn: number; text: string }[] {
	const length = lettersOnly(text).length;
	const last = Math.min(maxTurns, length - 1);
	return Array.from({ length: Math.max(0, last - 1) }, (_, i) => ({
		lettersPerTurn: i + 2,
		text: scytaleDecrypt(text, i + 2).text
	}));
}
