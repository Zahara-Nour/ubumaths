/**
 * Qui peut créer, modifier, supprimer une construction et en lire les brouillons :
 * le prof seul (décision de David du 2026-10-24 ; mono-professeur, la propriété
 * `author_id` ne compte plus). La RLS tient la même règle (migration
 * 20261024120100) ; ces gardes ne servent qu'à répondre 403 / 404 et à masquer les
 * boutons.
 */
import type { UserRole } from '$lib/server/middleware/auth';

export const CONSTRUCTION_AUTHOR_ROLES: UserRole[] = ['teacher'];

/** Colonnes d'une construction rendues au navigateur (`author_id` n'en fait plus partie). */
export const CONSTRUCTION_COLUMNS =
	'id, title, description, format, script, dsl_script, is_public, created_at, updated_at';

export function canAuthorConstructions(role: string | null | undefined): boolean {
	return CONSTRUCTION_AUTHOR_ROLES.some((allowed) => allowed === role);
}

/**
 * Scripts de démo (table `construction_demo_scripts`, enregistrés depuis
 * `/constructions/essais`, page du prof seul) : le prof seul, chacun ses scripts
 * (décision de David du 2026-10-25, l'admin retiré). La RLS tient la même règle
 * (migration 20261026120000).
 */
export const DEMO_SCRIPT_AUTHOR_ROLES: UserRole[] = ['teacher'];
