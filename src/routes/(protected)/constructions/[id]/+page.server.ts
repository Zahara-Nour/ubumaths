/**
 * Construction Player Page Server
 * Load a single construction by ID for the player view
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { validateUuidParam } from '$lib/server/validation/params';
import { createServerLogger } from '$lib/utils/logger';
import { canAuthorConstructions } from '$lib/server/constructions-access';

const logger = createServerLogger('(protected)/constructions/[id]/+page.server');

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
}

export const load: PageServerLoad = async ({ params, parent, locals: { supabase } }) => {
	const { user, profile } = await parent();
	if (!user) throw error(401, 'Non autorisé');
	const id = validateUuidParam(params.id);
	const canAuthor = canAuthorConstructions(profile?.role);

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
			updated_at
		`
		)
		.eq('id', id)
		.single();

	if (constructionError || !construction) {
		if (constructionError?.code === 'PGRST116') {
			throw error(404, 'Construction introuvable');
		}
		logger.error('Error fetching construction:', constructionError);
		throw error(500, 'Erreur lors du chargement de la construction');
	}

	// Un brouillon n'existe pas pour qui ne peut pas le lire (la RLS le masque déjà) :
	// 404 plutôt que 403, pour ne pas confirmer qu'il existe.
	if (!construction.is_public && !canAuthor) {
		throw error(404, 'Construction introuvable');
	}

	return {
		construction: construction as unknown as ConstructionDetail,
		canAuthor
	};
};
