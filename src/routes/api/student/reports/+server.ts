/**
 * GET /api/student/reports
 * =========================
 *
 * Returns the list of error reports submitted by the authenticated student.
 * Supports filtering by status and assignmentId, with pagination.
 *
 * AUTH: Student only
 *
 * QUERY PARAMS:
 * - status: 'pending' | 'fixed' | 'rejected' | 'all' (default: 'all')
 * - assignmentId: UUID (optional) - filter by specific assignment
 * - page: number (default: 1, max: 1000)
 * - limit: number (default: 10, max: 50)
 *
 * RESPONSE (200):
 * {
 *   reports: StudentErrorReportWithDisplay[],
 *   pagination: { page, limit, total, totalPages }
 * }
 *
 * Each report includes:
 * - id, worksheet_exercise_id, exercise_position, description, status, response
 * - created_at, updated_at
 * - assignment_id, worksheet_id, worksheet_title, assignment_title
 *
 * ERRORS:
 * - 400: Invalid query parameters
 * - 401: Not authenticated
 * - 403: Not a student
 * - 500: Server error
 *
 * SORTING: Results are sorted by created_at DESC (newest first)
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	validateStudentReportsQuery,
	studentReportsListResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import type { StudentErrorReportWithDisplay } from '$lib/types/worksheets';

// Type guards for Supabase nested joins
type SupabaseNestedWorksheetExercise = {
	position: number;
	worksheet_id: string;
	worksheets: {
		id: string;
		title: string;
	};
};

type SupabaseNestedAssignment = {
	id: string;
	title: string | null;
};

function isValidWorksheetExercise(obj: unknown): obj is SupabaseNestedWorksheetExercise {
	if (!obj || typeof obj !== 'object') return false;
	const ex = obj as Record<string, unknown>;
	return (
		typeof ex.position === 'number' &&
		typeof ex.worksheet_id === 'string' &&
		typeof ex.worksheets === 'object' &&
		ex.worksheets !== null
	);
}

function isValidAssignment(obj: unknown): obj is SupabaseNestedAssignment {
	if (!obj || typeof obj !== 'object') return false;
	const a = obj as Record<string, unknown>;
	return typeof a.id === 'string' && (a.title === null || typeof a.title === 'string');
}

export const GET: RequestHandler = async ({ locals, url }) => {
	// Auth check: Must be a student
	const { user } = await requireRole(locals, 'student');

	// Validate query parameters
	const queryValidation = validateStudentReportsQuery(url.searchParams);
	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { status, assignmentId, page, limit } = queryValidation.data;

	try {
		// Build the base query with joins for display information
		// Join path: worksheet_error_reports -> worksheet_exercises -> worksheets
		//            worksheet_error_reports -> worksheet_assignments
		let query = locals.supabase
			.from('worksheet_error_reports')
			.select(
				`
				id,
				assignment_id,
				worksheet_exercise_id,
				description,
				status,
				response,
				created_at,
				updated_at,
				worksheet_exercises!inner (
					position,
					worksheet_id,
					worksheets!inner (
						id,
						title
					)
				),
				worksheet_assignments!inner (
					id,
					title
				)
			`,
				{ count: 'exact' }
			)
			.eq('student_id', user.id)
			.order('created_at', { ascending: false });

		// Apply status filter (if not 'all')
		if (status !== 'all') {
			query = query.eq('status', status);
		}

		// Apply assignmentId filter if provided
		if (assignmentId) {
			query = query.eq('assignment_id', assignmentId);
		}

		// Apply pagination
		const from = (page - 1) * limit;
		const to = from + limit - 1;
		query = query.range(from, to);

		const { data: reports, error: queryError, count } = await query;

		if (queryError) {
			console.error('[API] Error fetching student reports:', queryError);
			throw error(500, 'Erreur lors de la recuperation des signalements');
		}

		// Transform the nested data into flat response structure
		const transformedReports: StudentErrorReportWithDisplay[] = (reports || []).map((report) => {
			// Runtime validation for nested data from Supabase
			const worksheetExercise = report.worksheet_exercises;
			const assignment = report.worksheet_assignments;

			if (!isValidWorksheetExercise(worksheetExercise)) {
				console.error('[API] Invalid worksheet_exercises structure:', worksheetExercise);
				throw error(500, 'Erreur de structure de donnees');
			}

			if (!isValidAssignment(assignment)) {
				console.error('[API] Invalid worksheet_assignments structure:', assignment);
				throw error(500, 'Erreur de structure de donnees');
			}

			return {
				id: report.id,
				worksheet_exercise_id: report.worksheet_exercise_id,
				exercise_position: worksheetExercise.position,
				description: report.description,
				status: report.status as StudentErrorReportWithDisplay['status'],
				response: report.response,
				created_at: report.created_at,
				updated_at: report.updated_at,
				assignment_id: report.assignment_id,
				worksheet_id: worksheetExercise.worksheets.id,
				worksheet_title: worksheetExercise.worksheets.title,
				assignment_title: assignment.title
			};
		});

		// Defensive handling of count
		const total = typeof count === 'number' ? count : 0;
		const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;

		// Validate and return response
		const validated = validateJsonResponse(
			studentReportsListResponseSchema,
			{
				reports: transformedReports,
				pagination: {
					page,
					limit,
					total,
					totalPages
				}
			},
			'GET /api/student/reports'
		);

		return json(validated);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in GET /api/student/reports:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
