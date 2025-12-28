/**
 * API Route: /api/worksheets/[id]/reports
 *
 * Teacher API for viewing all error reports across all assignments of a worksheet.
 * Provides an aggregated view with assignment filtering.
 *
 * GET - List all error reports with pagination, filtering by status and assignment
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { z } from 'zod';
import type { ErrorReportStatus } from '$lib/types/worksheets';

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const querySchema = z.object({
	assignmentId: z.string().uuid().optional(),
	status: z.enum(['pending', 'fixed', 'rejected']).optional(),
	page: z.coerce.number().int().min(1).default(1),
	limit: z.coerce.number().int().min(1).max(100).default(50)
});

// ============================================================================
// TYPES
// ============================================================================

interface AssignmentInfo {
	id: string;
	title: string | null;
	class_names: string[];
}

interface WorksheetReportView {
	id: string;
	assignment_id: string;
	assignment_title: string | null;
	assignment_class_names: string[];
	worksheet_exercise_id: string;
	exercise_position: number;
	student_id: string;
	student_first_name: string | null;
	student_last_name: string | null;
	description: unknown;
	status: ErrorReportStatus;
	response: unknown | null;
	created_at: string;
	updated_at: string;
}

// ============================================================================
// GET HANDLER - List all error reports for worksheet
// ============================================================================

/**
 * GET /api/worksheets/[id]/reports
 *
 * Returns aggregated list of error reports for all assignments of this worksheet.
 *
 * Query params:
 * - assignmentId: UUID (optional - filter by specific assignment)
 * - status: 'pending' | 'fixed' | 'rejected' (optional filter)
 * - page: number (default 1)
 * - limit: number (default 50, max 100)
 *
 * Response:
 * {
 *   reports: WorksheetReportView[],
 *   counts: { pending, fixed, rejected, total },
 *   assignments: AssignmentInfo[],
 *   pagination: { page, limit, total, totalPages }
 * }
 */
