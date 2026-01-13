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
import type { Database } from '$lib/types/database';
import { getTeacherClassesWithCounts } from '$lib/server/students';
import { getTeacherTestMode } from '$lib/server/test-mode';

type School = Database['public']['Tables']['schools']['Row'];

/**
 * Student with email status for welcome email feature
 */
export interface StudentWithEmailStatus {
	id: string;
	firstname: string;
	lastname: string | null;
	email: string | null;
	avatar_url: string | null;
	welcomeEmailSentAt: string | null;
}
import {
	validateFormData,
	createScheduleEntrySchema,
	updateScheduleEntrySchema,
	deleteScheduleEntrySchema
} from '$lib/server/validation';
import { requireRole } from '$lib/server/middleware/auth';
import { z } from 'zod';
import { formDataTransforms } from '$lib/server/validation/common';

/**
 * Schema for associating a Google Classroom course with a class
 */
const associateCourseSchema = z.object({
	classId: formDataTransforms.uuid,
	courseId: formDataTransforms.optionalString.pipe(
		z
			.string()
			.nullable()
			.refine((val) => val === null || z.string().uuid().safeParse(val).success, {
				message: 'UUID invalide'
			})
	)
});

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
export const load: PageServerLoad = async ({ locals }) => {
	// Get user and profile from locals (loaded in hooks.server.ts)
	const { user, profile, supabase } = locals;

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

	// Get teacher's test mode preference
	const isTestMode = await getTeacherTestMode(user.id, supabase);

	// Fetch students for all classes in batch (avoids N+1 queries)
	const classStudentsMap: Record<string, StudentWithEmailStatus[]> = {};
	const allClassIds = classesWithData.map((c) => c.id);

	if (allClassIds.length > 0) {
		// Batch fetch ALL active students for ALL classes in one query
		const { data: allMembers, error: membersError } = await supabase
			.from('class_members')
			.select(
				`
				class_id,
				student_id,
				profiles!class_members_student_id_fkey (
					id,
					firstname,
					lastname,
					email,
					avatar_url,
					is_test
				)
			`
			)
			.in('class_id', allClassIds)
			.eq('status', 'active');

		if (membersError) {
			console.error('[Teacher Classes] Error fetching students:', membersError);
		}

		// Get all unique student IDs across all classes
		const allStudentIds = [
			...new Set(
				(allMembers || [])
					.map((m) => {
						const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
						return profile?.id;
					})
					.filter((id): id is string => !!id)
			)
		];

		// Batch fetch ALL welcome emails in one query
		const welcomeEmailMap = new Map<string, string>();
		if (allStudentIds.length > 0) {
			const { data: allWelcomeEmails } = await supabase
				.from('welcome_emails_sent')
				.select('student_id, sent_at')
				.in('student_id', allStudentIds);

			for (const email of allWelcomeEmails || []) {
				welcomeEmailMap.set(email.student_id, email.sent_at);
			}
		}

		// Group members by class and transform
		for (const classItem of classesWithData) {
			const classMembers = (allMembers || []).filter((m) => m.class_id === classItem.id);

			const students: StudentWithEmailStatus[] = classMembers
				.map((member) => {
					const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
					if (!profile) return null;

					// Filter by test mode
					if (profile.is_test !== isTestMode) return null;

					return {
						id: profile.id,
						firstname: profile.firstname || '',
						lastname: profile.lastname || null,
						email: profile.email || null,
						avatar_url: profile.avatar_url || null,
						welcomeEmailSentAt: welcomeEmailMap.get(profile.id) || null
					};
				})
				.filter((s): s is StudentWithEmailStatus => s !== null)
				.sort((a, b) => {
					// Sort by lastname then firstname
					const lastNameCompare = (a.lastname || '').localeCompare(b.lastname || '', 'fr');
					if (lastNameCompare !== 0) return lastNameCompare;
					return a.firstname.localeCompare(b.firstname, 'fr');
				});

			classStudentsMap[classItem.id] = students;
		}
	}

	// Fetch school timetable (needed for period selection in schedule modal)
	let school: School | null = null;
	if (profile.school_id) {
		const { data, error: schoolError } = await supabase
			.from('schools')
			.select('*')
			.eq('id', profile.school_id)
			.single();

		if (schoolError) {
			console.error('[Teacher Classes] Error fetching school:', schoolError);
		} else {
			school = data;
		}
	}

	// Fetch teacher's Google Classroom courses
	const { data: googleCourses } = await supabase
		.from('google_classroom_courses')
		.select('id, name, section, course_state')
		.eq('teacher_id', user.id)
		.eq('course_state', 'ACTIVE')
		.order('name');

	// Fetch which courses are already associated with classes (for filtering)
	const { data: associatedCourseIds } = await supabase
		.from('classes')
		.select('google_classroom_course_id')
		.eq('teacher_id', user.id)
		.not('google_classroom_course_id', 'is', null);

	return {
		classes: classesWithData,
		school,
		classStudentsMap,
		googleCourses: googleCourses || [],
		associatedCourseIds: (associatedCourseIds || [])
			.map((c) => c.google_classroom_course_id)
			.filter((id): id is string => id !== null)
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

		const validation = validateFormData(createScheduleEntrySchema, formData);
		if (!validation.success) {
			return fail(400, { errors: validation.errors });
		}

		const {
			class_id: classId,
			day_of_week: dayOfWeek,
			period_number: periodNumber,
			start_time: startTime,
			end_time: endTime,
			subject,
			room,
			notes
		} = validation.data;

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

		const validation = validateFormData(updateScheduleEntrySchema, formData);
		if (!validation.success) {
			return fail(400, { errors: validation.errors });
		}

		const {
			id,
			day_of_week: dayOfWeek,
			period_number: periodNumber,
			start_time: startTime,
			end_time: endTime,
			subject,
			room,
			notes
		} = validation.data;

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

		const validation = validateFormData(deleteScheduleEntrySchema, formData);
		if (!validation.success) {
			return fail(400, { errors: validation.errors });
		}

		const { id } = validation.data;

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
	},

	/**
	 * Associate a Google Classroom course with a class
	 *
	 * SECURITY:
	 * - Verifies user is authenticated teacher
	 * - Validates class belongs to teacher
	 * - Validates course belongs to teacher (if provided)
	 *
	 * PROCESS:
	 * 1. Extract and validate classId and courseId from form data
	 * 2. Verify class ownership
	 * 3. Verify course ownership (if courseId provided)
	 * 4. Update class with google_classroom_course_id
	 */
	associateCourse: async ({ request, locals }) => {
		const { user } = await requireRole(locals, 'teacher');

		const formData = await request.formData();

		const validation = validateFormData(associateCourseSchema, formData);
		if (!validation.success) {
			return fail(400, { errors: validation.errors });
		}

		const { classId, courseId } = validation.data;

		// Verify teacher owns this class
		const { data: classData, error: classError } = await locals.supabase
			.from('classes')
			.select('teacher_id')
			.eq('id', classId)
			.single();

		if (classError || !classData) {
			return fail(404, { message: 'Classe introuvable' });
		}

		if (classData.teacher_id !== user.id) {
			return fail(403, { message: 'Vous ne possédez pas cette classe' });
		}

		// If courseId provided, verify teacher owns this course
		if (courseId) {
			const { data: courseData, error: courseError } = await locals.supabase
				.from('google_classroom_courses')
				.select('teacher_id')
				.eq('id', courseId)
				.single();

			if (courseError || !courseData) {
				return fail(404, { message: 'Cours Google Classroom introuvable' });
			}

			if (courseData.teacher_id !== user.id) {
				return fail(403, { message: 'Vous ne possédez pas ce cours' });
			}
		}

		// Update the class
		const { error: updateError } = await locals.supabase
			.from('classes')
			.update({ google_classroom_course_id: courseId })
			.eq('id', classId)
			.eq('teacher_id', user.id);

		if (updateError) {
			console.error('Error updating class association:', updateError);
			return fail(500, { message: "Erreur lors de la mise à jour de l'association" });
		}

		return { success: true };
	}
};
