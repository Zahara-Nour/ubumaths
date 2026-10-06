/**
 * Alphabet commun aux chiffres du Cabinet Noir : les 26 lettres A-Z.
 *
 * Tout texte est d'abord normalisé (majuscules, accents retirés, ligatures
 * développées) ; ce qui n'est pas une lettre (chiffres, espaces, ponctuation)
 * traverse les chiffres sans changer.
 *
 * @module lib/ciphers/alphabet
 */

// Types

/** Une lettre traitée par un chiffre, et le calcul qui l'a transformée */
export interface CipherStep {
	input: string;
	output: string;
	/** Calcul affiché (« 7 + 3 = 10 ») ; vide quand il n'y en a pas */
	detail: string;
}

export interface CipherResult {
	text: string;
	steps: CipherStep[];
}

// Constantes

export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const ALPHABET_SIZE = ALPHABET.length;

/** Lettres que la décomposition NFD ne ramène pas à A-Z */
const SPECIAL_LETTERS: Record<string, string> = {
	Œ: 'OE',
	Æ: 'AE',
	Ł: 'L',
	Ø: 'O',
	Đ: 'D',
	Ħ: 'H'
};

// Functions

/** Reste toujours compris entre 0 et m − 1, même pour n négatif */
export function mod(n: number, m: number): number {
	return ((n % m) + m) % m;
}

export function isLetter(char: string): boolean {
	return char.length === 1 && char >= 'A' && char <= 'Z';
}

/** Rang d'une lettre majuscule : A → 0, Z → 25 */
export function letterIndex(letter: string): number {
	return letter.charCodeAt(0) - 65;
}

export function indexToLetter(index: number): string {
	return ALPHABET[mod(index, ALPHABET_SIZE)];
}

/** Écrit un entier avec le vrai signe moins (−2), comme au tableau */
export function formatNumber(n: number): string {
	return n < 0 ? `−${-n}` : String(n);
}

/**
 * Majuscules, accents retirés, Œ → OE, Ł → L… Seuls les caractères qui
 * deviennent des lettres A-Z sont touchés : ≠, π ou un chiffre traversent tels quels.
 */
export function normalizeText(text: string): string {
	let output = '';
	for (const char of text) {
		// Accent déjà décomposé : il disparaît avec celui de la lettre précédente
		if (/\p{M}/u.test(char)) continue;
		const upper = char.toUpperCase();
		const letters = SPECIAL_LETTERS[upper] ?? upper.normalize('NFD').replace(/\p{M}/gu, '');
		output += /^[A-Z]+$/.test(letters) ? letters : char;
	}
	return output;
}

/** Les seules lettres A-Z du texte normalisé */
export function lettersOnly(text: string): string {
	return normalizeText(text).replace(/[^A-Z]/g, '');
}

/** Lettres groupées par blocs (de 5 par défaut) : cache la longueur des mots */
export function toBlocks(text: string, size = 5): string {
	return (
		lettersOnly(text)
			.match(new RegExp(`.{1,${size}}`, 'g'))
			?.join(' ') ?? ''
	);
}

/** Applique `transform` à chaque lettre du texte normalisé, en gardant le reste */
export function mapLetters(text: string, transform: (letter: string) => CipherStep): CipherResult {
	const steps: CipherStep[] = [];
	let output = '';
	for (const char of normalizeText(text)) {
		if (!isLetter(char)) {
			output += char;
			continue;
		}
		const step = transform(char);
		steps.push(step);
		output += step.output;
	}
	return { text: output, steps };
}
