/**
 * Page « Séries » (C17, Q27) : les séries du professeur, leur verrou, et les
 * actions Dupliquer / Supprimer. Prof et admin.
 */

import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { uuidSchema } from '$lib/server/validation/common';
import { deleteSeries, duplicateSeries, getTeacherSeries, SeriesError } from '$lib/server/series';

export const load: PageServerLoad = async ({ locals }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);
	try {
		return { series: await getTeacherSeries(locals.supabase, user.id) };
	} catch (e) {
		if (e instanceof SeriesError) throw error(e.status, e.message);
		throw e;
	}
};

/** Identifiant de série lu dans le formulaire */
function readSeriesId(formData: FormData): string | null {
	const parsed = uuidSchema.safeParse(formData.get('id'));
	return parsed.success ? parsed.data : null;
}

export const actions: Actions = {
	/** Dupliquer (B12) : « Copie de <titre> », jamais verrouillée */
	duplicate: async ({ request, locals }) => {
		const { user } = await requireRoles(locals, ['teacher', 'admin']);
		const id = readSeriesId(await request.formData());
		if (!id) return fail(400, { message: 'Série invalide' });

		try {
			const copy = await duplicateSeries(locals.supabase, id, user.id);
			return { success: true, seriesId: copy.id };
		} catch (e) {
			if (e instanceof SeriesError) return fail(e.status, { message: e.message });
			throw e;
		}
	},

	/** Supprimer (Q31) : refusé, avec un message clair, si une évaluation l'utilise */
	delete: async ({ request, locals }) => {
		await requireRoles(locals, ['teacher', 'admin']);
		const id = readSeriesId(await request.formData());
		if (!id) return fail(400, { message: 'Série invalide' });

		try {
			await deleteSeries(locals.supabase, id);
			return { success: true };
		} catch (e) {
			if (e instanceof SeriesError) return fail(e.status, { message: e.message });
			throw e;
		}
	}
};
