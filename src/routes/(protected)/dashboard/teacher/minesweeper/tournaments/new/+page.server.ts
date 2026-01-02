/**
 * New Tournament Page - Server-Side Logic
 * =========================================
 *
 * Loads the teacher's classes for tournament creation.
 */

import { redirect, error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getTeacherClassesWithCounts } from '$lib/server/students';

export interface ClassForTournament {
	id: string;
	name: string;
	student_count: number;
}

export interface NewTournamentPageData {
	classes: ClassForTournament[];
}

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw redirect(303, '/auth/signin');
	}

	// Verify user is a teacher
	const { data: profileData, error: profileError } = await locals.supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (profileError || !profileData) {
		throw error(403, 'Profil non trouve');
	}

	if (profileData.role !== 'teacher') {
		throw redirect(303, '/dashboard');
	}

	// Fetch teacher's classes
	const classesWithData = await getTeacherClassesWithCounts(user.id, locals.supabase);

	// Map to simpler format for the form
	const classes: ClassForTournament[] = classesWithData.map((c) => ({
		id: c.id,
		name: c.name,
		student_count: c.student_count
	}));

	return {
		classes
	};
};
