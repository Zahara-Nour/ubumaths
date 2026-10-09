/**
 * Mots du jeu Mathémo, tirés du dictionnaire mathématique.
 */
import MATH_DICTIONARY, { getTermsForGrade, type MathTerm } from '$lib/data/math-dictionary-fr';
import type { GradeCode } from '$lib/types/grades';

// Le clavier du jeu n'a que les lettres de a à z : un mot comme « demi-droite »
// ne pourrait jamais être trouvé
const PLAYABLE_WORD = /^[a-z]+$/;

/**
 * Normalize string by removing accents and converting to lowercase.
 * Allows players to type without accents.
 */
export function normalizeString(str: string): string {
	return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function playableWords(terms: MathTerm[]): string[] {
	return terms.map((t) => normalizeString(t.term)).filter((word) => PLAYABLE_WORD.test(word));
}

/** Pre-computed set of all playable terms (normalized) for fast validation */
export const allWordsNormalized = new Set(playableWords(MATH_DICTIONARY));

/**
 * Get playable terms for a given grade level.
 * Returns normalized term strings (without accents) for the game.
 */
export function getWordsForLevel(level: GradeCode): string[] {
	// Un homonyme (« base » d'une puissance, d'un solide, de vecteurs) ne doit
	// pas sortir plus souvent qu'un autre mot
	return [...new Set(playableWords(getTermsForGrade(level)))];
}
