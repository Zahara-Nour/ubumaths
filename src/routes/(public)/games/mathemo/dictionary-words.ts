/**
 * Mots du jeu Mathémo, tirés du dictionnaire mathématique.
 */
import MATH_DICTIONARY, { getTermsForGrade, type MathTerm } from '$lib/data/math-dictionary-fr';
import type { GradeCode } from '$lib/types/grades';

// Le clavier du jeu n'a que les lettres de a à z : un mot comme « demi-droite »
// ne pourrait jamais être trouvé
const PLAYABLE_WORD = /^[a-z]+$/;

/** Minuscules, accents retirés : le joueur tape sans accents. */
export function normalizeString(str: string): string {
	return str
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

function playableWords(terms: MathTerm[]): string[] {
	return terms.map((t) => normalizeString(t.term)).filter((word) => PLAYABLE_WORD.test(word));
}

/** Tous les mots jouables, normalisés : sert à valider une proposition du joueur. */
export const allWordsNormalized = new Set(playableWords(MATH_DICTIONARY));

/** Mots jouables d'un niveau, normalisés (sans accents), chacun une seule fois. */
export function getWordsForLevel(level: GradeCode): string[] {
	// Un homonyme (« base » d'une puissance, d'un solide, de vecteurs) ne doit
	// pas sortir plus souvent qu'un autre mot
	return [...new Set(playableWords(getTermsForGrade(level)))];
}
