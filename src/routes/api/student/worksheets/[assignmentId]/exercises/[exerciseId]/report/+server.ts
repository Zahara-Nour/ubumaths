/**
 * POST /api/student/worksheets/[assignmentId]/exercises/[exerciseId]/report
 * ==========================================================================
 *
 * Creates an error report for a specific exercise in a worksheet assignment.
 * Students can report content errors (typos, incorrect answers, etc.) to teachers.
 *
 * AUTH: Student only (must have access to the assignment)
 *
 * URL PARAMS:
 * - assignmentId: UUID of the worksheet assignment
 * - exerciseId: UUID of the exercise (from exercises table, NOT worksheet_exercises)
 *
 * REQUEST BODY:
 * {
 *   description: string (10-1000 chars) - Description of the error
 * }
 *
 * RESPONSE (201):
 * {
 *   report: StudentErrorReportView
 * }
 *
 * ERRORS:
 * - 400: Invalid parameters or validation error
 * - 401: Not authenticated
 * - 403: Not a student or no access to assignment
 * - 404: Assignment or exercise not found
 * - 429: Maximum reports limit reached (10 per exercise)
 * - 500: Server error
 *
 * SECURITY:
 * - Access verified via can_access_assignment() RPC
 * - RLS policies enforce student can only insert reports for their own ID
 * - Application-level limit of 10 reports per exercise per student
 *
 * SIDE EFFECTS:
 * - A database trigger (on_error_report_created) automatically creates
 *   a notification for the worksheet owner (teacher)
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	validateStudentErrorReportParams,
	validateCreateErrorReport,
	createErrorReportResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import type { StudentErrorReportView, WorksheetErrorReportInsert } from '$lib/types/worksheets';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	// Auth check: Must be a student
	const { user } = await requireRole(locals, 'student');

	// Validate URL parameters
	const paramValidation = validateStudentErrorReportParams(params);
	if (!paramValidation.success) {
		throw error(400, 'Parametres invalides');
	}

	const { assignmentId, exerciseId } = paramValidation.data;

	// Validate request body
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requete JSON invalide');
	}

	const bodyValidation = validateCreateErrorReport(body);
	if (!bodyValidation.success) {
		throw error(400, bodyValidation.error.issues[0].message);
	}

	const { description } = bodyValidation.data;

	try {
		// Step 1: Verify student has access to this assignment
		const { data: canAccess } = await locals.supabase.rpc('can_access_assignment', {
			p_assignment_id: assignmentId
		});

		if (!canAccess) {
			throw error(404, 'Devoir non trouve');
		}

		// Step 2: Get the worksheet_exercise_id by matching exercise_id and assignment's worksheet
		// First get the assignment to find its worksheet_id
		const { data: assignment, error: assignmentError } = await locals.supabase
			.from('worksheet_assignments')
			.select(
				`
				id,
				worksheet_id,
				worksheets!inner (
					id,
					title,
					created_by
				)
			`
			)
			.eq('id', assignmentId)
			.single();

		if (assignmentError || !assignment) {
			console.error('[API] Error fetching assignment:', assignmentError);
			throw error(404, 'Devoir non trouve');
		}

		const worksheet = assignment.worksheets as unknown as {
			id: string;
			title: string;
			created_by: string;
		};

		// Step 3: Find the worksheet_exercise by exercise_id within this worksheet
		const { data: worksheetExercise, error: weError } = await locals.supabase
			.from('worksheet_exercises')
			.select('id, position')
			.eq('worksheet_id', worksheet.id)
			.eq('exercise_id', exerciseId)
			.single();

		if (weError || !worksheetExercise) {
			console.error('[API] Error fetching worksheet exercise:', weError);
			throw error(404, 'Exercice non trouve dans ce devoir');
		}

		// Step 4: Check report limit (max 10 per exercise per student)
		const MAX_REPORTS_PER_EXERCISE = 10;
		const { count: existingReportsCount, error: countError } = await locals.supabase
			.from('worksheet_error_reports')
			.select('id', { count: 'exact', head: true })
			.eq('worksheet_exercise_id', worksheetExercise.id)
			.eq('student_id', user.id);

		if (countError) {
			console.error('[API] Error counting existing reports:', countError);
			throw error(500, 'Erreur lors de la verification des signalements');
		}

		if ((existingReportsCount ?? 0) >= MAX_REPORTS_PER_EXERCISE) {
			throw error(
				429,
				`Limite de ${MAX_REPORTS_PER_EXERCISE} signalements atteinte pour cet exercice`
			);
		}

		// Step 5: Insert the error report
		const reportInsert: WorksheetErrorReportInsert = {
			assignment_id: assignmentId,
			worksheet_exercise_id: worksheetExercise.id,
			student_id: user.id,
			description
		};

		const { data: newReport, error: insertError } = await locals.supabase
			.from('worksheet_error_reports')
			.insert(reportInsert)
			.select('id, worksheet_exercise_id, description, status, response, created_at, updated_at')
			.single();

		if (insertError) {
			console.error('[API] Error inserting error report:', insertError);
			throw error(500, 'Erreur lors de la creation du signalement');
		}

		// Note: Notification is created automatically by database trigger
		// (see migration: 20251213100000_error_report_notification_trigger.sql)

		// Step 6: Build response
		const reportView: StudentErrorReportView = {
			id: newReport.id,
			worksheet_exercise_id: newReport.worksheet_exercise_id,
			exercise_position: worksheetExercise.position,
			description: newReport.description,
			status: newReport.status as StudentErrorReportView['status'],
			response: newReport.response,
			created_at: newReport.created_at,
			updated_at: newReport.updated_at
		};

		// Validate response
		const validated = validateJsonResponse(
			createErrorReportResponseSchema,
			{ report: reportView },
			'POST /api/student/worksheets/[assignmentId]/exercises/[exerciseId]/report'
		);

		return json(validated, { status: 201 });
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error(
			'[API] Unexpected error in POST /api/student/worksheets/[assignmentId]/exercises/[exerciseId]/report:',
			err
		);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
