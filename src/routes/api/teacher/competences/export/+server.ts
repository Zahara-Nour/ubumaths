/**
 * GET /api/teacher/competences/export
 *
 * Streams a UTF-8 (BOM) CSV of a class's competence levels for the teacher to
 * re-key / paste into their ENT (Pronote...). Generated on the fly — nothing is
 * stored server-side (cf. docs/wip/export-competences-study.md §6 E13).
 *
 * Query params:
 *   - class_id       (uuid, required)
 *   - disposition    ('large' | 'longue', default 'large')
 *   - niveau_format  ('numeric' | 'label' | 'short', default 'numeric')
 *   - socle          ('true' to add a socle_code column — longue only)
 *   - task_count     ('true' to add a task_count column — longue only)
 *   - last_obs       ('true' to add a derniere_observation column — longue only)
 *   - period_label   (optional, used only in the filename)
 *
 * AuthZ: teacher (or admin) owning the class — `requireTeacherOfClass`.
 */

import { error } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireTeacherOfClass } from '$lib/server/stats/teacher-class-auth';
import { loadClassCompetenceExport } from '$lib/server/competences/load-export-data';
import { buildCompetencesCsv } from '$lib/server/competences/export-csv';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('api/teacher/competences/export');

const boolParam = z
	.enum(['true', 'false'])
	.default('false')
	.transform((v) => v === 'true');

const querySchema = z.object({
	class_id: z.string().uuid(),
	disposition: z.enum(['large', 'longue']).default('large'),
	niveau_format: z.enum(['numeric', 'label', 'short']).default('numeric'),
	socle: boolParam,
	task_count: boolParam,
	last_obs: boolParam,
	period_label: z.string().trim().max(100).optional()
});

/** Filename-safe slug: ASCII, lowercase, dashes. */
function slug(value: string): string {
	return value
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '') // strip combining diacritics
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
}

export const GET: RequestHandler = async ({ locals, url }) => {
	const parsed = querySchema.safeParse({
		class_id: url.searchParams.get('class_id') ?? undefined,
		disposition: url.searchParams.get('disposition') ?? undefined,
		niveau_format: url.searchParams.get('niveau_format') ?? undefined,
		socle: url.searchParams.get('socle') ?? undefined,
		task_count: url.searchParams.get('task_count') ?? undefined,
		last_obs: url.searchParams.get('last_obs') ?? undefined,
		period_label: url.searchParams.get('period_label') ?? undefined
	});
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}
	const q = parsed.data;

	// AuthN + AuthZ + ownership (teacher of the class, or admin).
	const { user, classRow } = await requireTeacherOfClass(locals, q.class_id);

	const { competences, rows } = await loadClassCompetenceExport(
		locals.supabase,
		q.class_id,
		classRow.name
	);

	const csv = buildCompetencesCsv(rows, {
		disposition: q.disposition,
		niveauFormat: q.niveau_format,
		competences,
		includeSocle: q.disposition === 'longue' && q.socle,
		includeTaskCount: q.disposition === 'longue' && q.task_count,
		includeLastObservation: q.disposition === 'longue' && q.last_obs
	});

	const today = new Date().toISOString().slice(0, 10);
	const parts = ['competences', slug(classRow.name)];
	if (q.period_label) parts.push(slug(q.period_label));
	parts.push(today);
	const filename = `${parts.filter(Boolean).join('-')}.csv`;

	logger.info('competences exported', {
		teacherId: user.id,
		classId: q.class_id,
		students: rows.length,
		disposition: q.disposition,
		niveauFormat: q.niveau_format
	});

	return new Response(csv, {
		headers: {
			'Content-Type': 'text/csv; charset=utf-8',
			'Content-Disposition': `attachment; filename="${filename}"`,
			'Cache-Control': 'no-store, no-cache, must-revalidate'
		}
	});
};
