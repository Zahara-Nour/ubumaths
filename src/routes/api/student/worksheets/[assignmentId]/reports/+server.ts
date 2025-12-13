/**
 * GET /api/student/worksheets/[assignmentId]/reports
 * ===================================================
 *
 * Returns the list of error reports submitted by the current student
 * for a specific worksheet assignment.
 *
 * AUTH: Student only (must have access to the assignment)
 *
 * URL PARAMS:
 * - assignmentId: UUID of the worksheet assignment
 *
 * RESPONSE (200):
 * {
 *   reports: StudentErrorReportView[]
 * }
 *
 * ERRORS:
 * - 400: Invalid assignmentId parameter
 * - 401: Not authenticated
 * - 403: Not a student
 * - 404: Assignment not found or no access
 * - 500: Server error
 *
 * SECURITY:
 * - Access verified via can_access_assignment() RPC
 * - RLS policies ensure student only sees their own reports
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	validateStudentWorksheetParam,
	studentErrorReportsListResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import type { StudentErrorReportView } from '$lib/types/worksheets';

export const GET: RequestHandler = async ({ locals, params }) => {
	// Auth check: Must be a student
	const { user } = await requireRole(locals, 'student');

	// Validate assignmentId parameter
	const paramValidation = validateStudentWorksheetParam(params);
	if (!paramValidation.success) {
		throw error(400, 'ID de devoir invalide');
	}

	const { assignmentId } = paramValidation.data;

	try {
		// Step 1: Verify student has access to this assignment
		const { data: canAccess } = await locals.supabase.rpc('can_access_assignment', {
			p_assignment_id: assignmentId
		});

		if (!canAccess) {
			throw error(404, 'Devoir non trouve');
		}

		// Step 2: Get the assignment's worksheet_id to join with worksheet_exercises
		const { data: assignment, error: assignmentError } = await locals.supabase
			.from('worksheet_assignments')
			.select('id, worksheet_id')
			.eq('id', assignmentId)
			.single();

		if (assignmentError || !assignment) {
			console.error('[API] Error fetching assignment:', assignmentError);
			throw error(404, 'Devoir non trouve');
		}

		// Step 3: Query reports for this student and assignment
		// Join with worksheet_exercises to get the position
		const { data: reports, error: reportsError } = await locals.supabase
			.from('worksheet_error_reports')
			.select(
				`
				id,
				worksheet_exercise_id,
				description,
				status,
				response,
				created_at,
				updated_at,
				worksheet_exercises!inner (
					position
				)
			`
			)
			.eq('assignment_id', assignmentId)
			.eq('student_id', user.id)
			.order('created_at', { ascending: false });

		if (reportsError) {
			console.error('[API] Error fetching error reports:', reportsError);
			throw error(500, 'Erreur lors de la recuperation des signalements');
		}

		// Step 4: Transform to response format
		const reportViews: StudentErrorReportView[] = (reports ?? []).map((report) => {
			const worksheetExercise = report.worksheet_exercises as unknown as { position: number };

			return {
				id: report.id,
				worksheet_exercise_id: report.worksheet_exercise_id,
				exercise_position: worksheetExercise.position,
				description: report.description,
				status: report.status as StudentErrorReportView['status'],
				response: report.response,
				created_at: report.created_at,
				updated_at: report.updated_at
			};
		});

		// Validate response
		const validated = validateJsonResponse(
			studentErrorReportsListResponseSchema,
			{ reports: reportViews },
			'GET /api/student/worksheets/[assignmentId]/reports'
		);

		return json(validated);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error(
			'[API] Unexpected error in GET /api/student/worksheets/[assignmentId]/reports:',
			err
		);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
