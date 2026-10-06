/**
 * Carré de Polybe : chaque lettre devient le numéro de sa ligne puis de sa
 * colonne dans une grille 5×5. Il n'y a que 25 cases : J partage celle de I,
 * donc un J déchiffré revient en I.
 *
 * @module lib/ciphers/polybius
 */
import { isLetter, normalizeText, type CipherResult, type CipherStep } from './alphabet';
import { CipherInputError } from './errors';

// Constantes

export const POLYBIUS_GRID: readonly string[] = ['ABCDE', 'FGHIK', 'LMNOP', 'QRSTU', 'VWXYZ'];

// Functions

function position(letter: string): { row: number; column: number } {
	const target = letter === 'J' ? 'I' : letter;
	const row = POLYBIUS_GRID.findIndex((line) => line.includes(target));
	return { row: row + 1, column: POLYBIUS_GRID[row].indexOf(target) + 1 };
}

/** Lettres seules, codées en paires séparées par des espaces */
export function polybiusEncrypt(text: string): CipherResult {
	const steps = [...normalizeText(text)].filter(isLetter).map((letter) => {
		const { row, column } = position(letter);
		const place = `ligne ${row}, colonne ${column}`;
		return {
			input: letter,
			output: `${row}${column}`,
			detail: letter === 'J' ? `J partage la case de I : ${place}` : place
		};
	});
	return { text: steps.map((step) => step.output).join(' '), steps };
}

export function polybiusDecrypt(code: string): CipherResult {
	const digits: number[] = [];
	[...code].forEach((char, i) => {
		if (/\s/.test(char)) return;
		if (!/[0-9]/.test(char)) {
			throw new CipherInputError(`Caractère inattendu « ${char} » (position ${i + 1}).`);
		}
		const digit = Number(char);
		if (digit < 1 || digit > 5) {
			throw new CipherInputError(
				`Le chiffre ${digit} (position ${i + 1}) n’existe pas dans la grille : seuls 1 à 5 sont possibles.`
			);
		}
		digits.push(digit);
	});
	if (digits.length % 2 === 1) {
		throw new CipherInputError('Nombre impair de chiffres : la dernière paire est incomplète.');
	}
	const steps: CipherStep[] = [];
	for (let i = 0; i < digits.length; i += 2) {
		const [row, column] = [digits[i], digits[i + 1]];
		steps.push({
			input: `${row}${column}`,
			output: POLYBIUS_GRID[row - 1][column - 1],
			detail: `ligne ${row}, colonne ${column}`
		});
	}
	return { text: steps.map((step) => step.output).join(''), steps };
}
