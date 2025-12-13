/**
 * GET /api/student/worksheets
 * ============================
 *
 * Returns the list of worksheet assignments available to the logged-in student.
 * Includes both class-based assignments and individual assignments.
 *
 * AUTH: Student only
 *
 * QUERY PARAMS:
 * - class_id (optional): Filter by class UUID
 * - page (default 1): Page number (1-1000)
 * - limit (default 50, max 100): Items per page
 *
 * RESPONSE:
 * {
 *   worksheets: StudentWorksheetListItem[],
 *   pagination: { page, limit, total, totalPages }
 * }
 *
 * SECURITY:
 * - RLS policies ensure students only see active assignments they have access to
 * - Assignments must have status='active' and available_from <= NOW()
 * - Access via class membership or individual assignment
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	validateStudentWorksheetsQuery,
	studentWorksheetsListResponseSchema
} from '$lib/server/validation/worksheets';
import { validateJsonResponse } from '$lib/server/validation/response-utils';
import type { StudentWorksheetListItem } from '$lib/types/worksheets';

export const GET: RequestHandler = async ({ locals, url }) => {
	// Auth check: Must be a student
	await requireRole(locals, 'student');

	// Validate query parameters
	const queryValidation = validateStudentWorksheetsQuery(url.searchParams);
	if (!queryValidation.success) {
		const errorMsg = queryValidation.error.issues
			.map((e) => `${e.path.join('.')}: ${e.message}`)
			.join('; ');
		throw error(400, `Parametres invalides: ${errorMsg}`);
	}

	const { page, limit, class_id } = queryValidation.data;

	try {
		// Build the base query for assignments accessible to this student
		// Note: RLS policies handle the access control, but we add explicit filters
		// for clarity and defense-in-depth
		let query = locals.supabase
			.from('worksheet_assignments')
			.select(
				`
				id,
				worksheet_id,
				class_id,
				available_from,
				closes_at,
				show_corrections,
				worksheets!inner (
					id,
					title,
					type
				),
				classes (
					id,
					name
				)
			`,
				{ count: 'exact' }
			)
			.eq('status', 'active')
			.or(`available_from.is.null,available_from.lte.${new Date().toISOString()}`);

		// Filter by class_id if provided
		if (class_id) {
			query = query.eq('class_id', class_id);
		}

		// Apply pagination
		const from = (page - 1) * limit;
		const to = from + limit - 1;
		query = query.range(from, to).order('available_from', { ascending: false, nullsFirst: false });

		const { data: assignments, error: dbError, count } = await query;

		if (dbError) {
			console.error('[API] Error fetching student worksheets:', dbError);
			throw error(500, 'Erreur lors de la recuperation des fiches');
		}

		// Helper to extract first element from join result (can be array or object)
		const getFirstOrSelf = <T>(val: T | T[]): T => (Array.isArray(val) ? val[0] : val);

		// Get exercise counts for all worksheets in a separate query
		const worksheetIds = [
			...new Set(
				(assignments ?? []).map((a) => {
					const worksheet = getFirstOrSelf(
						a.worksheets as unknown as { id: string; title: string; type: string }
					);
					return worksheet.id;
				})
			)
		];

		const exerciseCountMap = new Map<string, number>();

		if (worksheetIds.length > 0) {
			const { data: exerciseCounts } = await locals.supabase
				.from('worksheet_exercises')
				.select('worksheet_id')
				.in('worksheet_id', worksheetIds);

			if (exerciseCounts) {
				// Count exercises per worksheet
				for (const ec of exerciseCounts) {
					const current = exerciseCountMap.get(ec.worksheet_id) ?? 0;
					exerciseCountMap.set(ec.worksheet_id, current + 1);
				}
			}
		}

		// Transform to response format
		const worksheets: StudentWorksheetListItem[] = (assignments ?? []).map((assignment) => {
			const worksheet = getFirstOrSelf(
				assignment.worksheets as unknown as { id: string; title: string; type: string }
			);
			const classData = getFirstOrSelf(
				assignment.classes as unknown as { id: string; name: string } | null
			);

			return {
				assignment_id: assignment.id,
				worksheet_id: worksheet.id,
				title: worksheet.title,
				type: worksheet.type as StudentWorksheetListItem['type'],
				class_id: assignment.class_id,
				class_name: classData?.name ?? null,
				available_from: assignment.available_from,
				closes_at: assignment.closes_at,
				show_corrections: assignment.show_corrections ?? false,
				exercise_count: exerciseCountMap.get(worksheet.id) ?? 0
			};
		});

		const total = count ?? 0;
		const totalPages = Math.ceil(total / limit);

		// Validate response
		const validated = validateJsonResponse(
			studentWorksheetsListResponseSchema,
			{
				worksheets,
				pagination: {
					page,
					limit,
					total,
					totalPages
				}
			},
			'GET /api/student/worksheets'
		);

		return json(validated);
	} catch (err) {
		// Re-throw SvelteKit errors
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}

		console.error('[API] Unexpected error in GET /api/student/worksheets:', err);
		throw error(500, 'Une erreur inattendue est survenue');
	}
};
