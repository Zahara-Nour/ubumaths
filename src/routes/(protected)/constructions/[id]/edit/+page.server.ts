import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { validateUuidParam } from '$lib/server/validation/params';
import { requireRoles } from '$lib/server/middleware/auth';
import { CONSTRUCTION_AUTHOR_ROLES } from '$lib/server/constructions-access';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await requireRoles(locals, CONSTRUCTION_AUTHOR_ROLES);
	const { supabase } = locals;
	const id = validateUuidParam(params.id);

	const { data: construction, error: queryError } = await supabase
		.from('constructions')
		.select('id, title, description, format, dsl_script, is_public, author_id')
		.eq('id', id)
		.single();

	if (queryError || !construction) {
		if (queryError?.code === 'PGRST116') {
			throw error(404, 'Construction introuvable');
		}
		throw error(500, 'Erreur lors du chargement');
	}

	if (construction.author_id !== user.id) {
		throw error(403, 'Modification réservée à l’auteur de la construction');
	}

	return { construction };
};
