/**
 * Créer une évaluation depuis une série (B13, C20) : `?series=<id>`.
 * La composition vient de la série ; la page ne règle que la forme, le temps
 * limite (Course aux nombres), les tentatives, la date limite et l'ordre.
 */

import { error, fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { uuidSchema } from '$lib/server/validation/common';
import { createEvaluationFormSchema } from '$lib/server/validation/evaluations';
import { getSeries, SeriesError } from '$lib/server/series';
import { createEvaluation, EvaluationError } from '$lib/server/evaluations';

export const load: PageServerLoad = async ({ locals, url }) => {
	await requireRoles(locals, ['teacher', 'admin']);

	const seriesId = uuidSchema.safeParse(url.searchParams.get('series'));
	if (!seriesId.success) {
		// Une évaluation part toujours d'une série
		throw redirect(303, '/dashboard/teacher/series');
	}

	try {
		const series = await getSeries(locals.supabase, seriesId.data);
		if (!series) throw error(404, 'Série introuvable');
		return { series };
	} catch (e) {
		if (e instanceof SeriesError) throw error(e.status, e.message);
		throw e;
	}
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const { user } = await requireRoles(locals, ['teacher', 'admin']);
		const formData = await request.formData();

		const validation = createEvaluationFormSchema.safeParse({
			series_id: formData.get('series_id'),
			settings: formData.get('settings'),
			status: formData.get('status') ?? undefined
		});
		if (!validation.success) {
			return fail(400, { message: validation.error.issues[0].message });
		}

		try {
			const evaluation = await createEvaluation(locals.supabase, validation.data, user.id);
			return { success: true, evaluationId: evaluation.id };
		} catch (e) {
			if (e instanceof EvaluationError) return fail(e.status, { message: e.message });
			throw e;
		}
	}
};
