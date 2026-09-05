/**
 * SRS Review API - Due Cards
 *
 * GET /api/srs/review/due?deck_id=X[&states=learning,relearning]
 *
 * Refonte 2026-06-10 (Phase 3) : ajout du filtre `states` pour permettre
 * aux sections du deck Programme de lancer une session ciblée
 * (À remédier = states=learning,relearning ; À renforcer = states=review).
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { QuestionInstance } from '$lib/questions/types';
import type { CardState } from '$lib/srs/types';
import type { TemplateMarkdown } from '$lib/ubumark';
import { generateSRSInstance } from '$lib/srs/generator';
import { dueCardsQuerySchema } from '$lib/server/validation/srs';
import { requireAuth } from '$lib/server/middleware/auth';
import { asCardState } from '$lib/srs/types';
import { templateMarkdown } from '$lib/ubumark/types/template';

/**
 * Lightweight stats for API response (subset of CardStats)
 */
interface ReviewCardStats {
	state: CardState;
	difficulty: number;
	stability: number;
	totalReviews: number;
	lastReview: string | null;
	nextReview: string;
}

/**
 * Review card for API response (simplified from $lib/srs/types)
 */
type ReviewCard =
	| {
			cardId: string;
			cardType: 'template';
			templateId: string;
			instance: QuestionInstance;
			stats: ReviewCardStats;
	  }
	| {
			cardId: string;
			cardType: 'custom';
			frontContent: TemplateMarkdown;
			backContent: TemplateMarkdown;
			stats: ReviewCardStats;
	  };

/**
 * GET /api/srs/review/due?deck_id=X
 *
 * Get cards due for review in a specific deck.
 * For template cards, generates a new instance with random seed.
 * For custom cards, returns stored content.
 *
 * Query params:
 * - deck_id (required): Deck ID
 *
 * @returns Array of ReviewCard objects ready for study
 */
