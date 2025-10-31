/**
 * SRS Review API - Submit Review
 * ===============================
 *
 * Submit a review result and update FSRS stats.
 *
 * Endpoint:
 * - POST /api/srs/review/submit
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { CardStats } from '$lib/srs/types';
import { FSRS } from '$lib/srs/fsrs';
import { DEFAULT_FSRS_PARAMS } from '$lib/srs/config';
import { submitReviewSchema } from '$lib/server/validation/srs';
import { requireAuth } from '$lib/server/middleware/auth';

/**
 * POST /api/srs/review/submit
 *
 * Submit a review result and update card statistics using FSRS algorithm.
 *
 * Body:
 * {
 *   cardId: string,
 *   deckId: string,
 *   grade: 1 | 2 | 3 | 4,
 *   timeSpent?: number (seconds)
 * }
 *
 * Grades:
 * - 1 (Again): Complete blackout, wrong response
 * - 2 (Hard): Correct response with serious difficulty
 * - 3 (Good): Correct response with some hesitation
 * - 4 (Easy): Perfect response
 *
 * @returns Updated card statistics and next review date
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireAuth(locals);
	const supabase = locals.supabase;

	try {
		// ✅ SECURITY: Validate input with Zod
		const bodyRaw = await request.json();
		const validation = submitReviewSchema.safeParse(bodyRaw);

		if (!validation.success) {
			return json({ error: validation.error.issues[0].message }, { status: 400 });
		}

		const body = validation.data;
		console.log('[SRS Submit] Received review:', body);

		// Get card to determine type and reference
		console.log('[SRS Submit] Fetching card:', body.cardId);
		const { data: card, error: cardError } = await supabase
			.from('srs_cards')
			.select('*')
			.eq('id', body.cardId)
			.single();

		if (cardError || !card) {
			console.error('[SRS Submit] Card not found:', cardError);
			return json({ error: 'Card not found' }, { status: 404 });
		}

		console.log('[SRS Submit] Card found:', card.card_type, card.template_id || card.id);

		// Verify card belongs to deck
		if (card.deck_id !== body.deckId) {
			return json({ error: 'Card does not belong to specified deck' }, { status: 400 });
		}

		// Verify user owns deck
		const { data: deck, error: deckError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('id', body.deckId)
			.eq('owner_id', user.id)
			.single();

		if (deckError || !deck) {
			return json({ error: 'Deck not found or access denied' }, { status: 404 });
		}

		// Determine card reference
		const cardReferenceType = card.card_type as 'template' | 'custom';
		const cardReferenceId = card.card_type === 'template' ? card.template_id : card.id;

		if (!cardReferenceId) {
			console.error('[SRS Submit] Invalid card reference');
			return json({ error: 'Invalid card reference' }, { status: 400 });
		}

		console.log('[SRS Submit] Card reference:', cardReferenceType, cardReferenceId);

		// Get or initialize stats
		let stats: CardStats;

		console.log('[SRS Submit] Fetching existing stats...');
		const { data: existingStats, error: statsError } = await supabase
			.from('srs_card_stats')
			.select('*')
			.eq('user_id', user.id)
			.eq('card_reference_type', cardReferenceType)
			.eq('card_reference_id', cardReferenceId)
			.single();

		if (statsError && statsError.code !== 'PGRST116') {
			console.error('[SRS Submit] Error fetching stats:', statsError);
		}

		if (existingStats) {
			// Convert database format to CardStats
			console.log('[SRS Submit] Existing stats found');
			stats = {
				id: existingStats.id,
				userId: existingStats.user_id,
				cardReferenceType: existingStats.card_reference_type,
				cardReferenceId: existingStats.card_reference_id,
				difficulty: existingStats.difficulty,
				stability: existingStats.stability,
				state: existingStats.state,
				lastReview: existingStats.last_review,
				nextReview: existingStats.next_review,
				totalReviews: existingStats.total_reviews,
				reviewHistory: existingStats.review_history || [],
				createdAt: existingStats.created_at,
				updatedAt: existingStats.updated_at
			};
		} else {
			// Initialize new card stats
			console.log('[SRS Submit] No existing stats, initializing new');
			const now = new Date().toISOString();
			stats = {
				id: crypto.randomUUID(),
				userId: user.id,
				cardReferenceType,
				cardReferenceId,
				difficulty: 5.0,
				stability: 0.1,
				state: 'new',
				lastReview: null,
				nextReview: now,
				totalReviews: 0,
				reviewHistory: [],
				createdAt: now,
				updatedAt: now
			};
		}

		// Use FSRS to calculate new stats
		console.log('[SRS Submit] Calculating new stats with FSRS...');
		const fsrs = new FSRS(
			deck.config.parameters || DEFAULT_FSRS_PARAMS,
			deck.config.desiredRetention || 0.9,
			deck.config.maximumInterval || 36500
		);
		const updatedStats = fsrs.reviewCard(stats, body.grade, body.timeSpent);
		console.log('[SRS Submit] New stats calculated:', updatedStats.state, updatedStats.nextReview);

		// Upsert stats to database
		console.log('[SRS Submit] Upserting stats to database...');
		const { error: upsertError } = await supabase.from('srs_card_stats').upsert({
			id: stats.id, // Use original stats.id (preserved by reviewCard spread operator)
			user_id: updatedStats.userId,
			card_reference_type: updatedStats.cardReferenceType,
			card_reference_id: updatedStats.cardReferenceId,
			difficulty: updatedStats.difficulty,
			stability: updatedStats.stability,
			state: updatedStats.state,
			last_review: updatedStats.lastReview,
			next_review: updatedStats.nextReview,
			total_reviews: updatedStats.totalReviews,
			review_history: updatedStats.reviewHistory
		});

		if (upsertError) {
			console.error('Error upserting card stats:', upsertError);
			return json({ error: 'Failed to update card statistics' }, { status: 500 });
		}

		// Update or create review session
		// Check if there's an active session today
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const todayStr = today.toISOString();

		const { data: existingSession } = await supabase
			.from('srs_review_sessions')
			.select('*')
			.eq('user_id', user.id)
			.eq('deck_id', body.deckId)
			.gte('created_at', todayStr)
			.order('created_at', { ascending: false })
			.limit(1)
			.single();

		const isCorrect = body.grade >= 3; // Good or Easy
		const timeSpent = body.timeSpent || 0;

		if (existingSession) {
			// Update existing session
			await supabase
				.from('srs_review_sessions')
				.update({
					cards_reviewed: existingSession.cards_reviewed + 1,
					correct_count: existingSession.correct_count + (isCorrect ? 1 : 0),
					total_time: existingSession.total_time + timeSpent
				})
				.eq('id', existingSession.id);
		} else {
			// Create new session
			await supabase.from('srs_review_sessions').insert({
				user_id: user.id,
				deck_id: body.deckId,
				cards_reviewed: 1,
				correct_count: isCorrect ? 1 : 0,
				total_time: timeSpent
			});
		}

		return json({
			success: true,
			stats: {
				difficulty: updatedStats.difficulty,
				stability: updatedStats.stability,
				state: updatedStats.state,
				nextReview: updatedStats.nextReview,
				totalReviews: updatedStats.totalReviews
			}
		});
	} catch (error) {
		console.error('Unexpected error in POST /api/srs/review/submit:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
