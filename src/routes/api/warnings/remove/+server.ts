/**
 * Remove Warning API Endpoint
 * ============================
 *
 * DELETE most recent warning of a specific type for a student
 */

import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { z } from 'zod';

const removeWarningSchema = z.object({
	student_id: z.string().uuid(),
	class_id: z.string().uuid(),
	academic_period_id: z.string().uuid(),
	warning_type: z.enum(['C', 'M', 'R', 'T'])
});

export const POST: RequestHandler = async ({ request, locals }) => {
	const supabase = locals.supabase;
	const { user } = await locals.safeGetSession();
	if (!user) {
		throw error(401, 'Non authentifié');
	}

	// Validate request body
	const validation = removeWarningSchema.safeParse(await request.json());
	if (!validation.success) {
		throw error(400, validation.error.issues[0].message);
	}

	const { student_id, class_id, academic_period_id, warning_type } = validation.data;

	// Find the most recent warning of this type for this student
	const { data: warnings, error: fetchError } = await supabase
		.from('student_warnings')
		.select('id')
		.eq('student_id', student_id)
		.eq('class_id', class_id)
		.eq('academic_period_id', academic_period_id)
		.eq('warning_type', warning_type)
		.order('created_at', { ascending: false })
		.limit(1);

	if (fetchError) {
		console.error('Error fetching warning:', fetchError);
		throw error(500, 'Erreur serveur');
	}

	if (!warnings || warnings.length === 0) {
		throw error(404, 'Aucun avertissement trouvé');
	}

	const warningId = warnings[0].id;

	// Delete the warning
	const { error: deleteError } = await supabase.from('student_warnings').delete().eq('id', warningId);

	if (deleteError) {
		console.error('Error deleting warning:', deleteError);
		throw error(500, 'Erreur serveur');
	}

	return json({ success: true });
};