export const GET: RequestHandler = async ({ locals, params, url }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);

	// Validate worksheet ID
	const worksheetId = params.id;
	if (!worksheetId || !z.string().uuid().safeParse(worksheetId).success) {
		throw error(400, 'Format UUID invalide pour la feuille');
	}

	// Validate query parameters
	const queryParams: Record<string, string> = {};
	for (const [key, value] of url.searchParams.entries()) {
		queryParams[key] = value;
	}
	const queryValidation = querySchema.safeParse(queryParams);
	if (!queryValidation.success) {
		throw error(400, queryValidation.error.issues[0].message);
	}

	const { assignmentId, status: statusFilter, page, limit } = queryValidation.data;

	// Verify teacher owns this worksheet
	const { data: worksheet, error: worksheetError } = await locals.supabase
		.from('worksheets')
		.select('id, created_by, title')
		.eq('id', worksheetId)
		.single();

	if (worksheetError || !worksheet) {
		throw error(404, 'Feuille de travail non trouvee');
	}

	if (worksheet.created_by !== user.id) {
		// Check if admin
		const { data: profile } = await locals.supabase
			.from('profiles')
			.select('role')
			.eq('id', user.id)
			.single();

		if (profile?.role !== 'admin') {
			throw error(403, 'Acces non autorise a cette feuille de travail');
		}
	}

	try {
		// Step 1: Get all assignments for this worksheet with class info
		const { data: assignments, error: assignmentsError } = await locals.supabase
			.from('worksheet_assignments')
			.select(
				`
				id,
				title,
				worksheet_assignment_classes (
					class:classes (
						id,
						name
					)
				)
			`
			)
			.eq('worksheet_id', worksheetId);

		if (assignmentsError) {
			console.error('[API] Error fetching assignments:', assignmentsError);
			throw error(500, 'Erreur lors de la recuperation des devoirs');
		}

		if (!assignments || assignments.length === 0) {
			// No assignments, return empty result
			return json({
				reports: [],
				counts: { pending: 0, fixed: 0, rejected: 0, total: 0 },
				assignments: [],
				pagination: { page: 1, limit, total: 0, totalPages: 0 }
			});
		}

		// Build assignment info map
		const assignmentMap = new Map<string, AssignmentInfo>();
		for (const a of assignments) {
			const classNames: string[] = [];
			if (a.worksheet_assignment_classes) {
				for (const wac of a.worksheet_assignment_classes as unknown[]) {
					// Supabase may return class as object or array depending on the relation
					const wacTyped = wac as {
						class: { id: string; name: string } | { id: string; name: string }[] | null;
					};
					if (wacTyped.class) {
						const classData = Array.isArray(wacTyped.class) ? wacTyped.class[0] : wacTyped.class;
						if (classData?.name) {
							classNames.push(classData.name);
						}
					}
				}
			}
			assignmentMap.set(a.id, {
				id: a.id,
				title: a.title,
				class_names: classNames
			});
		}

		const assignmentIds = assignments.map((a) => a.id);
		const filteredAssignmentIds = assignmentId ? [assignmentId] : assignmentIds;

		// Step 2: Get counts per status for all reports (or filtered by assignment)
		const { data: allReports, error: countError } = await locals.supabase
			.from('worksheet_error_reports')
			.select('id, status, assignment_id')
			.in('assignment_id', filteredAssignmentIds);

		if (countError) {
			console.error('[API] Error counting reports:', countError);
			throw error(500, 'Erreur lors du comptage des signalements');
		}

		// Calculate counts
		const counts = { pending: 0, fixed: 0, rejected: 0, total: 0 };
		for (const report of allReports ?? []) {
			counts.total++;
			if (report.status === 'pending') counts.pending++;
			else if (report.status === 'fixed') counts.fixed++;
			else if (report.status === 'rejected') counts.rejected++;
		}

		// Step 3: Build query for filtered reports with pagination
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
			.in('assignment_id', filteredAssignmentIds)
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

		// Step 4: Get exercise positions
		const worksheetExerciseIds = [...new Set((reports ?? []).map((r) => r.worksheet_exercise_id))];
		const exercisePositions = new Map<string, number>();

		if (worksheetExerciseIds.length > 0) {
			const { data: exercises, error: exercisesError } = await locals.supabase
				.from('worksheet_exercises')
				.select('id, position')
				.in('id', worksheetExerciseIds);

			if (!exercisesError && exercises) {
				for (const e of exercises) {
					exercisePositions.set(e.id, e.position);
				}
			}
		}

		// Step 5: Transform to WorksheetReportView
		const reportViews: WorksheetReportView[] = (reports ?? []).map((report) => {
			const studentData = report.student;
			const student = Array.isArray(studentData) ? studentData[0] : studentData;
			const assignmentInfo = assignmentMap.get(report.assignment_id);

			return {
				id: report.id,
				assignment_id: report.assignment_id,
				assignment_title: assignmentInfo?.title ?? null,
				assignment_class_names: assignmentInfo?.class_names ?? [],
				worksheet_exercise_id: report.worksheet_exercise_id,
				exercise_position: exercisePositions.get(report.worksheet_exercise_id) ?? 0,
				student_id: report.student_id,
				student_first_name: (student as { firstname?: string })?.firstname ?? null,
				student_last_name: (student as { lastname?: string })?.lastname ?? null,
				description: report.description,
				status: report.status as ErrorReportStatus,
				response: report.response,
				created_at: report.created_at,
				updated_at: report.updated_at
			};
		});

		// Step 6: Calculate pagination
		const total = totalFiltered ?? 0;
		const totalPages = Math.ceil(total / limit);

		// Build assignments list for filter dropdown
		const assignmentsList: AssignmentInfo[] = Array.from(assignmentMap.values());

		return json({
			reports: reportViews,
			counts,
			assignments: assignmentsList,
			pagination: { page, limit, total, totalPages }
		});
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in GET /api/worksheets/[id]/reports:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
