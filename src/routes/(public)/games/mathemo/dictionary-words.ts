/**
 * Mots du jeu Mathémo, tirés du dictionnaire mathématique (lu en base, ADR 0022).
 * Le serveur n'envoie que les mots jouables, réduits à ce que le jeu lit.
 */
import { canRead, type MathTerm } from '$lib/dictionary/model';
import type { GradeCode } from '$lib/types/grades';

/** Ce que le jeu lit d'une entrée : son nom, son niveau, ses filières partagées. */
export type MathemoTerm = Pick<MathTerm, 'term' | 'grade' | 'sharedWith'>;

// Le clavier du jeu n'a que les lettres de a à z : un mot comme « demi-droite »
// ne pourrait jamais être trouvé
const PLAYABLE_WORD = /^[a-z]+$/;

/** Minuscules, accents retirés : le joueur tape sans accents. */
export function normalizeString(str: string): string {
	return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Les entrées jouables du dictionnaire, réduites à ce que le jeu lit (envoyées au navigateur). */
export function playableTerms(entries: readonly MathTerm[]): MathemoTerm[] {
	return entries
		.filter((t) => PLAYABLE_WORD.test(normalizeString(t.term)))
		.map((t) => ({
			term: t.term,
			grade: t.grade,
			...(t.sharedWith && { sharedWith: t.sharedWith })
		}));
}

/** Tous les mots jouables, normalisés : sert à valider une proposition du joueur. */
export function allPlayableWords(terms: readonly MathemoTerm[]): Set<string> {
	return new Set(terms.map((t) => normalizeString(t.term)));
}

/** Mots jouables d'un niveau, normalisés (sans accents), chacun une seule fois. */
export function getWordsForLevel(terms: readonly MathemoTerm[], level: GradeCode): string[] {
	// Un homonyme (« base » d'une puissance, d'un solide, de vecteurs) ne doit
	// pas sortir plus souvent qu'un autre mot
	const visible = terms.filter((t) => canRead(level, t.grade, t.sharedWith));
	return [...new Set(visible.map((t) => normalizeString(t.term)))];
}
