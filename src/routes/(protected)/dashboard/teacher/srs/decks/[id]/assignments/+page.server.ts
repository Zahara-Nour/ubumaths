/**
 * Teacher - View Deck Assignments (Server)
 * =========================================
 *
 * Load deck assignment details and student list.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	if (!user || !session) {
		throw error(401, 'Unauthorized');
	}

	const { id: deckId } = params;

	try {
		// Fetch deck details
		const { data: deck, error: deckError } = await supabase
			.from('srs_decks')
			.select('*')
			.eq('id', deckId)
			.eq('owner_id', user.id)
			.single();

		if (deckError || !deck) {
			console.error('Error fetching deck:', deckError);
			throw error(404, 'Deck not found');
		}

		// Map deck to camelCase
		const mappedDeck = {
			id: deck.id,
			name: deck.name,
			description: deck.description,
			ownerId: deck.owner_id,
			deckType: deck.deck_type,
			isAssigned: deck.is_assigned,
			config: deck.config,
			createdAt: deck.created_at,
			updatedAt: deck.updated_at
		};

		// Fetch assignments for this deck
		const { data: assignments, error: assignmentsError } = await supabase
			.from('srs_deck_assignments')
			.select('*')
			.eq('source_deck_id', deckId)
			.order('assigned_at', { ascending: false });

		if (assignmentsError) {
			console.error('Error fetching assignments:', assignmentsError);
		}

		// Get student details and their deck copies
		const assignmentsWithDetails = await Promise.all(
			(assignments || []).map(async (assignment) => {
				// Get student profile
				const { data: student } = await supabase
					.from('profiles')
					.select('id, firstname, lastname, email, avatar_url')
					.eq('id', assignment.assigned_to)
					.single();

				// Check if student has the deck copy
				// Look for any assigned deck with the same name for this student
				const { data: studentDecks, error: studentDeckError } = await supabase
					.from('srs_decks')
					.select('id, name, created_at')
					.eq('owner_id', assignment.assigned_to)
					.eq('is_assigned', true)
					.eq('name', deck.name)
					.order('created_at', { ascending: false })
					.limit(1);

				if (studentDeckError) {
					console.error('Error fetching student deck:', studentDeckError);
				}

				const studentDeck = studentDecks && studentDecks.length > 0 ? studentDecks[0] : null;
				console.log(
					`Student ${assignment.assigned_to}: deck found = ${studentDeck ? 'YES' : 'NO'}`,
					studentDeck?.id
				);

				// Get stats for student's deck if it exists
				let deckStats = null;
				if (studentDeck) {
					const { data: stats } = await supabase.rpc('get_deck_stats', {
						p_user_id: assignment.assigned_to,
						p_deck_id: studentDeck.id
					});

					deckStats = stats?.[0] || null;
				}

				return {
					id: assignment.id,
					assignedTo: assignment.assigned_to,
					assignedBy: assignment.assigned_by,
					assignedAt: assignment.assigned_at,
					assignmentType: assignment.assignment_type,
					student: student
						? {
								id: student.id,
								firstName: student.firstname,
								lastName: student.lastname,
								email: student.email,
								avatarUrl: student.avatar_url
							}
						: null,
					studentDeck: studentDeck
						? {
								id: studentDeck.id,
								name: studentDeck.name,
								createdAt: studentDeck.created_at,
								stats: deckStats
							}
						: null
				};
			})
		);

		return {
			deck: mappedDeck,
			assignments: assignmentsWithDetails
		};
	} catch (err) {
		console.error('Error in assignments page load:', err);
		throw error(500, 'Internal server error');
	}
};
