/**
 * API Route: /api/schools/[schoolId]/years/[yearId]/stats
 * GET - Get academic period statistics for a school year
 *
 * Returns all periods with their assessment counts for visualization
 * and monitoring purposes.
 *
 * @auth Teacher/Admin only
 * @returns Array of periods with assessment counts
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { schoolYearParamsSchema } from '$lib/server/validation/schools';

/**
 * GET /api/schools/[schoolId]/years/[yearId]/stats
 * Get statistics about academic periods and their assessments
 */
export const GET: RequestHandler = async ({ params, locals }) => {
	// 1. Auth check
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Non autorisé');
	}

	// 2. Validate URL parameters
	const paramsValidation = schoolYearParamsSchema.safeParse(params);
	if (!paramsValidation.success) {
		throw error(400, 'Format des paramètres invalide');
	}

	const { schoolId, yearId } = paramsValidation.data;

	// 3. Verify teacher or admin role
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role, school_id')
		.eq('id', user.id)
		.single();

	if (!profile || !['teacher', 'admin'].includes(profile.role)) {
		throw error(403, 'Accès refusé - Enseignants et admins uniquement');
	}

	// 4. Verify user's school matches
	if (profile.school_id !== schoolId) {
		throw error(403, 'Accès refusé - École non autorisée');
	}

	// 5. Verify school year exists and belongs to school
	const { data: schoolYear, error: yearError } = await locals.supabase
		.from('school_years')
		.select('id, name')
		.eq('id', yearId)
		.eq('school_id', schoolId)
		.single();

	if (yearError || !schoolYear) {
		console.error('School year not found:', { yearId, schoolId, error: yearError });
		throw error(404, 'Année scolaire non trouvée');
	}

	// 6. Fetch periods with assessment counts
	// We need to manually count since Supabase doesn't support aggregations in foreign tables
	const { data: periods, error: periodsError } = await locals.supabase
		.from('academic_periods')
		.select(
			`
			id,
			name,
			type,
			start_date,
			end_date,
			period_order
		`
		)
		.eq('school_year_id', yearId)
		.order('period_order', { ascending: true });

	if (periodsError) {
		console.error('Error fetching periods:', periodsError);
		throw error(500, 'Erreur lors de la récupération des périodes');
	}

	// 7. For each period, count assessments
	const periodsWithCounts = await Promise.all(
		(periods || []).map(async (period) => {
			const { count, error: countError } = await locals.supabase
				.from('assessments')
				.select('id', { count: 'exact', head: true })
				.eq('academic_period_id', period.id);

			if (countError) {
				console.error('Error counting assessments for period:', {
					periodId: period.id,
					error: countError
				});
			}

			return {
				...period,
				assessments_count: count || 0
			};
		})
	);

	// 8. Return formatted response
	return json({
		periods: periodsWithCounts
	});
};
