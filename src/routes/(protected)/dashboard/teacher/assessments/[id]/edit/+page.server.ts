/**
 * Modifier les réglages d'une évaluation en brouillon (forme, temps limite,
 * tentatives, date limite, ordre). La série se modifie depuis « Séries ».
 */

import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { updateEvaluationFormSchema } from '$lib/server/validation/evaluations';
import { EvaluationError, getEvaluation, updateEvaluation } from '$lib/server/evaluations';

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user, profile } = await requireRoles(locals, ['teacher', 'admin']);
	const id = validateUuidParam(params.id);

	let evaluation;
	try {
		evaluation = await getEvaluation(locals.supabase, id);
	} catch (e) {
		if (e instanceof EvaluationError) throw error(e.status, e.message);
		throw e;
	}
	if (!evaluation) throw error(404, 'Évaluation introuvable');
	if (evaluation.created_by !== user.id && profile.role !== 'admin') {
		throw error(403, 'Non autorisé');
	}
	// Seuls les brouillons se modifient
	if (evaluation.status !== 'draft') {
		throw redirect(303, '/dashboard/teacher/assessments');
	}

	return { evaluation };
};

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		await requireRoles(locals, ['teacher', 'admin']);
		const id = validateUuidParam(params.id);
		const formData = await request.formData();

		const validation = updateEvaluationFormSchema.safeParse({
			settings: formData.get('settings')
		});
		if (!validation.success) {
			return fail(400, { message: validation.error.issues[0].message });
		}

		try {
			// La page n'est pas une garde : un POST direct la contourne. On relit.
			const current = await getEvaluation(locals.supabase, id);
			if (!current) return fail(404, { message: 'Évaluation introuvable' });
			if (current.status !== 'draft') {
				return fail(409, { message: 'Seule une évaluation en brouillon se modifie' });
			}

			await updateEvaluation(locals.supabase, current.id, validation.data.settings);
			return { success: true };
		} catch (e) {
			if (e instanceof EvaluationError) return fail(e.status, { message: e.message });
			throw e;
		}
	}
};