export const GET: RequestHandler = async ({ url, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	// ✅ SECURITY: Validate query parameters with Zod (states inclus)
	const queryRaw = {
		deck_id: url.searchParams.get('deck_id'),
		states: url.searchParams.get('states') ?? undefined
	};
	const validation = dueCardsQuerySchema.safeParse(queryRaw);

	if (!validation.success) {
		return json({ error: validation.error.issues[0].message }, { status: 400 });
	}

	const { deck_id: deckId, states } = validation.data;

	// `states` est déjà parsé+validé par Zod (undefined si pas de filtre valide)
	const allowedStates: Set<CardState> | null = states ? new Set(states as CardState[]) : null;

	try {
		// Verify user owns deck
		const { data: deck, error: deckError } = await supabase
			.from('srs_decks')
			.select('id')
			.eq('id', deckId)
			.eq('owner_id', user.id)
			.single();

		if (deckError || !deck) {
			return json({ error: 'Deck not found or access denied' }, { status: 404 });
		}

		// Get due cards using helper function
		console.log(`[SRS] Fetching due cards for user ${user.id}, deck ${deckId}`);
		const { data: dueCards, error: dueCardsError } = await supabase.rpc('get_due_cards_for_deck', {
			p_user_id: user.id,
			p_deck_id: deckId
		});

		if (dueCardsError) {
			console.error('Error fetching due cards:', dueCardsError);
			return json({ error: 'Failed to fetch due cards' }, { status: 500 });
		}

		console.log(`[SRS] RPC returned ${dueCards?.length || 0} due cards`);

		if (!dueCards || dueCards.length === 0) {
			console.log('[SRS] No due cards found - returning empty array');
			return json({ cards: [] });
		}

		// `get_due_cards_for_deck` ne renvoie que
		// (card_id, template_id, card_type, difficulty, stability, state, next_review) :
		// ni `total_reviews`, ni `last_review`. Le code les lisait tout de même sur
		// la ligne du RPC, et l'élève voyait donc des statistiques `undefined`.
		//
		// Ces deux champs vivent dans `srs_card_stats`, indexée par utilisateur et
		// par carte. Une seule requête groupée suffit.
		const { data: statsCartes } = await supabase
			.from('srs_card_stats')
			.select('card_reference_id, total_reviews, last_review')
			.eq('user_id', user.id)
			.in(
				'card_reference_id',
				dueCards.map((c) => c.card_id)
			);

		const statsParCarte = new Map(
			(statsCartes ?? []).map((s) => [
				s.card_reference_id,
				{ totalReviews: s.total_reviews, lastReview: s.last_review }
			])
		);

		// Process each card to prepare ReviewCard objects
		const reviewCards: ReviewCard[] = [];

		console.log('[SRS] Processing due cards...');
		for (const dueCard of dueCards) {
			// Filtre states optionnel (Phase 3 — sections deck Programme)
			if (allowedStates && !allowedStates.has(dueCard.state as CardState)) {
				continue;
			}
			try {
				console.log(`[SRS] Processing card ${dueCard.card_id}, type: ${dueCard.card_type}`);
				if (dueCard.card_type === 'template') {
					// Fetch template and generate instance
					console.log(`[SRS] Fetching template ${dueCard.template_id}`);
					const { data: template, error: templateError } = await supabase
						.from('question_templates')
						.select('*')
						.eq('id', dueCard.template_id)
						.single();

					if (templateError || !template) {
						console.error(
							`[SRS] Template ${dueCard.template_id} not found for card ${dueCard.card_id}:`,
							templateError
						);
						continue;
					}

					console.log(`[SRS] Generating instance for template ${dueCard.template_id}`);
					// Generate new instance with random seed
					const result = generateSRSInstance(template);

					if (!result.success) {
						console.error(
							`[SRS] Failed to generate instance for template ${dueCard.template_id}:`,
							result.errors // TypeScript now knows result.errors exists when success is false
						);
						continue;
					}

					reviewCards.push({
						cardId: dueCard.card_id,
						cardType: 'template',
						templateId: dueCard.template_id,
						instance: result.instance,
						stats: {
							state: asCardState(dueCard.state),
							difficulty: dueCard.difficulty,
							stability: dueCard.stability,
							totalReviews: statsParCarte.get(dueCard.card_id)?.totalReviews ?? 0,
							lastReview: statsParCarte.get(dueCard.card_id)?.lastReview ?? null,
							nextReview: dueCard.next_review
						}
					});
					console.log(`[SRS] ✓ Template card added to review session`);
				} else {
					// Custom card - fetch from srs_cards to get content
					const { data: customCard, error: customCardError } = await supabase
						.from('srs_cards')
						.select('front_content, back_content')
						.eq('id', dueCard.card_id)
						.single();

					if (customCardError || !customCard) {
						console.error(`Custom card ${dueCard.card_id} not found`);
						continue;
					}

					// Custom card - use stored content
					reviewCards.push({
						cardId: dueCard.card_id,
						cardType: 'custom',
						// `front_content` / `back_content` sont nullables en base ; le type
						// métier est une chaîne marquée. Une carte sans contenu devient vide.
						frontContent: templateMarkdown(customCard.front_content ?? ''),
						backContent: templateMarkdown(customCard.back_content ?? ''),
						stats: {
							state: asCardState(dueCard.state),
							difficulty: dueCard.difficulty,
							stability: dueCard.stability,
							totalReviews: statsParCarte.get(dueCard.card_id)?.totalReviews ?? 0,
							lastReview: statsParCarte.get(dueCard.card_id)?.lastReview ?? null,
							nextReview: dueCard.next_review
						}
					});
				}
			} catch (error) {
				console.error(`Error processing card ${dueCard.card_id}:`, error);
				// Skip this card and continue with others
				continue;
			}
		}

		console.log(`[SRS] Returning ${reviewCards.length} review cards to client`);
		return json({ cards: reviewCards });
	} catch (error) {
		console.error('Unexpected error in GET /api/srs/review/due:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
