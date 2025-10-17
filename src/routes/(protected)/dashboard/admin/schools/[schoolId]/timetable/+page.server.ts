import { error, fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { SchoolTimetable } from '$lib/types/database';
import { validateTimetable } from '$lib/utils/timetable';

export const load: PageServerLoad = async ({ params, locals: { supabase, safeGetSession } }) => {
	const { session, user } = await safeGetSession();

	if (!session) {
		throw redirect(303, '/login');
	}

	// Get user profile to check if admin
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Only admins can manage school timetables');
	}

	// Fetch school data
	const { data: school, error: schoolError } = await supabase
		.from('schools')
		.select('*')
		.eq('id', params.schoolId)
		.single();

	if (schoolError || !school) {
		throw error(404, 'School not found');
	}

	return {
		school
	};
};

export const actions = {
	/**
	 * Update school timetable
	 * Validates periods and saves to database
	 */
	updateTimetable: async ({ request, params, locals: { supabase, safeGetSession } }) => {
		const { session, user } = await safeGetSession();

		if (!session) {
			return fail(401, { message: 'Not authenticated' });
		}

		// Verify admin role
		const { data: profile } = await supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (!profile || profile.role !== 'admin') {
			return fail(403, { message: 'Only admins can update timetables' });
		}

		const formData = await request.formData();
		const timetableJson = formData.get('timetable') as string;

		if (!timetableJson) {
			return fail(400, { message: 'Timetable data is required' });
		}

		let timetable: SchoolTimetable;
		try {
			timetable = JSON.parse(timetableJson);
		} catch {
			return fail(400, { message: 'Invalid timetable JSON' });
		}

		// Validate timetable
		const validation = validateTimetable(timetable.periods);
		if (!validation.valid) {
			return fail(400, {
				message: 'Timetable validation failed',
				errors: validation.errors
			});
		}

		// Update school timetable
		const { error: updateError } = await supabase
			.from('schools')
			.update({ timetable })
			.eq('id', params.schoolId);

		if (updateError) {
			console.error('Error updating timetable:', updateError);
			return fail(500, { message: 'Failed to update timetable' });
		}

		return { success: true };
	}
} satisfies Actions;
