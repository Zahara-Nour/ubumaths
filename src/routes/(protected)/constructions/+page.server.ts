/**
 * Constructions List Page Server
 * ==============================
 * Load user's constructions and public constructions from others
 */

import type { PageServerLoad } from './$types';
import { error, redirect } from '@sveltejs/kit';

/**
 * Construction with author info (from database query)
 */
export interface ConstructionListItem {
	id: string;
	title: string;
	description: string | null;
	is_public: boolean;
	created_at: string;
	updated_at: string;
	author_id: string | null;
	// Supabase returns array for joins, we pick first element in the client
	profiles: {
		firstname: string | null;
		lastname: string | null;
	}[];
}

/**
 * Load constructions for the list page
 */
export const load: PageServerLoad = async ({ locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();
	if (!user) {
		throw redirect(303, '/login');
	}

	// Fetch user's constructions and public constructions
	// RLS policies handle the filtering, but we use OR to combine conditions
	const { data: constructions, error: constructionsError } = await supabase
		.from('constructions')
		.select(
			`
			id,
			title,
			description,
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
