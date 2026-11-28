/**
 * Modifier une série (C17). La base refuse la modification d'une série
 * verrouillée (UBS01) : le message invite à la dupliquer.
 */

import { error, fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { requireRoles } from '#lib/server/middleware/auth.ts';
import { validateUuidParam } from '#lib/server/validation/params.ts';
import { updateSeriesSchema } from '#lib/server/validation/evaluations.ts';
import { getSeries, SeriesError, updateSeries } from '#lib/server/series.ts';
import type { SeriesItem } from '#lib/validation/series.ts';
import { createServerLogger } from '#lib/utils/logger.ts';
import { getDurationSignals } from '#lib/server/stats/duration-signals.ts';
import { getTeacherTestMode } from '#lib/server/test-mode.ts';
import type { DurationSignalsResponse } from '#lib/types/duration-signals.ts';
import { TEMPLATE_COLUMNS } from '#lib/server/question-template-columns.ts';
import { mapDbTemplateToForm, type CatalogueTemplate } from '#lib/questions/types.ts';

const logger = createServerLogger('series/edit');

export const load: PageServerLoad = async ({ params, locals }) => {
	const { user } = await requireRoles(locals, ['teacher', 'admin']);
	const id = validateUuidParam(params.id);

	try {
		const series = await getSeries(locals.supabase, id);
		if (!series) throw error(404, 'Série introuvable');
		const [templates, durationSignals] = await Promise.all([
			loadPublishedTemplates(locals.supabase, series.items),
			loadDurationSignals(locals.supabase, user.id, series.items)
		]);
		return {
			series,
			templates,
			durationSignals: durationSignals?.signals ?? null,
			observedDurations: durationSignals?.observed ?? null
		};
	} catch (e) {
		if (e instanceof SeriesError) throw error(e.status, e.message);
		throw e;
	}
};

/**
 * Modèles PUBLIÉS de la série, sans leurs cas de test : un modèle absent est
 * signalé « retiré » par la page (ADR 0035, Q7) ; ses variations servent au
 * choix des variations d'une ligne (chantier `idees-format`, idée 2).
 */
async function loadPublishedTemplates(
	supabase: App.Locals['supabase'],
	items: readonly SeriesItem[]
): Promise<CatalogueTemplate[]> {
	const ids = [...new Set(items.map((item) => item.templateId))];
	if (ids.length === 0) return [];
	const { data, error: readError } = await supabase
		.from('question_templates')
		.select(TEMPLATE_COLUMNS)
		.eq('status', 'published')
		.in('id', ids);
	if (readError) {
		logger.error('[series/edit] Modèles illisibles :', readError);
		throw error(500, 'Impossible de charger la série');
	}
	// Liste de colonnes construite : le client Supabase ne sait plus typer la ligne
	const rows: unknown[] = data ?? [];
	return rows.map((row) => mapDbTemplateToForm(row as Record<string, unknown>));
}

/**
 * Durées trop courtes (chantier `durees-trop-courtes`) et durées observées
 * (chantier `durees-ajustees`) des modèles ; un échec rend null : ni marque ni
 * suggestion, la page reste.
 */
async function loadDurationSignals(
	supabase: App.Locals['supabase'],
	userId: string,
	items: readonly SeriesItem[]
): Promise<DurationSignalsResponse | null> {
	const isTestMode = await getTeacherTestMode(userId, supabase);
	const result = await getDurationSignals(
		supabase,
		items.map((item) => item.templateId),
		isTestMode
	);
	return result.status === 'ok' ? { signals: result.signals, observed: result.observed } : null;
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
