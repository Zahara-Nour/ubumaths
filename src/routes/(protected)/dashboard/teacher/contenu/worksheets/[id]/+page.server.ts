import type { PageServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';
import { z } from 'zod';
import { fetchWorksheetCitations } from '$lib/server/worksheets/citations';

// UUID validation schema
const uuidSchema = z.string().uuid();

/**
 * Load worksheet details with sections and exercises
 */
export const load: PageServerLoad = async ({ locals, params, fetch }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/login');
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

	// Les séances qui citent cette fiche PAR NUMÉRO d'exercice.
	//
	// Chargé ici plutôt qu'ajouté à `/api/worksheets/[id]` : cet avertissement ne
	// concerne que la page d'édition, et la réponse de l'API est partagée avec
	// d'autres consommateurs — dont un schéma Zod qui laisserait tomber le champ
	// en silence.
	const citations = await fetchWorksheetCitations(locals.supabase, idValidation.data);

	return {
		worksheet: data.worksheet,
		citations,
		user
	};
};
