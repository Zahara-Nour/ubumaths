/**
 * SRS Deck Assignment API
 * ========================
 *
 * Assign deck to students or class.
 * Creates a COPY of the deck for each student.
 *
 * Endpoint:
 * - POST /api/srs/decks/[id]/assign
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { AssignDeckRequest } from '$lib/srs/types';
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { SUPABASE_SERVICE_ROLE_KEY } from '$env/static/private';

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
export const POST: RequestHandler = async ({
	params,
	request,
	locals: { supabase, safeGetSession }
}) => {
	const { session, user } = await safeGetSession();

	if (!user || !session) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const { id: deckId } = params;

	try {
		// Check if user is teacher or admin
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || (profile.role !== 'teacher' && profile.role !== 'admin')) {
			return json(
				{ error: 'Forbidden. Only teachers can assign decks.' },
				{ status: 403 }
			);
		}

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

		const body = (await request.json()) as AssignDeckRequest;

		// Validate request
		if (!body.targetType || !['student', 'class'].includes(body.targetType)) {
			return json({ error: 'Invalid target type' }, { status: 400 });
		}

		if (!body.targetIds || !Array.isArray(body.targetIds) || body.targetIds.length === 0) {
			return json({ error: 'At least one target ID is required' }, { status: 400 });
		}

		// Get target student IDs
		let studentIds: string[] = [];

		if (body.targetType === 'student') {
			studentIds = body.targetIds;
			console.log('Assigning to individual students:', studentIds);
		} else {
			// Get all students in classes
			console.log('Assigning to classes:', body.targetIds);
			for (const classId of body.targetIds) {
				const { data: members, error: membersError } = await supabase
					.from('class_members')
					.select('student_id')
					.eq('class_id', classId);

				console.log(`Class ${classId}: found ${members?.length || 0} members`);
				if (membersError) {
					console.error(`Error fetching members for class ${classId}:`, membersError);
				}

				if (members) {
					studentIds.push(...members.map((m) => m.student_id));
				}
			}

			// Remove duplicates
			studentIds = [...new Set(studentIds)];
			console.log('Total unique students to assign:', studentIds.length);
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

		const results = {
			successCount: 0,
			failedStudents: [] as string[],
			createdDecks: [] as string[]
		};

		// Create admin client to bypass RLS for deck assignment
		const adminClient = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});

		// Create deck copy for each student
		console.log('Creating deck copies for', studentIds.length, 'students');
		for (const studentId of studentIds) {
			try {
				console.log(`Creating deck copy for student ${studentId}...`);
				// Create deck copy (marked as assigned) - using admin client to bypass RLS
				const { data: newDeck, error: createDeckError } = await adminClient
					.from('srs_decks')
					.insert({
						name: sourceDeck.name,
						description: sourceDeck.description,
						owner_id: studentId,
						deck_type: sourceDeck.deck_type,
						is_assigned: true, // Mark as assigned (read-only)
						config: sourceDeck.config
					})
					.select()
					.single();

				if (createDeckError || !newDeck) {
					console.error(`Failed to create deck for student ${studentId}:`, createDeckError);
					results.failedStudents.push(studentId);
					continue;
				}

				console.log(`✓ Deck copy created for student ${studentId}: ${newDeck.id}`);

				// Copy all cards to new deck - using admin client
				if (sourceCards && sourceCards.length > 0) {
					const cardCopies = sourceCards.map((card) => ({
						deck_id: newDeck.id,
						card_type: card.card_type,
						template_id: card.template_id,
						front_content: card.front_content,
						back_content: card.back_content
					}));

					const { data: insertedCards, error: cardsError } = await adminClient
						.from('srs_cards')
						.insert(cardCopies)
						.select('id, card_type, template_id');

					if (cardsError) {
						console.error(`Failed to copy cards for student ${studentId}:`, cardsError);
						// Rollback: Delete deck using admin client
						await adminClient.from('srs_decks').delete().eq('id', newDeck.id);
						results.failedStudents.push(studentId);
						continue;
					}

					// Create initial card stats for each card (so they show up in reviews)
					if (insertedCards) {
						console.log(`Creating initial stats for ${insertedCards.length} cards...`);
						const now = new Date().toISOString();

						const statsToCreate = insertedCards.map((card) => ({
							user_id: studentId,
							card_reference_type: card.card_type,
							card_reference_id: card.card_type === 'template' ? card.template_id : card.id,
							difficulty: 5.0, // Default difficulty (FSRS default)
							stability: 0.1, // Very short initial stability (new card)
							state: 'new',
							last_review: null,
							next_review: now, // Available immediately
							total_reviews: 0,
							review_history: []
						}));

						const { error: statsError } = await adminClient
							.from('srs_card_stats')
							.insert(statsToCreate);

						if (statsError) {
							console.error(`Failed to create card stats for student ${studentId}:`, statsError);
							// Continue anyway - cards exist, just without stats
						} else {
							console.log(`✓ Created ${statsToCreate.length} card stats for student ${studentId}`);
						}
					}
				}

				// Create assignment record - using admin client
				await adminClient.from('srs_deck_assignments').insert({
					source_deck_id: deckId,
					assigned_by: user.id,
					assigned_to: studentId,
					assignment_type: 'student'
				});

				results.successCount++;
				results.createdDecks.push(newDeck.id);
			} catch (error) {
				console.error(`Error assigning deck to student ${studentId}:`, error);
				results.failedStudents.push(studentId);
			}
		}

		// Mark source deck as assigned if assignment was successful
		if (results.successCount > 0) {
			await supabase
				.from('srs_decks')
				.update({ is_assigned: true })
				.eq('id', deckId);
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
