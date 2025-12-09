/**
 * Construction Player Page Server
 * ================================
 * Load a single construction by ID for the player view
 */

import type { PageServerLoad } from './$types';
import type { ConstructionScript } from '$lib/constructions';
import { error, redirect } from '@sveltejs/kit';
import { validateUuidParam } from '$lib/server/validation/params';

/**
 * Construction with author info and script
 */
export interface ConstructionDetail {
	id: string;
	title: string;
	description: string | null;
	script: ConstructionScript;
	is_public: boolean;
	created_at: string;
	updated_at: string;
	author_id: string | null;
	profiles: {
		firstname: string | null;
		lastname: string | null;
	} | null;
}

/**
 * Load construction for the player page
 */
export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	const id = validateUuidParam(params.id);

	// Fetch construction with author info
	const { data: construction, error: constructionError } = await supabase
		.from('constructions')
		.select(
			`
			id,
			title,
			description,
			script,
			is_public,
			created_at,
			updated_at,
			author_id,
			profiles!constructions_author_id_fkey (
				firstname,
				lastname
			)
		`
		)
		.eq('id', id)
		.single();

	if (constructionError || !construction) {
		if (constructionError?.code === 'PGRST116') {
			throw error(404, 'Construction non trouvee');
		}
		console.error('Error fetching construction:', constructionError);
		throw error(500, 'Erreur lors du chargement de la construction');
	}

	// Check access: user must be owner OR construction must be public
	if (construction.author_id !== user.id && !construction.is_public) {
		throw error(403, 'Acces refuse a cette construction');
	}

	return {
		construction: construction as unknown as ConstructionDetail,
		userId: user.id,
		isOwner: construction.author_id === user.id
	};
};
