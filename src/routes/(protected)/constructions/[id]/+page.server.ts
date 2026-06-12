/**
 * Construction Player Page Server
 * Load a single construction by ID for the player view
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { validateUuidParam } from '$lib/server/validation/params';

export interface ConstructionDetail {
	id: string;
	title: string;
	description: string | null;
	format: string;
	script: unknown;
	dsl_script: string | null;
	is_public: boolean;
	created_at: string;
	updated_at: string;
	author_id: string | null;
	profiles: {
		firstname: string | null;
		lastname: string | null;
	} | null;
}

export const load: PageServerLoad = async ({ params, parent, locals: { supabase } }) => {
	const { user } = await parent();
	if (!user) throw error(401, 'Non autorisé');
	const id = validateUuidParam(params.id);

	const { data: construction, error: constructionError } = await supabase
		.from('constructions')
		.select(
			`
			id,
			title,
			description,
			format,
			script,
			dsl_script,
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

	if (construction.author_id !== user.id && !construction.is_public) {
		throw error(403, 'Acces refuse a cette construction');
	}

	return {
		construction: construction as unknown as ConstructionDetail,
		userId: user.id,
		isOwner: construction.author_id === user.id
	};
};
