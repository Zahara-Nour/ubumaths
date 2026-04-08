import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isMarketplaceEnabled } from '$lib/server/marketplace/helpers';

/**
 * GET /api/marketplace/proposals/my
 * Get current user's proposals (as proposer) with enriched summary
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

	// Fetch proposals with listing details
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

	// Collect all IDs to resolve names
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

	// Resolve card instance IDs → template names (left join, no !inner)
	const cardNameMap = new Map<string, string>();

	if (allCardInstanceIds.size > 0) {
		const { data: instances } = await supabase
			.from('vip_card_instances')
			.select('id, template_id')
			.in('id', Array.from(allCardInstanceIds));

		if (instances) {
			// Collect template IDs from instances
			for (const inst of instances) {
				allTemplateIds.add(inst.template_id);
			}

			// Resolve all template IDs at once
			if (allTemplateIds.size > 0) {
				const { data: templates } = await supabase
					.from('vip_card_templates')
					.select('id, name')
					.in('id', Array.from(allTemplateIds));

				const templateMap = new Map<string, string>();
				if (templates) {
					for (const t of templates) templateMap.set(t.id, t.name);
				}

				// Map instance ID → template name
				for (const inst of instances) {
					const name = templateMap.get(inst.template_id);
					if (name) cardNameMap.set(inst.id, name);
				}

				// Also populate templateNameMap for wanted_card_template_ids
				for (const [id, name] of templateMap) {
					cardNameMap.set(`tmpl:${id}`, name);
				}
			}
		}
	} else if (allTemplateIds.size > 0) {
		// No card instances but we have template IDs to resolve
		const { data: templates } = await supabase
			.from('vip_card_templates')
			.select('id, name')
			.in('id', Array.from(allTemplateIds));

		if (templates) {
			for (const t of templates) {
				cardNameMap.set(`tmpl:${t.id}`, t.name);
			}
		}
	}

	// Helper: group IDs into "name (xN)" parts
	function groupByName(ids: string[], nameMap: Map<string, string>, prefix = ''): string[] {
		const grouped: Record<string, number> = {};
		for (const id of ids) {
			const name = nameMap.get(prefix + id) || '?';
			grouped[name] = (grouped[name] || 0) + 1;
		}
		return Object.entries(grouped)
			.filter(([name]) => name !== '?')
			.map(([name, count]) => (count > 1 ? `${count}x ${name}` : name));
	}

	// Build summary for each proposal
	const enriched = proposals.map((p) => {
		const listing = p.listing as Record<string, unknown> | null;

		// What I offered (my proposal)
		const myOfferParts: string[] = [];
		if (p.offered_card_ids?.length) {
			myOfferParts.push(...groupByName(p.offered_card_ids, cardNameMap));
		}
		if (p.offered_gidouilles && p.offered_gidouilles > 0) {
			myOfferParts.push(`${p.offered_gidouilles} gidouilles`);
		}

		// What I get in return
		const returnParts: string[] = [];
		if (listing) {
			// Cards the listing creator offers
			const offCardIds = listing.offered_card_ids as string[] | null;
			if (offCardIds?.length) {
				returnParts.push(...groupByName(offCardIds, cardNameMap));
			}
			// Gidouilles the listing creator offers
			const offGid = listing.offered_gidouilles as number | null;
			if (offGid && offGid > 0) {
				returnParts.push(`${offGid} gidouilles`);
			}
			// For "sell" listings: the creator wants gidouilles (already in myOffer)
			// and offers cards (already in returnParts via offered_card_ids).
			// For "buy" listings: the creator wants cards and offers gidouilles.
			// If neither side has cards, use wanted_card_template_ids for context
			if (returnParts.length === 0) {
				const wantedTmplIds = listing.wanted_card_template_ids as string[] | null;
				if (wantedTmplIds?.length) {
					// The listing wanted these cards (which I'm giving) — show what I get
					const wantedGid = listing.wanted_gidouilles as number | null;
					if (wantedGid && wantedGid > 0) {
						returnParts.push(`${wantedGid} gidouilles`);
					}
				}
			}
		}

		const myOffer = myOfferParts.length > 0 ? myOfferParts.join(' + ') : 'rien';
		const theirOffer = returnParts.length > 0 ? returnParts.join(' + ') : 'rien';
		const summary = `${myOffer} contre ${theirOffer}`;

		return { ...p, summary };
	});

	return json(enriched);
};
