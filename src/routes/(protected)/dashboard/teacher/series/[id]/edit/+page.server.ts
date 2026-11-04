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
import type { SeriesItem } from '$lib/validation/series';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('series/edit');

export const load: PageServerLoad = async ({ params, locals }) => {
	await requireRoles(locals, ['teacher', 'admin']);
	const id = validateUuidParam(params.id);

	try {
		const series = await getSeries(locals.supabase, id);
		if (!series) throw error(404, 'Série introuvable');
		return { series, templates: await loadPublishedTemplates(locals.supabase, series.items) };
	} catch (e) {
		if (e instanceof SeriesError) throw error(e.status, e.message);
		throw e;
	}
};

/**
 * Titre et niveau des modèles PUBLIÉS de la série : un modèle absent est
 * signalé « retiré » par la page (ADR 0035, Q7).
 */
async function loadPublishedTemplates(
	supabase: App.Locals['supabase'],
	items: readonly SeriesItem[]
): Promise<Array<{ id: string; title: string; level: number }>> {
	const ids = [...new Set(items.map((item) => item.templateId))];
	if (ids.length === 0) return [];
	const { data, error: readError } = await supabase
		.from('question_templates')
		.select('id, title, level')
		.eq('status', 'published')
		.in('id', ids);
	if (readError) {
		logger.error('[series/edit] Modèles illisibles :', readError);
		throw error(500, 'Impossible de charger la série');
	}
	return data ?? [];
}

/** Lignes sérialisées par la page */
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
			items: parseJsonField(formData.get('items'))
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
