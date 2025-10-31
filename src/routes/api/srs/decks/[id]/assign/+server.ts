/**
 * SRS Deck Assignment API
 * ========================
 *
 * Assign deck to students or class.
 * Creates a COPY of the deck for each student.
 *
 * Endpoint:
 * - POST /api/srs/decks/[id]/assign
 *
 * Performance Optimization:
 * - Uses batch operations to reduce N+1 query problem
 * - Queries: ~6 total (vs. ~63 for N=20 students)
 *   1. Fetch class members (1 query with .in())
 *   2. Fetch source cards (1 query)
 *   3. Batch-insert decks (1 query)
 *   4. Batch-insert cards (1 query)
 *   5. Batch-insert stats (1 query)
 *   6. Batch-insert assignments (1 query)
 * - 90%+ reduction in database queries
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';
import { assignDeckSchema, uuidParamSchema } from '$lib/server/validation/srs';
import { requireRole } from '$lib/server/middleware/auth';

/**
 * POST /api/srs/decks/[id]/assign
 *
 * Assign deck to students or entire class.
 * Creates a copy of the deck for each target student.
 *
 * Body:
 * {
 *   targetType: 'student' | 'class',
 *   targetIds: string[]  // Student IDs or Class IDs
 * }
 *
 * @returns Assignment results
 */
