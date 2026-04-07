import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isMarketplaceEnabled } from '$lib/server/marketplace/helpers';

/**
 * GET /api/marketplace/proposals/my
 * Get current user's proposals (as proposer) with enriched data
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

	// Fetch user's proposals with listing info (including offer/demand details)
	const { data: proposals, error: proposalsError } = await supabase
		.from('marketplace_proposals')
		.select(
			`
			*,
			listing:marketplace_listings!marketplace_proposals_listing_id_fkey(
				id,
				title,
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

	// Collect all card instance IDs from proposals + listing offered_card_ids
	// to resolve their template names in a single query
	const allCardInstanceIds = new Set<string>();
	const allTemplateIds = new Set<string>();

	for (const p of proposals) {
		if (p.offered_card_ids) {
			for (const id of p.offered_card_ids) allCardInstanceIds.add(id);
		}
		const listing = p.listing as Record<string, unknown> | null;
		if (listing?.offered_card_ids) {
			for (const id of listing.offered_card_ids as string[]) allCardInstanceIds.add(id);
		}
		if (listing?.wanted_card_template_ids) {
			for (const id of listing.wanted_card_template_ids as string[]) allTemplateIds.add(id);
		}
	}

	// Resolve card instance IDs → template names
	const cardNameMap = new Map<string, string>();

	if (allCardInstanceIds.size > 0) {
		const { data: instances } = await supabase
			.from('vip_card_instances')
			.select('id, template:vip_card_templates!inner(name)')
			.in('id', Array.from(allCardInstanceIds));

		if (instances) {
			for (const inst of instances) {
				const tmpl = inst.template as unknown as { name: string } | null;
				if (tmpl) cardNameMap.set(inst.id, tmpl.name);
			}
		}
	}

	// Resolve template IDs → names (for wanted_card_template_ids)
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

	// Build summary for each proposal
	const enriched = proposals.map((p) => {
		const listing = p.listing as Record<string, unknown> | null;

		// What I offered
		const myOfferParts: string[] = [];
		if (p.offered_card_ids?.length) {
			const grouped: Record<string, number> = {};
			for (const id of p.offered_card_ids) {
				const name = cardNameMap.get(id) || 'carte';
				grouped[name] = (grouped[name] || 0) + 1;
			}
			for (const [name, count] of Object.entries(grouped)) {
				myOfferParts.push(count > 1 ? `${count} cartes ${name}` : `1 carte ${name}`);
			}
		}
		if (p.offered_gidouilles && p.offered_gidouilles > 0) {
			myOfferParts.push(`${p.offered_gidouilles} gidouilles`);
		}

		// What I get in return (what the listing offers)
		const returnParts: string[] = [];
		if (listing) {
			const offeredCardIds = listing.offered_card_ids as string[] | null;
			if (offeredCardIds?.length) {
				const grouped: Record<string, number> = {};
				for (const id of offeredCardIds) {
					const name = cardNameMap.get(id) || 'carte';
					grouped[name] = (grouped[name] || 0) + 1;
				}
				for (const [name, count] of Object.entries(grouped)) {
					returnParts.push(count > 1 ? `${count} cartes ${name}` : `1 carte ${name}`);
				}
			}
			const offeredGidouilles = listing.offered_gidouilles as number | null;
			if (offeredGidouilles && offeredGidouilles > 0) {
				returnParts.push(`${offeredGidouilles} gidouilles`);
			}
		}

		const myOffer = myOfferParts.length > 0 ? myOfferParts.join(' + ') : 'rien';
		const theirOffer = returnParts.length > 0 ? returnParts.join(' + ') : 'rien';
		const summary = `${myOffer} contre ${theirOffer}`;

		return { ...p, summary };
	});

	return json(enriched);
};
