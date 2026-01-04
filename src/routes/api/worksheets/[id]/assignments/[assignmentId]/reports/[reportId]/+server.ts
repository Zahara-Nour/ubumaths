/**
 * API Route: /api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]
 *
 * Teacher API for reviewing a specific error report.
 *
 * GET - Get detailed error report with exercise content for review
 * PUT - Review an error report (mark as fixed/rejected with optional response)
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import {
	validateErrorReportParams,
	validateReviewErrorReport,
	reviewErrorReportResponseSchema,
	getErrorReportDetailResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import {
	notifyErrorReportValidated,
	notifyErrorReportRejected
} from '$lib/server/auto-notifications';
import type { TeacherErrorReportView, ErrorReportStatus } from '$lib/types/worksheets';
import { getExerciseContentSafe, type Exercise } from '$lib/exercises/types';

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
// GET HANDLER - Get error report detail for review
// ============================================================================

/**
 * GET /api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]
 *
 * Get detailed error report with original exercise content for teacher review.
 *
 * Response:
 * {
 *   report: TeacherErrorReportView & { statement_md, solution_md },
 *   context: { worksheet_title, student_name, exercise_position },
 *   next_pending_report_id: string | null
 * }
 */
export const GET: RequestHandler = async ({ locals, params }) => {
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

	// Verify teacher access to worksheet
	const worksheet = await verifyTeacherWorksheetAccess(locals.supabase, worksheetId, user.id);

	try {
		// Step 1: Fetch the report with all related data
		const { data: reportData, error: reportError } = await locals.supabase
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
				),
				worksheet_exercise:worksheet_exercises!worksheet_error_reports_worksheet_exercise_id_fkey (
					id,
					position,
					exercise_id,
					exercise:exercises!worksheet_exercises_exercise_id_fkey (
						id,
						shared,
						variations
					)
				)
			`
			)
			.eq('id', reportId)
			.eq('assignment_id', assignmentId)
			.single();

		if (reportError || !reportData) {
			console.error('[API] Error fetching report:', reportError);
			throw error(404, 'Signalement non trouve');
		}

		// Extract nested data safely
		const studentData = reportData.student;
		const student = Array.isArray(studentData) ? studentData[0] : studentData;

		const worksheetExerciseData = reportData.worksheet_exercise;
		const worksheetExercise = Array.isArray(worksheetExerciseData)
			? worksheetExerciseData[0]
			: worksheetExerciseData;

		if (!worksheetExercise) {
			throw error(500, 'Exercice du signalement non trouve');
		}

		const exerciseData = worksheetExercise.exercise;
		const exercise = Array.isArray(exerciseData) ? exerciseData[0] : exerciseData;

		if (!exercise) {
			throw error(500, "Donnees de l'exercice non trouvees");
		}

		// Get content from variations (single source of truth)
		const exerciseContent = getExerciseContentSafe(exercise as unknown as Exercise);

		// Step 2: Find next pending report for this assignment (for navigation)
		const { data: nextPendingReports, error: nextError } = await locals.supabase
			.from('worksheet_error_reports')
			.select('id')
			.eq('assignment_id', assignmentId)
			.eq('status', 'pending')
			.neq('id', reportId)
			.order('created_at', { ascending: true })
			.limit(1);

		if (nextError) {
			console.error('[API] Error fetching next pending report:', nextError);
		}

		const nextPendingReportId = nextPendingReports?.[0]?.id ?? null;

		// Step 3: Build response
		const studentName =
			student?.firstname && student?.lastname
				? `${student.firstname} ${student.lastname}`
				: (student?.firstname ?? student?.lastname ?? 'Etudiant inconnu');

		const reportView = {
			id: reportData.id,
			assignment_id: reportData.assignment_id,
			worksheet_exercise_id: reportData.worksheet_exercise_id,
			exercise_position: worksheetExercise.position ?? 0,
			student_id: reportData.student_id,
			student_first_name: student?.firstname ?? null,
			student_last_name: student?.lastname ?? null,
			description: reportData.description,
			status: reportData.status as ErrorReportStatus,
			response: reportData.response,
			created_at: reportData.created_at,
			updated_at: reportData.updated_at,
			statement_md: exerciseContent.statement_md,
			solution_md: exerciseContent.solution_md
		};

		const responseData = {
			report: reportView,
			context: {
				worksheet_title: worksheet.title,
				student_name: studentName,
				exercise_position: worksheetExercise.position ?? 0
			},
			next_pending_report_id: nextPendingReportId
		};

		// Validate response
		const validated = validateJsonResponse(
			getErrorReportDetailResponseSchema,
			responseData,
			'GET /api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]'
		);

		return json(validated);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error(
			'[API] Unexpected error in GET /api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]:',
			err
		);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};

// ============================================================================
// PUT HANDLER - Review an error report
// ============================================================================

/**
 * PUT /api/worksheets/[id]/assignments/[assignmentId]/reports/[reportId]
 *
 * Review an error report by marking it as fixed or rejected.
 * When status is 'fixed':
 * - Updates the original exercise content (statement_md, solution_md)
 * - Awards 1 bonus point to the student
 * - Creates a notification for the student
 *
 * When status is 'rejected':
 * - Requires a response (rejection reason)
 * - Creates a notification for the student
 *
 * Request body:
 * {
 *   status: 'fixed' | 'rejected',
 *   response?: string | null,
 *   statement_md?: string (required if fixed),
 *   solution_md?: string | null (optional if fixed)
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

	const {
		status: newStatus,
		response: teacherResponse,
		statement_md: newStatementMd,
		solution_md: newSolutionMd
	} = bodyValidation.data;

	// Verify teacher access to worksheet
	const worksheet = await verifyTeacherWorksheetAccess(locals.supabase, worksheetId, user.id);

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

		// Step 2: Get exercise data (position and exercise_id)
		const { data: worksheetExerciseData, error: worksheetExerciseError } = await locals.supabase
			.from('worksheet_exercises')
			.select('id, position, exercise_id')
			.eq('id', existingReport.worksheet_exercise_id)
			.single();

		if (worksheetExerciseError || !worksheetExerciseData) {
			console.error('[API] Error fetching worksheet exercise:', worksheetExerciseError);
			throw error(500, 'Exercice du signalement non trouve');
		}

		const exercisePosition = worksheetExerciseData.position ?? 0;
		const exerciseId = worksheetExerciseData.exercise_id;

		// Step 3: Get assignment data for class_id (needed for bonus)
		const { data: assignmentData, error: assignmentError } = await locals.supabase
			.from('worksheet_assignments')
			.select('class_id')
			.eq('id', assignmentId)
			.single();

		if (assignmentError) {
			console.error('[API] Error fetching assignment:', assignmentError);
		}

		const classId = assignmentData?.class_id;

		// Step 4: If status is 'fixed', update the original exercise
		if (newStatus === 'fixed' && newStatementMd) {
			const exerciseUpdate: { statement_md: string; solution_md?: string | null } = {
				statement_md: newStatementMd
			};

			// Only update solution_md if it was provided (could be null to clear it)
			if (newSolutionMd !== undefined) {
				exerciseUpdate.solution_md = newSolutionMd;
			}

			const { error: exerciseUpdateError } = await locals.supabase
				.from('exercises')
				.update(exerciseUpdate)
				.eq('id', exerciseId);

			if (exerciseUpdateError) {
				console.error('[API] Error updating exercise:', exerciseUpdateError);
				throw error(500, "Erreur lors de la mise a jour de l'exercice");
			}

			// Step 5: Award bonus to student (only if class_id is available)
			if (classId) {
				const { error: bonusError } = await locals.supabase.rpc('update_student_bonus', {
					p_student_id: existingReport.student_id,
					p_class_id: classId,
					p_delta: 1,
					p_reason: "Correction d'une erreur"
				});

				if (bonusError) {
					// Log but don't fail the request - bonus is a nice-to-have
					console.error('[API] Error awarding bonus:', bonusError);
				}
			} else {
				console.warn(
					'[API] No class_id found for assignment, skipping bonus award for student:',
					existingReport.student_id
				);
			}
		}

		// Step 6: Update the report
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

		// Step 7: Create notification for student
		if (newStatus === 'fixed') {
			await notifyErrorReportValidated(locals.supabase, {
				studentId: existingReport.student_id,
				worksheetTitle: worksheet.title,
				exercisePosition: exercisePosition + 1 // 1-indexed for display
			});
		} else {
			await notifyErrorReportRejected(locals.supabase, {
				studentId: existingReport.student_id,
				worksheetTitle: worksheet.title,
				exercisePosition: exercisePosition + 1, // 1-indexed for display
				response: teacherResponse ?? undefined
			});
		}

		// Step 8: Build response
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
