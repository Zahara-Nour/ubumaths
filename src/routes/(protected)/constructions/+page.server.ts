/**
 * Constructions List Page Server
 * Load user's constructions and public constructions from others
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export interface ConstructionListItem {
	id: string;
	title: string;
	description: string | null;
	format: string;
	is_public: boolean;
	created_at: string;
	updated_at: string;
	author_id: string | null;
	profiles: {
		firstname: string | null;
		lastname: string | null;
	}[];
}

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { user } = await parent();
	if (!user) throw error(401, 'Non autorisé');

	const { data: constructions, error: constructionsError } = await supabase
		.from('constructions')
		.select(
			`
			id,
			title,
			description,
			format,
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
		.or(`author_id.eq.${user.id},is_public.eq.true`)
		.order('created_at', { ascending: false });

	if (constructionsError) {
		console.error('Error fetching constructions:', constructionsError);
		throw error(500, 'Erreur lors du chargement des constructions');
	}

	return {
		constructions: (constructions ?? []) as ConstructionListItem[],
		userId: user.id
	};
};
