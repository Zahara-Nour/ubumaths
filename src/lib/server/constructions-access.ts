/**
 * Qui peut créer et modifier une construction : le prof et l'admin seuls
 * (décision de David du 2026-10-22). La RLS tient la même règle
 * (migration 20261022200000) ; ces gardes ne servent qu'à répondre 403 et à
 * masquer les boutons.
 */
import type { UserRole } from '$lib/server/middleware/auth';

export const CONSTRUCTION_AUTHOR_ROLES: UserRole[] = ['teacher', 'admin'];

export function canAuthorConstructions(role: string | null | undefined): boolean {
	return CONSTRUCTION_AUTHOR_ROLES.some((allowed) => allowed === role);
}
