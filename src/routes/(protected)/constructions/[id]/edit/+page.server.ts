import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { validateUuidParam } from '$lib/server/validation/params';

export const load: PageServerLoad = async ({ params, parent, locals: { supabase } }) => {
	const { user } = await parent();
	const id = validateUuidParam(params.id);

	const { data: construction, error: queryError } = await supabase
		.from('constructions')
		.select('id, title, description, format, dsl_script, is_public, author_id')
		.eq('id', id)
		.single();

	if (queryError || !construction) {
		if (queryError?.code === 'PGRST116') {
			throw error(404, 'Construction non trouvee');
		}
		throw error(500, 'Erreur lors du chargement');
	}

	if (construction.author_id !== user.id) {
		throw error(403, 'Vous ne pouvez modifier que vos propres constructions');
	}

	return { construction };
};
