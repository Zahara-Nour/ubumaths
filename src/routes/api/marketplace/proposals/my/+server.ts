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

	const marketplaceEnabled = await isMarketplaceEnabled(supabase, userId);
	if (!marketplaceEnabled) {
		throw error(403, "Le marketplace n'est pas activé pour votre classe");
	}

	const { data: proposals, error: proposalsError } = await supabase
		.from('marketplace_proposals')
		.select(
			`
			*,
			listing:marketplace_listings!marketplace_proposals_listing_id_fkey(
				id,
				listing_type,
				creator_id,
				status,
				offered_gidouilles,
				wanted_gidouilles,
				offered_card_ids,
				wanted_card_template_ids
			)
		`
		)
		.eq('proposer_id', userId)
		.order('created_at', { ascending: false });

	if (proposalsError) {
		console.error('Error fetching user proposals:', proposalsError);
		throw error(500, 'Erreur lors de la récupération des propositions');
	}

	if (!proposals || proposals.length === 0) {
		return json([]);
	}

	// Build a simple text summary for each proposal using counts (no name resolution)
	const enriched = proposals.map((p) => {
		const listing = p.listing as {
			listing_type?: string;
			offered_gidouilles?: number | null;
			wanted_gidouilles?: number | null;
			offered_card_ids?: string[] | null;
			wanted_card_template_ids?: string[] | null;
		} | null;

		// What I offered
		const myParts: string[] = [];
		const myCardCount = p.offered_card_ids?.length ?? 0;
		if (myCardCount > 0) {
			myParts.push(`${myCardCount} carte${myCardCount > 1 ? 's' : ''}`);
		}
		if (p.offered_gidouilles && p.offered_gidouilles > 0) {
			myParts.push(`${p.offered_gidouilles} gidouilles`);
		}

		// What I get in return (what the listing offers)
		const theirParts: string[] = [];
		if (listing) {
			const theirCardCount = listing.offered_card_ids?.length ?? 0;
			if (theirCardCount > 0) {
				theirParts.push(`${theirCardCount} carte${theirCardCount > 1 ? 's' : ''}`);
			}
			if (listing.offered_gidouilles && listing.offered_gidouilles > 0) {
				theirParts.push(`${listing.offered_gidouilles} gidouilles`);
			}
		}

		const myOffer = myParts.length > 0 ? myParts.join(' + ') : 'rien';
		const theirOffer = theirParts.length > 0 ? theirParts.join(' + ') : 'rien';
		const summary = `${myOffer} contre ${theirOffer}`;

		return { ...p, summary };
	});

	return json(enriched);
};
