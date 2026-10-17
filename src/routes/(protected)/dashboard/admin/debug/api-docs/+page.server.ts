/**
 * Documentation de l'API (Swagger UI) : admin seul.
 *
 * La spécification (`/api/openapi.json`) est déjà réservée à l'admin ; la page qui
 * l'affiche l'est aussi, au lieu d'une coquille vide visible de tous.
 */
import type { PageServerLoad } from './$types';
import { requireAdmin } from '$lib/server/middleware/auth';

export const load: PageServerLoad = async ({ locals }) => {
	await requireAdmin(locals);
	return {};
};
