/**
 * Page « Évaluations » (Q27) : les évaluations du professeur, chacune avec sa
 * série et sa forme. Les séries se gèrent dans « Séries ».
 */

import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { uuidSchema } from '$lib/server/validation/common';
import {
	EvaluationError,
	getTeacherEvaluations,
	setEvaluationStatus
} from '$lib/server/evaluations';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);
	try {
		return { evaluations: await getTeacherEvaluations(locals.supabase, user.id) };
	} catch (e) {
		if (e instanceof EvaluationError) throw error(e.status, e.message);
		throw e;
	}
};

export const actions: Actions = {
	/** Publier un brouillon */
	publish: async ({ request, locals }) => {
		await requireRoles(locals, ['teacher', 'admin']);
		const id = uuidSchema.safeParse((await request.formData()).get('id'));
		if (!id.success) return fail(400, { message: 'Évaluation invalide' });

		try {
			await setEvaluationStatus(locals.supabase, id.data, 'published');
			return { success: true };
		} catch (e) {
			if (e instanceof EvaluationError) return fail(e.status, { message: e.message });
			throw e;
		}
	}
};
