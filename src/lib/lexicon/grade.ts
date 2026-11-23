/**
 * Niveau de lecture des mots cliquables (lot 2 du lexique)
 *
 * Module léger, sans le dictionnaire : le cadre d'une question le calcule sans
 * charger les 230 Ko de définitions.
 *
 * @module lexicon/grade
 */

import { GRADES, isGradeCode, type GradeCode } from '#lib/types/grades.ts';

/**
 * Niveau de lecture : celui de l'élève ; sans lui (visiteur, professeur), le
 * plus petit niveau de la question, pour les définitions les plus simples.
 */
export function lexiconGrade(
	profileGrade: string | null | undefined,
	questionGrades: readonly string[] = []
): GradeCode | null {
	if (profileGrade && isGradeCode(profileGrade)) return profileGrade;
	const grades = questionGrades.filter(isGradeCode);
	if (grades.length === 0) return null;
	return grades.reduce((lowest, grade) =>
		GRADES[grade].schoolYear < GRADES[lowest].schoolYear ? grade : lowest
	);
}

/** Niveaux de lecture d'une carte de question (R3, Q1 du chantier mots-cliquables). */
export interface QuestionReadingGrades {
	/** Niveau des définitions montrées au clic */
	grade: GradeCode;
	/** Niveau qui choisit les mots soulignés */
	linkGrade: GradeCode;
}

/**
 * Élève : son niveau, pour les deux. Professeur ou visiteur : la fiche au plus
 * petit niveau de la question (définitions les plus simples), le soulignement
 * au plus haut (R3 : sur une question 4e + 3e, lu comme un élève de 3e).
 * `null` : niveau inconnu, aucun mot souligné (E1).
 */
export function questionReadingGrades(
	profileGrade: string | null | undefined,
	questionGrades: readonly string[] = []
): QuestionReadingGrades | null {
	if (profileGrade && isGradeCode(profileGrade)) {
		return { grade: profileGrade, linkGrade: profileGrade };
	}
	const grades = questionGrades.filter(isGradeCode);
	if (grades.length === 0) return null;
	const highest = grades.reduce((top, grade) =>
		GRADES[grade].schoolYear > GRADES[top].schoolYear ? grade : top
	);
	// lexiconGrade rend le plus petit niveau quand le profil n'en a pas
	return { grade: lexiconGrade(null, grades) ?? highest, linkGrade: highest };
}
