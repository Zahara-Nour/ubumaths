import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isMarketplaceEnabled } from '$lib/server/marketplace/helpers';

type VipCardsJson = Record<string, { cardId: string; earnedAt: string; usedAt?: string }>;

interface ListingData {
	id: string;
	listing_type: string;
	creator_id: string;
	status: string;
	offered_gidouilles: number | null;
	wanted_gidouilles: number | null;
	offered_card_ids: string[] | null;
	wanted_card_template_ids: string[] | null;
}

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

	// --- Step 1: Collect all template IDs we need names for ---
	// For "buy" listings: wanted_card_template_ids ARE template IDs directly
	// For "sell" listings: offered_card_ids are instance IDs → need profile resolution
	const allTemplateIds = new Set<string>();
	const userIdsForProfiles = new Set<string>();
	let needInstanceResolution = false;

	for (const p of proposals) {
		const listing = p.listing as ListingData | null;
		if (!listing) continue;

		// Buy listing: wanted_card_template_ids are template IDs directly
		if (listing.wanted_card_template_ids?.length) {
			for (const id of listing.wanted_card_template_ids) allTemplateIds.add(id);
		}

		// Sell listing: need to resolve offered_card_ids via profiles
		if (listing.offered_card_ids?.length) {
			userIdsForProfiles.add(listing.creator_id);
			userIdsForProfiles.add(p.proposer_id); // card might have been transferred
			needInstanceResolution = true;
		}

		// Proposal offered cards: need profile resolution
		if (p.offered_card_ids?.length) {
			userIdsForProfiles.add(p.proposer_id);
			userIdsForProfiles.add(listing.creator_id); // card might have been transferred
			needInstanceResolution = true;
		}
	}

	// --- Step 2: Resolve instance IDs via profiles.vip_cards ---
	const instanceToTemplate = new Map<string, string>();

	if (needInstanceResolution && userIdsForProfiles.size > 0) {
		const { data: profiles } = await supabase
			.from('profiles')
			.select('id, vip_cards')
			.in('id', Array.from(userIdsForProfiles));

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
	}

	// --- Step 3: Fetch all template names in ONE query ---
	const templateNameMap = new Map<string, string>();
	if (allTemplateIds.size > 0) {
		const { data: templates } = await supabase
			.from('vip_card_templates')
			.select('id, name')
			.in('id', Array.from(allTemplateIds));

		if (templates) {
			for (const t of templates) templateNameMap.set(t.id, t.name);
		}
	}

	// --- Step 4: Build summary for each proposal ---
	const enriched = proposals.map((p) => {
		const listing = p.listing as ListingData | null;

		// What I offered
		const myParts: string[] = [];

		if (listing?.listing_type === 'buy' && listing.wanted_card_template_ids?.length) {
			// For buy listings: I offered cards matching wanted_card_template_ids
			// Use template IDs directly (no instance resolution needed!)
			const names = listing.wanted_card_template_ids
				.map((id) => templateNameMap.get(id))
				.filter((n): n is string => !!n);
			if (names.length > 0) myParts.push(formatCardNames(names));
		} else if (p.offered_card_ids?.length) {
			// Resolve instance IDs via profiles
			const names: string[] = [];
			for (const instanceId of p.offered_card_ids) {
				const templateId = instanceToTemplate.get(instanceId);
				const name = templateId ? templateNameMap.get(templateId) : undefined;
				if (name) names.push(name);
			}
			if (names.length > 0) myParts.push(formatCardNames(names));
		}

		if (p.offered_gidouilles && p.offered_gidouilles > 0) {
			myParts.push(`${p.offered_gidouilles} gidouilles`);
		}

		// What I get in return
		const theirParts: string[] = [];

		if (listing) {
			// Cards the listing offers (sell listings)
			if (listing.offered_card_ids?.length) {
				const names: string[] = [];
				for (const instanceId of listing.offered_card_ids) {
					const templateId = instanceToTemplate.get(instanceId);
					const name = templateId ? templateNameMap.get(templateId) : undefined;
					if (name) names.push(name);
				}
				if (names.length > 0) theirParts.push(formatCardNames(names));
			}

			// Gidouilles the listing offers (buy listings)
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
