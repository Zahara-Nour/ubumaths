import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isMarketplaceEnabled } from '$lib/server/marketplace/helpers';

/**
 * GET /api/marketplace/proposals/my
 * Get current user's proposals (as proposer)
 */
export const GET: RequestHandler = async ({ locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Check if marketplace is enabled for user
	const marketplaceEnabled = await isMarketplaceEnabled(supabase, userId);
	if (!marketplaceEnabled) {
		throw error(403, "Le marketplace n'est pas activé pour votre classe");
	}

	// Fetch user's proposals with listing info
	const { data: proposals, error: proposalsError } = await supabase
		.from('marketplace_proposals')
		.select(
			`
			*,
			listing:marketplace_listings!marketplace_proposals_listing_id_fkey(
				id,
				title,
				creator_id,
				status
			)
		`
		)
		.eq('proposer_id', userId)
		.order('created_at', { ascending: false });

	if (proposalsError) {
		console.error('Error fetching user proposals:', proposalsError);
		throw error(500, 'Erreur lors de la récupération des propositions');
	}

	return json(proposals || []);
};
