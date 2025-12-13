/**
 * API Route: /api/worksheets/[id]/assignments/[assignmentId]/reports
 *
 * Teacher API for viewing error reports submitted by students for this assignment.
 *
 * GET - List all error reports with pagination, filtering, and counts per status
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateAssignmentParams,
	validateErrorReportsQuery,
	teacherErrorReportsListResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import type { TeacherErrorReportView, ErrorReportStatus } from '$lib/types/worksheets';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify worksheet and assignment exist and teacher has permission
 */
async function verifyTeacherAccess(
	supabase: App.Locals['supabase'],
	worksheetId: string,
	assignmentId: string,
	userId: string
) {
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
	if (worksheet.created_by !== userId) {
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

	return { worksheet, assignment };
}

// ============================================================================
// GET HANDLER - List error reports for assignment
// ============================================================================

/**
 * GET /api/worksheets/[id]/assignments/[assignmentId]/reports
 *
 * Returns list of error reports submitted by students for this assignment.
 * Includes student info, status filtering, pagination, and counts per status.
 *
 * Query params:
 * - status: 'pending' | 'fixed' | 'rejected' (optional filter)
 * - page: number (default 1)
 * - limit: number (default 50, max 100)
 *
 * Response:
 * {
 *   reports: TeacherErrorReportView[],
 *   counts: { pending, fixed, rejected, total },
 *   pagination: { page, limit, total, totalPages }
 * }
 */
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	// Validate URL parameters
	const paramsValidation = validateAssignmentParams({
		id: params.id,
		assignmentId: params.assignmentId
	});
	if (!paramsValidation.success) {
		throw error(400, 'Format UUID invalide');
	}

	const { id: worksheetId, assignmentId } = paramsValidation.data;

	// Validate query parameters
	const queryValidation = validateErrorReportsQuery(url.searchParams);
	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { status: statusFilter, page, limit } = queryValidation.data;

	// Verify teacher access
	await verifyTeacherAccess(locals.supabase, worksheetId, assignmentId, user.id);

	try {
		// Step 1: Get counts per status (always query all statuses for counts)
		const { data: allReports, error: countError } = await locals.supabase
			.from('worksheet_error_reports')
			.select('id, status')
			.eq('assignment_id', assignmentId);

		if (countError) {
			console.error('[API] Error counting reports:', countError);
			throw error(500, 'Erreur lors du comptage des signalements');
		}

		// Calculate counts
		const counts = {
			pending: 0,
			fixed: 0,
			rejected: 0,
			total: 0
		};

		for (const report of allReports ?? []) {
			counts.total++;
			if (report.status === 'pending') counts.pending++;
			else if (report.status === 'fixed') counts.fixed++;
			else if (report.status === 'rejected') counts.rejected++;
		}

		// Step 2: Build query for filtered reports with pagination
		let query = locals.supabase
			.from('worksheet_error_reports')
			.select(
				`
				id,
				assignment_id,
				worksheet_exercise_id,
				student_id,
				description,
				status,
				response,
				created_at,
				updated_at,
				student:profiles!worksheet_error_reports_student_id_fkey (
					firstname,
					lastname
				)
			`,
				{ count: 'exact' }
			)
			.eq('assignment_id', assignmentId)
			.order('created_at', { ascending: false });

		// Apply status filter if provided
		if (statusFilter) {
			query = query.eq('status', statusFilter);
		}

		// Apply pagination
		const offset = (page - 1) * limit;
		query = query.range(offset, offset + limit - 1);

		const { data: reports, error: fetchError, count: totalFiltered } = await query;

		if (fetchError) {
			console.error('[API] Error fetching reports:', fetchError);
			throw error(500, 'Erreur lors de la recuperation des signalements');
		}

		// Step 3: Get exercise positions from worksheet_exercises
		const worksheetExerciseIds = [...new Set((reports ?? []).map((r) => r.worksheet_exercise_id))];

		let exercisePositions: Map<string, number> = new Map();

		if (worksheetExerciseIds.length > 0) {
			const { data: exercises, error: exercisesError } = await locals.supabase
				.from('worksheet_exercises')
				.select('id, position')
				.in('id', worksheetExerciseIds);

			if (exercisesError) {
				console.error('[API] Error fetching exercise positions:', exercisesError);
				// Continue without positions (will default to 0)
			} else {
				exercisePositions = new Map((exercises ?? []).map((e) => [e.id, e.position]));
			}
		}

		// Step 4: Transform to TeacherErrorReportView
		const reportViews: TeacherErrorReportView[] = (reports ?? []).map((report) => {
			const studentData = report.student;
			const student = Array.isArray(studentData) ? studentData[0] : studentData;

			return {
				id: report.id,
				assignment_id: report.assignment_id,
				worksheet_exercise_id: report.worksheet_exercise_id,
				exercise_position: exercisePositions.get(report.worksheet_exercise_id) ?? 0,
				student_id: report.student_id,
				student_first_name: student?.firstname ?? null,
				student_last_name: student?.lastname ?? null,
				description: report.description,
				status: report.status as ErrorReportStatus,
				response: report.response,
				created_at: report.created_at,
				updated_at: report.updated_at
			};
		});

		// Step 5: Calculate pagination
		const total = totalFiltered ?? 0;
		const totalPages = Math.ceil(total / limit);

		// Validate response
		const validated = validateJsonResponse(
			teacherErrorReportsListResponseSchema,
			{
				reports: reportViews,
				counts,
				pagination: {
					page,
					limit,
					total,
					totalPages
				}
			},
			'GET /api/worksheets/[id]/assignments/[assignmentId]/reports'
		);

		return json(validated);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error(
			'[API] Unexpected error in GET /api/worksheets/[id]/assignments/[assignmentId]/reports:',
			err
		);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
