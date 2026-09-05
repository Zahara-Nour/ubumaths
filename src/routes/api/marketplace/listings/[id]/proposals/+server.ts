import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import { createProposalSchema } from '$lib/server/marketplace/validation';
import {
	validateCardOwnership,
	lockCardsForEntity,
	isMarketplaceEnabled,
	getStudentGidouilles,
	enrichWithUsernames,
	enrichProposalsWithCardData
} from '$lib/server/marketplace/helpers';
import {
	notifyNewProposal,
	notifyProposalAccepted,
	notifyProposalRejected
} from '$lib/server/marketplace/notifications';
import { z } from 'zod';
import { acceptProposalSchema } from '$lib/server/validation/marketplace-rpc';

// ID validation schema
const idSchema = z.string().uuid("ID d'annonce invalide");

/**
 * GET /api/marketplace/listings/[id]/proposals
 * Get proposals for a listing (owner only)
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate listing ID
	const idValidation = idSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const listingId = idValidation.data;

	// Verify user owns the listing + get listing details for summary
	const { data: listing, error: listingError } = await supabase
		.from('marketplace_listings')
		.select(
			'creator_id, listing_type, offered_card_ids, offered_gidouilles, wanted_card_template_ids, wanted_gidouilles'
		)
		.eq('id', listingId)
		.single();

	if (listingError || !listing) {
		throw error(404, 'Annonce non trouvée');
	}

	if (listing.creator_id !== userId) {
		throw error(403, 'Vous ne pouvez pas voir les propositions de cette annonce');
	}

	// Fetch proposals with proposer info + proposer's vip_cards (for card name resolution)
	const { data: proposals, error: proposalsError } = await supabase
		.from('marketplace_proposals')
		.select(
			`
      *,
      proposer:profiles!marketplace_proposals_proposer_id_fkey(
        id,
        firstname,
        lastname,
        avatar_url,
        vip_cards
      )
    `
		)
		.eq('listing_id', listingId)
		.order('created_at', { ascending: false });

	if (proposalsError) {
		console.error('Error fetching proposals:', proposalsError);
		throw error(500, 'Erreur lors de la récupération des propositions');
	}

	// Resolve template names for listing's offered_card_ids
	// After an accepted trade, the cards are in the PROPOSER's profile
	type VipCardsJson = Record<string, { cardId: string }>;

	// Collect all template IDs we need
	const allTemplateIds = new Set<string>();

	// From listing's wanted_card_template_ids (already template IDs)
	if (listing.wanted_card_template_ids?.length) {
		for (const id of listing.wanted_card_template_ids) allTemplateIds.add(id);
	}

	// Build instanceId → templateId map from ALL proposers' profiles
	// (listing's offered cards may now be in any proposer's profile)
	const instanceToTemplate = new Map<string, string>();
	if (proposals) {
		for (const p of proposals) {
			const proposer = p.proposer as { vip_cards?: VipCardsJson } | null;
			if (proposer?.vip_cards) {
				for (const [instId, card] of Object.entries(proposer.vip_cards)) {
					instanceToTemplate.set(instId, card.cardId);
					allTemplateIds.add(card.cardId);
				}
			}
		}
	}

	// Also check MY profile (owner) for cards not yet traded
	const { data: myProfile } = await supabase
		.from('profiles')
		.select('vip_cards')
		.eq('id', userId)
		.single();
	if (myProfile?.vip_cards) {
		const myCards = myProfile.vip_cards as VipCardsJson;
		for (const [instId, card] of Object.entries(myCards)) {
			instanceToTemplate.set(instId, card.cardId);
			allTemplateIds.add(card.cardId);
		}
	}

	// Fetch all template names
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

	// Helper to group card names
	function formatCardNames(names: string[]): string {
		const counts = new Map<string, number>();
		for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
		return Array.from(counts)
			.map(([name, count]) => (count > 1 ? `${count}x ${name}` : name))
			.join(' + ');
	}

	// SECURITY (finding M12): proposer.vip_cards was fetched only to build the
	// instanceId→template map above. Strip each bidder's full inventory now so it
	// never reaches the listing owner in the response.
	for (const p of proposals ?? []) {
		const proposer = p.proposer as { vip_cards?: unknown } | null;
		if (proposer && typeof proposer === 'object') {
			delete proposer.vip_cards;
		}
	}

	// Build summary for each proposal (from listing owner's perspective)
	// Format: "[ce que j'ai reçu] contre [ce que j'ai donné]"
	const enrichedProposals = await enrichProposalsWithCardData(supabase, proposals);
	const result = enrichedProposals.map(enrichWithUsernames).map((p) => {
		// Ce que j'ai reçu = what the proposer offered
		const iGotParts: string[] = [];
		if (p.offered_cards?.length) {
			const names = p.offered_cards
				.map((c: { template?: { name?: string } }) => c.template?.name)
				.filter((n: string | undefined): n is string => !!n);
			if (names.length > 0) iGotParts.push(formatCardNames(names));
		}
		if (p.offered_gidouilles && p.offered_gidouilles > 0) {
			iGotParts.push(`${p.offered_gidouilles} gidouilles`);
		}

		// Ce que j'ai donné = what my listing offered
		const iGaveParts: string[] = [];
		// Resolve listing offered_card_ids via profiles
		if (listing.offered_card_ids?.length) {
			const names: string[] = [];
			for (const instId of listing.offered_card_ids) {
				const tmplId = instanceToTemplate.get(instId);
				const name = tmplId ? templateNameMap.get(tmplId) : undefined;
				if (name) names.push(name);
			}
			if (names.length > 0) iGaveParts.push(formatCardNames(names));
		}
		if (listing.offered_gidouilles && listing.offered_gidouilles > 0) {
			iGaveParts.push(`${listing.offered_gidouilles} gidouilles`);
		}

		const iGot = iGotParts.length > 0 ? iGotParts.join(' + ') : 'rien';
		const iGave = iGaveParts.length > 0 ? iGaveParts.join(' + ') : 'rien';

		return { ...p, summary: `${iGot} contre ${iGave}` };
	});

	return json(result);
};

/**
 * POST /api/marketplace/listings/[id]/proposals
 * Submit a proposal for a listing
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const supabase = locals.supabase;
	const userId = locals.user?.id;

	if (!userId) {
		throw error(401, 'Non authentifié');
	}

	// Validate listing ID
	const idValidation = idSchema.safeParse(params.id);
	if (!idValidation.success) {
		throw error(400, idValidation.error.issues[0].message);
	}

	const listingId = idValidation.data;

	// Validate request body
	const body = await request.json().catch(() => ({}));

	// Override listing_id from params to ensure consistency
	const proposalData = { ...body, listing_id: listingId };
	const validation = createProposalSchema.safeParse(proposalData);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const data = validation.data;

	// Check if marketplace is enabled
	const marketplaceEnabled = await isMarketplaceEnabled(supabase, userId);
	if (!marketplaceEnabled) {
		throw error(403, "Le marketplace n'est pas activé pour votre classe");
	}

	// Verify listing exists and is active
	const { data: listing, error: listingError } = await supabase
		.from('marketplace_listings')
		.select('*')
		.eq('id', listingId)
		.single();

	if (listingError || !listing) {
		throw error(404, 'Annonce non trouvée');
	}

	if (listing.status !== 'active') {
		throw error(403, "Cette annonce n'est plus active");
	}

	if (listing.creator_id === userId) {
		throw error(403, 'Vous ne pouvez pas faire une proposition sur votre propre annonce');
	}

	// Check if user already has a pending proposal for this listing
	const { data: existingProposal } = await supabase
		.from('marketplace_proposals')
		.select('id, status')
		.eq('listing_id', listingId)
		.eq('proposer_id', userId)
		.single();

	if (existingProposal) {
		if (existingProposal.status === 'pending') {
			throw error(403, 'Vous avez déjà une proposition en cours pour cette annonce');
		}
		// Resubmission: reuse the rejected/withdrawn proposal record
	}

	// Validate card ownership if offering cards
	if (data.offered_card_ids.length > 0) {
		const ownsCards = await validateCardOwnership(supabase, userId, data.offered_card_ids);
		if (!ownsCards) {
			throw error(403, 'Vous ne possédez pas toutes les cartes spécifiées');
		}
	}

	// Validate user has enough gidouilles if offering them
	if (data.offered_gidouilles > 0) {
		const userGidouilles = await getStudentGidouilles(supabase, userId);
		if (userGidouilles < data.offered_gidouilles) {
			throw error(403, "Vous n'avez pas assez de gidouilles");
		}
	}

	let proposal;
	let proposalError;

	if (existingProposal) {
		// Update the existing rejected/withdrawn proposal
		const result = await supabase
			.from('marketplace_proposals')
			.update({
				offered_card_ids: data.offered_card_ids,
				offered_gidouilles: data.offered_gidouilles,
				message: data.message || null,
				status: 'pending',
				response_message: null,
				responded_at: null,
				created_at: new Date().toISOString()
			})
			.eq('id', existingProposal.id)
			.select(
				`
        *,
        proposer:profiles!marketplace_proposals_proposer_id_fkey(
          id,
          firstname,
          lastname,
          avatar_url
        )
      `
			)
			.single();
		proposal = result.data;
		proposalError = result.error;
	} else {
		// Create a new proposal
		const result = await supabase
			.from('marketplace_proposals')
			.insert({
				listing_id: listingId,
				proposer_id: userId,
				offered_card_ids: data.offered_card_ids,
				offered_gidouilles: data.offered_gidouilles,
				message: data.message || null,
				status: 'pending'
			})
			.select(
				`
        *,
        proposer:profiles!marketplace_proposals_proposer_id_fkey(
          id,
          firstname,
          lastname,
          avatar_url
        )
      `
			)
			.single();
		proposal = result.data;
		proposalError = result.error;
	}

	if (proposalError) {
		console.error('Error creating proposal:', proposalError);
		throw error(500, 'Erreur lors de la création de la proposition');
	}

	// Lock cards if offering any
	if (data.offered_card_ids.length > 0) {
		const lockResult = await lockCardsForEntity(
			supabase,
			userId,
			data.offered_card_ids,
			listingId,
			'listing'
		);

		if (!lockResult.success) {
			// Rollback: delete the proposal
			await supabase.from('marketplace_proposals').delete().eq('id', proposal.id);

			throw error(500, lockResult.error || 'Erreur lors du verrouillage des cartes');
		}
	}

	// Increment listing proposal count
	await supabase
		.from('marketplace_listings')
		.update({
			proposal_count: listing.proposal_count + 1
		})
		.eq('id', listingId);

	// Check if proposal exactly matches listing demand → auto-accept
	const exactMatch = await (async () => {
		const wantedGidouilles = listing.wanted_gidouilles || 0;
		const offeredGidouilles = data.offered_gidouilles || 0;
		const wantedTemplateIds = listing.wanted_card_template_ids || [];
		const offeredCardIds = data.offered_card_ids || [];

		// Case 1: Sell listing — wants gidouilles only
		if (wantedTemplateIds.length === 0 && wantedGidouilles > 0) {
			return offeredGidouilles >= wantedGidouilles && offeredCardIds.length === 0;
		}

		// Case 2: Buy listing — wants specific card templates
		if (wantedTemplateIds.length > 0 && offeredCardIds.length > 0) {
			// Resolve offered card instance IDs to their template IDs
			const { data: proposerProfile } = await supabase
				.from('profiles')
				.select('vip_cards')
				.eq('id', userId)
				.single();

			if (!proposerProfile?.vip_cards) return false;

			const vipCards = proposerProfile.vip_cards as Record<
				string,
				{ cardId: string; earnedAt: string }
			>;
			const offeredTemplateIds = offeredCardIds.map((id) => vipCards[id]?.cardId).filter(Boolean);

			// Check that every wanted template is covered by offered cards
			const offeredSet = new Set(offeredTemplateIds);
			const allWantedCovered = wantedTemplateIds.every((tid: string) => offeredSet.has(tid));

			// Also check gidouilles match if any are wanted
			const gidouillesOk = wantedGidouilles <= 0 || offeredGidouilles >= wantedGidouilles;

			return allWantedCovered && gidouillesOk;
		}

		return false;
	})();

	if (exactMatch) {
		// Auto-accept: execute trade immediately via RPC
		const { data: result, error: rpcError } = await supabase.rpc('accept_proposal_atomic', {
			p_proposal_id: proposal.id,
			p_user_id: listing.creator_id
		});

		// `RETURNS json` : on valide la forme réelle plutôt que de lire `.success`
		// sur le type `Json`, qui ne porte aucune de ces clés.
		const acceptation = rpcError ? null : acceptProposalSchema.safeParse(result);

		if (acceptation?.success && acceptation.data.success) {
			// Notify accepted proposer
			await notifyProposalAccepted(supabase, userId, 'Annonce', proposal.id);

			// Notify rejected proposers
			const { data: rejectedProposals } = await supabase
				.from('marketplace_proposals')
				.select('proposer_id')
				.eq('listing_id', listingId)
				.eq('status', 'rejected')
				.neq('id', proposal.id);

			if (rejectedProposals) {
				for (const p of rejectedProposals) {
					await notifyProposalRejected(
						supabase,
						p.proposer_id,
						'Annonce',
						'Autre proposition acceptée'
					);
				}
			}

			return json(
				{
					...enrichWithUsernames(proposal),
					status: 'accepted',
					auto_accepted: true,
					trade_id: acceptation.data.trade_id
				},
				{ status: 201 }
			);
		}
		// If auto-accept fails, fall through to normal proposal flow
		console.error(
			'Auto-accept failed:',
			rpcError ??
				(acceptation?.success && !acceptation.data.success ? acceptation.data.error : result)
		);
	}

	// Normal flow: notify listing creator about new proposal
	await notifyNewProposal(supabase, listing.creator_id, userId, 'Annonce', proposal.id);

	return json(enrichWithUsernames(proposal), { status: 201 });
};
