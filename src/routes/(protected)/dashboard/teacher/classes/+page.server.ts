/**
 * Teacher Classes Page - Server-Side Logic
 * ==========================================
 *
 * Handles data loading and form actions for the teacher class schedule system.
 *
 * FEATURES:
 * - Load teacher's classes with student counts
 * - Load schedule entries for each class
 * - Create, update, and delete schedule entries
 * - Security: Verify teacher ownership before modifications
 *
 * ROUTES:
 * - Load: GET /dashboard/teacher/classes
 * - Actions: POST /dashboard/teacher/classes?/createScheduleEntry
 *           POST /dashboard/teacher/classes?/updateScheduleEntry
 *           POST /dashboard/teacher/classes?/deleteScheduleEntry
 */

import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Class, ClassSchedule, School } from '$lib/types/database';
import { getTeacherClassesWithCounts } from '$lib/server/students';

/**
 * Extended class type with additional computed data
 * Combines class info with student count and schedule entries
 */
interface ClassWithData extends Class {
	student_count: number;
	schedules: ClassSchedule[];
}

/**
 * Load function - Fetches teacher's classes with student counts and schedules
 *
 * PROCESS:
 * 1. Verify user is authenticated and has teacher role
 * 2. Fetch all active classes owned by this teacher
 * 3. For each class, fetch:
 *    - Student count from class_members table
 *    - Schedule entries from class_schedules table
 * 4. Return enriched class data with counts and schedules
 *
 * RETURNS:
 * {
 *   classes: ClassWithData[] - Array of classes with student_count and schedules
 * }
 */
export const load: PageServerLoad = async ({ parent, locals: { supabase } }) => {
	// Get user and profile from parent (protected) layout
	const { user, profile } = await parent();

	if (!user || !profile) {
		throw error(401, 'Unauthorized');
	}

	// Verify user is a teacher (not student or admin accessing this route)
	if (profile.role !== 'teacher') {
		throw error(403, 'Only teachers can access this page');
	}

	// Use unified helper to fetch classes with counts and schedules
	// Automatically handles test mode filtering
	const classesWithData = await getTeacherClassesWithCounts(user.id, supabase);

	// Fetch school timetable (needed for period selection in schedule modal)
	let school: School | null = null;
	if (profile.school_id) {
		const { data: schoolData, error: schoolError } = await supabase
			.from('schools')
			.select('*')
			.eq('id', profile.school_id)
			.single();

		if (schoolError) {
			console.error('Error loading school:', schoolError);
		} else {
			school = schoolData;
		}
	}

	return {
		classes: classesWithData,
		school
	};
};

/**
 * Form Actions
 * =============
 *
 * Handles CRUD operations for schedule entries with security validation
 */
