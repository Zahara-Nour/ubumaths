/**
 * Niveau de lecture des mots cliquables (lot 2 du lexique)
 *
 * Module léger, sans le dictionnaire : le cadre d'une question le calcule sans
 * charger les 230 Ko de définitions.
 *
 * @module lexicon/grade
 */

import { GRADES, isGradeCode, type GradeCode } from '$lib/types/grades';

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
