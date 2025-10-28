/**
 * API Route: /api/schools/[schoolId]/years/[yearId]/link-assessments
 * POST - Manually link existing assessments to academic periods
 *
 * This endpoint calls the SQL function `link_existing_assessments_to_periods()`
 * which assigns assessments to periods based on their creation date.
 *
 * @auth Admin only
 * @returns Count of assessments linked to periods
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { schoolYearParamsSchema } from '$lib/server/validation/schools';

/**
 * POST /api/schools/[schoolId]/years/[yearId]/link-assessments
 * Manually trigger the linking of assessments to periods for a specific school year
 */
export const POST: RequestHandler = async ({ params, locals }) => {
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

	// 3. Verify admin role
	const { data: profile } = await locals.supabase
		.from('profiles')
		.select('role, school_id')
		.eq('id', user.id)
		.single();

	if (!profile || profile.role !== 'admin') {
		throw error(403, 'Accès refusé - Admin uniquement');
	}

	// 4. Verify school year exists and belongs to school
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

	// 5. Verify user's school matches (additional security check)
	if (profile.school_id !== schoolId) {
		throw error(403, 'Accès refusé - École non autorisée');
	}

	// 6. Call the SQL function to link assessments
	const { data, error: linkError } = await locals.supabase.rpc(
		'link_existing_assessments_to_periods',
		{
			p_school_year_id: yearId
		}
	);

	if (linkError) {
		console.error('Error linking assessments to periods:', {
			yearId,
			schoolYear: schoolYear.name,
			error: linkError
		});
		throw error(500, 'Erreur lors de la liaison des évaluations');
	}

	const count = data || 0;

	// 7. Return success with count
	return json({
		success: true,
		count,
		message: `${count} évaluation(s) liée(s) à des périodes`
	});
};
