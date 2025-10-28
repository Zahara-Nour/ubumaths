/**
 * Teacher - Assign SRS Deck (Server)
 * ===================================
 *
 * Load deck, students, and classes for assignment.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getTeacherTestMode } from '$lib/server/test-mode';
import { getTeacherClassesWithCounts } from '$lib/server/students';

export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { user } = await safeGetSession();

	if (!user) {
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

		// Get test mode to filter students
		const isTestMode = await getTeacherTestMode(user.id, supabase);

		// Fetch teacher's students filtered by test mode
		const { data: students, error: studentsError } = await supabase
			.from('profiles')
			.select('id, firstname, lastname, email, role, is_test')
			.eq('role', 'student')
			.eq('is_test', isTestMode)
			.order('lastname');

		if (studentsError) {
			console.error('Error fetching students:', studentsError);
		}

		console.log('Students found:', students?.length || 0);

		// Use unified helper to get classes with student counts
		// Automatically handles test mode filtering
		const classesWithCounts = await getTeacherClassesWithCounts(user.id, supabase);

		// Map students to match expected format
		const mappedStudents = (students || []).map((s) => ({
			id: s.id,
			first_name: s.firstname,
			last_name: s.lastname,
			email: s.email
		}));

		return {
			deck: mappedDeck,
			students: mappedStudents,
			classes: classesWithCounts
		};
	} catch (err) {
		console.error('Error in assign page load:', err);
		throw error(500, 'Internal server error');
	}
};
