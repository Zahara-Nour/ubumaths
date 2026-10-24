/**
 * Constructions List Page Server
 * Le prof voit tout (publiées et brouillons) ; les autres, les publiées seules.
 */

import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { createServerLogger } from '$lib/utils/logger';
import { canAuthorConstructions } from '$lib/server/constructions-access';

const logger = createServerLogger('(protected)/constructions/+page.server');

/**
 * Une ligne de la liste des constructions.
 *
 * Les nullabilités reflètent le schéma : `is_public` et les horodatages ont
 * une valeur par défaut en base mais restent nullables. Le nom de l'auteur
 * n'est pas lu : la page ne l'affiche pas (décision de David, 2026-10-24).
 */
export interface ConstructionListItem {
	id: string;
	title: string;
	description: string | null;
	format: string;
	is_public: boolean | null;
	created_at: string | null;
	updated_at: string | null;
}

export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	const { user, profile } = await parent();
	if (!user) throw error(401, 'Non autorisé');
	const canAuthor = canAuthorConstructions(profile?.role);

	let query = supabase.from('constructions').select(
		`
			id,
			title,
			description,
			format,
			is_public,
			created_at,
			updated_at
		`
	);
	// La RLS tient la même règle ; le filtre la double.
	if (!canAuthor) query = query.eq('is_public', true);

	const { data: constructions, error: constructionsError } = await query.order('created_at', {
		ascending: false
	});

	if (constructionsError) {
		logger.error('Error fetching constructions:', constructionsError);
		throw error(500, 'Erreur lors du chargement des constructions');
	}

	return {
		constructions: constructions ?? [],
		canAuthor
	};
};
