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

/**
 * Une ligne rendue par `get_my_error_reports()`.
 *
 * La fonction est SECURITY DEFINER et absente de `database.ts`, généré depuis
 * la production : le contrat est donc décrit ici, et vérifié à l'exécution par
 * {@link isReportRow} — un type seul ne prouve rien de ce que la base renvoie.
 */
interface OwnErrorReportRow {
	id: string;
	assignment_id: string;
	worksheet_exercise_id: string;
	exercise_position: number;
	worksheet_id: string;
	worksheet_title: string;
	assignment_title: string | null;
	description: string;
	status: string;
	response: string | null;
	created_at: string;
	updated_at: string;
}

function isReportRow(value: unknown): value is OwnErrorReportRow {
	if (!value || typeof value !== 'object') return false;
	const row = value as Record<string, unknown>;
	return (
		typeof row.id === 'string' &&
		typeof row.assignment_id === 'string' &&
		typeof row.worksheet_exercise_id === 'string' &&
		typeof row.exercise_position === 'number' &&
		typeof row.worksheet_id === 'string' &&
		typeof row.worksheet_title === 'string' &&
		(row.assignment_title === null || typeof row.assignment_title === 'string') &&
		typeof row.description === 'string' &&
		typeof row.status === 'string' &&
		(row.response === null || typeof row.response === 'string') &&
		typeof row.created_at === 'string' &&
		typeof row.updated_at === 'string'
	);
}

export const GET: RequestHandler = async ({ locals, url }) => {
	// Auth check: Must be a student. L'identité n'est plus reprise ici : c'est
	// `get_my_error_reports()` qui borne à `auth.uid()`, côté base.
	await requireRole(locals, 'student');

	// Validate query parameters
	const queryValidation = validateStudentReportsQuery(url.searchParams);
	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { status, assignmentId, page, limit } = queryValidation.data;

	try {
		// Les signalements de l'élève, par une fonction dédiée.
		//
		// La requête PostgREST joignait `worksheet_exercises!inner`,
		// `worksheets!inner` et `worksheet_assignments!inner` pour afficher le
		// contexte. Un `!inner` exige que la ligne jointe soit VISIBLE : depuis que
		// l'élève archivé perd l'accès aux fiches de la classe quittée, sa liste se
		// vidait en silence, emportant ses propres signalements et les réponses du
		// professeur. La fiche appartient à la classe, le signalement à l'élève.
		//
		// La fonction est bornée à `student_id = auth.uid()` et ne rend que trois
		// colonnes de contexte : elle ne rouvre pas la fiche.
		const { data: rawReports, error: queryError } =
			await locals.supabase.rpc('get_my_error_reports');

		if (queryError) {
			console.error('[API] Error fetching student reports:', queryError);
			throw error(500, 'Erreur lors de la recuperation des signalements');
		}

		const allReports = (rawReports ?? []) as unknown[];

		// Filtres et pagination en mémoire : un élève a quelques dizaines de
		// signalements au plus, et les reproduire en SQL doublerait la garde
		// `student_id = auth.uid()` sans rien apporter.
		const filtered = allReports.filter((row) => {
			if (!isReportRow(row)) {
				console.error('[API] Ligne de signalement inattendue :', row);
				throw error(500, 'Erreur de structure de donnees');
			}
			if (status !== 'all' && row.status !== status) return false;
			if (assignmentId && row.assignment_id !== assignmentId) return false;
			return true;
		}) as OwnErrorReportRow[];

		const from = (page - 1) * limit;
		const reports = filtered.slice(from, from + limit);

		const transformedReports: StudentErrorReportWithDisplay[] = reports.map((report) => ({
			id: report.id,
			worksheet_exercise_id: report.worksheet_exercise_id,
			exercise_position: report.exercise_position,
			description: report.description,
			status: report.status as StudentErrorReportWithDisplay['status'],
			response: report.response,
			created_at: report.created_at,
			updated_at: report.updated_at,
			assignment_id: report.assignment_id,
			worksheet_id: report.worksheet_id,
			worksheet_title: report.worksheet_title,
			assignment_title: report.assignment_title
		}));

		const total = filtered.length;
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
