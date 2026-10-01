/**
 * Question d'âge en 2nde (RGPD, article 8)
 * ========================================
 *
 * En 2nde, l'élève répond une seule fois à « As-tu 15 ans ou plus ? ». La réponse
 * (et sa date) est enregistrée, jamais l'âge. Écriture : uniquement par le serveur
 * (POST /api/student/age-declaration) ; annulation : par le professeur.
 */

import type { AgeDeclaration } from '$lib/types/database-helpers';

/** Seul niveau où la question est posée. */
export const AGE_QUESTION_GRADE = '2';

/** Endpoint qui enregistre la réponse. */
export const AGE_DECLARATION_ENDPOINT = '/api/student/age-declaration';

/** Ce qu'il faut savoir du profil pour décider de poser la question. */
export interface AgeQuestionProfile {
	role: string | null;
	grade: string | null;
	age_declaration: string | null;
	consent_required: boolean | null;
}

/**
 * Vrai si la question doit être posée : élève de 2nde, soumis au consentement, sans
 * réponse. Un élève déjà dispensé par le professeur n'est pas interrogé (Q74) : la
 * question ne sert qu'à décider d'une dispense.
 */
export function shouldAskAgeQuestion(profile: AgeQuestionProfile | null | undefined): boolean {
	if (!profile) return false;
	return (
		profile.role === 'student' &&
		profile.grade === AGE_QUESTION_GRADE &&
		profile.age_declaration === null &&
		profile.consent_required === true
	);
}

/** Garde de type sur la valeur lue en base (colonne text + CHECK). */
export function isAgeDeclaration(value: unknown): value is AgeDeclaration {
	return value === '15_plus' || value === 'under_15';
}

/**
 * Phrase affichée au professeur, ex. « a déclaré avoir 15 ans ou plus, le 01/10/2026 ».
 * null si aucune réponse exploitable.
 */
export function describeAgeDeclaration(
	declaration: string | null,
	declaredAt: string | null
): string | null {
	if (!isAgeDeclaration(declaration)) return null;
	const what =
		declaration === '15_plus'
			? 'a déclaré avoir 15 ans ou plus'
			: 'a déclaré avoir moins de 15 ans';
	if (!declaredAt) return what;
	const date = new Date(declaredAt);
	if (Number.isNaN(date.getTime())) return what;
	const formatted = date.toLocaleDateString('fr-FR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric'
	});
	return `${what}, le ${formatted}`;
}
