/**
 * Constructions List Page Server
 * Load user's constructions and public constructions from others
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

/**
 * Une ligne de la liste des constructions.
 *
 * Les nullabilités reflètent le schéma : `is_public` et les horodatages ont
 * une valeur par défaut en base mais restent nullables, et un embed PostgREST
 * sur une clé étrangère unique renvoie un objet — ou `null` si l'auteur a été
 * supprimé — jamais un tableau. La page gère déjà les deux formes.
 */
export interface ConstructionListItem {
	id: string;
	title: string;
	description: string | null;
	format: string;
	is_public: boolean | null;
	created_at: string | null;
	updated_at: string | null;
	author_id: string | null;
	profiles: {
		firstname: string | null;
		lastname: string | null;
	} | null;
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
		constructions: constructions ?? [],
		userId: user.id
	};
};
