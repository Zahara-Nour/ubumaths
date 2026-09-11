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
import { fetchClassesByAssignment } from '$lib/server/worksheets/assignment-classes';
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
				available_from,
				closes_at,
				show_corrections,
				worksheets!inner (
					id,
					title,
					type
				)
			`,
				{ count: 'exact' }
			)
			.eq('status', 'active')
			.or(`available_from.is.null,available_from.lte.${new Date().toISOString()}`);

		// Restriction à une classe : la JONCTION, pas la colonne historique.
		//
		// `worksheet_assignments.class_id` ne porte que la PREMIÈRE classe de
		// l'affectation. Filtrer dessus renvoyait une liste VIDE à l'élève d'une
		// seconde classe — et la page « Mon cours » d'un chapitre, qui appelle cet
		// endpoint avec `?class_id=`, lui annonçait qu'aucune fiche n'existait.
		if (class_id) {
			const { data: liens, error: liensError } = await locals.supabase
				.from('worksheet_assignment_classes')
				.select('assignment_id')
				.eq('class_id', class_id);

			// Ce filtre borne la liste. Vidé par une panne, il affiche un écran vide
			// qui accuse la base plutôt que la lecture.
			if (liensError) {
				console.error('[API] Classes des affectations illisibles :', liensError);
				throw error(500, 'Erreur lors de la recuperation des fiches');
			}

			query = query.in(
				'id',
				(liens ?? []).map((l) => l.assignment_id)
			);
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

		// La classe rapportée à l'élève est la SIENNE. La RLS ne lui montre de la
		// jonction que les lignes de ses propres classes : lui afficher le nom
		// tiré de la colonne historique désignait une classe dont il pouvait
		// parfaitement ne pas être membre.
		const classesByAssignment = await fetchClassesByAssignment(
			locals.supabase,
			(assignments ?? []).map((a) => a.id)
		);

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
			const { data: exerciseCounts, error: exerciseCountsError } = await locals.supabase
				.from('worksheet_exercises')
				.select('worksheet_id')
				.in('worksheet_id', worksheetIds);

			// Enrichissement d'affichage : son absence ne ferme pas l'écran, mais elle
			// laisse une trace.
			if (exerciseCountsError) {
				console.error('Enrichissement illisible :', exerciseCountsError);
			}

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
			const classeEleve = classesByAssignment.get(assignment.id)?.[0] ?? null;

			return {
				assignment_id: assignment.id,
				worksheet_id: worksheet.id,
				title: worksheet.title,
				type: worksheet.type as StudentWorksheetListItem['type'],
				class_id: classeEleve?.id ?? null,
				class_name: classeEleve?.name || null,
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
