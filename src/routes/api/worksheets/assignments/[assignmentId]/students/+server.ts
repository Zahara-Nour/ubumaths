/**
 * Assignment Students API Endpoint
 * =================================
 *
 * Manage students who have access to a worksheet assignment.
 * Returns both class-based and individual student assignments.
 *
 * GET: List all students with access (from classes + individual)
 * POST: Add individual student(s)
 * DELETE: Remove individual student
 *
 * Security:
 * - Only assignment creator or admin can access
 * - Validates student_id is actually a student role
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

/**
 * Schema for adding individual students
 * POST body: { student_id: uuid } or { student_ids: uuid[] }
 */
const addStudentSchema = z
	.object({
		student_id: z.string().uuid().optional(),
		student_ids: z.array(z.string().uuid()).max(500, 'Maximum 500 students per request').optional()
	})
	.refine(
		(data) => data.student_id !== undefined || (data.student_ids && data.student_ids.length > 0),
		{ message: 'student_id or student_ids is required', path: ['student_id'] }
	);

/**
 * Schema for removing individual student
 * DELETE query param: ?student_id=uuid
 */
const removeStudentSchema = z.object({
	student_id: z.string().uuid('Invalid student ID format')
});

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

interface StudentListItem {
	id: string;
	first_name: string | null;
	last_name: string | null;
	class_id: string | null;
	class_name: string | null;
	is_individual: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify assignment exists and user has permission to manage it
 */
async function verifyAssignmentAccess(
	supabase: App.Locals['supabase'],
	assignmentId: string,
	userId: string
): Promise<{ assignment: { id: string; created_by: string }; isAdmin: boolean }> {
	// Fetch assignment
	const { data: assignment, error: fetchError } = await supabase
		.from('worksheet_assignments')
		.select('id, created_by')
		.eq('id', assignmentId)
		.single();

	if (fetchError || !assignment) {
		throw error(404, 'Assignation non trouvee');
	}

	// Check permissions
	const { data: profile } = await supabase
		.from('profiles')
		.select('role')
		.eq('id', userId)
		.single();

	const isCreator = assignment.created_by === userId;
	const isAdmin = profile?.role === 'admin';

	if (!isCreator && !isAdmin) {
		throw error(403, 'Acces non autorise');
	}

	return { assignment, isAdmin };
}

// ============================================================================
// GET HANDLER - List all students with access
// ============================================================================

/**
 * GET /api/worksheets/assignments/[assignmentId]/students
 *
 * Returns all students who have access to this assignment:
 * - Students from assigned classes (via worksheet_assignment_classes)
 * - Individual students (via worksheet_assignment_students)
 *
 * Response:
 * {
 *   students: Array<{
 *     id: string,
 *     first_name: string | null,
 *     last_name: string | null,
 *     class_id: string | null,
 *     class_name: string | null,
 *     is_individual: boolean
 *   }>
 * }
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Non authentifie');
	}

	const assignmentId = params.assignmentId;
	if (!assignmentId) {
		throw error(400, "ID de l'assignation requis");
	}

	try {
		await verifyAssignmentAccess(locals.supabase, assignmentId, user.id);

		const students: StudentListItem[] = [];
		const seenStudentIds = new Set<string>();

		// 1. Get students from assigned classes (via junction table)
		const { data: classAssignments, error: classError } = await locals.supabase
			.from('worksheet_assignment_classes')
			.select(
				`
				class_id,
				classes(id, name)
			`
			)
			.eq('assignment_id', assignmentId);

		if (classError) {
			console.error('Error fetching class assignments:', classError);
			throw error(500, 'Erreur lors de la recuperation des classes');
		}

		// Get students from each assigned class
		for (const ca of classAssignments || []) {
			// Supabase joins can return arrays - handle both cases
			const classData = ca.classes;
			const classInfo = Array.isArray(classData) ? classData[0] : classData;
			if (!classInfo) continue;

			const { data: classMembers, error: membersError } = await locals.supabase
				.from('class_members')
				.select(
					`
					student_id,
					profiles!class_members_student_id_fkey(id, firstname, lastname)
				`
				)
				.eq('class_id', ca.class_id);

			if (membersError) {
				console.error('Error fetching class members:', membersError);
				continue;
			}

			for (const member of classMembers || []) {
				// Supabase joins can return arrays - handle both cases
				const profileData = member.profiles;
				const profile = Array.isArray(profileData) ? profileData[0] : profileData;
				if (!profile || seenStudentIds.has(member.student_id)) continue;

				seenStudentIds.add(member.student_id);
				students.push({
					id: member.student_id,
					first_name: profile.firstname,
					last_name: profile.lastname,
					class_id: classInfo.id,
					class_name: classInfo.name,
					is_individual: false
				});
			}
		}

		// 2. Get individually assigned students
		const { data: individualStudents, error: individualError } = await locals.supabase
			.from('worksheet_assignment_students')
			.select(
				`
				student_id,
				profiles!worksheet_assignment_students_student_id_fkey(id, firstname, lastname)
			`
			)
			.eq('assignment_id', assignmentId);

		if (individualError) {
			console.error('Error fetching individual students:', individualError);
			throw error(500, 'Erreur lors de la recuperation des eleves individuels');
		}

		for (const is of individualStudents || []) {
			// Supabase joins can return arrays - handle both cases
			const profileData = is.profiles;
			const profile = Array.isArray(profileData) ? profileData[0] : profileData;
			if (!profile) continue;

			// Check if student is already in the list (from a class)
			if (seenStudentIds.has(is.student_id)) {
				// Mark the existing entry as also individually assigned
				const existingIndex = students.findIndex((s) => s.id === is.student_id);
				if (existingIndex >= 0) {
					// Student is both in a class AND individually assigned
					// Keep the class info but also note they're individual
					students[existingIndex].is_individual = true;
				}
			} else {
				seenStudentIds.add(is.student_id);
				students.push({
					id: is.student_id,
					first_name: profile.firstname,
					last_name: profile.lastname,
					class_id: null, // Not from a class
					class_name: null,
					is_individual: true
				});
			}
		}

		// Sort students by last name, then first name
		students.sort((a, b) => {
			const lastNameCompare = (a.last_name || '').localeCompare(b.last_name || '');
			if (lastNameCompare !== 0) return lastNameCompare;
			return (a.first_name || '').localeCompare(b.first_name || '');
		});

		return json({
			success: true,
			students,
			count: students.length,
			class_count: (classAssignments || []).length,
			individual_count: (individualStudents || []).length
		});
	} catch (err) {
		console.error('Error fetching assignment students:', err);

		if (err instanceof Error && 'status' in err) {
			throw err;
		}

		throw error(500, 'Erreur lors de la recuperation des eleves');
	}
};

// ============================================================================
// POST HANDLER - Add individual student(s)
// ============================================================================

/**
 * POST /api/worksheets/assignments/[assignmentId]/students
 *
 * Add individual student(s) to the assignment.
 * These students get access in addition to class members.
 *
 * Body: { student_id: uuid } or { student_ids: uuid[] }
 *
 * Response:
 * {
 *   success: true,
 *   added_count: number
 * }
 */
export const POST: RequestHandler = async ({ params, locals, request }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Non authentifie');
	}

