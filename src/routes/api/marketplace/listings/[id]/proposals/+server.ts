import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
// Supabase client is now accessed via locals.supabase
import { createProposalSchema } from '$lib/server/marketplace/validation';
import {
	validateCardOwnership,
	lockCardsForEntity,
	resolveCardInstances,
	isMarketplaceEnabled,
	getStudentGidouilles,
	getStudentSchoolId,
	enrichWithParticipants,
	enrichProposalsWithCardData
} from '$lib/server/marketplace/helpers';
import { autoAcceptExactProposal } from '$lib/server/marketplace/auto-accept';
import { proposersRejectedByAcceptance } from '$lib/server/marketplace/acceptance';
import {
	notifyNewProposal,
	notifyProposalAccepted,
	notifyProposalRejected
} from '$lib/server/marketplace/notifications';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { z } from 'zod';

// Refus d'auto-acceptation qui ne sont pas des pannes (cf. autoAcceptExactProposalSchema)
const REFUS_PREVUS = new Set(['not_exact', 'busy', 'cards_unavailable']);

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

	// ⚠️ Plus de `vip_cards` ici. L'inventaire complet de chaque proposant était
	// chargé pour une seule chose — traduire les instances de cartes en modèles —
	// puis effacé de la réponse à la main (finding M12). La RPC le fait sans
	// jamais sortir de colonne de profil : le problème disparaît à la source.
	const { data: proposals, error: proposalsError } = await supabase
		.from('marketplace_proposals')
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
		.eq('listing_id', listingId)
		.order('created_at', { ascending: false });

	if (proposalsError) {
		console.error('Error fetching proposals:', proposalsError);
		throw error(500, 'Erreur lors de la récupération des propositions');
	}

	// Les cartes que MON annonce offrait, traduites en modèles pour le résumé.
	//
	// ⚠️ Par la RPC, PAS par `profiles.vip_cards`. Une fois l'échange ACCEPTÉ,
	// ces cartes ont changé de main : elles sont dans l'inventaire du proposant,
	// que la RLS me ferme depuis `20260915580000`. Et une lecture refusée par la
	// RLS ne rend aucune erreur — elle rend zéro ligne. La traduction échouait
	// donc en silence, et mon propre résumé d'échange affichait
	// « … contre rien », comme si je n'avais rien donné.
	//
	// Le repli par le profil du propriétaire ne rattrapait rien : après
	// l'échange, la carte n'y est justement plus.
	//
	// `resolve_card_instances` est SECURITY DEFINER, bornée, et ne rend que
	// instance → modèle. Réservée au serveur (Q134) : appelée par le client
	// service via `resolveCardInstances`.
	const instancesOffertes = listing.offered_card_ids ?? [];

	const { data: resolues, error: resolutionError } = await resolveCardInstances(instancesOffertes);

	// Ces cartes composent la moitié du résumé d'échange. Une carte non résolue
	// disparaît de l'offre : mieux vaut une erreur qu'un troc falsifié.
	if (resolutionError) {
		console.error('[marketplace] Cartes de l’annonce illisibles :', resolutionError);
		throw error(500, 'Impossible de lire les cartes de l’annonce');
	}

	const instanceToTemplate = new Map<string, string>();
	const allTemplateIds = new Set<string>();
	for (const ligne of resolues ?? []) {
		instanceToTemplate.set(ligne.instance_id, ligne.card_id);
		allTemplateIds.add(ligne.card_id);
	}

	// Fetch all template names
	const templateNameMap = new Map<string, string>();
	if (allTemplateIds.size > 0) {
		const { data: templates, error: templatesError } = await supabase
			.from('vip_card_templates')
			.select('id, name')
			.in('id', Array.from(allTemplateIds));

		// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
		// laisse une trace.
		if (templatesError) {
			console.error('Enrichissement illisible :', templatesError);
		}
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

	// (Le retrait manuel de `proposer.vip_cards` — finding M12 — n'a plus lieu
	// d'être : la colonne n'est plus demandée.)

	// Build summary for each proposal (from listing owner's perspective)
	// Format: "[ce que j'ai reçu] contre [ce que j'ai donné]"
	const enrichedProposals = await enrichProposalsWithCardData(supabase, proposals);
	// ⚠️ Comblement AVANT la projection : le propriétaire d'une annonce doit
	// savoir qui lui propose un échange. Mesuré, 10 propositions sur 31
	// seraient devenues anonymes.
	const result = (await enrichWithParticipants(supabase, enrichedProposals)).map((p) => {
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

	// L'école est la frontière du marché : une annonce d'une autre école ne se
	// propose pas, même si son identifiant est connu.
	const proposerSchoolId = await getStudentSchoolId(supabase, userId);
	if (!proposerSchoolId || listing.school_id !== proposerSchoolId) {
		throw error(403, "Cette annonce n'est pas proposée dans votre école");
	}

	// Check if user already has a pending proposal for this listing
	const { data: existingProposal, error: existingProposalError } = await supabase
		.from('marketplace_proposals')
		.select('id, status')
		.eq('listing_id', listingId)
		.eq('proposer_id', userId)
		.single();

	// PGRST116 = la ligne n'existe pas, ce que la suite traite déjà. Une AUTRE
	// panne prenait le même visage et faisait conclure « rien ici », donc créer
	// par-dessus ce qu'on n'avait simplement pas su lire.
	if (existingProposalError && existingProposalError.code !== 'PGRST116') {
		console.error('Lecture impossible :', existingProposalError);
		throw error(500, 'Impossible de vérifier l’état actuel');
	}

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
		// Resoumission d'une proposition refusée ou retirée. Client service : depuis
		// Q147, la RLS ne laisse au proposant que le RETRAIT de sa proposition ; toute
		// autre écriture passe par ici, après les contrôles ci-dessus (annonce active,
		// même école, cartes possédées, solde). Les filtres `proposer_id` et `status`
		// gardent la ligne visée même sans RLS.
		const result = await createServiceRoleClient()
			.from('marketplace_proposals')
			.update({
				offered_card_ids: data.offered_card_ids,
				offered_gidouilles: data.offered_gidouilles,
				message: data.message || null,
				status: 'pending',
				response_message: null,
				responded_at: null,
				withdrawn_at: null,
				created_at: new Date().toISOString()
			})
			.eq('id', existingProposal.id)
			.eq('proposer_id', userId)
			.in('status', ['rejected', 'withdrawn'])
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

	// `proposal` est alimentée par deux branches et reste donc `T | null` pour le
	// compilateur, même une fois l'erreur écartée. La garde évite que la suite —
	// verrouillage de cartes, notifications, réponse — ne travaille sur `null`.
	if (!proposal) {
		throw error(500, 'Proposition créée sans contenu exploitable');
	}

	// Verrouillage des cartes offertes SOUS L'ID DE LA PROPOSITION. Sous l'id de
	// l'annonce, le refus et le retrait (qui déverrouillent par proposition) les
	// laissaient verrouillées, et un échec de `lock_cards` — qui efface tout ce
	// qui est verrouillé sous l'id reçu — effaçait les verrous du VENDEUR.
	if (data.offered_card_ids.length > 0) {
		const lockResult = await lockCardsForEntity(
			userId,
			data.offered_card_ids,
			proposal.id,
			'listing'
		);

		if (!lockResult.success) {
			// Annulation de la proposition. Client service : aucune policy DELETE
			// sur les propositions, la suppression échouait en silence (0 ligne).
			const { data: supprimee, error: suppressionError } = await createServiceRoleClient()
				.from('marketplace_proposals')
				.delete()
				.eq('id', proposal.id)
				.eq('proposer_id', userId)
				.select('id');

			if (suppressionError || !supprimee || supprimee.length === 0) {
				console.error(
					'[marketplace] Proposition non annulée après échec du verrouillage :',
					suppressionError ?? 'aucune ligne supprimée'
				);
			}

			throw error(500, lockResult.error || 'Erreur lors du verrouillage des cartes');
		}
	}

	// Compteur de propositions de l'annonce. Client service : la RLS ne laisse
	// écrire l'annonce qu'à son créateur, la mise à jour par le proposant ne
	// touchait aucune ligne. `.select()` : un refus rend zéro ligne, pas d'erreur.
	const { data: compteur, error: compteurError } = await createServiceRoleClient()
		.from('marketplace_listings')
		.update({
			// `proposal_count` est nullable : une annonce jamais proposée vaut NULL.
			proposal_count: (listing.proposal_count ?? 0) + 1
		})
		.eq('id', listingId)
		.select('id');

	if (compteurError || !compteur || compteur.length === 0) {
		// Compteur d'affichage : son échec ne défait pas la proposition, mais il se voit.
		console.error(
			'[marketplace] proposal_count non mis à jour :',
			compteurError ?? 'aucune ligne modifiée'
		);
	}

	// Offre exacte → acceptation immédiate. La comparaison offre / demande se fait
	// EN BASE, sous verrou de la proposition et de l'annonce : comparer ici puis
	// laisser la base relire la proposition ouvrait une course (le proposant
	// pouvait la modifier entre les deux), et la comparaison par ensemble laissait
	// un seul A couvrir une demande [A, A]. `not_exact` = rien n'a bougé.
	const acceptation = await autoAcceptExactProposal(proposal.id);

	if (acceptation.success) {
		// Notify accepted proposer
		await notifyProposalAccepted(userId, 'Annonce', proposal.id);

		// Proposants refusés PAR cette acceptation seulement (pas ceux refusés plus tôt).
		let refuses: string[];
		try {
			refuses = await proposersRejectedByAcceptance(proposal.id);
		} catch (e) {
			console.error('Lecture impossible :', e);
			throw error(500, 'Impossible de charger les données');
		}

		for (const proposerId of refuses) {
			await notifyProposalRejected(proposerId, 'Annonce', 'Autre proposition acceptée');
		}

		return json(
			{
				...(await enrichWithParticipants(supabase, [proposal]))[0],
				status: 'accepted',
				auto_accepted: true,
				trade_id: acceptation.trade_id
			},
			{ status: 201 }
		);
	}

	// Offre non exacte, annonce occupée (`busy`) ou cartes indisponibles : cas
	// prévus. Tout autre refus est journalisé. Dans tous les cas, rien n'a bougé
	// et la proposition reste en attente comme une proposition ordinaire.
	if (!REFUS_PREVUS.has(acceptation.reason)) {
		console.error('Auto-accept failed:', acceptation.reason, acceptation.error ?? '');
	}

	// Normal flow: notify listing creator about new proposal
	await notifyNewProposal(supabase, listing.creator_id, userId, 'Annonce', proposal.id);

	const [avecProposant] = await enrichWithParticipants(supabase, [proposal]);
	return json(avecProposant, { status: 201 });
};