export const POST: RequestHandler = async ({ params, request, locals }) => {
	const { user } = await requireRole(locals, 'teacher');

	// ✅ SECURITY: Validate UUID parameter
	const paramValidation = uuidParamSchema.safeParse(params);
	if (!paramValidation.success) {
		return json({ error: 'Invalid deck ID' }, { status: 400 });
	}

	const { id: deckId } = paramValidation.data;
	const supabase = locals.supabase;

	try {
		// Get source deck
		const { data: sourceDeck, error: deckError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('id', deckId)
			.eq('owner_id', user.id)
			.single();

		if (deckError || !sourceDeck) {
			return json({ error: 'Source deck not found' }, { status: 404 });
		}

		// ✅ SECURITY: Validate input with Zod
		const bodyRaw = await request.json();
		const validation = assignDeckSchema.safeParse(bodyRaw);

		if (!validation.success) {
			return json({ error: validation.error.issues[0].message }, { status: 400 });
		}

		const body = validation.data;

		// ============================================================================
		// OPTIMIZATION: Batch-fetch all student IDs in ONE query
		// ============================================================================
		let studentIds: string[] = [];

		if (body.targetType === 'student') {
			studentIds = body.targetIds;
			console.log('Assigning to individual students:', studentIds.length);
		} else {
			// Batch-fetch all class members in ONE query using .in()
			console.log('Assigning to classes:', body.targetIds.length);
			const { data: members, error: membersError } = await supabase
				.from('class_members')
				.select('student_id')
				.in('class_id', body.targetIds);

			if (membersError) {
				console.error('Error fetching class members:', membersError);
				return json({ error: 'Failed to fetch class members' }, { status: 500 });
			}

			if (!members || members.length === 0) {
				console.error('No students found in specified classes');
				return json({ error: 'No students found in specified classes' }, { status: 400 });
			}

			// Remove duplicates (students in multiple classes)
			studentIds = [...new Set(members.map((m) => m.student_id))];
			console.log(`Total unique students to assign: ${studentIds.length}`);
		}

		if (studentIds.length === 0) {
			console.error('No students found for assignment');
			return json({ error: 'No students found for assignment' }, { status: 400 });
		}

		// Get all cards from source deck
		const { data: sourceCards } = await supabase
			.from('srs_cards')
			.select('*')
			.eq('deck_id', deckId);

		console.log('Source deck has', sourceCards?.length || 0, 'cards');

		// Create admin client to bypass RLS for deck assignment
		const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});

		// ============================================================================
		// OPTIMIZATION: Batch insert all decks, cards, stats, and assignments
		// Instead of 4N queries (1 deck + 1 cards + 1 stats + 1 assignment per student),
		// we use 5 queries total (1 deck batch + 1 cards batch + 1 stats batch + 1 assignments batch + 1 mark source)
		// ============================================================================

		console.log(`Batch-creating ${studentIds.length} deck copies...`);

		// Step 1: Batch-insert all decks for all students (ONE query)
		const decksToCreate = studentIds.map((studentId) => ({
			name: sourceDeck.name,
			description: sourceDeck.description,
			owner_id: studentId,
			deck_type: sourceDeck.deck_type,
			is_assigned: true, // Mark as assigned (read-only)
			config: sourceDeck.config
		}));

		const { data: createdDecks, error: decksError } = await adminClient
			.from('srs_decks')
			.insert(decksToCreate)
			.select('id, owner_id');

		if (decksError || !createdDecks) {
			console.error('Failed to batch-create decks:', decksError);
			return json({ error: 'Failed to create deck copies' }, { status: 500 });
		}

		console.log(`✓ Created ${createdDecks.length} deck copies`);

		// Build mapping: studentId -> deckId for O(1) lookups
		const studentToDeckMap = new Map<string, string>();
		for (const deck of createdDecks) {
			studentToDeckMap.set(deck.owner_id, deck.id);
		}

		// Step 2: Batch-insert all cards for all decks (ONE query)
		const allCardsToCreate: Array<{
			deck_id: string;
			card_type: string;
			template_id: string | null;
			front_content: unknown;
			back_content: unknown;
		}> = [];

		if (sourceCards && sourceCards.length > 0) {
			for (const deck of createdDecks) {
				const cardsForDeck = sourceCards.map((card) => ({
					deck_id: deck.id,
					card_type: card.card_type,
					template_id: card.template_id,
					front_content: card.front_content,
					back_content: card.back_content
				}));
				allCardsToCreate.push(...cardsForDeck);
			}

			console.log(`Batch-inserting ${allCardsToCreate.length} cards...`);

			const { data: insertedCards, error: cardsError } = await adminClient
				.from('srs_cards')
				.insert(allCardsToCreate)
				.select('id, deck_id, card_type, template_id');

			if (cardsError || !insertedCards) {
				console.error('Failed to batch-insert cards:', cardsError);
				// Rollback: Delete all created decks
				await adminClient
					.from('srs_decks')
					.delete()
					.in(
						'id',
						createdDecks.map((d) => d.id)
					);
				return json({ error: 'Failed to copy cards' }, { status: 500 });
			}

			console.log(`✓ Inserted ${insertedCards.length} cards`);

			// Step 3: Batch-insert all card stats (ONE query)
			const now = new Date().toISOString();
			const allStatsToCreate = insertedCards.map((card) => {
				// Find the student who owns this card's deck
				const deckOwnerId = createdDecks.find((d) => d.id === card.deck_id)?.owner_id;

				return {
					user_id: deckOwnerId!,
					card_reference_type: card.card_type,
					card_reference_id: card.card_type === 'template' ? card.template_id : card.id,
					difficulty: 5.0, // Default difficulty (FSRS default)
					stability: 0.1, // Very short initial stability (new card)
					state: 'new',
					last_review: null,
					next_review: now, // Available immediately
					total_reviews: 0,
					review_history: []
				};
			});

			console.log(`Batch-inserting ${allStatsToCreate.length} card stats...`);

			const { error: statsError } = await adminClient
				.from('srs_card_stats')
				.insert(allStatsToCreate);

			if (statsError) {
				console.error('Failed to batch-insert card stats:', statsError);
				// Continue anyway - cards exist, just without stats
				console.warn(
					'Warning: Cards created without stats. Students may not see cards in reviews.'
				);
			} else {
				console.log(`✓ Inserted ${allStatsToCreate.length} card stats`);
			}
		}

		// Step 4: Batch-insert all assignment records (ONE query)
		const assignmentsToCreate = studentIds.map((studentId) => ({
			source_deck_id: deckId,
			assigned_by: user.id,
			assigned_to: studentId,
			assignment_type: 'student' as const
		}));

		console.log(`Batch-inserting ${assignmentsToCreate.length} assignment records...`);

		const { error: assignmentsError } = await adminClient
			.from('srs_deck_assignments')
			.insert(assignmentsToCreate);

		if (assignmentsError) {
			console.error('Failed to batch-insert assignments:', assignmentsError);
			// Continue anyway - decks and cards are created
		} else {
			console.log(`✓ Inserted ${assignmentsToCreate.length} assignment records`);
		}

		const results = {
			successCount: createdDecks.length,
			failedStudents: [] as string[],
			createdDecks: createdDecks.map((d) => d.id)
		};

		// Mark source deck as assigned if assignment was successful
		if (results.successCount > 0) {
			await supabase.from('srs_decks').update({ is_assigned: true }).eq('id', deckId);
		}

		console.log('Assignment complete:', results);
		console.log(`✓ Successfully assigned to ${results.successCount} students`);
		console.log(`✗ Failed for ${results.failedStudents.length} students`);

		return json({
			success: true,
			message: `Deck assigned to ${results.successCount} students`,
			results
		});
	} catch (error) {
		console.error('Unexpected error in POST /api/srs/decks/[id]/assign:', error);
		return json({ error: 'Internal server error' }, { status: 500 });
	}
};
