/**
 * API Route: /api/worksheets/[id]/assignments/[assignmentId]/students
 *
 * Teacher API for managing individual student assignments.
 *
 * GET - List students individually assigned to this assignment
 * POST - Add individual students to the assignment
 * DELETE - Remove an individual student from the assignment
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateAssignmentParams,
	validateAddAssignmentStudents,
	validateRemoveAssignmentStudent,
	assignmentStudentsResponseSchema,
	addStudentsResponseSchema,
	removeStudentResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify worksheet and assignment exist and user has permission
 * Returns the assignment if found and authorized
 */
async function verifyAssignmentAccess(
	supabase: App.Locals['supabase'],
	worksheetId: string,
	assignmentId: string,
	userId: string,
	role: string
) {
	// Validate UUID formats
	const paramsValidation = validateAssignmentParams({ id: worksheetId, assignmentId });
	if (!paramsValidation.success) {
		throw error(400, 'Format UUID invalide');
	}

	// Fetch worksheet with ownership check
	const { data: worksheet, error: worksheetError } = await supabase
		.from('worksheets')
		.select('id, created_by')
		.eq('id', worksheetId)
		.single();

	if (worksheetError || !worksheet) {
		throw error(404, 'Feuille de travail non trouvee');
	}

	// Verify ownership (teachers can only access their own worksheets)
	if (role === 'teacher' && worksheet.created_by !== userId) {
		throw error(403, 'Acces non autorise a cette feuille de travail');
	}

	// Fetch assignment and verify it belongs to this worksheet
	const { data: assignment, error: assignmentError } = await supabase
		.from('worksheet_assignments')
		.select('id, worksheet_id, created_by')
		.eq('id', assignmentId)
		.eq('worksheet_id', worksheetId)
		.single();

	if (assignmentError || !assignment) {
		throw error(404, 'Devoir non trouve');
	}

	// Additional ownership check for assignment
	if (role === 'teacher' && assignment.created_by !== userId) {
		throw error(403, 'Acces non autorise a ce devoir');
	}

	return { worksheet, assignment };
}

// ============================================================================
// GET HANDLER - List individually assigned students
// ============================================================================

/**
 * GET /api/worksheets/[id]/assignments/[assignmentId]/students
 *
 * Returns list of students individually assigned to this assignment
 * (not via class membership, but directly through worksheet_assignment_students)
 */
export const GET: RequestHandler = async ({ locals, params }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Verify access
	await verifyAssignmentAccess(
		locals.supabase,
		params.id,
		params.assignmentId,
		user.id,
		profile.role as string
	);

	// Fetch individually assigned students with profile info
	const { data: assignedStudents, error: fetchError } = await locals.supabase
		.from('worksheet_assignment_students')
		.select(
			`
			id,
			student_id,
			created_at,
			student:profiles!worksheet_assignment_students_student_id_fkey (
				firstname,
				lastname
			)
		`
		)
		.eq('assignment_id', params.assignmentId)
		.order('created_at', { ascending: false });

	if (fetchError) {
		console.error('Failed to fetch assigned students:', fetchError);
		throw error(500, 'Erreur lors de la recuperation des eleves');
	}

	// Transform response to expected format
	// Note: Supabase may return joined data as array or single object depending on version
	const students = (assignedStudents ?? []).map((row) => {
		const studentData = row.student;
		const student = Array.isArray(studentData) ? studentData[0] : studentData;
		return {
			id: row.id,
			student_id: row.student_id,
			first_name: student?.firstname ?? null,
			last_name: student?.lastname ?? null,
			created_at: row.created_at
		};
	});

	// Validate response
	const validated = validateJsonResponse(
		assignmentStudentsResponseSchema,
		{ students },
		'GET /api/worksheets/[id]/assignments/[assignmentId]/students'
	);

	return json(validated);
};

// ============================================================================
// POST HANDLER - Add individual students
// ============================================================================

/**
 * POST /api/worksheets/[id]/assignments/[assignmentId]/students
 *
 * Add individual students to the assignment
 * Body: { student_ids: UUID[] }
 */
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Verify access
	await verifyAssignmentAccess(
		locals.supabase,
		params.id,
		params.assignmentId,
		user.id,
		profile.role as string
	);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps JSON invalide');
	}

	const validation = validateAddAssignmentStudents(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues.map((e) => e.message).join('; ');
		throw error(400, `Validation echouee: ${errorMsg}`);
	}

	const { student_ids } = validation.data;

	// Verify all students exist and are actually students
	const { data: validStudents, error: studentError } = await locals.supabase
		.from('profiles')
		.select('id')
		.in('id', student_ids)
		.eq('role', 'student');

	if (studentError) {
		console.error('Failed to verify students:', studentError);
		throw error(500, 'Erreur lors de la verification des eleves');
	}

	const validStudentIds = new Set((validStudents ?? []).map((s) => s.id));
	const invalidIds = student_ids.filter((id) => !validStudentIds.has(id));

	if (invalidIds.length > 0) {
		throw error(
			400,
			`Certains eleves n'existent pas ou ne sont pas des eleves: ${invalidIds.length} ID(s) invalide(s)`
		);
	}

	// Insert student assignments (ignore duplicates)
	const insertData = student_ids.map((student_id) => ({
		assignment_id: params.assignmentId,
		student_id
	}));

	const { data: inserted, error: insertError } = await locals.supabase
		.from('worksheet_assignment_students')
		.upsert(insertData, { onConflict: 'assignment_id,student_id', ignoreDuplicates: true })
		.select('id');

	if (insertError) {
		console.error('Failed to add students to assignment:', insertError);
		throw error(500, "Erreur lors de l'ajout des eleves");
	}

	// Validate response
	const validated = validateJsonResponse(
		addStudentsResponseSchema,
		{
			success: true as const,
			added_count: inserted?.length ?? 0
		},
		'POST /api/worksheets/[id]/assignments/[assignmentId]/students'
	);

	return json(validated, { status: 201 });
};

// ============================================================================
// DELETE HANDLER - Remove individual student
// ============================================================================

/**
 * DELETE /api/worksheets/[id]/assignments/[assignmentId]/students
 *
 * Remove an individual student from the assignment
 * Body: { student_id: UUID }
 */
export const DELETE: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);

	// Verify access
	await verifyAssignmentAccess(
		locals.supabase,
		params.id,
		params.assignmentId,
		user.id,
		profile.role as string
	);

	// Parse and validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps JSON invalide');
	}

	const validation = validateRemoveAssignmentStudent(body);
	if (!validation.success) {
		const errorMsg = validation.error.issues.map((e) => e.message).join('; ');
		throw error(400, `Validation echouee: ${errorMsg}`);
	}

	const { student_id } = validation.data;

	// Delete the student assignment
	const { error: deleteError, count } = await locals.supabase
		.from('worksheet_assignment_students')
		.delete({ count: 'exact' })
		.eq('assignment_id', params.assignmentId)
		.eq('student_id', student_id);

	if (deleteError) {
		console.error('Failed to remove student from assignment:', deleteError);
		throw error(500, "Erreur lors de la suppression de l'eleve");
	}

	if (count === 0) {
		throw error(404, 'Eleve non trouve dans ce devoir');
	}

	// Validate response
	const validated = validateJsonResponse(
		removeStudentResponseSchema,
		{
			success: true as const,
			message: 'Eleve retire du devoir avec succes'
		},
		'DELETE /api/worksheets/[id]/assignments/[assignmentId]/students'
	);

	return json(validated);
};