	const assignmentId = params.assignmentId;
	if (!assignmentId) {
		throw error(400, "ID de l'assignation requis");
	}

	// Parse and validate body
	const body = await request.json().catch(() => null);
	const validation = addStudentSchema.safeParse(body);

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	// Normalize to array
	const studentIds =
		validation.data.student_ids || (validation.data.student_id ? [validation.data.student_id] : []);

	if (studentIds.length === 0) {
		throw error(400, 'Au moins un eleve requis');
	}

	try {
		await verifyAssignmentAccess(locals.supabase, assignmentId, user.id);

		// Verify all students exist and are actually students
		const { data: studentsData, error: studentsError } = await locals.supabase
			.from('profiles')
			.select('id')
			.in('id', studentIds)
			.eq('role', 'student');

		if (studentsError) {
			console.error('Error fetching students:', studentsError);
			throw error(500, 'Erreur lors de la verification des eleves');
		}

		const foundStudentIds = new Set(studentsData?.map((s) => s.id) || []);
		const invalidStudentIds = studentIds.filter((id) => !foundStudentIds.has(id));

		if (invalidStudentIds.length > 0) {
			throw error(
				400,
				`${invalidStudentIds.length} eleve(s) invalide(s): non trouve(s) ou ne sont pas des eleves`
			);
		}

		// Insert student assignments (ignore duplicates)
		const insertData = studentIds.map((student_id) => ({
			assignment_id: assignmentId,
			student_id
		}));

		const { data: inserted, error: insertError } = await locals.supabase
			.from('worksheet_assignment_students')
			.upsert(insertData, { onConflict: 'assignment_id,student_id', ignoreDuplicates: true })
			.select('id');

		if (insertError) {
			console.error('Error adding students to assignment:', insertError);
			throw error(500, "Erreur lors de l'ajout des eleves");
		}

		return json(
			{
				success: true,
				message: `${inserted?.length || 0} eleve(s) ajoute(s)`,
				added_count: inserted?.length || 0
			},
			{ status: 201 }
		);
	} catch (err) {
		console.error('Error adding students to assignment:', err);

		if (err instanceof Error && 'status' in err) {
			throw err;
		}

		throw error(500, "Erreur lors de l'ajout des eleves");
	}
};

// ============================================================================
// DELETE HANDLER - Remove individual student
// ============================================================================

/**
 * DELETE /api/worksheets/assignments/[assignmentId]/students?student_id=uuid
 *
 * Remove an individual student from the assignment.
 * Note: Only removes individual assignments, not class membership.
 *
 * Query params: student_id (required)
 *
 * Response:
 * {
 *   success: true,
 *   message: string
 * }
 */
export const DELETE: RequestHandler = async ({ params, locals, url }) => {
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Non authentifie');
	}

	const assignmentId = params.assignmentId;
	if (!assignmentId) {
		throw error(400, "ID de l'assignation requis");
	}

	// Validate query param
	const studentId = url.searchParams.get('student_id');
	const validation = removeStudentSchema.safeParse({ student_id: studentId });

	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	try {
		await verifyAssignmentAccess(locals.supabase, assignmentId, user.id);

		// Delete the student assignment
		const { error: deleteError, count } = await locals.supabase
			.from('worksheet_assignment_students')
			.delete({ count: 'exact' })
			.eq('assignment_id', assignmentId)
			.eq('student_id', validation.data.student_id);

		if (deleteError) {
			console.error('Error removing student from assignment:', deleteError);
			throw error(500, "Erreur lors de la suppression de l'eleve");
		}

		if (count === 0) {
			throw error(404, 'Eleve non trouve dans les assignations individuelles');
		}

		return json({
			success: true,
			message: 'Eleve retire du devoir avec succes'
		});
	} catch (err) {
		console.error('Error removing student from assignment:', err);

		if (err instanceof Error && 'status' in err) {
			throw err;
		}

		throw error(500, "Erreur lors de la suppression de l'eleve");
	}
};
