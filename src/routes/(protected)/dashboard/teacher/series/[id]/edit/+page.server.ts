/**
 * Modifier une série (C17). La base refuse la modification d'une série
 * verrouillée (UBS01) : le message invite à la dupliquer.
 */

import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireRoles } from '$lib/server/middleware/auth';
import { validateUuidParam } from '$lib/server/validation/params';
import { updateSeriesSchema } from '$lib/server/validation/evaluations';
import { getSeries, SeriesError, updateSeries } from '$lib/server/series';

export const load: PageServerLoad = async ({ params, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);
	const id = validateUuidParam(params.id);

	try {
		const series = await getSeries(locals.supabase, id);
		if (!series) throw error(404, 'Série introuvable');
		return { series };
	} catch (e) {
		if (e instanceof SeriesError) throw error(e.status, e.message);
		throw e;
	}
};

/** Catégories sérialisées par la page */
function parseJsonField(value: FormDataEntryValue | null): unknown {
	if (typeof value !== 'string' || value.length > 100_000) return undefined;
	try {
		return JSON.parse(value) as unknown;
	} catch {
		return undefined;
	}
}

export const actions: Actions = {
	default: async ({ request, params, locals }) => {
		await requireRoles(locals, ['teacher', 'admin']);
		const id = validateUuidParam(params.id);
		const formData = await request.formData();

		const validation = updateSeriesSchema.safeParse({
			title: formData.get('title'),
			grade: formData.get('grade'),
			description: formData.get('description') ?? null,
			categories: parseJsonField(formData.get('categories'))
		});
		if (!validation.success) {
			return fail(400, { message: validation.error.issues[0].message });
		}

		try {
			await updateSeries(locals.supabase, id, validation.data);
			return { success: true };
		} catch (e) {
			if (e instanceof SeriesError) return fail(e.status, { message: e.message });
			throw e;
		}
	}
};
