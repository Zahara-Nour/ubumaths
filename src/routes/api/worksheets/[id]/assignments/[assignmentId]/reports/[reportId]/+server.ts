/**
 * API Route: /api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]
 *
 * Teacher API for reviewing a specific error report.
 *
 * PUT - Review an error report (mark as fixed/rejected with optional response)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateErrorReportParams,
	validateReviewErrorReport,
	reviewErrorReportResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import { createSystemNotification } from '$lib/server/notifications';
import type { TeacherErrorReportView, ErrorReportStatus } from '$lib/types/worksheets';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Verify worksheet exists and teacher has permission
 */
async function verifyTeacherWorksheetAccess(
	supabase: App.Locals['supabase'],
	worksheetId: string,
	userId: string
) {
	const { data: worksheet, error: worksheetError } = await supabase
		.from('worksheets')
		.select('id, created_by, title')
		.eq('id', worksheetId)
		.single();

	if (worksheetError || !worksheet) {
		throw error(404, 'Feuille de travail non trouvee');
	}

	if (worksheet.created_by !== userId) {
		throw error(403, 'Acces non autorise a cette feuille de travail');
	}

	return worksheet;
}

// ============================================================================
// PUT HANDLER - Review an error report
// ============================================================================

/**
 * PUT /api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]
 *
 * Review an error report by marking it as fixed or rejected.
 * Creates a notification for the student who submitted the report.
 *
 * Request body:
 * {
 *   status: 'fixed' | 'rejected',
 *   response?: string | null (optional teacher response message)
 * }
 *
 * Response:
 * {
 *   success: true,
 *   report: TeacherErrorReportView
 * }
 */
export const PUT: RequestHandler = async ({ locals, params, request }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	// Validate URL parameters
	const paramsValidation = validateErrorReportParams({
		id: params.id,
		assignmentId: params.assignmentId,
		reportId: params.reportId
	});
	if (!paramsValidation.success) {
		throw error(400, 'Format UUID invalide');
	}

	const { id: worksheetId, assignmentId, reportId } = paramsValidation.data;

	// Validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete JSON invalide');
	}

	const bodyValidation = validateReviewErrorReport(body);
	if (!bodyValidation.success) {
		throw error(400, bodyValidation.error.issues[0].message);
	}

	const { status: newStatus, response: teacherResponse } = bodyValidation.data;

	// Verify teacher access to worksheet
	const _worksheet = await verifyTeacherWorksheetAccess(locals.supabase, worksheetId, user.id);

	try {
		// Step 1: Verify the report exists and belongs to this assignment
		const { data: existingReport, error: fetchError } = await locals.supabase
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
				updated_at
			`
			)
			.eq('id', reportId)
			.eq('assignment_id', assignmentId)
			.single();

		if (fetchError || !existingReport) {
			throw error(404, 'Signalement non trouve');
		}

		// Check that report is still pending
		if (existingReport.status !== 'pending') {
			throw error(400, 'Ce signalement a deja ete traite');
		}

		// Step 2: Get exercise position
		const { data: exerciseData, error: exerciseError } = await locals.supabase
			.from('worksheet_exercises')
			.select('id, position')
			.eq('id', existingReport.worksheet_exercise_id)
			.single();

		if (exerciseError) {
			console.error('[API] Error fetching exercise position:', exerciseError);
		}

		const exercisePosition = exerciseData?.position ?? 0;

		// Step 3: Update the report
		const { data: updatedReport, error: updateError } = await locals.supabase
			.from('worksheet_error_reports')
			.update({
				status: newStatus,
				response: teacherResponse,
				reviewed_by: user.id,
				reviewed_at: new Date().toISOString()
			})
			.eq('id', reportId)
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
			`
			)
			.single();

		if (updateError || !updatedReport) {
			console.error('[API] Error updating report:', updateError);
			throw error(500, 'Erreur lors de la mise a jour du signalement');
		}

		// Step 4: Create notification for student
		await createSystemNotification(locals.supabase, {
			title: 'Signalement traite',
			message: `Votre signalement pour l'exercice ${exercisePosition + 1} a ete traite. Consultez la reponse.`,
			type: 'info',
			priority: 'normal',
			system_event_type: 'error_report_reviewed',
			target_type: 'users',
			target_user_ids: [existingReport.student_id],
			action_label: 'Voir le devoir',
			action_url: `/dashboard/student/worksheets/${assignmentId}`
		});

		// Step 5: Build response
		const studentData = updatedReport.student;
		const student = Array.isArray(studentData) ? studentData[0] : studentData;

		const reportView: TeacherErrorReportView = {
			id: updatedReport.id,
			assignment_id: updatedReport.assignment_id,
			worksheet_exercise_id: updatedReport.worksheet_exercise_id,
			exercise_position: exercisePosition,
			student_id: updatedReport.student_id,
			student_first_name: student?.firstname ?? null,
			student_last_name: student?.lastname ?? null,
			description: updatedReport.description,
			status: updatedReport.status as ErrorReportStatus,
			response: updatedReport.response,
			created_at: updatedReport.created_at,
			updated_at: updatedReport.updated_at
		};

		// Validate response
		const validated = validateJsonResponse(
			reviewErrorReportResponseSchema,
			{
				success: true as const,
				report: reportView
			},
			'PUT /api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]'
		);

		return json(validated);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error(
			'[API] Unexpected error in PUT /api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]:',
			err
		);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
