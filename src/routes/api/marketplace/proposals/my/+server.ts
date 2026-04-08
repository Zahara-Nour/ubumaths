import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isMarketplaceEnabled } from '$lib/server/marketplace/helpers';

// vip_cards JSONB is Record<instanceId, { cardId, earnedAt, usedAt? }>
type VipCardsJson = Record<string, { cardId: string; earnedAt: string; usedAt?: string }>;

/**
 * Formats a list of card names with grouping for duplicates.
 * e.g. ["Tranquilou", "Tranquilou", "Batman"] → "2x Tranquilou + Batman"
 */
function formatCardNames(names: string[]): string {
	const counts = new Map<string, number>();
	for (const name of names) {
		counts.set(name, (counts.get(name) ?? 0) + 1);
	}
	const parts: string[] = [];
	for (const [name, count] of counts) {
		parts.push(count > 1 ? `${count}x ${name}` : name);
	}
	return parts.join(' + ');
}

/**
 * GET /api/marketplace/proposals/my
 * Get current user's proposals (as proposer) with resolved card name summaries
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

	// --- Resolve card instance IDs to template names ---
	// Following the same pattern as enrichListingsWithCardData in helpers.ts

	// 1. Collect all user IDs we need vip_cards for (proposers + listing creators)
	const userIds = new Set<string>();
	for (const p of proposals) {
		userIds.add(p.proposer_id);
		const listing = p.listing as { creator_id?: string } | null;
		if (listing?.creator_id) {
			userIds.add(listing.creator_id);
		}
	}

	// 2. Fetch vip_cards for all relevant users in ONE query
	const { data: profiles } = await supabase
		.from('profiles')
		.select('id, vip_cards')
		.in('id', Array.from(userIds));

	// 3. Build a global map: instanceId → templateId
	const instanceToTemplate = new Map<string, string>();
	const allTemplateIds = new Set<string>();

	if (profiles) {
		for (const profile of profiles) {
			const vipCards = profile.vip_cards as VipCardsJson | null;
			if (vipCards) {
				for (const [instanceId, card] of Object.entries(vipCards)) {
					instanceToTemplate.set(instanceId, card.cardId);
					allTemplateIds.add(card.cardId);
				}
			}
		}
	}

	// 4. Fetch all template names in ONE query
	const templateNameMap = new Map<string, string>();
	if (allTemplateIds.size > 0) {
		const { data: templates } = await supabase
			.from('vip_card_templates')
			.select('id, name')
			.in('id', Array.from(allTemplateIds));

		if (templates) {
			for (const t of templates) {
				templateNameMap.set(t.id, t.name);
			}
		}
	}

	// 5. Build summary for each proposal
	const enriched = proposals.map((p) => {
		const listing = p.listing as {
			offered_gidouilles?: number | null;
			offered_card_ids?: string[] | null;
		} | null;

		// --- What I offered (proposal side) ---
		const myParts: string[] = [];

		// Resolve my offered card instance IDs to names
		if (p.offered_card_ids && p.offered_card_ids.length > 0) {
			const cardNames: string[] = [];
			for (const instanceId of p.offered_card_ids) {
				const templateId = instanceToTemplate.get(instanceId);
				const name = templateId ? templateNameMap.get(templateId) : undefined;
				cardNames.push(name ?? 'Carte inconnue');
			}
			myParts.push(formatCardNames(cardNames));
		}

		if (p.offered_gidouilles && p.offered_gidouilles > 0) {
			myParts.push(`${p.offered_gidouilles} gidouilles`);
		}

		// --- What I get in return (listing side) ---
		const theirParts: string[] = [];

		if (listing) {
			// Resolve listing's offered card instance IDs to names
			if (listing.offered_card_ids && listing.offered_card_ids.length > 0) {
				const cardNames: string[] = [];
				for (const instanceId of listing.offered_card_ids) {
					const templateId = instanceToTemplate.get(instanceId);
					const name = templateId ? templateNameMap.get(templateId) : undefined;
					cardNames.push(name ?? 'Carte inconnue');
				}
				theirParts.push(formatCardNames(cardNames));
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
