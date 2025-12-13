/**
 * DELETE /api/student/reports/[reportId]
 * ========================================
 *
 * Allows a student to cancel (delete) their own pending error report.
 * Only pending reports can be cancelled - processed reports are preserved.
 *
 * AUTH: Student only (must own the report)
 *
 * URL PARAMS:
 * - reportId: UUID of the error report to delete
 *
 * RESPONSE (200):
 * {
 *   success: true
 * }
 *
 * ERRORS:
 * - 400: Invalid reportId (not a valid UUID)
 * - 401: Not authenticated
 * - 403: Not a student
 * - 403: Report status is not pending (cannot cancel processed reports)
 * - 404: Report not found or not owned by student
 * - 500: Server error
 *
 * SECURITY:
 * - Ownership verified by querying with student_id = user.id
 * - RLS policy ensures students can only delete their own pending reports
 *
 * BUSINESS RULES:
 * - Only pending reports can be cancelled
 * - Once a report is reviewed (fixed/rejected), it cannot be deleted
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	validateStudentReportIdParam,
	deleteStudentReportResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';

export const DELETE: RequestHandler = async ({ locals, params }) => {
	// Auth check: Must be a student
	const { user } = await requireRole(locals, 'student');

	// Validate URL parameter
	const paramValidation = validateStudentReportIdParam(params);
	if (!paramValidation.success) {
		throw error(400, paramValidation.error.issues[0].message);
	}

	const { reportId } = paramValidation.data;

	try {
		// Step 1: Fetch the report to verify ownership and status
		// We query with student_id filter to ensure ownership
		const { data: report, error: fetchError } = await locals.supabase
			.from('worksheet_error_reports')
			.select('id, status, student_id')
			.eq('id', reportId)
			.eq('student_id', user.id)
			.single();

		if (fetchError || !report) {
			// Report not found or not owned by this student
			throw error(404, 'Signalement non trouve');
		}

		// Step 2: Check if report is still pending
		if (report.status !== 'pending') {
			throw error(403, "Impossible d'annuler un signalement deja traite");
		}

		// Step 3: Delete the report
		const { error: deleteError } = await locals.supabase
			.from('worksheet_error_reports')
			.delete()
			.eq('id', reportId)
			.eq('student_id', user.id);

		if (deleteError) {
			console.error('[API] Error deleting report:', deleteError);
			throw error(500, 'Erreur lors de la suppression du signalement');
		}

		// Validate and return response
		const validated = validateJsonResponse(
			deleteStudentReportResponseSchema,
			{ success: true as const },
			'DELETE /api/student/reports/[reportId]'
		);

		return json(validated);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in DELETE /api/student/reports/[reportId]:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