export const actions: Actions = {
	/**
	 * Create new schedule entry
	 *
	 * SECURITY:
	 * - Verifies user is authenticated
	 * - Validates day_of_week is 0-4 (Sunday-Thursday)
	 * - Confirms teacher owns the class before creating entry
	 *
	 * PROCESS:
	 * 1. Extract form data (class_id, day_of_week, times, optional fields)
	 * 2. Validate required fields and day range
	 * 3. Verify class ownership
	 * 4. Insert new schedule entry into database
	 */
	createScheduleEntry: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const classId = formData.get('class_id') as string;
		const dayOfWeek = parseInt(formData.get('day_of_week') as string, 10);
		const periodNumber = parseInt(formData.get('period_number') as string, 10);
		const startTime = formData.get('start_time') as string;
		const endTime = formData.get('end_time') as string;
		const subject = formData.get('subject') as string;
		const room = formData.get('room') as string;
		const notes = formData.get('notes') as string;

		// Validate required fields
		if (!classId || isNaN(dayOfWeek) || !startTime || !endTime) {
			return fail(400, { message: 'Missing required fields' });
		}

		// Validate day of week (0-4 for Sunday-Thursday)
		if (dayOfWeek < 0 || dayOfWeek > 4) {
			return fail(400, { message: 'Invalid day of week' });
		}

		// Verify teacher owns this class
		const { data: classData, error: classError } = await supabase
			.from('classes')
			.select('teacher_id')
			.eq('id', classId)
			.single();

		if (classError || !classData) {
			return fail(404, { message: 'Class not found' });
		}

		if (classData.teacher_id !== user.id) {
			return fail(403, { message: 'You do not own this class' });
		}

		// Insert schedule entry
		const { error: insertError } = await supabase.from('class_schedules').insert({
			class_id: classId,
			teacher_id: user.id,
			day_of_week: dayOfWeek,
			period_number: periodNumber,
			start_time: startTime,
			end_time: endTime,
			subject: subject || null,
			room: room || null,
			notes: notes || null
		});

		if (insertError) {
			console.error('Error creating schedule entry:', insertError);
			return fail(500, { message: 'Failed to create schedule entry' });
		}

		return { success: true, message: 'Créneau créé avec succès' };
	},

	/**
	 * Update existing schedule entry
	 *
	 * SECURITY:
	 * - Verifies user is authenticated
	 * - Validates day_of_week is 0-4 (Sunday-Thursday)
	 * - Confirms teacher owns the schedule entry before updating
	 *
	 * PROCESS:
	 * 1. Extract form data (id, day_of_week, times, optional fields)
	 * 2. Validate required fields and day range
	 * 3. Verify schedule entry ownership
	 * 4. Update schedule entry in database
	 */
	updateScheduleEntry: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;
		const dayOfWeek = parseInt(formData.get('day_of_week') as string, 10);
		const periodNumber = parseInt(formData.get('period_number') as string, 10);
		const startTime = formData.get('start_time') as string;
		const endTime = formData.get('end_time') as string;
		const subject = formData.get('subject') as string;
		const room = formData.get('room') as string;
		const notes = formData.get('notes') as string;

		// Validate required fields
		if (!id || isNaN(dayOfWeek) || !startTime || !endTime) {
			return fail(400, { message: 'Missing required fields' });
		}

		// Validate day of week
		if (dayOfWeek < 0 || dayOfWeek > 4) {
			return fail(400, { message: 'Invalid day of week' });
		}

		// Verify teacher owns this schedule entry
		const { data: scheduleData, error: scheduleError } = await supabase
			.from('class_schedules')
			.select('teacher_id')
			.eq('id', id)
			.single();

		if (scheduleError || !scheduleData) {
			return fail(404, { message: 'Schedule entry not found' });
		}

		if (scheduleData.teacher_id !== user.id) {
			return fail(403, { message: 'You do not own this schedule entry' });
		}

		// Update schedule entry
		const { error: updateError } = await supabase
			.from('class_schedules')
			.update({
				day_of_week: dayOfWeek,
				period_number: periodNumber,
				start_time: startTime,
				end_time: endTime,
				subject: subject || null,
				room: room || null,
				notes: notes || null
			})
			.eq('id', id);

		if (updateError) {
			console.error('Error updating schedule entry:', updateError);
			return fail(500, { message: 'Failed to update schedule entry' });
		}

		return { success: true, message: 'Créneau modifié avec succès' };
	},

	/**
	 * Delete schedule entry
	 *
	 * SECURITY:
	 * - Verifies user is authenticated
	 * - Confirms teacher owns the schedule entry before deletion
	 *
	 * PROCESS:
	 * 1. Extract schedule entry ID from form data
	 * 2. Verify schedule entry ownership
	 * 3. Delete entry from database (cascades automatically)
	 */
	deleteScheduleEntry: async ({ request, locals: { safeGetSession, supabase } }) => {
		const { user } = await safeGetSession();

		if (!user) {
			return fail(401, { message: 'Unauthorized' });
		}

		const formData = await request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { message: 'Missing schedule entry ID' });
		}

		// Verify teacher owns this schedule entry
		const { data: scheduleData, error: scheduleError } = await supabase
			.from('class_schedules')
			.select('teacher_id')
			.eq('id', id)
			.single();

		if (scheduleError || !scheduleData) {
			return fail(404, { message: 'Schedule entry not found' });
		}

		if (scheduleData.teacher_id !== user.id) {
			return fail(403, { message: 'You do not own this schedule entry' });
		}

		// Delete schedule entry
		const { error: deleteError } = await supabase.from('class_schedules').delete().eq('id', id);

		if (deleteError) {
			console.error('Error deleting schedule entry:', deleteError);
			return fail(500, { message: 'Failed to delete schedule entry' });
		}

		return { success: true, message: 'Créneau supprimé avec succès' };
	}
};
