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
		} else {
			// Get all students in classes
			for (const classId of body.targetIds) {
				const { data: members } = await supabase
					.from('class_members')
					.select('student_id')
					.eq('class_id', classId);

				if (members) {
					studentIds.push(...members.map((m) => m.student_id));
				}
			}

			// Remove duplicates
			studentIds = [...new Set(studentIds)];
		}

		if (studentIds.length === 0) {
			return json({ error: 'No students found for assignment' }, { status: 400 });
		}

		// Get all cards from source deck
		const { data: sourceCards } = await supabase
			.from('srs_cards')
			.select('*')
			.eq('deck_id', deckId);

		const results = {
			successCount: 0,
			failedStudents: [] as string[],
			createdDecks: [] as string[]
		};

		// Create deck copy for each student
		for (const studentId of studentIds) {
			try {
				// Create deck copy (marked as assigned)
				const { data: newDeck, error: createDeckError } = await supabase
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

				// Copy all cards to new deck
				if (sourceCards && sourceCards.length > 0) {
					const cardCopies = sourceCards.map((card) => ({
						deck_id: newDeck.id,
						card_type: card.card_type,
						template_id: card.template_id,
						front_content: card.front_content,
						back_content: card.back_content
					}));

					const { error: cardsError } = await supabase.from('srs_cards').insert(cardCopies);

					if (cardsError) {
						console.error(`Failed to copy cards for student ${studentId}:`, cardsError);
						// Rollback: Delete deck
						await supabase.from('srs_decks').delete().eq('id', newDeck.id);
						results.failedStudents.push(studentId);
						continue;
					}
				}

				// Create assignment record
				await supabase.from('srs_deck_assignments').insert({
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
