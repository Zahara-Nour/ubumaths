// Messages lisibles pour les refus de la base sur les années scolaires.
// Deux contraintes d'unicité (schéma de base) :
// - `unique_school_year` : (school_id, name) — une école n'a pas deux années du même nom ;
// - `idx_one_active_year_per_school` : une seule année active par école.

type DbErrorLike = { code?: string; message?: string; details?: string } | null | undefined;

const UNIQUE_VIOLATION = '23505';

/**
 * Message à montrer à l'admin quand la base refuse une année pour doublon ;
 * `null` si l'erreur est d'une autre nature (message générique de l'appelant).
 */
export function schoolYearConflictMessage(dbError: DbErrorLike, yearName: string): string | null {
	if (!dbError || dbError.code !== UNIQUE_VIOLATION) return null;
	const text = `${dbError.message ?? ''} ${dbError.details ?? ''}`;

	if (text.includes('unique_school_year')) {
		return `Une année « ${yearName} » existe déjà pour cette école. Modifiez-la ou activez-la plutôt que d'en créer une autre.`;
	}
	if (text.includes('idx_one_active_year_per_school')) {
		return 'Une autre année est déjà active pour cette école. Décochez « Année active », ou activez cette année depuis la liste.';
	}
	return null;
}
