/**
 * Niveaux qui reçoivent le message sur les parenthèses (page de structure)
 *
 * L'enchaînement d'additions et de soustractions et les nombres relatifs
 * arrivent en 5e : la page appelle `parenthesesAdvice` (`mathAST/structure`)
 * seulement si `needsParenthesesAdvice(readReaderGrade()())`.
 * Spécification : `docs/systeme/mathast/structure-expression.md`, section C.
 *
 * @module lexicon/parentheses-advice-grade
 */

import { GRADES, isGradeCode } from '$lib/types/grades';

/** Dernière année sans somme algébrique ni nombres relatifs : la 6e (CP = 1) */
const LAST_YEAR_WITHOUT_RELATIVES = GRADES['6'].schoolYear;

/** Vrai pour un élève de 6e ou avant ; faux pour un visiteur, un niveau inconnu, la 5e et après */
export function needsParenthesesAdvice(grade: string | null | undefined): boolean {
	return isGradeCode(grade) && GRADES[grade].schoolYear <= LAST_YEAR_WITHOUT_RELATIVES;
}
