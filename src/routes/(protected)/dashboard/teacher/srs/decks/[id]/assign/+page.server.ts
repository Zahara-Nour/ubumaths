/**
 * Teacher - Assign SRS Deck (Server)
 * ===================================
 *
 * Load deck, students, and classes for assignment.
 */

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getAssignmentTargets } from '$lib/server/students';

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

		// Use unified helper to get classes with students
		// Automatically handles test mode filtering
		const classesWithStudents = await getAssignmentTargets(user.id, supabase);

		// Format classes with student counts for UI
		const classesWithCounts = classesWithStudents.map((c) => ({
			id: c.id,
			name: c.name,
			description: c.description,
			student_count: c.students.length,
			schedules: [] // Not needed for assignment page
		}));

		// Extract unique students across all classes
		const studentsMap = new Map<
			string,
			{
				id: string;
				first_name: string;
				last_name: string | null;
				email: string;
			}
		>();

		classesWithStudents.forEach((cls) => {
			cls.students.forEach((student) => {
				if (!studentsMap.has(student.id)) {
					studentsMap.set(student.id, {
						id: student.id,
						first_name: student.firstname,
						last_name: student.lastname,
						email: '' // Email not available in StudentFull type
					});
				}
			});
		});

		const mappedStudents = Array.from(studentsMap.values());

		console.log('Students found:', mappedStudents.length);

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
