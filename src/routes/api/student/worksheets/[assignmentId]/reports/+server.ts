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
import { fetchCopyNumbering } from '$lib/server/worksheets/display-number';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/student/worksheets/[assignmentId]/reports/+server');

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
		const { data: canAccess, error: canAccessError } = await locals.supabase.rpc(
			'can_access_assignment',
			{
				p_assignment_id: assignmentId
			}
		);

		// Contrôle d'accès : rester fermé est le bon repli, mais un refus dû à une
		// panne doit se distinguer d'un refus mérité.
		if (canAccessError && canAccessError.code !== 'PGRST116') {
			logger.error('Contrôle d’accès impossible :', canAccessError);
			throw error(500, 'Impossible de vérifier l’accès');
		}

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
			logger.error('[API] Error fetching assignment:', assignmentError);
			throw error(404, 'Devoir non trouve');
		}

		// Step 3: Query reports for this student and assignment
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
				updated_at
			`
			)
			.eq('assignment_id', assignmentId)
			.eq('student_id', user.id)
			.order('created_at', { ascending: false });

		if (reportsError) {
			logger.error('[API] Error fetching error reports:', reportsError);
			throw error(500, 'Erreur lors de la recuperation des signalements');
		}

		// Step 4: le numéro de chaque exercice dans LA COPIE de cet élève (D6),
		// ordre mélangé compris ; inconnu → null, jamais la position (elle
		// redémarre à chaque section et ignore le mélange).
		const numbering =
			(reports ?? []).length > 0
				? await fetchCopyNumbering(locals.supabase, assignment.worksheet_id, [assignmentId])
				: null;

		// Step 5: Transform to response format
		const reportViews: StudentErrorReportView[] = (reports ?? []).map((report) => {
			return {
				id: report.id,
				worksheet_exercise_id: report.worksheet_exercise_id,
				exercise_position:
					numbering?.numberOf(assignmentId, user.id, report.worksheet_exercise_id) ?? null,
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

		logger.error(
			'[API] Unexpected error in GET /api/student/worksheets/[assignmentId]/reports:',
			err
		);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
