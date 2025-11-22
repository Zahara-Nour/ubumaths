import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { z } from 'zod';

// UUID validation schema
const uuidSchema = z.string().uuid();

/**
 * Load worksheet data for editing
 */
export const load: PageServerLoad = async ({ locals, params, fetch }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	// Validate worksheet ID
	const idValidation = uuidSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, 'ID de feuille invalide');
	}

	// Fetch worksheet details from API
	const response = await fetch(`/api/worksheets/${params.id}`);

	if (!response.ok) {
		if (response.status === 404) {
			throw error(404, 'Feuille non trouvee');
		}
		if (response.status === 403) {
			throw error(403, 'Acces refuse');
		}
		throw error(500, 'Erreur lors du chargement de la feuille');
	}

	const data = await response.json();

	return {
		worksheet: data.worksheet,
		user
	};
};
