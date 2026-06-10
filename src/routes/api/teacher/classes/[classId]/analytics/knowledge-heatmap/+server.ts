/**
 * GET /api/teacher/classes/[classId]/analytics/knowledge-heatmap
 *
 * Widget C — Heatmap activité classe (élève × jour, sur N derniers jours).
 * Query : ?days=30&alertThresholdDays=5
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import { classIdParamSchema, heatmapQuerySchema } from '$lib/server/validation/teacher-analytics';
import { getClassActivityHeatmap } from '$lib/server/stats';

export const GET: RequestHandler = async ({ params, url, locals }) => {
	const paramCheck = classIdParamSchema.safeParse(params);
	if (!paramCheck.success) {
		return json({ error: paramCheck.error.issues[0].message }, { status: 400 });
	}

	const queryCheck = heatmapQuerySchema.safeParse({
		days: url.searchParams.get('days') ?? undefined,
		alertThresholdDays: url.searchParams.get('alertThresholdDays') ?? undefined
	});
	if (!queryCheck.success) {
		return json({ error: queryCheck.error.issues[0].message }, { status: 400 });
	}

	const { classId } = paramCheck.data;
	await requireTeacherOfClass(locals, classId);

	const heatmap = await getClassActivityHeatmap(
		locals.supabase,
		classId,
		queryCheck.data.days,
		queryCheck.data.alertThresholdDays
	);

	return json(heatmap);
};
